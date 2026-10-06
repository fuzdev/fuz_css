/**
 * The shape of a declared shadow variable: a geometry token, then a shadow
 * color mixed down to a step of the alpha ramp. Kept in a leaf module with
 * type-only imports so a theme module can author shadows without pulling the
 * variable data into a runtime chunk.
 *
 * @module
 */

import type {
	NumericScaleVariant,
	ShadowSemanticValue,
	ShadowSizeVariant,
	shadow_variant_prefixes
} from './variable_data.ts';

/**
 * Where a shadow falls: `shadow` centered on the element, `shadow_top` and
 * `shadow_bottom` cast to one side, and the `inset` twins drawn inside it.
 * Derived from `shadow_variant_prefixes`, the vocabulary the geometry tokens
 * are emitted from.
 */
export type ShadowShape = (typeof shadow_variant_prefixes)[number] extends infer TPrefix
	? TPrefix extends `${infer TShape}_`
		? TShape
		: never
	: never;

/**
 * Renders one `box-shadow` layer from the shadow tokens, for a declared
 * shadow variable like `--button_shadow` or `--panel_shadow`. Join several
 * with `, ` to stack them.
 *
 * The color is named outright, not read through the contextual
 * `--shadow_color` the `.shadow_*` classes set: a custom property's `var()`s
 * substitute against the element that declares it, and theme variables are
 * declared on `:root`, so that indirection would only ever see its fallback.
 *
 * @param shape - where the shadow falls
 * @param size - the geometry step
 * @param color - the semantic shadow color, as in `--shadow_color_umbra`
 * @param alpha - the step of the shadow alpha ramp, scaled by `--shadow_alpha_scale`
 * @returns the layer as a CSS value
 */
export const render_shadow_css = (
	shape: ShadowShape,
	size: ShadowSizeVariant,
	color: ShadowSemanticValue,
	alpha: NumericScaleVariant
): string =>
	`var(--${shape}_${size}) color-mix(in oklab, var(--shadow_color_${color}) var(--shadow_alpha_${alpha}), transparent)`;
