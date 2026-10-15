/**
 * The scheme stance mirror, which makes a single-scheme theme render its one
 * appearance in both color schemes.
 *
 * This lives apart from `theme.ts` so the renderer stays free of the variable
 * set. Only a stanced theme needs the mirror, and most consumers use a
 * dual-scheme theme, so keeping the dependency here means only the code that
 * renders a stanced theme pays for the data.
 *
 * A consequence of mirroring into the theme layer: the mirror re-declares the
 * scheme-adaptive defaults in `fuz.theme`, which outranks the
 * `fuz.preferences` OS mappings - so under a stanced theme
 * `prefers-contrast: more` keeps only its stronger `--border_color` and the
 * panel ring, not the ground and text stretch. Compose the high-contrast modifier
 * (`contrast_modifiers`) over the theme to raise contrast deliberately.
 *
 * @module
 */

import { scheme_adaptive_variables } from './scheme_adaptive_variables.ts';
import type { StyleVariable, Theme } from './variable.ts';
import { to_theme_stance, type ResolvedTheme } from './theme.ts';

/**
 * Computes the mirror a single-scheme stance implies: every scheme-adaptive
 * variable in `variables` (those carrying a dark slot), re-slotted with the
 * stanced scheme's value in the `base` slot. A base-slot declaration in
 * `fuz.theme` applies in both color schemes - cascade-layer order beats the
 * higher specificity of the `fuz.base` dark-scheme defaults (`:root.dark` and
 * its `prefers-color-scheme` twin) - and keeping the mirror out of the dark
 * slot means later same-block declarations (the theme's own variables,
 * composed overlays, compiled caps) always win by source order.
 *
 * The mirror depends on the stance alone, not on the theme: the renderer
 * skips an entry whose name the theme or its caps set.
 *
 * @param scheme - the stance to mirror for
 * @param variables - the variable set to mirror, `scheme_adaptive_variables` by default
 * @returns the mirrored variables, to render before the theme's own
 */
export const scheme_stance_variables = (
	scheme: 'light' | 'dark',
	variables: Array<StyleVariable> = scheme_adaptive_variables
): Array<StyleVariable> => {
	const mirrored: Array<StyleVariable> = [];
	for (const v of variables) {
		if (v.dark === undefined) continue; // the same in both schemes already
		const value = scheme === 'dark' ? v.dark : v.base;
		if (value !== undefined) mirrored.push({ name: v.name, base: value });
	}
	return mirrored;
};

/**
 * Resolves a theme for rendering: a single-scheme theme gets its stance
 * mirror beside it, a dual-scheme theme nothing. Safe to call on any theme,
 * and pure - the theme comes back as the same reference, never carrying the
 * derived data, so persisting `resolved.theme` persists only what was
 * authored.
 *
 * @param theme - the theme to resolve
 * @returns the theme with its derived data, for `render_theme_style(r.theme, r)`
 */
export const resolve_theme_stance = (theme: Theme): ResolvedTheme => {
	const stance = to_theme_stance(theme.scheme);
	return stance ? { theme, scheme_mirror: scheme_stance_variables(stance) } : { theme };
};
