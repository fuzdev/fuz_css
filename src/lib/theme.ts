import type { StyleVariable, Theme } from './variable.ts';
import {
	css_comment_is_contained,
	css_custom_property_name_is_contained,
	css_value_is_contained,
	escape_css_identifier
} from './css_containment.ts';

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
 *
 * Two deliberate exceptions, both `!important` declarations in a layer, which
 * outrank every later layer and unlayered styles: the `prefers-reduced-motion`
 * mapping (a theme's durations must not re-enable motion the user turned off)
 * and `[hidden]`.
 */
export const FUZ_LAYER_ORDER_STATEMENT =
	'@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;';

/**
 * The root selectors that put a page in each color scheme: `explicit` names
 * the scheme with a class on the root element (fuz_ui's theme state sets one),
 * and `preferred` holds while the root names neither scheme, so the page
 * follows the OS preference without JS.
 */
export const COLOR_SCHEME_ROOTS = {
	dark: { explicit: ':root.dark', preferred: ':root:not(.light)' },
	light: { explicit: ':root.light', preferred: ':root:not(.dark)' }
} as const;

/**
 * Renders a color scheme's rules twice: once under the scheme's root class,
 * and once inside `@media (prefers-color-scheme: …)` for a root that names
 * no scheme. Both renderings carry the same declarations, so which one
 * applies changes nothing.
 *
 * @param scheme - the color scheme the rules belong to
 * @param to_rules - renders the rules given which root selector applies
 * @param media - an outer media condition to combine with the preference
 *   (`(width >= 48rem)`), or null
 * @returns the CSS, with `media` (when given) wrapping both renderings
 */
export const render_color_scheme_rules = (
	scheme: 'light' | 'dark',
	to_rules: (root: string) => string,
	media: string | null = null
): string => {
	const roots = COLOR_SCHEME_ROOTS[scheme];
	const explicit = to_rules(roots.explicit);
	const preferred = indent_css(to_rules(roots.preferred));
	const preference = `(prefers-color-scheme: ${scheme})`;
	return media
		? `@media ${media} {\n${indent_css(explicit)}\n}\n@media ${media} and ${preference} {\n${preferred}\n}`
		: `${explicit}\n@media ${preference} {\n${preferred}\n}`;
};

const indent_css = (css: string): string => css.replace(/^(?=.)/gm, '\t');

/**
 * The sublayer a build-time theme's own overlay renders into. A layer's
 * direct styles outrank its sublayers, so a runtime theme rendered into
 * `fuz.theme` wins over the baked one whatever their selectors' specificity,
 * while the baked overlay still sits above `fuz.preferences`.
 */
export const FUZ_BAKED_THEME_LAYER = 'fuz.theme.baked';

/**
 * Data derived from a theme rather than authored in it: what a theme's stance
 * and hues imply, computed by `resolve_theme_stance` and `compile_theme`
 * (`theme_compile.ts`) and handed to `render_theme_style` beside the theme.
 * Never part of a `Theme`, so a persisted or shared theme can't carry stale
 * derived values - it's recomputed from the theme wherever the theme renders,
 * and never validated.
 */
export interface ThemeDerived {
	/**
	 * The stance mirror: the scheme-adaptive variables re-slotted (the
	 * defaults' twin at runtime, the configured set at build time) into the
	 * `base` position with the stanced scheme's value, so a single-scheme
	 * theme's one appearance holds in both color schemes. Rendered first and
	 * only under a stance, skipping any name the theme's variables or the
	 * `caps` set.
	 */
	scheme_mirror?: Array<StyleVariable>;
	/**
	 * Recomputed worst-hue chroma caps from `compile_theme` (or
	 * `compute_theme_caps` alone), as `_palette_chroma_NN` overrides.
	 * Rendered last, so they win over the mirror's re-slotted defaults.
	 */
	caps?: Array<StyleVariable>;
}

/**
 * A theme with its derived data beside it, ready to render:
 * `render_theme_style(resolved.theme, resolved)`. The theme is wrapped rather
 * than extended, so serializing `theme` can't leak the derived data into
 * what's persisted.
 */
export interface ResolvedTheme extends ThemeDerived {
	theme: Theme;
}

export interface RenderStyleVariablesOptions {
	comments?: boolean;
	/**
	 * Scopes the rendered variables to `#id` instead of `:root`. Dark slots
	 * render for both placements of the scheme class - on the scope element
	 * itself (`#id.dark`) and on the root (`:root.dark #id`), the ecosystem
	 * convention - so a scoped theme's dark appearance follows the page's.
	 * A `.light` on the scope element wins over either: the scope takes the
	 * theme's base slots under `:root.dark` and on a dark OS alike. With no
	 * scheme class on the root or the scope, the dark slots follow the OS
	 * preference.
	 *
	 * Only literal-valued variables take effect in a scope: the derived color
	 * stops (`--palette_a_50`, `--shade_50`, ...) resolve their `calc()` on
	 * `:root`, and a descendant inherits the computed color, so a curve knob
	 * like `--chroma_scale` set at `#id` changes nothing. Knob-only themes
	 * need `:root`.
	 *
	 * Any string works: it's escaped into the selector, so it matches the
	 * element whose `id` attribute is that string and can't end the rule or
	 * the `<style>` element. An empty string renders to `:root`.
	 */
	id?: string | null;
	/**
	 * The cascade layer wrapping the rendered variables. Theme overrides
	 * default to `fuz.theme` so they beat the `fuz.base` defaults by layer
	 * order; pass `null` to render unlayered. A value that isn't a dotted
	 * layer name (`fuz.theme.baked`) falls back to the default.
	 */
	layer?: string | null;
}

/**
 * The options of `render_theme_style`: the rendering options plus the
 * theme's derived data, so a `ResolvedTheme` passes as is.
 */
export interface RenderThemeStyleOptions extends RenderStyleVariablesOptions, ThemeDerived {}

/**
 * Reads the single-scheme stance a theme's `scheme` names, or `null` for a
 * dual-scheme theme. Total over any value, so it reads unvalidated data too.
 *
 * @param scheme - a theme's `scheme`
 */
export const to_theme_stance = (scheme: unknown): 'light' | 'dark' | null =>
	scheme === 'light' || scheme === 'dark' ? scheme : null;

/**
 * Picks the value a single-scheme stance renders from a dual-slot shape: the
 * stanced scheme's slot, dark falling back to the `base` position. Shared
 * by `compose_themes` and the theme editor so the re-slot semantics can't
 * drift.
 */
export const pick_stance_slot = (
	v: { base?: string; dark?: string } | undefined,
	stance: 'light' | 'dark'
): string | undefined => (stance === 'dark' ? (v?.dark ?? v?.base) : v?.base);

/**
 * Overlays one variable onto the same-named variable beneath it, the merge
 * every theme composition shares: the overlay replaces wholesale, except that
 * a dark-only overlay keeps the base slot beneath it. A dark slot only
 * shadows in the dark scheme, so dropping the base slot would leave the
 * variable without its light-scheme value.
 *
 * @param existing - the variable being overlaid, if any
 * @param overlay - the variable that wins
 */
export const overlay_style_variable = (
	existing: StyleVariable | undefined,
	overlay: StyleVariable
): StyleVariable =>
	overlay.base === undefined && overlay.dark !== undefined && existing?.base !== undefined
		? { ...overlay, base: existing.base }
		: overlay;

/**
 * Composes a base theme with overlay fragments by flatten + last-wins: later
 * variables replace same-named earlier ones wholesale, a dark-only overlay
 * keeping the base slot beneath it (see `overlay_style_variable`). Any
 * knob-only theme is already a valid fragment - the contrast modifiers in
 * `contrast_modifiers` are the canonical overlays. This is the hand-flatten
 * precursor to a first-class `extends`, with the same merge semantics.
 *
 * The base's `scheme` stance wins; when the base is single-scheme, each
 * overlay variable is re-slotted to the stanced scheme's value so a
 * dual-slot fragment can't leak the other scheme's appearance past the
 * stance. The result is a plain theme like its inputs - resolve it to render
 * a stance faithfully. The composed name appends the overlay names so
 * name-keyed pickers and renderers treat the composition as its own theme,
 * and the base's `summary` carries through.
 */
export const compose_themes = (base: Theme, ...overlays: Array<Theme>): Theme => {
	if (!overlays.length) return base;
	const stance = to_theme_stance(base.scheme);
	const by_name = new Map<string, StyleVariable>();
	for (const v of base.variables) by_name.set(v.name, v);
	for (const overlay of overlays) {
		for (const v of overlay.variables) {
			if (stance) {
				// single-slot in the base position, like stanced themes author their own
				const value = pick_stance_slot(v, stance);
				if (value === undefined) continue;
				by_name.set(v.name, {
					name: v.name,
					base: value,
					...(v.summary !== undefined && { summary: v.summary })
				});
			} else {
				by_name.set(v.name, overlay_style_variable(by_name.get(v.name), v));
			}
		}
	}
	return {
		name: `${base.name} (${overlays.map((o) => o.name).join(', ')})`,
		...(base.summary !== undefined && { summary: base.summary }),
		...(base.scheme !== undefined && { scheme: base.scheme }),
		variables: [...by_name.values()]
	};
};

/**
 * Renders a theme's variables as CSS, wrapped in the `fuz.theme` cascade
 * layer by default.
 *
 * Renders exactly what the theme carries plus the derived data in `options`:
 * the stance mirror (under a stance only, minus any name the theme or the
 * caps set), then the theme's variables, then the caps. An empty theme
 * renders nothing (inheriting the `fuz.base` defaults) unless a `scheme`
 * stance needs pinning. To render a single-scheme theme faithfully, resolve
 * it first and pass the result as the options:
 * `render_theme_style(resolved.theme, resolved)`.
 *
 * A theme can't set the internal ramp variables, so a `_`-prefixed name in
 * `theme.variables` is dropped - the schema rejects one, and this holds the
 * same line for a theme that skipped it. The derived `scheme_mirror` and
 * `caps` carry internal names by design and render them. To render a
 * variable set that isn't a theme, like the full defaults, use
 * `render_style_variables`.
 *
 * Total over any JSON value in either argument, because a theme restored
 * from storage reaches this without passing the schema: whatever isn't the
 * type declared is dropped instead of thrown on or coerced into the
 * stylesheet. A `variables`, `scheme_mirror`, or `caps` that isn't an array
 * renders as empty, an entry that isn't an object is skipped, a name or slot
 * that isn't a contained string drops its declaration, and a summary that
 * isn't one drops its comment (see `css_containment.ts`).
 *
 * @param theme - the theme to render
 * @param options - see `RenderThemeStyleOptions`
 * @returns the theme CSS, or an empty string when there's nothing to render
 */
export const render_theme_style = (theme: Theme, options: RenderThemeStyleOptions = {}): string => {
	// read as unchecked data: only null and undefined throw on a property read
	const { scheme, variables } = (theme ?? {}) as Unchecked<Theme>;
	const { scheme_mirror, caps } = (options ?? {}) as Unchecked<RenderThemeStyleOptions>;
	const stance = to_theme_stance(scheme);
	// a theme can't set an intermediate; the derived data carries them by design
	const own = to_array(variables).filter((v) => !to_entry_name(v)?.startsWith('_'));
	const derived_caps = to_array(caps);
	// the mirror belongs to the stance, so a dual theme renders without it, and
	// it yields every name the theme or the caps set
	const shadowed = new Set([...own, ...derived_caps].map(to_entry_name));
	const mirror = stance
		? to_array(scheme_mirror).filter((v) => !shadowed.has(to_entry_name(v)))
		: [];
	return render_variables([...mirror, ...own, ...derived_caps], stance, options);
};

/**
 * Renders a variable set as CSS the way `render_theme_style` renders a
 * theme's, for a set that isn't a theme: the internal ramp variables render
 * too, and nothing is mirrored or pinned. This is how `theme.css` renders the
 * full defaults, and how a project that baked a theme in at build time can
 * restore the defaults at runtime: `render_style_variables(default_variables)`.
 * Total over any JSON value, like `render_theme_style`.
 *
 * @param variables - the variables to render, in order
 * @param options - see `RenderStyleVariablesOptions`
 * @returns the CSS, or an empty string when there's nothing to render
 */
export const render_style_variables = (
	variables: Array<StyleVariable>,
	options: RenderStyleVariablesOptions = {}
): string => render_variables(to_array(variables), null, options);

// a dotted layer name, as `@layer` takes one
const LAYER_NAME_MATCHER = /^[a-z_][a-z0-9_-]*(?:\.[a-z_][a-z0-9_-]*)*$/iu;

const render_variables = (
	variables: Array<unknown>,
	stance: 'light' | 'dark' | null,
	options: unknown
): string => {
	const {
		comments,
		id,
		layer: layer_option
	} = (options ?? {}) as Unchecked<RenderStyleVariablesOptions>;
	const with_comments = comments === true;
	const layer =
		layer_option === null
			? null
			: typeof layer_option === 'string' && LAYER_NAME_MATCHER.test(layer_option)
				? layer_option
				: 'fuz.theme';
	const rendered_base = variables
		.map((v) => render_theme_variable(v, false, with_comments))
		.filter(Boolean);
	if (stance) rendered_base.unshift(`color-scheme: ${stance};`);
	const rendered_dark = variables
		.map((v) => render_theme_variable(v, true, with_comments))
		.filter(Boolean);
	// nothing declared - no variables, or every one of them empty or dropped
	if (!rendered_base.length && !rendered_dark.length) return '';
	const scope = typeof id === 'string' && id ? '#' + escape_css_identifier(id) : ':root';
	const dark_declarations = rendered_dark.join('\n\t');
	const blocks = [
		rendered_base.length ? `${scope} {\n\t${rendered_base.join('\n\t')}\n}` : '',
		rendered_dark.length
			? render_color_scheme_rules(
					'dark',
					(root) => `${to_dark_scope(scope, root)} {\n\t${dark_declarations}\n}`
				)
			: ''
	]
		.filter(Boolean)
		.join('\n');
	if (layer === null) return blocks;
	return `${FUZ_LAYER_ORDER_STATEMENT}
@layer ${layer} {
${blocks}
}`;
};

// the selector for a theme scope's dark slots under a root selector - the
// scheme class conventionally lives on the root element, so a scoped theme's
// dark block matches both that and the class on the scope itself, and a
// `.light` on the scope keeps it light under either root
const to_dark_scope = (scope: string, root: string): string => {
	if (scope === ':root') return root;
	return root === COLOR_SCHEME_ROOTS.dark.explicit
		? `${scope}.dark, ${root} ${scope}:not(.light)`
		: `${root} ${scope}:not(.light)`;
};

// a type's properties before anything has checked them
type Unchecked<T> = { [K in keyof T]?: unknown };

const to_array = (value: unknown): Array<unknown> => (Array.isArray(value) ? value : []);

// an entry's name when it's a string, read as unchecked data
const to_entry_name = (entry: unknown): string | undefined => {
	const name =
		typeof entry === 'object' && entry !== null
			? (entry as Unchecked<StyleVariable>).name
			: undefined;
	return typeof name === 'string' ? name : undefined;
};

// one variable's declaration for a scheme slot, or '' when the slot is blank
// or can't be rendered without escaping its declaration - a theme may be
// untrusted data that skipped the schema, and this is where it becomes CSS
const render_theme_variable = (variable: unknown, dark: boolean, comments: boolean): string => {
	const { name, base, dark: dark_slot, summary } = (variable ?? {}) as Unchecked<StyleVariable>;
	const value = dark ? dark_slot : base;
	// the containment checks pass strings only, which is what makes the
	// concatenation below safe
	if (
		!css_value_is_contained(value) ||
		!(value as string).trim() ||
		!css_custom_property_name_is_contained(name)
	) {
		return '';
	}
	return (
		'--' +
		(name as string) +
		': ' +
		(value as string) +
		';' +
		(comments && summary && css_comment_is_contained(summary)
			? ' /* ' + (summary as string) + ' */'
			: '')
	);
};
