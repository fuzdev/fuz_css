import {default_variables} from './variables.ts';
import type {StyleVariable} from './variable.ts';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
 */
export type ColorScheme = 'dark' | 'light' | 'auto';

export const color_schemes: Array<ColorScheme> = ['light', 'auto', 'dark'];

export interface Theme {
	name: string;
	variables: Array<StyleVariable>;
}

/**
 * The fuz_css cascade layer order: defaults (variables + element styles) in
 * `fuz.base`, theme overrides in `fuz.theme`, generated utility classes in
 * `fuz.utilities`. Layer order beats specificity, so theme overrides win over
 * the statically imported defaults regardless of head insertion order, and
 * consumers' unlayered styles beat everything.
 */
export const FUZ_LAYER_ORDER_STATEMENT = '@layer fuz.base, fuz.theme, fuz.utilities;';

export interface RenderThemeStyleOptions {
	comments?: boolean;
	id?: string | null;
	/**
	 * How to treat a theme whose `variables` are empty. When `true` (the
	 * default) it renders nothing, inheriting the `fuz.base` defaults; when
	 * `false` it renders the full `default_variables` set (how
	 * `theme.gen.css.ts` emits the standalone `theme.css`). A theme that
	 * carries variables always renders them and ignores this option.
	 */
	empty_default_theme?: boolean;
	/**
	 * The cascade layer wrapping the rendered variables. Theme overrides
	 * default to `fuz.theme` so they beat the `fuz.base` defaults by layer
	 * order; pass `null` to render unlayered.
	 */
	layer?: string | null;
}

export const render_theme_style = (theme: Theme, options: RenderThemeStyleOptions = {}): string => {
	const {comments = false, id = null, empty_default_theme = true, layer = 'fuz.theme'} = options;
	// key the default-theme special case on emptiness, not the name, so any theme
	// carrying variables renders them (a theme merely named 'base' still renders)
	const variables = theme.variables.length
		? theme.variables
		: empty_default_theme
			? null
			: default_variables;
	if (!variables?.length) return '';
	const rendered_light = variables.map((v) => render_theme_variable(v)).filter(Boolean);
	const rendered_dark = variables
		.map((v) => render_theme_variable(v, true, comments))
		.filter(Boolean);
	const scope = id ? '#' + id : ':root';
	const blocks = `${
		rendered_light.length
			? `${scope} {
	${rendered_light.join('\n\t')}
}`
			: ''
	}
${
	rendered_dark.length
		? `${scope}.dark {
	${rendered_dark.join('\n\t')}
}`
		: ''
}
`.trim();
	if (layer === null) return blocks;
	return `${FUZ_LAYER_ORDER_STATEMENT}
@layer ${layer} {
${blocks}
}`;
};

export const render_theme_variable = (
	variable: StyleVariable,
	dark = false,
	comments = true,
): string => {
	const v = dark ? variable.dark : variable.light;
	if (!v) return '';
	return (
		'--' +
		variable.name +
		': ' +
		v +
		';' +
		(comments && variable.summary ? ' /* ' + variable.summary + ' */' : '')
	);
};
