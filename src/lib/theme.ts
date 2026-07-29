import { default_variables } from './variables.ts';
import type { StyleVariable } from './variable.ts';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
 */
export type ColorScheme = 'dark' | 'light' | 'auto';

export const color_schemes: Array<ColorScheme> = ['light', 'auto', 'dark'];

/**
 * A theme's scheme stance: which color schemes it supports. `'dual'` themes
 * render light and dark appearances from each variable's slots; `'light'` and
 * `'dark'` themes render that single appearance in both color schemes.
 */
export type ThemeScheme = 'dual' | 'light' | 'dark';

export interface Theme {
	name: string;
	variables: Array<StyleVariable>;
	/**
	 * The scheme stance, defaulting to `'dual'`. A single-scheme stance mirrors
	 * every scheme-adaptive default the theme doesn't override so the stanced
	 * scheme's values apply in both color schemes (see
	 * `scheme_stance_variables`), and pins `color-scheme` on the scope so form
	 * controls and native scrollbars agree. A stanced theme's own variables
	 * are best authored single-slot in the light/base position.
	 */
	scheme?: ThemeScheme;
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

/**
 * Composes a base theme with overlay fragments by flatten + last-wins: later
 * variables replace same-named earlier ones wholesale (both slots). Any
 * knob-only theme is already a valid fragment — the contrast modifiers in
 * `contrast_modifiers` are the canonical overlays. This is the hand-flatten
 * precursor to a first-class `extends`, with the same merge semantics.
 *
 * The base's `scheme` stance wins; when the base is single-scheme, each
 * overlay variable is re-slotted to the stanced scheme's value so a
 * dual-slot fragment can't leak the other scheme's appearance past the
 * stance. The composed name appends the overlay names so name-keyed pickers
 * and renderers treat the composition as its own theme.
 */
export const compose_themes = (base: Theme, ...overlays: Array<Theme>): Theme => {
	if (!overlays.length) return base;
	const stance = base.scheme === 'light' || base.scheme === 'dark' ? base.scheme : null;
	const by_name = new Map<string, StyleVariable>();
	for (const v of base.variables) by_name.set(v.name, v);
	for (const overlay of overlays) {
		for (const v of overlay.variables) {
			if (stance) {
				// single-slot in the base position, like stanced themes author their own
				const value = stance === 'dark' ? (v.dark ?? v.light) : v.light;
				if (value === undefined) continue;
				by_name.set(v.name, { name: v.name, light: value });
			} else {
				by_name.set(v.name, v);
			}
		}
	}
	return {
		name: `${base.name} (${overlays.map((o) => o.name).join(', ')})`,
		...(base.scheme !== undefined && { scheme: base.scheme }),
		variables: [...by_name.values()]
	};
};

/**
 * Computes the mirror a single-scheme stance implies: every scheme-adaptive
 * default (dual-slot entry in `default_variables`) not overridden by
 * `variables`, re-slotted so the stanced scheme's value applies in both color
 * schemes — into the base slot for a `'dark'` stance, into the dark slot for
 * a `'light'` stance (defeating the base dark values by cascade-layer order).
 */
export const scheme_stance_variables = (
	scheme: 'light' | 'dark',
	variables: Array<StyleVariable>
): Array<StyleVariable> => {
	const overridden = new Set(variables.map((v) => v.name));
	const mirrored: Array<StyleVariable> = [];
	for (const v of default_variables) {
		if (v.dark === undefined || overridden.has(v.name)) continue;
		if (scheme === 'dark') {
			mirrored.push({ name: v.name, light: v.dark });
		} else if (v.light !== undefined) {
			mirrored.push({ name: v.name, dark: v.light });
		}
	}
	return mirrored;
};

export const render_theme_style = (theme: Theme, options: RenderThemeStyleOptions = {}): string => {
	const { comments = false, id = null, empty_default_theme = true, layer = 'fuz.theme' } = options;
	const stance = theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : null;
	// key the default-theme special case on emptiness, not the name, so any theme
	// carrying variables renders them (a theme merely named 'base' still renders);
	// a stanced theme always renders its stance mirror, even with no variables
	const own = theme.variables.length
		? theme.variables
		: empty_default_theme
			? null
			: default_variables;
	// mirrored defaults first so the theme's own variables win by order
	const variables = [...(stance ? scheme_stance_variables(stance, own ?? []) : []), ...(own ?? [])];
	if (!variables.length && !stance) return '';
	const rendered_light = variables
		.map((v) => render_theme_variable(v, false, comments))
		.filter(Boolean);
	if (stance) rendered_light.unshift(`color-scheme: ${stance};`);
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
	comments = true
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
