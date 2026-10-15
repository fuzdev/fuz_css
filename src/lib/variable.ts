/**
 * The schemas for the theme data shapes: a style variable and the theme that
 * carries a set of them.
 *
 * These live together, and apart from `theme.ts`, so the renderer stays free
 * of zod - `theme.ts` imports the types type-only, which keeps mounting a
 * theme at roughly a kilobyte.
 *
 * @module
 */

import { z } from 'zod';

import { css_comment_is_contained, css_value_is_contained } from './css_containment.ts';
// TODO this import goes with the compiled-cap carve-out in `StyleVariable` - it
// pulls `ramps.ts` (and the module-init leftovers of `variable_data.ts`) into
// `parse_theme`, about 1KB, so drop it when caps leave `Theme`
import { CHROMA_STOP_CSS_MATCHER } from './ramps.ts';

/** Matches a public style variable name, the names a theme may set. */
export const STYLE_VARIABLE_NAME_MATCHER = /^[a-z][a-z0-9_]*(?<!_)$/;

/**
 * Matches an internal variable name: a leading underscore before a public
 * name, the private spelling of the ramp intermediates
 * (`_palette_lightness_30`, `_chroma_shape_50`, `_palette_chroma_50`).
 * `default_variables` declares them and the renderer emits them, but they're
 * plumbing rather than API, so `STYLE_VARIABLE_NAME_MATCHER` rejects the
 * spelling and a theme can't set one.
 */
export const INTERNAL_VARIABLE_NAME_MATCHER = /^_[a-z][a-z0-9_]*(?<!_)$/;

// the one internal variable a theme can carry, and only in the capped form
// (see `StyleVariable`)
const PALETTE_CHROMA_NAME_MATCHER = /^_palette_chroma_(\d+)$/;

const INTERNAL_NAME_ERROR =
	'internal ramp variable - a theme steers the ramps through their knobs and color stops and cannot set one';

const to_name_error = (name: unknown): string =>
	typeof name === 'string' && INTERNAL_VARIABLE_NAME_MATCHER.test(name)
		? INTERNAL_NAME_ERROR
		: 'invalid style variable name';

// a slot is either absent or the capped form for the variable's own stop
const is_capped_chroma_slot = (stop: string, slot: string | undefined): boolean =>
	slot === undefined || CHROMA_STOP_CSS_MATCHER.exec(slot)?.[1] === stop;

export const StyleVariableName = z
	.string()
	.regex(STYLE_VARIABLE_NAME_MATCHER, 'invalid style variable name');
export type StyleVariableName = z.infer<typeof StyleVariableName>;

// a slot renders verbatim into a declaration, so it has to stay inside it
const StyleVariableValue = z
	.string()
	.regex(/\S/u, 'must not be blank')
	.refine(css_value_is_contained, 'must be a single contained CSS value');

/**
 * A style variable: a custom property name with a value per color scheme.
 *
 * The slots follow the renderer's cascade: `base` is the base position,
 * rendered on `:root`, and `dark` renders on `:root.dark` (and for a root
 * naming no scheme, under `prefers-color-scheme: dark`). A theme variable
 * with only `base` therefore applies in both color schemes (its `fuz.theme`
 * `:root` beats the `fuz.base` dark default by layer order), while `dark`
 * alone applies in dark only - which is why the shipped themes author a
 * scheme-agnostic knob as a single `base` value. The light scheme renders
 * `base`; there is no light-only slot.
 *
 * Strict: a misspelled slot is an error, not a silently dropped scheme. A
 * slot must also be a contained CSS value (see `css_containment.ts`), since it
 * renders verbatim.
 *
 * The name is a public one (`StyleVariableName`), with one exception: the
 * internal `_palette_chroma_NN` stops are admitted when every slot is the
 * capped form `render_chroma_stop_css` emits for that stop. That's the shape
 * `compile_theme` writes its recomputed gamut caps in, and the shape a
 * stanced theme's `scheme_mirror` re-slots the defaults' caps in; any other
 * internal variable, or another value for this one, is rejected.
 */
export const StyleVariable = z
	.strictObject({
		name: z
			.string()
			.refine(
				(name) => STYLE_VARIABLE_NAME_MATCHER.test(name) || PALETTE_CHROMA_NAME_MATCHER.test(name),
				{ error: (issue) => to_name_error(issue.input) }
			),
		base: StyleVariableValue.optional(),
		dark: StyleVariableValue.optional(),
		summary: z.string().refine(css_comment_is_contained, 'must not close a CSS comment').optional()
	})
	.refine(
		(v) => {
			const stop = PALETTE_CHROMA_NAME_MATCHER.exec(v.name)?.[1];
			return (
				stop === undefined ||
				(is_capped_chroma_slot(stop, v.base) && is_capped_chroma_slot(stop, v.dark))
			);
		},
		{ message: INTERNAL_NAME_ERROR, path: ['name'] }
	)
	.refine((v) => v.base !== undefined || v.dark !== undefined, {
		message: 'must have at least one of base or dark'
	})
	.refine((v) => !(v.base !== undefined && v.dark !== undefined && v.base === v.dark), {
		message: 'base and dark must differ when both specified',
		path: ['dark']
	});
export type StyleVariable = z.infer<typeof StyleVariable>;

/**
 * A theme's scheme stance: which color schemes it supports. `'dual'` themes
 * render light and dark appearances from each variable's slots; `'light'` and
 * `'dark'` themes render that single appearance in both color schemes.
 */
export const ThemeScheme = z.enum(['dual', 'light', 'dark'], {
	error: "expected 'dual', 'light', or 'dark'"
});
export type ThemeScheme = z.infer<typeof ThemeScheme>;

export const Theme = z.strictObject({
	name: z.string().min(1, 'must be non-empty'),
	/**
	 * A sentence or two on what the theme looks like, for a theme picker to
	 * show beside the name. Never rendered into CSS.
	 */
	summary: z
		.string()
		.optional()
		.meta({ description: 'what the theme looks like, for theme pickers' }),
	variables: z.array(StyleVariable),
	/**
	 * The scheme stance, defaulting to `'dual'`. A single-scheme stance pins
	 * `color-scheme` on the scope so form controls and native scrollbars agree.
	 * A stanced theme's own variables are best authored single-slot in the
	 * `base` position.
	 *
	 * Rendering a stanced theme faithfully also needs the scheme-adaptive
	 * defaults mirrored into the stanced scheme; that is
	 * `resolve_theme_stance` in `theme_stance.ts`, applied before rendering.
	 * The renderer only pins `color-scheme` - it holds no variable data of its
	 * own, so the mirror stays off the theme path of consumers who don't use a
	 * stanced theme.
	 */
	scheme: ThemeScheme.optional().meta({
		description: 'which color schemes the theme supports, defaulting to dual'
	}),
	/**
	 * The stance mirror computed by `resolve_theme_stance`: scheme-adaptive
	 * defaults re-slotted so a single-scheme theme's appearance holds in both
	 * color schemes. Rendered before `variables`, so the theme's own values
	 * win by order.
	 *
	 * Kept apart from `variables` so the authored knobs stay distinguishable
	 * from the derived ones.
	 */
	scheme_mirror: z
		.array(StyleVariable)
		.optional()
		.meta({ description: 'the derived stance mirror, from `resolve_theme_stance`' })
});
export type Theme = z.infer<typeof Theme>;

/**
 * Parses an unknown value as a `Theme`, returning `null` when it doesn't
 * match. For untrusted input - a theme restored from storage, a theme handed
 * across a boundary - where a malformed value should fall back to a default
 * rather than throw. Use `Theme.safeParse` directly when the failure detail
 * matters, or `validate_theme` in `theme_validate.ts` for the full lint.
 *
 * @param value - the value to parse
 * @returns the theme, or `null` when the value isn't one
 */
export const parse_theme = (value: unknown): Theme | null => {
	const parsed = Theme.safeParse(value);
	return parsed.success ? parsed.data : null;
};
