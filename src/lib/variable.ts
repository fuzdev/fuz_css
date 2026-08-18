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

export const STYLE_VARIABLE_NAME_MATCHER = /^[a-z][a-z0-9_]*(?<!_)$/;

export const StyleVariableName = z
	.string()
	.regex(STYLE_VARIABLE_NAME_MATCHER, 'invalid style variable name');
export type StyleVariableName = z.infer<typeof StyleVariableName>;

/**
 * Zod schema for validating `StyleVariable` objects.
 * Use `safeParse` for validation; the `StyleVariable` type is defined separately
 * to preserve the `Flavored` brand on `name`.
 */
export const StyleVariable = z
	.object({
		name: StyleVariableName,
		light: z.string().optional(),
		dark: z.string().optional(),
		summary: z.string().optional()
	})
	.refine((v) => v.light !== undefined || v.dark !== undefined, {
		message: 'must have at least one of light or dark'
	})
	.refine((v) => !(v.light !== undefined && v.dark !== undefined && v.light === v.dark), {
		message: 'light and dark must differ when both specified',
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
	variables: z.array(StyleVariable),
	/**
	 * The scheme stance, defaulting to `'dual'`. A single-scheme stance pins
	 * `color-scheme` on the scope so form controls and native scrollbars agree.
	 * A stanced theme's own variables are best authored single-slot in the
	 * light/base position.
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
 * matters, or `validate_theme` in `theme_check.ts` for the full lint.
 *
 * @param value - the value to parse
 * @returns the theme, or `null` when the value isn't one
 */
export const parse_theme = (value: unknown): Theme | null => {
	const parsed = Theme.safeParse(value);
	return parsed.success ? parsed.data : null;
};
