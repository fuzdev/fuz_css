import {SvelteMap} from 'svelte/reactivity';

import type {Theme} from '$lib/theme.ts';
import type {StyleVariable} from '$lib/variable.ts';
import {default_variables} from '$lib/variables.ts';
import {theme_knob_by_name} from '$lib/knobs.ts';
import type {ColorSchemeVariant} from '$lib/variable_data.ts';

// TODO upstream to fuz_ui

/**
 * The name of the in-progress theme shown in pickers. Never `'base'`, which
 * fuz_ui's `ThemeRoot` suppresses to render nothing (pickers key by name), and
 * never a registry/exemplar name, which would collide with `ThemeInput`'s
 * name-keyed selection.
 */
export const UNSAVED_THEME_NAME = 'unsaved';

const default_variable_by_name: Map<string, StyleVariable> = new Map(
	default_variables.map((v) => [v.name, v]),
);

export interface SlotOverride {
	light?: string;
	dark?: string;
}

export interface ThemeEditorSnapshotData {
	name: string;
	based_on: string;
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
 * dual-slot, the merge preserves the default's dark slot explicitly — a
 * theme's `:root` block beats the base defaults' `:root.dark` by cascade
 * layer order, so omitting it would silently change dark mode too. A base
 * theme that itself sets only light slots (e.g. dark-only mirrors) chose
 * those cross-scheme semantics deliberately and is left alone.
 */
export class ThemeEditorState {
	readonly themes: Array<Theme> = [];

	name: string = $state.raw('new theme');
	based_on: string = $state.raw('base');
	readonly overrides: SvelteMap<string, SlotOverride> = new SvelteMap();

	constructor(themes: Array<Theme>) {
		this.themes = themes;
	}

	readonly base_theme: Theme = $derived(
		this.themes.find((t) => t.name === this.based_on) ?? this.themes[0]!,
	);

	readonly base_variable_by_name: Map<string, StyleVariable> = $derived(
		new Map(this.base_theme.variables.map((v) => [v.name, v])),
	);

	readonly dirty: boolean = $derived(this.overrides.size > 0);

	/**
	 * True when the draft (or its base) moves palette-tier knobs — the letter
	 * hues — making it an exemplar-tier theme per the two-tier policy.
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

	#merge_variable(name: string): StyleVariable | null {
		const o = this.overrides.get(name);
		const b = this.base_variable_by_name.get(name);
		const light = o?.light ?? b?.light;
		let dark = o?.dark ?? b?.dark;
		// preserve a scheme-adaptive default's dark slot for fresh light-only
		// overrides - see the class comment for the cascade-layer rationale
		if (o?.light !== undefined && dark === undefined && !b) {
			dark = default_variable_by_name.get(name)?.dark;
		}
		if (dark !== undefined && dark === light) dark = undefined;
		if (light === undefined && dark === undefined) return null;
		const merged: StyleVariable = {name};
		if (light !== undefined) merged.light = light;
		if (dark !== undefined) merged.dark = dark;
		return merged;
	}

	/** The live-applied theme, stably named so pickers key it consistently. */
	readonly draft: Theme = $derived({name: UNSAVED_THEME_NAME, variables: this.merged_variables});

	/** The copyable theme, carrying the user's chosen name. */
	readonly output: Theme = $derived({name: this.name, variables: this.merged_variables});

	/**
	 * The value a scheme currently renders for a variable, derived from the
	 * same merge the renderer uses so the two can't disagree — including the
	 * theme layer's light slots beating the base defaults' dark slots, and the
	 * merge preserving a scheme-adaptive default's dark slot under fresh
	 * light-only overrides.
	 */
	display_value(name: string, scheme: ColorSchemeVariant): string | undefined {
		const merged = this.#merge_variable(name);
		const d = default_variable_by_name.get(name);
		if (scheme === 'light') return merged?.light ?? d?.light;
		return merged?.dark ?? merged?.light ?? d?.dark ?? d?.light;
	}

	changed(name: string): boolean {
		return this.overrides.has(name);
	}

	set_value(name: string, value: string, scheme: ColorSchemeVariant): void {
		const o = this.overrides.get(name);
		const b = this.base_variable_by_name.get(name);
		const d = default_variable_by_name.get(name);
		const adaptive = d?.dark !== undefined || b?.dark !== undefined || o?.dark !== undefined;
		const slot = adaptive ? scheme : 'light';
		this.overrides.set(name, {...o, [slot]: value});
	}

	reset(name: string): void {
		this.overrides.delete(name);
	}

	reset_all(): void {
		this.overrides.clear();
	}

	/**
	 * Loads a theme as the new base: overrides clear and the editor edits on
	 * top of its flattened variables (flatten-on-load composition).
	 *
	 * @mutates `this`
	 */
	load_theme(theme: Theme): void {
		if (theme.name === UNSAVED_THEME_NAME) return;
		this.based_on = theme.name;
		this.overrides.clear();
		this.name = theme.name === 'base' ? 'new theme' : `custom ${theme.name}`;
	}

	to_snapshot(): ThemeEditorSnapshotData {
		return {
			name: this.name,
			based_on: this.based_on,
			overrides: Array.from(this.overrides.entries()).map(([name, o]) => [name, {...o}]),
		};
	}

	/**
	 * @mutates `this`
	 */
	restore_snapshot(data: ThemeEditorSnapshotData): void {
		this.name = data.name;
		this.based_on = data.based_on;
		this.overrides.clear();
		for (const [name, o] of data.overrides) {
			this.overrides.set(name, {...o});
		}
	}
}

const escape_single_quotes = (s: string): string =>
	s.replaceAll('\\', '\\\\').replaceAll("'", "\\'");

/**
 * Renders a theme as a copyable TypeScript module.
 */
export const render_theme_ts = (theme: Theme): string => {
	const identifier =
		theme.name
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/gu, '_')
			.replaceAll(/^_+|_+$/gu, '') || 'custom';
	const variables = theme.variables
		.map((v) => {
			const parts = [`name: '${escape_single_quotes(v.name)}'`];
			if (v.light !== undefined) parts.push(`light: '${escape_single_quotes(v.light)}'`);
			if (v.dark !== undefined) parts.push(`dark: '${escape_single_quotes(v.dark)}'`);
			return `\t\t{${parts.join(', ')}},`;
		})
		.join('\n');
	// the comma rides inside so the empty case can put a comment after it
	const variables_ts = theme.variables.length
		? `[\n${variables}\n\t],`
		: '[], // empty - every variable keeps its base default';
	return `import type {Theme} from '@fuzdev/fuz_css/theme.ts';

export const ${identifier}_theme: Theme = {
	name: '${escape_single_quotes(theme.name)}',
	variables: ${variables_ts}
};
`;
};
