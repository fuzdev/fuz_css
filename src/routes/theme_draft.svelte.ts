// TODO upstream to fuz_ui

import type { ResolvedTheme } from '#lib/theme.ts';
import { resolve_theme_stance } from '#lib/theme_stance.ts';
import type { StyleVariable, Theme } from '#lib/variable.ts';

/**
 * The name of the in-progress theme shown in pickers. Never `'base'`, which
 * fuz_ui's `ThemeRoot` suppresses to render nothing (pickers key by name), and
 * never a registry/exemplar name, which would collide with `ThemeInput`'s
 * name-keyed selection.
 *
 * Lives in its own leaf module so the root layout (which only needs this
 * string to skip persisting drafts, and `resolve_site_theme` to render them)
 * doesn't pull the whole editor-state module - and with it `variables.ts`,
 * `theme_check.ts`, and `knobs.ts` - into every page's bundle.
 */
export const UNSAVED_THEME_NAME = 'unsaved';

/**
 * Returns the editor draft's recomputed chroma caps, read reactively, so a
 * resolver calling it in a `$derived` follows the draft's edits.
 */
export type DraftCapsSource = () => Array<StyleVariable>;

// reactive so a source registered after the layout's first render still reaches it
let draft_caps_source: DraftCapsSource | null = $state.raw(null);

/**
 * Registers where the editor draft's caps come from - the themes page passes
 * its session editor's compiled caps. The editor compiles, so this module
 * stays free of `compile_theme` and the layout pays only for the hookup.
 *
 * @param source - the caps getter, or `null` to unregister
 */
export const register_draft_caps_source = (source: DraftCapsSource | null): void => {
	draft_caps_source = source;
};

/**
 * The docs site's `ThemeRoot` resolver: every theme gets its stance mirror
 * (`resolve_theme_stance`), and the editor draft, composed with a contrast
 * modifier or not, also gets the caps its compile recomputes, so the page
 * renders the draft as a build baking it would. The site's own themes
 * compile to no caps, alone or composed, so only the draft needs them.
 *
 * @param theme - the theme `ThemeRoot` renders
 * @returns the theme with its derived data
 */
export const resolve_site_theme = (theme: Theme): ResolvedTheme => {
	const resolved = resolve_theme_stance(theme);
	// a composed draft keeps the draft's name, and the modifiers move no caps
	if (theme.name !== UNSAVED_THEME_NAME || !draft_caps_source) return resolved;
	const caps = draft_caps_source();
	return caps.length ? { ...resolved, caps } : resolved;
};
