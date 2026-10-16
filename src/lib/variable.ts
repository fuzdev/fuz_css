/**
 * The schemas for the theme data shapes: a style variable and the theme that
 * carries a set of them.
 *
 * These live together, and apart from `theme.ts`, so the renderer stays free
 * of the schema library - `theme.ts` imports the types type-only, which keeps
 * mounting a theme at roughly a kilobyte.
 *
 * @module
 */

import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

import { css_comment_is_contained, css_value_is_contained } from './css_containment.ts';

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

const INTERNAL_NAME_ERROR =
	'internal ramp variable - a theme steers the ramps through their knobs and color stops and cannot set one';

const to_name_error = (name: unknown): string =>
	typeof name === 'string' && INTERNAL_VARIABLE_NAME_MATCHER.test(name)
		? INTERNAL_NAME_ERROR
		: 'invalid style variable name';

export const StyleVariableName = s.pipe(
	s.string,
	s.message(
		s.regex(STYLE_VARIABLE_NAME_MATCHER, 'a style variable name'),
		'invalid style variable name'
	)
);
export type StyleVariableName = s.Infer<typeof StyleVariableName>;

// a slot renders verbatim into a declaration, so it has to stay inside it
const StyleVariableValue = s.pipe(
	s.string,
	s.message(s.regex(/\S/u, 'a non-blank value'), 'must not be blank'),
	s.message(
		s.check<string>(css_value_is_contained, 'a contained CSS value'),
		'must be a single contained CSS value'
	)
);

const StyleVariableFields = s.object({
	name: s.pipe(
		s.string,
		s.message(
			s.check((name: string) => STYLE_VARIABLE_NAME_MATCHER.test(name), 'a style variable name'),
			(_issue, name) => to_name_error(name)
		)
	),
	base: s.optional(StyleVariableValue),
	dark: s.optional(StyleVariableValue),
	summary: s.optional(
		s.pipe(
			s.string,
			s.message(
				s.check<string>(css_comment_is_contained, 'a contained CSS comment'),
				'must not close a CSS comment'
			)
		)
	)
});
type StyleVariableFields = s.Infer<typeof StyleVariableFields>;

const slots_differ = (v: StyleVariableFields): boolean =>
	!(v.base !== undefined && v.dark !== undefined && v.base === v.dark);

// the cross-field rules are pipe steps, so they run only once every field
// has passed, and this one is a hand-written check rather than `s.check`
// because the issue belongs on `dark`, the slot an editor points at, and a
// pipe step's issue otherwise lands on the object itself
const StyleVariableSlotsDiffer: s.Schema<
	StyleVariableFields,
	StyleVariableFields,
	'check',
	typeof slots_differ
> = {
	kind: 'check',
	def: slots_differ,
	run: (v, ctx) => {
		if (slots_differ(v)) return v;
		s.fail(ctx, 'check', v.dark, 'a dark value that differs from base');
		if (!ctx.probe) {
			const issue = ctx.issues![ctx.issues!.length - 1]!;
			issue.path = ['dark'];
			issue.message = 'base and dark must differ when both specified';
		}
		return v;
	}
};

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
 * The name is a public one (`StyleVariableName`): an internal ramp variable
 * is rejected with an error saying so. The derived data that does carry
 * internal names - a stance's mirror and `compile_theme`'s caps - travels
 * beside a theme as `ThemeDerived`, never inside it.
 */
export const StyleVariable = s.pipe(
	StyleVariableFields,
	s.message(
		s.check(
			(v: StyleVariableFields) => v.base !== undefined || v.dark !== undefined,
			'base or dark'
		),
		'must have at least one of base or dark'
	),
	StyleVariableSlotsDiffer
);
export type StyleVariable = s.Infer<typeof StyleVariable>;

/**
 * A theme's scheme stance: which color schemes it supports. `'dual'` themes
 * render light and dark appearances from each variable's slots; `'light'` and
 * `'dark'` themes render that single appearance in both color schemes.
 */
export const ThemeScheme = s.message(
	s.one_of(['dual', 'light', 'dark']),
	"expected 'dual', 'light', or 'dark'"
);
export type ThemeScheme = s.Infer<typeof ThemeScheme>;

export const Theme = s.object({
	name: s.pipe(s.string, s.message(s.min_length(1), 'must be non-empty')),
	/**
	 * A sentence or two on what the theme looks like, for a theme picker to
	 * show beside the name. Never rendered into CSS.
	 */
	summary: meta(s.optional(s.string), {
		description: 'what the theme looks like, for theme pickers'
	}),
	variables: s.array(StyleVariable),
	/**
	 * The scheme stance, defaulting to `'dual'`. A single-scheme stance pins
	 * `color-scheme` on the scope so form controls and native scrollbars agree.
	 * A stanced theme's own variables are best authored single-slot in the
	 * `base` position.
	 *
	 * Rendering a stanced theme faithfully also needs the scheme-adaptive
	 * defaults mirrored into the stanced scheme. That mirror is derived data,
	 * not part of the theme: `resolve_theme_stance` in `theme_stance.ts`
	 * computes it beside the theme, and `render_theme_style` takes it as an
	 * option. The renderer alone only pins `color-scheme` - it holds no
	 * variable data of its own, so the mirror stays off the theme path of
	 * consumers who don't use a stanced theme.
	 */
	scheme: meta(s.optional(ThemeScheme), {
		description: 'which color schemes the theme supports, defaulting to dual'
	})
});
export type Theme = s.Infer<typeof Theme>;

/**
 * Parses an unknown value as a `Theme`, returning `null` when it doesn't
 * match. For untrusted input - a theme restored from storage, a theme handed
 * across a boundary - where a malformed value should fall back to a default
 * rather than throw. Use `s.parse(Theme, value)` directly when the failure
 * detail matters, or `validate_theme` in `theme_validate.ts` for the full lint.
 *
 * @param value - the value to parse
 * @returns the theme, or `null` when the value isn't one
 */
export const parse_theme = (value: unknown): Theme | null => {
	const parsed = s.parse(Theme, value);
	return parsed.ok ? parsed.value : null;
};
