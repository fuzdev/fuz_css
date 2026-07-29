/**
 * Built-in CSS class definitions combining token classes and composites.
 *
 * Token classes map to CSS variables (design tokens).
 * For other CSS properties, use CSS-literal syntax like `display:flex` or `position:absolute`.
 *
 * @module
 */

import type { CssClassDefinition } from './css_class_generation.ts';
import {
	generate_classes,
	generate_property_classes,
	generate_directional_classes,
	generate_border_radius_corners,
	generate_shadow_classes,
	format_spacing_value
} from './css_class_generators.ts';
import {
	space_variants,
	distance_variants,
	palette_variants,
	intent_variants,
	intensity_variants,
	shade_variants,
	shade_scale_variants,
	text_scale_variants,
	font_size_variants,
	icon_size_variants,
	line_height_variants,
	border_radius_variants,
	border_width_variants,
	shadow_size_variants,
	shadow_semantic_values,
	shadow_alpha_variants,
	darken_lighten_variants
} from './variable_data.ts';
import { css_class_composites } from './css_class_composites.ts';

// TODO add animation support, either as a separate thing or rename `css_class_definitions` to be more generic, like `css_by_name` - need to collect `animation: foo ...` names like we do classes

// TODO think about variable support (much harder problem, need dependency graph)

/**
 * All built-in CSS class definitions (token classes + composites).
 *
 * @see `generate_classes_css`
 */
export const css_class_definitions: Record<string, CssClassDefinition | undefined> = {
	// Composite classes go first, so they can be overridden by the more specific classes.
	...css_class_composites,

	/*

	typography

	*/
	font_family_sans: { declaration: 'font-family: var(--font_family_sans);' },
	font_family_serif: { declaration: 'font-family: var(--font_family_serif);' },
	font_family_mono: { declaration: 'font-family: var(--font_family_mono);' },

	...generate_property_classes(
		'line-height',
		line_height_variants,
		(v) => `var(--line_height_${v})`
	),
	...generate_property_classes(
		'font-size',
		font_size_variants,
		(v) => `var(--font_size_${v}); --font_size: var(--font_size_${v})`
	),
	...generate_property_classes(
		'font-size',
		icon_size_variants,
		(v) => `var(--icon_size_${v}); --font_size: var(--icon_size_${v})`,
		'icon_size'
	),

	/*

	colors

	*/
	// Text colors (flipped scale: low numbers = subtle, high numbers = bold)
	...generate_property_classes(
		'color',
		text_scale_variants,
		(v) => `var(--text_${v}); --text_color: var(--text_${v})`,
		'text'
	),
	// Shade scale (tinted backgrounds)
	...generate_property_classes(
		'background-color',
		shade_scale_variants,
		(v) => `var(--shade_${v})`,
		'shade'
	),
	// Hue classes
	// TODO nothing in the shipped CSS consumes `--hue` yet (see the
	// `--outline_color` TODO in style.css) - these are a consumer hook for
	// now; wire something to the variable or drop them
	...generate_classes(
		(letter: string) => ({
			name: `hue_${letter}`,
			css: `--hue: var(--hue_${letter});`
		}),
		palette_variants
	),
	// Palette intensity classes (text color); property-first like the other
	// applications of the palette variables (`bg_`, `border_`, `outline_`,
	// `shadow_`) - the letter alone implies the palette
	...generate_classes(
		(letter: string, intensity: string) => ({
			name: `color_${letter}_${intensity}`,
			css: `color: var(--palette_${letter}_${intensity}); --text_color: var(--palette_${letter}_${
				intensity
			});`
		}),
		palette_variants,
		intensity_variants
	),
	// Palette intensity classes (background color)
	...generate_classes(
		(letter: string, intensity: string) => ({
			name: `bg_${letter}_${intensity}`,
			css: `background-color: var(--palette_${letter}_${intensity});`
		}),
		palette_variants,
		intensity_variants
	),
	// Intent intensity classes (text color) - meaning-first twins of the palette classes
	...generate_classes(
		(intent: string, intensity: string) => ({
			name: `${intent}_${intensity}`,
			css: `color: var(--${intent}_${intensity}); --text_color: var(--${intent}_${intensity});`
		}),
		intent_variants,
		intensity_variants
	),
	// Intent intensity classes (background color)
	...generate_classes(
		(intent: string, intensity: string) => ({
			name: `bg_${intent}_${intensity}`,
			css: `background-color: var(--${intent}_${intensity});`
		}),
		intent_variants,
		intensity_variants
	),
	// Darken/lighten overlays (non-adaptive, alpha-based)
	...generate_property_classes(
		'background-color',
		darken_lighten_variants,
		(v) => `var(--darken_${v})`,
		'darken'
	),
	...generate_property_classes(
		'background-color',
		darken_lighten_variants,
		(v) => `var(--lighten_${v})`,
		'lighten'
	),
	// The adaptive alpha overlay variables (`--fg_*` toward foreground,
	// `--bg_*` toward background) have no bare token classes: `bg_` is the
	// opaque background prefix (`bg_a_50`, `bg_positive_50`), and a bare
	// `bg_50` alpha wash beside those was the one collision in the family.
	// Reach the overlays with literals - `background-color:var(--fg_10)`.
	/*

	borders

	*/
	// Border colors using shade scale (opaque, for explicit shade-based borders)
	...generate_property_classes('border-color', shade_variants, (v) => `var(--shade_${v})`),
	// Border color alpha (tinted alpha borders - overrides shade-based for 05-95)
	...generate_property_classes(
		'border-color',
		darken_lighten_variants,
		(v) => `var(--border_color_${v}); --border_color: var(--border_color_${v})`,
		'border_color'
	),
	// Border colors using palette hue + intensity (sets both property and contextual variable);
	// the letter alone implies the palette - the alpha-ramp family is `border_color_NN`
	...generate_classes(
		(letter: string, intensity: string) => ({
			name: `border_${letter}_${intensity}`,
			css: `border-color: var(--palette_${letter}_${intensity}); --border_color: var(--palette_${
				letter
			}_${intensity});`
		}),
		palette_variants,
		intensity_variants
	),
	// Outline colors using shade scale
	...generate_property_classes('outline-color', shade_variants, (v) => `var(--shade_${v})`),
	// Outline colors using palette hue + intensity (sets both property and contextual variable);
	// the letter alone implies the palette - the shade family is `outline_color_NN`
	...generate_classes(
		(letter: string, intensity: string) => ({
			name: `outline_${letter}_${intensity}`,
			css: `outline-color: var(--palette_${letter}_${intensity}); --outline_color: var(--palette_${
				letter
			}_${intensity});`
		}),
		palette_variants,
		intensity_variants
	),

	...generate_property_classes(
		'border-width',
		border_width_variants.map(String),
		(v) => `var(--border_width_${v})`
	),
	...generate_property_classes(
		'outline-width',
		border_width_variants.map(String),
		(v) => `var(--border_width_${v})`
	),
	outline_width_focus: { declaration: 'outline-width: var(--outline_width_focus);' },
	outline_width_active: { declaration: 'outline-width: var(--outline_width_active);' },

	...generate_property_classes(
		'border-radius',
		border_radius_variants,
		(v) => `var(--border_radius_${v})`
	),
	...generate_border_radius_corners(border_radius_variants, (v) => `var(--border_radius_${v})`),

	/*

	shadows

	*/
	...generate_shadow_classes(shadow_size_variants, {
		xs: '30',
		sm: '40',
		md: '50',
		lg: '60',
		xl: '70'
	}),
	...generate_classes(
		(value: string) => ({
			name: `shadow_color_${value}`,
			css: `--shadow_color: var(--shadow_color_${value});`
		}),
		shadow_semantic_values
	),
	...generate_classes(
		(alpha: string) => ({
			name: `shadow_alpha_${alpha}`,
			css: `--shadow_alpha: var(--shadow_alpha_${alpha});`
		}),
		shadow_alpha_variants
	),
	// Shadow colors using palette hue + intensity (sets contextual variable only);
	// the letter alone implies the palette - semantic colors are `shadow_color_umbra` etc.
	...generate_classes(
		(letter: string, intensity: string) => ({
			name: `shadow_${letter}_${intensity}`,
			css: `--shadow_color: var(--palette_${letter}_${intensity});`
		}),
		palette_variants,
		intensity_variants
	),

	/*

	layout

	*/
	...generate_property_classes('width', space_variants, (v) => `var(--space_${v})`),
	...generate_property_classes('height', space_variants, (v) => `var(--space_${v})`),

	...generate_classes(
		(v: string) => ({
			name: `width_atmost_${v}`,
			css: `width: 100%; max-width: var(--distance_${v});`
		}),
		distance_variants
	),
	...generate_classes(
		(v: string) => ({
			name: `width_atleast_${v}`,
			css: `width: 100%; min-width: var(--distance_${v});`
		}),
		distance_variants
	),
	...generate_classes(
		(v: string) => ({
			name: `height_atmost_${v}`,
			css: `height: 100%; max-height: var(--distance_${v});`
		}),
		distance_variants
	),
	...generate_classes(
		(v: string) => ({
			name: `height_atleast_${v}`,
			css: `height: 100%; min-height: var(--distance_${v});`
		}),
		distance_variants
	),

	...generate_property_classes('top', space_variants, format_spacing_value),
	...generate_property_classes('right', space_variants, format_spacing_value),
	...generate_property_classes('bottom', space_variants, format_spacing_value),
	...generate_property_classes('left', space_variants, format_spacing_value),
	...generate_property_classes('inset', space_variants, format_spacing_value),

	...generate_directional_classes('padding', ['0', ...space_variants], format_spacing_value),
	...generate_directional_classes('margin', ['0', 'auto', ...space_variants], format_spacing_value),
	...generate_property_classes('gap', space_variants, format_spacing_value),
	...generate_property_classes('column-gap', space_variants, format_spacing_value),
	...generate_property_classes('row-gap', space_variants, format_spacing_value)
};

/**
 * Merges user class definitions with the built-in defaults.
 * User definitions take precedence over defaults with the same name.
 *
 * @param user_definitions - user-provided class definitions to merge
 * @param include_defaults - whether to include built-in definitions
 * @returns merged class definitions
 * @throws Error if `include_defaults` is false and no user definitions provided
 */
export const merge_class_definitions = (
	user_definitions: Record<string, CssClassDefinition | undefined> | undefined,
	include_defaults: boolean
): Record<string, CssClassDefinition | undefined> => {
	if (!include_defaults && !user_definitions) {
		throw new Error('class_definitions is required when include_default_classes is false');
	}
	return include_defaults
		? user_definitions
			? { ...css_class_definitions, ...user_definitions }
			: css_class_definitions
		: user_definitions!;
};
