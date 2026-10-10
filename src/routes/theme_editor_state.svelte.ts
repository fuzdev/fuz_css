import { SvelteMap } from 'svelte/reactivity';
import { escape_js_string } from '@fuzdev/fuz_util/string.ts';

import { compose_themes, pick_stance_slot, to_theme_stance } from '#lib/theme.ts';
import { resolve_theme_stance } from '#lib/theme_stance.ts';
import type { StyleVariable, Theme, ThemeScheme } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
import { theme_knob_by_name } from '#lib/knobs.ts';
import { check_theme, type ThemeCheckReport, type ThemeGateEntry } from '#lib/theme_check.ts';
import { validate_theme, type ThemeIssue } from '#lib/theme_validate.ts';
import { create_theme_resolver, type ThemeKnobResolver } from '#lib/theme_resolver.ts';
import type { ColorSchemeVariant } from '#lib/variable_data.ts';
import { UNSAVED_THEME_NAME } from '#routes/theme_draft.ts';

// TODO upstream to fuz_ui

const default_variable_by_name: Map<string, StyleVariable> = new Map(
	default_variables.map((v) => [v.name, v])
);

/** The draft's name while it's based on the first theme. */
const NEW_THEME_NAME = 'new theme';

export interface SlotOverride {
	light?: string;
	dark?: string;
}

export interface ThemeEditorSnapshotData {
	name: string;
	based_on: string;
	scheme: ThemeScheme;
	overrides: Array<[string, SlotOverride]>;
	/** The active contrast modifier's name, absent or `null` for none. */
	contrast?: string | null;
}

export interface ThemeEditorStateOptions {
	/** The themes a draft can be based on. The first is the fallback base. */
	themes: Array<Theme>;
	/**
	 * Modifier themes that compose over whatever is applied, usually
	 * `contrast_modifiers`.
	 *
	 * @default []
	 */
	contrast_modifiers?: Array<Theme>;
}

/**
 * State for the inline theme editor: a base theme selected by name plus a map
 * of per-variable slot overrides, merged into a draft `Theme` on the fly.
 *
 * Scheme semantics: variables whose effective definition is scheme-adaptive
 * (dual-slot) edit the slot of the scheme being viewed; single-slot variables
 * always edit the light (base) slot so the change applies to both schemes.
 * When a fresh light-slot override lands on a variable whose default is
 * dual-slot, the merge preserves the default's dark slot explicitly - a
 * theme's `:root` block beats the base defaults' `:root.dark` by cascade
 * layer order, so omitting it would silently change dark mode too. A base
 * theme that itself sets only light slots (e.g. dark-only mirrors) chose
 * those cross-scheme semantics deliberately and is left alone.
 *
 * A single-scheme stance (`Theme.scheme`) changes both halves: edits to a
 * scheme-adaptive variable write the stanced scheme's slot whichever scheme
 * is being viewed (the stance renders that one appearance in both), and the
 * merge re-slots each layer to the stance and skips the dark-slot
 * preservation (the renderer's stance mirror handles untouched defaults). The
 * overrides themselves are never rewritten by a stance change, so switching
 * into a stance and back loses nothing - the other scheme's edits just don't
 * render while the stance holds - and a stanced draft over a dual base can't
 * ship both appearances.
 *
 * The editor also owns what the page applies: `applied_theme` is the dirty
 * draft or the base, composed with the active contrast modifier, and
 * `sync_applied_theme` adopts a theme that was already applied when the
 * editor mounts.
 */
export class ThemeEditorState {
	readonly themes: Array<Theme>;
	readonly contrast_modifiers: Array<Theme>;

	name: string = $state.raw(NEW_THEME_NAME);
	/** The base theme's name - the first theme until another loads. */
	based_on: string = $state.raw('');
	scheme: ThemeScheme = $state.raw('dual');
	readonly overrides: SvelteMap<string, SlotOverride> = new SvelteMap();
	/** The modifier composed over the applied theme, `null` for none. */
	contrast_modifier: Theme | null = $state.raw(null);

	constructor(options: ThemeEditorStateOptions) {
		const { themes, contrast_modifiers = [] } = options;
		if (!themes.length) throw new Error('ThemeEditorState requires at least one theme');
		this.themes = themes;
		this.contrast_modifiers = contrast_modifiers;
		// start clean on the first theme, carrying its stance
		this.based_on = themes[0]!.name;
		this.scheme = themes[0]!.scheme ?? 'dual';
	}

	readonly base_theme: Theme = $derived.by(
		() => this.themes.find((t) => t.name === this.based_on) ?? this.themes[0]!
	);

	readonly base_scheme: ThemeScheme = $derived(this.base_theme.scheme ?? 'dual');

	/** The single-scheme stance, `null` for dual themes. */
	readonly stance: 'light' | 'dark' | null = $derived(to_theme_stance(this.scheme));

	readonly base_variable_by_name: Map<string, StyleVariable> = $derived(
		new Map(this.base_theme.variables.map((v) => [v.name, v]))
	);

	readonly dirty: boolean = $derived(this.overrides.size > 0 || this.scheme !== this.base_scheme);

	/**
	 * True when the draft (or its base) moves palette-tier knobs - the letter
	 * hues - making it an exemplar-tier theme per the two-tier policy.
	 */
	readonly is_palette_tier: boolean = $derived.by(() => {
		for (const name of this.overrides.keys()) {
			if (theme_knob_by_name.get(name)?.tier === 'palette') return true;
		}
		for (const v of this.base_theme.variables) {
			if (theme_knob_by_name.get(v.name)?.tier === 'palette') return true;
		}
		return false;
	});

	readonly merged_variables: Array<StyleVariable> = $derived.by(() => {
		const merged: Array<StyleVariable> = [];
		const seen: Set<string> = new Set();
		for (const v of this.base_theme.variables) {
			seen.add(v.name);
			const m = this.#merge_variable(v.name);
			if (m) merged.push(m);
		}
		for (const name of this.overrides.keys()) {
			if (seen.has(name)) continue;
			const m = this.#merge_variable(name);
			if (m) merged.push(m);
		}
		return merged;
	});

	/**
	 * `merged_variables` indexed by name - the lookup `display_value` reads so
	 * the per-knob template pass reuses the one merge instead of re-merging
	 * per call, making "derived from the same merge" structural.
	 */
	readonly #merged_by_name: Map<string, StyleVariable> = $derived(
		new Map(this.merged_variables.map((v) => [v.name, v]))
	);

	#merge_variable(name: string): StyleVariable | null {
		const o = this.overrides.get(name);
		const b = this.base_variable_by_name.get(name);
		let light: string | undefined;
		let dark: string | undefined;
		if (this.stance) {
			// re-slot each layer to the stance, sharing `compose_themes`' overlay
			// semantics: the stanced scheme's value becomes the base slot and the
			// other never renders. Overrides are usually single-slot already, but
			// a dual base theme's own variables carry both slots and would split
			// the appearances the stance promises to unify - re-slotting per layer
			// keeps an override's base-slot edit winning over the base's dark slot.
			// An adaptive variable's override is read from the stanced slot alone:
			// its lone light slot is a light-scheme edit, not a base value
			const override = this.#is_adaptive(name, o, b)
				? o?.[this.stance]
				: pick_stance_slot(o, this.stance);
			light = override ?? pick_stance_slot(b, this.stance);
		} else {
			light = o?.light ?? b?.light;
			dark = o?.dark ?? b?.dark;
			// preserve a scheme-adaptive default's dark slot for fresh light-only
			// overrides - see the class comment for the cascade-layer rationale
			if (o?.light !== undefined && dark === undefined && !b) {
				dark = default_variable_by_name.get(name)?.dark;
			}
		}
		if (dark !== undefined && dark === light) dark = undefined;
		if (light === undefined && dark === undefined) return null;
		const merged: StyleVariable = { name };
		if (light !== undefined) merged.light = light;
		if (dark !== undefined) merged.dark = dark;
		return merged;
	}

	/** The draft's name, trimmed - what a copied theme is named. */
	readonly trimmed_name: string = $derived(this.name.trim());

	/**
	 * The copyable theme, carrying the user's chosen name. Resolved through
	 * `resolve_theme_stance` so a single-scheme draft carries its mirror -
	 * without it the renderer would pin `color-scheme` but show the other
	 * scheme's defaults.
	 */
	readonly output: Theme = $derived(
		resolve_theme_stance({
			name: this.trimmed_name,
			variables: this.merged_variables,
			...(this.stance ? { scheme: this.stance } : {})
		})
	);

	/**
	 * The live-applied theme: `output` renamed to a stable name so pickers key
	 * it consistently.
	 */
	readonly draft: Theme = $derived({ ...this.output, name: UNSAVED_THEME_NAME });

	/** The themes a picker offers: the bases, plus the draft once a knob moves. */
	readonly picker_themes: Array<Theme> = $derived.by(() =>
		this.dirty ? [...this.themes, this.draft] : this.themes
	);

	/** The theme a picker highlights: what's applied, before the contrast modifier. */
	readonly picked_theme: Theme = $derived.by(() => (this.dirty ? this.draft : this.base_theme));

	/**
	 * What the page applies: the picked theme composed with the active
	 * contrast modifier. A composed draft keeps the draft's stable name, since
	 * `compose_themes` renames and pickers and persistence key on it.
	 */
	readonly applied_theme: Theme = $derived.by(() => {
		const modifier = this.contrast_modifier;
		if (!modifier) return this.picked_theme;
		const composed = compose_themes(this.picked_theme, modifier);
		return this.dirty ? { ...composed, name: UNSAVED_THEME_NAME } : composed;
	});

	/** Structural lint findings for the draft, from `validate_theme`. */
	readonly issues: Array<ThemeIssue> = $derived(validate_theme(this.output));

	/**
	 * The gamut/monotonicity/contrast gate report for the draft, from
	 * `check_theme` - the same gates the shipped themes are held to in CI,
	 * re-run on every edit.
	 */
	readonly check_report: ThemeCheckReport = $derived(check_theme(this.output));

	/** The gate entries that fail for the draft. */
	readonly failing_gates: Array<ThemeGateEntry> = $derived(
		this.check_report.entries.filter((e) => !e.pass)
	);

	/** Whether the draft lints clean and passes every gate with nothing unchecked. */
	readonly gates_pass: boolean = $derived(this.issues.length === 0 && this.check_report.ok);

	/** Whether the draft's name is taken by a theme it could be confused with in a picker. */
	readonly name_collides: boolean = $derived.by(
		() =>
			this.trimmed_name === UNSAVED_THEME_NAME ||
			this.themes.some((t) => t.name === this.trimmed_name)
	);

	/**
	 * The memoized numeric resolver over the draft, rebuilt per edit like
	 * `check_report` - agreement with `display_value` is structural since both
	 * read the same `output` (the same effective-value merge and stance mirror).
	 */
	readonly resolver: ThemeKnobResolver = $derived(create_theme_resolver(this.output));

	/**
	 * The value a scheme currently renders for a variable, derived from the
	 * same merge the renderer uses so the two can't disagree - including the
	 * theme layer's light slots beating the base defaults' dark slots, the
	 * merge preserving a scheme-adaptive default's dark slot under fresh
	 * light-only overrides, and a single-scheme stance mirroring untouched
	 * scheme-adaptive defaults so both schemes show the stanced appearance.
	 */
	display_value(name: string, scheme: ColorSchemeVariant): string | undefined {
		const merged = this.#merged_by_name.get(name);
		const d = default_variable_by_name.get(name);
		// the renderer's stance mirror applies only to defaults the theme
		// doesn't touch, re-slotted so the stanced value wins in both schemes
		const mirrored = !merged && this.stance ? d?.[this.stance] : undefined;
		if (scheme === 'light') return merged?.light ?? mirrored ?? d?.light;
		return merged?.dark ?? mirrored ?? merged?.light ?? d?.dark ?? d?.light;
	}

	/**
	 * The numeric twin of `display_value`: the number a scheme currently
	 * renders for a knob, resolved through derivation chains (`var()`
	 * bindings, the `calc(var(--x) * k)` scaled-reference form, derived
	 * stops). `null` for values outside the resolver's color-system coverage
	 * (lengths, colors, shadows, unset hooks).
	 */
	resolved_value(name: string, scheme: ColorSchemeVariant): number | null {
		return this.resolver.resolve(name, scheme);
	}

	changed(name: string): boolean {
		return this.overrides.has(name);
	}

	/**
	 * Whether a variable's effective definition is scheme-adaptive - dual-slot
	 * in the defaults, the base theme, or the overrides - so its edits are
	 * per scheme rather than to the base slot.
	 */
	#is_adaptive(name: string, o: SlotOverride | undefined, b: StyleVariable | undefined): boolean {
		return (
			default_variable_by_name.get(name)?.dark !== undefined ||
			b?.dark !== undefined ||
			o?.dark !== undefined
		);
	}

	set_value(name: string, value: string, scheme: ColorSchemeVariant): void {
		const o = this.overrides.get(name);
		const adaptive = this.#is_adaptive(name, o, this.base_variable_by_name.get(name));
		// a scheme-adaptive variable edits the slot of the scheme being viewed,
		// or under a stance the stanced scheme's slot - that one appearance
		// renders in both, and writing its own slot is what lets the merge pick
		// the edit over an earlier one; anything else edits the base slot
		const slot = adaptive ? (this.stance ?? scheme) : 'light';
		this.overrides.set(name, { ...o, [slot]: value });
	}

	/**
	 * Sets the scheme stance. Overrides are left as they are: the merge picks
	 * the stanced scheme's slots while a stance holds, so leaving the stance
	 * restores every edit made before it.
	 */
	set_scheme(scheme: ThemeScheme): void {
		this.scheme = scheme;
	}

	reset(name: string): void {
		this.overrides.delete(name);
	}

	reset_all(): void {
		this.overrides.clear();
		this.scheme = this.base_scheme;
	}

	/**
	 * Loads a theme as the new base: overrides clear and the editor edits on
	 * top of its flattened variables (flatten-on-load composition), carrying
	 * the theme's scheme stance.
	 */
	load_theme(theme: Theme): void {
		if (theme.name === UNSAVED_THEME_NAME) return;
		this.based_on = theme.name;
		this.overrides.clear();
		this.scheme = theme.scheme ?? 'dual';
		this.name = theme.name === this.themes[0]!.name ? NEW_THEME_NAME : `custom ${theme.name}`;
	}

	/**
	 * Loads a theme as the new base unless that would discard a dirty draft
	 * the user wants to keep - the one guard every picker shares.
	 *
	 * @param theme - the theme to load
	 * @param confirm_discard - asks whether to discard the draft, given the message to show
	 * @returns whether the theme loaded
	 * @mutates `this`
	 */
	load_theme_guarded(theme: Theme, confirm_discard: (message: string) => boolean): boolean {
		if (theme.name === UNSAVED_THEME_NAME) return false; // the draft, already applied
		if (this.dirty && !confirm_discard(discard_confirm_message(this, theme.name))) return false;
		this.load_theme(theme);
		return true;
	}

	/**
	 * Adopts a theme the page already applies - one persisted from an earlier
	 * visit or picked elsewhere - so the editor's base and contrast modifier
	 * match what's rendered instead of replacing it with the editor's own
	 * defaults. Recognizes a base by name and a contrast composition by its
	 * composed name. A dirty editor keeps its draft, and the draft itself or
	 * an unknown theme leaves the editor as it is.
	 *
	 * @returns whether the editor now matches `theme`
	 * @mutates `this`
	 */
	sync_applied_theme(theme: Theme): boolean {
		if (this.dirty || theme.name === UNSAVED_THEME_NAME) return false;
		for (const base of this.themes) {
			const modifier =
				base.name === theme.name
					? null
					: this.contrast_modifiers.find((m) => compose_themes(base, m).name === theme.name);
			if (modifier === undefined) continue;
			this.load_theme(base);
			this.contrast_modifier = modifier;
			return true;
		}
		return false;
	}

	to_snapshot(): ThemeEditorSnapshotData {
		return {
			name: this.name,
			based_on: this.based_on,
			scheme: this.scheme,
			overrides: Array.from(this.overrides.entries()).map(([name, o]) => [name, { ...o }]),
			contrast: this.contrast_modifier?.name ?? null
		};
	}

	/** Restores a page snapshot: the name, base, overrides, and contrast modifier. */
	restore_snapshot(data: ThemeEditorSnapshotData): void {
		this.name = data.name;
		// a stale snapshot may reference a renamed/removed theme - fall back to
		// the first theme rather than leaving the "based on" select unmatched
		this.based_on = this.themes.some((t) => t.name === data.based_on)
			? data.based_on
			: this.themes[0]!.name;
		this.scheme = data.scheme ?? this.base_scheme;
		this.overrides.clear();
		for (const [name, o] of data.overrides) {
			this.overrides.set(name, { ...o });
		}
		this.contrast_modifier = this.contrast_modifiers.find((m) => m.name === data.contrast) ?? null;
	}
}

/**
 * Creates a `ThemeEditorState` under its own effect root, for an editor that
 * outlives the component creating it. Built during a component's init, the
 * editor's deriveds would belong to that component and go inert once it's
 * destroyed, so a later reader would see stale values. The root is never
 * cleaned up - the editor lives as long as whatever holds it.
 */
export const create_rooted_theme_editor = (options: ThemeEditorStateOptions): ThemeEditorState => {
	let editor: ThemeEditorState | null = null;
	$effect.root(() => {
		editor = new ThemeEditorState(options);
	});
	return editor!;
};

/**
 * The confirm-dialog message shown before a dirty draft is discarded by
 * loading `name` as the new base - shared by every picker that can trigger
 * the flatten-on-load, so the wording can't drift.
 */
export const discard_confirm_message = (editor: ThemeEditorState, name: string): string => {
	const discarded = editor.overrides.size
		? `${editor.overrides.size} edited knob(s) will be discarded`
		: 'the scheme change will be discarded';
	return `load "${name}" as the new base? ${discarded}`;
};

/**
 * Renders a theme as a copyable TypeScript module. A single-scheme theme
 * emits the same resolve-at-module-scope shape as the shipped stanced
 * exemplars, so the copied module is render-ready - the authored variables
 * stay legible and the stance mirror computes where the theme is defined.
 */
export const render_theme_ts = (theme: Theme): string => {
	const slug =
		theme.name
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/gu, '_')
			.replaceAll(/^_+|_+$/gu, '') || 'custom';
	// an identifier can't lead with a digit, so those names take the prefix form
	const identifier = /^\d/u.test(slug) ? `theme_${slug}` : `${slug}_theme`;
	const variables = theme.variables
		.map((v) => {
			const parts = [`name: '${escape_js_string(v.name)}'`];
			if (v.light !== undefined) parts.push(`light: '${escape_js_string(v.light)}'`);
			if (v.dark !== undefined) parts.push(`dark: '${escape_js_string(v.dark)}'`);
			return `\t\t{${parts.join(', ')}},`;
		})
		.join('\n');
	// the comma rides inside so the empty case can put a comment after it
	const variables_ts = theme.variables.length
		? `[\n${variables}\n\t],`
		: '[], // empty - every variable keeps its base default';
	const stanced = to_theme_stance(theme.scheme) !== null;
	if (stanced) {
		return `import type {Theme} from '@fuzdev/fuz_css/variable.ts';
import {resolve_theme_stance} from '@fuzdev/fuz_css/theme_stance.ts';

const authored: Theme = {
	name: '${escape_js_string(theme.name)}',
	scheme: '${theme.scheme}', // renders this appearance in both color schemes
	variables: ${variables_ts}
};

/** Resolved at module scope so the theme is render-ready when imported. */
export const ${identifier}: Theme = resolve_theme_stance(authored);
`;
	}
	return `import type {Theme} from '@fuzdev/fuz_css/variable.ts';

export const ${identifier}: Theme = {
	name: '${escape_js_string(theme.name)}',
	variables: ${variables_ts}
};
`;
};
