import { SvelteMap } from 'svelte/reactivity';
import { escape_js_string } from '@fuzdev/fuz_util/string.ts';

import { pick_stance_slot } from '$lib/theme.ts';
import { resolve_theme_stance } from '$lib/theme_stance.ts';
import type { StyleVariable, Theme, ThemeScheme } from '$lib/variable.ts';
import { default_variables } from '$lib/variables.ts';
import { theme_knob_by_name } from '$lib/knobs.ts';
import {
	validate_theme,
	check_theme,
	create_theme_resolver,
	type ThemeIssue,
	type ThemeCheckReport,
	type ThemeKnobResolver
} from '$lib/theme_check.ts';
import type { ColorSchemeVariant } from '$lib/variable_data.ts';
import { UNSAVED_THEME_NAME } from '$routes/theme_draft.ts';

// TODO upstream to fuz_ui

const default_variable_by_name: Map<string, StyleVariable> = new Map(
	default_variables.map((v) => [v.name, v])
);

export interface SlotOverride {
	light?: string;
	dark?: string;
}

export interface ThemeEditorSnapshotData {
	name: string;
	based_on: string;
	scheme: ThemeScheme;
	overrides: Array<[string, SlotOverride]>;
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
 * A single-scheme stance (`Theme.scheme`) changes both halves: edits always
 * write the light/base slot (the stance renders that one appearance in both
 * color schemes, so dual slots are meaningless), and the merge skips the
 * dark-slot preservation (the renderer's stance mirror handles untouched
 * defaults). Switching into a stance re-slots existing overrides so the
 * stanced scheme's edited values become the base slots, and the merge
 * re-slots a dual base theme's own dual-slot variables the same way - so a
 * stanced draft over a dual base can't ship both appearances.
 */
export class ThemeEditorState {
	readonly themes: Array<Theme>;

	name: string = $state.raw('new theme');
	based_on: string = $state.raw('base');
	scheme: ThemeScheme = $state.raw('dual');
	readonly overrides: SvelteMap<string, SlotOverride> = new SvelteMap();

	constructor(themes: Array<Theme>) {
		if (!themes.length) throw new Error('ThemeEditorState requires at least one theme');
		this.themes = themes;
	}

	readonly base_theme: Theme = $derived(
		this.themes.find((t) => t.name === this.based_on) ?? this.themes[0]!
	);

	readonly base_scheme: ThemeScheme = $derived(this.base_theme.scheme ?? 'dual');

	/** The single-scheme stance, `null` for dual themes. */
	readonly stance: 'light' | 'dark' | null = $derived(
		this.scheme === 'light' || this.scheme === 'dark' ? this.scheme : null
	);

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
			// keeps an override's base-slot edit winning over the base's dark slot
			light = pick_stance_slot(o, this.stance) ?? pick_stance_slot(b, this.stance);
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

	/**
	 * The copyable theme, carrying the user's chosen name. Resolved through
	 * `resolve_theme_stance` so a single-scheme draft carries its mirror -
	 * without it the renderer would pin `color-scheme` but show the other
	 * scheme's defaults.
	 */
	readonly output: Theme = $derived(
		resolve_theme_stance({
			name: this.name,
			variables: this.merged_variables,
			...(this.stance ? { scheme: this.stance } : {})
		})
	);

	/**
	 * The live-applied theme: `output` renamed to a stable name so pickers key
	 * it consistently.
	 */
	readonly draft: Theme = $derived({ ...this.output, name: UNSAVED_THEME_NAME });

	/** Structural lint findings for the draft, from `validate_theme`. */
	readonly issues: Array<ThemeIssue> = $derived(validate_theme(this.output));

	/**
	 * The gamut/monotonicity/contrast gate report for the draft, from
	 * `check_theme` - the same gates the shipped themes pass in CI, re-run on
	 * every edit.
	 */
	readonly check_report: ThemeCheckReport = $derived(check_theme(this.output));

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

	set_value(name: string, value: string, scheme: ColorSchemeVariant): void {
		const o = this.overrides.get(name);
		const b = this.base_variable_by_name.get(name);
		const d = default_variable_by_name.get(name);
		const adaptive = d?.dark !== undefined || b?.dark !== undefined || o?.dark !== undefined;
		// under a stance edits always write the base slot - dual slots are
		// meaningless when one appearance renders in both color schemes
		const slot = !this.stance && adaptive ? scheme : 'light';
		this.overrides.set(name, { ...o, [slot]: value });
	}

	/**
	 * Sets the scheme stance. Entering a single-scheme stance re-slots existing
	 * overrides so the stanced scheme's edited values become base slots (dark
	 * slots would otherwise shadow later stanced edits in dark mode); a
	 * light-stanced theme drops dark-only overrides since that appearance never
	 * renders.
	 *
	 * @mutates `this`
	 */
	set_scheme(scheme: ThemeScheme): void {
		this.scheme = scheme;
		if (scheme !== 'light' && scheme !== 'dark') return;
		for (const [name, o] of this.overrides) {
			const value = scheme === 'dark' ? (o.dark ?? o.light) : o.light;
			if (value === undefined) {
				this.overrides.delete(name);
			} else {
				this.overrides.set(name, { light: value });
			}
		}
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
	 *
	 * @mutates `this`
	 */
	load_theme(theme: Theme): void {
		if (theme.name === UNSAVED_THEME_NAME) return;
		this.based_on = theme.name;
		this.overrides.clear();
		this.scheme = theme.scheme ?? 'dual';
		this.name = theme.name === 'base' ? 'new theme' : `custom ${theme.name}`;
	}

	to_snapshot(): ThemeEditorSnapshotData {
		return {
			name: this.name,
			based_on: this.based_on,
			scheme: this.scheme,
			overrides: Array.from(this.overrides.entries()).map(([name, o]) => [name, { ...o }])
		};
	}

	/**
	 * @mutates `this`
	 */
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
	}
}

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
	const identifier =
		theme.name
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/gu, '_')
			.replaceAll(/^_+|_+$/gu, '') || 'custom';
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
	const stanced = theme.scheme === 'light' || theme.scheme === 'dark';
	if (stanced) {
		return `import type {Theme} from '@fuzdev/fuz_css/variable.ts';
import {resolve_theme_stance} from '@fuzdev/fuz_css/theme_stance.ts';

const authored: Theme = {
	name: '${escape_js_string(theme.name)}',
	scheme: '${theme.scheme}', // renders this appearance in both color schemes
	variables: ${variables_ts}
};

/** Resolved at module scope so the theme is render-ready when imported. */
export const ${identifier}_theme: Theme = resolve_theme_stance(authored);
`;
	}
	return `import type {Theme} from '@fuzdev/fuz_css/variable.ts';

export const ${identifier}_theme: Theme = {
	name: '${escape_js_string(theme.name)}',
	variables: ${variables_ts}
};
`;
};
