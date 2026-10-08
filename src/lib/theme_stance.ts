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
import { to_theme_stance } from './theme.ts';

/**
 * Computes the mirror a single-scheme stance implies: every scheme-adaptive
 * default not overridden by `variables`, re-slotted with the stanced scheme's
 * value in the base (light) slot. A base-slot declaration in `fuz.theme`
 * applies in both color schemes - cascade-layer order beats the higher
 * specificity of the `fuz.base` `:root.dark` defaults - and keeping the
 * mirror out of the dark slot means later same-block declarations (the
 * theme's own variables, composed overlays, compiled cap overrides) always
 * win by source order.
 *
 * @param scheme - the stance to mirror for
 * @param variables - the theme's own variables, whose names are left alone
 * @returns the mirrored variables, to render before the theme's own
 */
export const scheme_stance_variables = (
	scheme: 'light' | 'dark',
	variables: Array<StyleVariable>
): Array<StyleVariable> => {
	const overridden = new Set(variables.map((v) => v.name));
	const mirrored: Array<StyleVariable> = [];
	for (const v of scheme_adaptive_variables) {
		if (overridden.has(v.name)) continue;
		const value = scheme === 'dark' ? v.dark : v.light;
		if (value !== undefined) mirrored.push({ name: v.name, light: value });
	}
	return mirrored;
};

/**
 * Resolves a single-scheme theme by computing its stance mirror into
 * `scheme_mirror`, so `render_theme_style` needs no knowledge of the defaults.
 * A dual-scheme theme, or one already carrying the mirror its variables
 * imply, is returned unchanged - so it's safe to call on any theme, resolved
 * or not. A carried mirror that no longer matches (the theme's variables
 * changed after it was resolved, or the defaults did) is recomputed.
 *
 * The mirror lands in its own field rather than merged into `variables` so the
 * authored knobs stay distinguishable from the derived ones - `compile_theme`
 * reads `variables` to detect author pins, and theme editors show it as the
 * theme's own surface.
 *
 * The shipped stanced themes apply this at their own module scope, so a
 * hand-rolled stanced theme is the only kind that needs the call.
 *
 * @param theme - the theme to resolve
 * @returns the theme carrying its stance mirror
 */
export const resolve_theme_stance = (theme: Theme): Theme => {
	const stance = to_theme_stance(theme.scheme);
	if (!stance) return theme;
	const scheme_mirror = scheme_stance_variables(stance, theme.variables);
	if (theme.scheme_mirror && scheme_mirrors_equal(theme.scheme_mirror, scheme_mirror)) {
		return theme;
	}
	return { ...theme, scheme_mirror };
};

/**
 * Whether two stance mirrors are the same, entry for entry. A mirror holds
 * only light slots in `scheme_adaptive_variables` order, so a carried mirror
 * that differs from a freshly computed one is stale (the defaults moved) or
 * edited - either way the renderer would emit it as is.
 *
 * @param a - one mirror
 * @param b - the other
 * @returns whether they match
 */
export const scheme_mirrors_equal = (a: Array<StyleVariable>, b: Array<StyleVariable>): boolean =>
	a.length === b.length &&
	a.every((v, i) => v.name === b[i]!.name && v.light === b[i]!.light && v.dark === b[i]!.dark);
