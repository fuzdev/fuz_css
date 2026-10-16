/**
 * The compile step for a theme: everything derived from it - the stance
 * mirror and the recomputed chroma caps - with the gates and the lint run
 * over that rendering, in one call.
 *
 * Apart from `theme_check.ts` so the gates and the caps stay importable
 * without the lint (`validate_theme`) and the schemas it parses with, which
 * is how the build-time theme bake runs them.
 *
 * @module
 */

import type { StyleVariable, Theme } from './variable.ts';
import { to_theme_stance, type ResolvedTheme } from './theme.ts';
import { scheme_stance_variables } from './theme_stance.ts';
import { check_theme, compute_theme_caps, type ThemeCheckReport } from './theme_check.ts';
import { validate_theme, type ThemeIssue } from './theme_validate.ts';

/**
 * The output of `compile_theme`: the input theme with everything derived from
 * it - the stance mirror and the recomputed caps - plus the gate report and
 * lint over that rendering. Renders as `render_theme_style(c.theme, c)`.
 */
export interface CompiledTheme extends ResolvedTheme {
	/** The input theme, the same reference - compiling never edits it. */
	theme: Theme;
	/** The stance mirror for a single-scheme theme, `undefined` for a dual one. */
	scheme_mirror: Array<StyleVariable> | undefined;
	/**
	 * The `_palette_chroma_NN` caps recomputed where the baked ones no longer
	 * fit the theme's hues and lightness (`compute_theme_caps`) - empty when
	 * they all still fit.
	 */
	caps: Array<StyleVariable>;
	/** The gates over the theme with its caps, from `check_theme`. */
	report: ThemeCheckReport;
	/** The theme's lint, from `validate_theme`. */
	issues: Array<ThemeIssue>;
}

/**
 * Compiles a theme: computes its stance mirror and its recomputed chroma caps
 * (`compute_theme_caps`), re-checks the gates with the caps, and lints it.
 * The theme comes back as the same reference and never carries the derived
 * data, so compiling the same theme again gives the same result.
 *
 * @param theme - the theme to compile
 * @returns the theme with its mirror, caps, gate report, and lint
 */
export const compile_theme = (theme: Theme): CompiledTheme => {
	const stance = to_theme_stance(theme.scheme);
	const caps = compute_theme_caps(theme);
	return {
		theme,
		scheme_mirror: stance ? scheme_stance_variables(stance) : undefined,
		caps,
		report: check_theme(theme, { caps }),
		issues: validate_theme(theme)
	};
};
