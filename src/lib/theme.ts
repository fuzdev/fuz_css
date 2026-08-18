import type { StyleVariable, Theme } from './variable.ts';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
 */
export type ColorScheme = 'dark' | 'light' | 'auto';

export const color_schemes: Array<ColorScheme> = ['light', 'auto', 'dark'];

/**
 * The fuz_css cascade layer order: defaults (variables + element styles) in
 * `fuz.base`, OS user-preference mappings (`prefers-contrast`,
 * `prefers-reduced-motion`) in `fuz.preferences`, theme overrides in
 * `fuz.theme`, generated utility classes in `fuz.utilities`. Layer order
 * beats specificity and source order, so the preference mappings win over
 * the defaults, theme overrides win over both regardless of head insertion
 * order, and consumers' unlayered styles beat everything.
 */
export const FUZ_LAYER_ORDER_STATEMENT =
	'@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;';

export interface RenderThemeStyleOptions {
	comments?: boolean;
	/**
	 * Scopes the rendered variables to `#id` instead of `:root`. Dark slots
	 * render for both placements of the scheme class - on the scope element
	 * itself (`#id.dark`) and on the root (`:root.dark #id`), the ecosystem
	 * convention - so a scoped theme's dark appearance follows the page's.
	 */
	id?: string | null;
	/**
	 * The cascade layer wrapping the rendered variables. Theme overrides
	 * default to `fuz.theme` so they beat the `fuz.base` defaults by layer
	 * order; pass `null` to render unlayered.
	 */
	layer?: string | null;
}

/**
 * Picks the value a single-scheme stance renders from a dual-slot shape: the
 * stanced scheme's slot, dark falling back to the light/base position. Shared
 * by `compose_themes` and the theme editor so the re-slot semantics can't
 * drift.
 */
export const pick_stance_slot = (
	v: { light?: string; dark?: string } | undefined,
	stance: 'light' | 'dark'
): string | undefined => (stance === 'dark' ? (v?.dark ?? v?.light) : v?.light);

/**
 * Composes a base theme with overlay fragments by flatten + last-wins: later
 * variables replace same-named earlier ones wholesale (both slots). Any
 * knob-only theme is already a valid fragment - the contrast modifiers in
 * `contrast_modifiers` are the canonical overlays. This is the hand-flatten
 * precursor to a first-class `extends`, with the same merge semantics.
 *
 * The base's `scheme` stance wins; when the base is single-scheme, each
 * overlay variable is re-slotted to the stanced scheme's value so a
 * dual-slot fragment can't leak the other scheme's appearance past the
 * stance. The base's `scheme_mirror` carries through minus any names the
 * overlays set - the mirror was computed against the base's own variables,
 * so entries for newly composed names would shadow nothing but still render
 * - and overlay values win over the remaining mirror by source order.
 * The composed name appends the overlay names so name-keyed pickers and
 * renderers treat the composition as its own theme.
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
				const value = pick_stance_slot(v, stance);
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
		// drop mirror entries the overlays now author; the rest renders before
		// `variables`, so overlay values win by order
		...(base.scheme_mirror !== undefined && {
			scheme_mirror: base.scheme_mirror.filter((v) => !by_name.has(v.name))
		}),
		variables: [...by_name.values()]
	};
};

/**
 * Renders a theme's variables as CSS, wrapped in the `fuz.theme` cascade
 * layer by default.
 *
 * Renders exactly what the theme carries - an empty `variables` array renders
 * nothing (inheriting the `fuz.base` defaults) unless a `scheme` stance needs
 * pinning. To render the full default set, pass it: `render_theme_style({name:
 * 'base', variables: default_variables})`. To render a single-scheme theme
 * faithfully, resolve it through `resolve_theme_stance` first.
 *
 * @param theme - the theme to render
 * @param options - see `RenderThemeStyleOptions`
 * @returns the theme CSS, or an empty string when there's nothing to render
 */
export const render_theme_style = (theme: Theme, options: RenderThemeStyleOptions = {}): string => {
	const { comments = false, id = null, layer = 'fuz.theme' } = options;
	const stance = theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : null;
	// mirrored defaults first so the theme's own variables win by order
	const variables = theme.scheme_mirror?.length
		? [...theme.scheme_mirror, ...theme.variables]
		: theme.variables;
	if (!variables.length && !stance) return '';
	const rendered_light = variables
		.map((v) => render_theme_variable(v, false, comments))
		.filter(Boolean);
	if (stance) rendered_light.unshift(`color-scheme: ${stance};`);
	const rendered_dark = variables
		.map((v) => render_theme_variable(v, true, comments))
		.filter(Boolean);
	const scope = id ? '#' + id : ':root';
	// the scheme class conventionally lives on the root element, so a scoped
	// theme's dark block matches both that and a class on the scope itself
	const dark_scope = id ? `${scope}.dark, :root.dark ${scope}` : ':root.dark';
	const blocks = `${
		rendered_light.length
			? `${scope} {
	${rendered_light.join('\n\t')}
}`
			: ''
	}
${
	rendered_dark.length
		? `${dark_scope} {
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

// one variable's declaration for a scheme slot, or '' when the slot is empty
const render_theme_variable = (
	variable: StyleVariable,
	dark: boolean,
	comments: boolean
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
