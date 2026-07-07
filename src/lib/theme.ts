import {default_variables} from './variables.ts';
import {default_themes} from './themes.ts'; // TODO shoudln't be a dep, see usage below
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
	const variables =
		theme.name === default_themes[0]!.name
			? empty_default_theme
				? null
				: default_variables
			: theme.variables;
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
