/**
 * The compile step for a theme: everything derived from it - the stance
 * mirror and the recomputed chroma caps - with the gates and the lint run
 * over that rendering, in one call. The build-time bake (`bake_theme`)
 * compiles over the configured variable set the same way.
 *
 * Apart from `theme_check.ts` so the gates and the caps stay importable
 * without the lint (`validate_theme`) and the schemas it parses with.
 *
 * @module
 */

import type { StyleVariable, Theme } from './variable.ts';
import type { ColorScheme } from './variable_data.ts';
import { overlay_style_variable, to_theme_stance, type ResolvedTheme } from './theme.ts';
import { compute_scheme_mirror } from './theme_stance.ts';
import { check_theme, compute_theme_caps, type ThemeCheckReport } from './theme_check.ts';
import { validate_theme, type ThemeIssue } from './theme_validate.ts';
import { default_variables } from './variables.ts';
import { theme_knobs } from './knobs.ts';
import { contain_variable } from './css_containment.ts';

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
 * Options for `compile_theme`.
 */
export interface CompileThemeOptions {
	/**
	 * The variable set the theme overlays, when it isn't the defaults - a
	 * build's configured `variables`. The stance mirror re-slots this set
	 * rather than the defaults, and each knob-tier value (`theme_knobs`) it
	 * changes from the default is folded in beneath the theme's own (re-slotted
	 * for a stance as the mirror re-slots it), so the caps and the gates
	 * measure what renders. A folded value the gates can't read lands in
	 * `unchecked`. The theme comes back unfolded. A partial set mirrors only
	 * what it contains, and the gates still measure the default for anything
	 * it leaves out.
	 */
	variables?: Array<StyleVariable>;
}

/**
 * Compiles a theme: computes its stance mirror and its recomputed chroma caps
 * (`compute_theme_caps`), re-checks the gates with the caps, and lints it.
 * The theme comes back as the same reference and never carries the derived
 * data, so compiling the same theme again gives the same result.
 *
 * @param theme - the theme to compile
 * @param options - the variable set the theme overlays, when it isn't the defaults
 * @returns the theme with its mirror, caps, gate report, and lint
 */
export const compile_theme = (theme: Theme, options: CompileThemeOptions = {}): CompiledTheme => {
	const { variables } = options;
	const stance = to_theme_stance(theme.scheme);
	const measured = variables ? fold_configured_knobs(theme, variables, stance) : theme;
	const caps = compute_theme_caps(measured);
	return {
		theme,
		scheme_mirror: stance ? compute_scheme_mirror(stance, variables) : undefined,
		caps,
		report: check_theme(measured, { caps }),
		issues: validate_theme(theme)
	};
};

const knob_names: ReadonlySet<string> = new Set(theme_knobs.map((k) => k.name));
const default_knobs: ReadonlyMap<string, StyleVariable> = new Map(
	default_variables.filter((v) => knob_names.has(v.name)).map((v) => [v.name, v])
);

// the theme the caps and gates measure: the configured set's knob-tier values
// that differ from the defaults, beneath the theme's own (re-slotted for a
// stance as the mirror re-slots them), or the theme itself when none differ
const fold_configured_knobs = (
	theme: Theme,
	variables: Array<StyleVariable>,
	stance: ColorScheme | null
): Theme => {
	const by_name: Map<string, StyleVariable> = new Map();
	for (const v of variables) {
		const fallback = default_knobs.get(v.name);
		if (!fallback || (v.base === fallback.base && v.dark === fallback.dark)) continue;
		const contained = contain_variable(v);
		if (!contained) continue;
		by_name.set(
			v.name,
			(stance ? compute_scheme_mirror(stance, [contained])[0] : undefined) ?? contained
		);
	}
	if (!by_name.size) return theme;
	for (const v of theme.variables)
		by_name.set(v.name, overlay_style_variable(by_name.get(v.name), v));
	return { ...theme, variables: [...by_name.values()] };
};
