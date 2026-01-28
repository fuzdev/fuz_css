/**
 * Built-in CSS class definitions combining token classes and composites.
 *
 * Token classes map to CSS variables (design tokens).
 * For other CSS properties, use CSS-literal syntax like `display:flex` or `position:absolute`.
 *
 * @module
 */

import type {CssClassDefinition} from './css_class_generation.js';
import {
	generate_classes,
	generate_property_classes,
	generate_directional_classes,
	generate_border_radius_corners,
	generate_shadow_classes,
	format_spacing_value,
} from './css_class_generators.js';
import {
	space_variants,
	distance_variants,
	color_variants,
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
	darken_lighten_variants,
	color_scheme_variants,
} from './variable_data.js';
import {css_class_composites} from './css_class_composites.js';

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
	font_family_sans: {declaration: 'font-family: var(--font_family_sans);'},
	font_family_serif: {declaration: 'font-family: var(--font_family_serif);'},
	font_family_mono: {declaration: 'font-family: var(--font_family_mono);'},

	...generate_property_classes(
		'line-height',
		line_height_variants,
		(v) => `var(--line_height_${v})`,
	),
	...generate_property_classes(
		'font-size',
		font_size_variants,
		(v) => `var(--font_size_${v}); --font_size: var(--font_size_${v})`,
	),
	...generate_property_classes(
		'font-size',
		icon_size_variants,
		(v) => `var(--icon_size_${v}); --font_size: var(--icon_size_${v})`,
		'icon_size',
	),

	/*

	colors

	*/
	// Text colors (flipped scale: low numbers = subtle, high numbers = bold)
	...generate_property_classes('color', text_scale_variants, (v) => `var(--text_${v}); --text_color: var(--text_${v})`, 'text'),
	// Shade scale (tinted backgrounds)
	...generate_property_classes(
		'background-color',
		shade_scale_variants,
		(v) => `var(--shade_${v})`,
		'shade',
	),
	// Non-adaptive shade backgrounds (fixed to specific color scheme value)
	...generate_classes(
		(shade: string, mode: string) => ({
			name: `shade_${shade}_${mode}`,
			css: `background-color: var(--shade_${shade}_${mode});`,
		}),
		shade_variants,
		color_scheme_variants,
	),
	// Hue classes
	...generate_classes(
		(hue: string) => ({
			name: `hue_${hue}`,
			css: `--hue: var(--hue_${hue});`,
		}),
		color_variants,
	),
	// Color intensity classes (text color)
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `color_${hue}_${intensity}`,
			css: `color: var(--color_${hue}_${intensity}); --text_color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		intensity_variants,
	),
	// Color intensity classes (background color)
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `bg_${hue}_${intensity}`,
			css: `background-color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		intensity_variants,
	),
	// Absolute color text classes (non-adaptive)
	...generate_classes(
		(hue: string, intensity: string, mode: string) => ({
			name: `color_${hue}_${intensity}_${mode}`,
			css: `color: var(--color_${hue}_${intensity}_${mode}); --text_color: var(--color_${hue}_${intensity}_${mode});`,
		}),
		color_variants,
		intensity_variants,
		color_scheme_variants,
	),
	// Absolute color background classes (non-adaptive)
	...generate_classes(
		(hue: string, intensity: string, mode: string) => ({
			name: `bg_${hue}_${intensity}_${mode}`,
			css: `background-color: var(--color_${hue}_${intensity}_${mode});`,
		}),
		color_variants,
		intensity_variants,
		color_scheme_variants,
	),
	// Darken/lighten overlays (non-adaptive, alpha-based)
	...generate_property_classes(
		'background-color',
		darken_lighten_variants,
		(v) => `var(--darken_${v})`,
		'darken',
	),
	...generate_property_classes(
		'background-color',
		darken_lighten_variants,
		(v) => `var(--lighten_${v})`,
		'lighten',
	),
	// Adaptive alpha overlays (fg = toward foreground, bg = toward background)
	...generate_property_classes(
		'background-color',
		darken_lighten_variants,
		(v) => `var(--fg_${v})`,
		'fg',
	),
	...generate_property_classes(
		'background-color',
		darken_lighten_variants,
		(v) => `var(--bg_${v})`,
		'bg',
	),
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
		'border_color',
	),
	// Border colors using hue + intensity (sets both property and contextual variable)
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `border_color_${hue}_${intensity}`,
			css: `border-color: var(--color_${hue}_${intensity}); --border_color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		intensity_variants,
	),
	// Outline colors using shade scale
	...generate_property_classes('outline-color', shade_variants, (v) => `var(--shade_${v})`),
	// Outline colors using hue + intensity (sets both property and contextual variable)
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `outline_color_${hue}_${intensity}`,
			css: `outline-color: var(--color_${hue}_${intensity}); --outline_color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		intensity_variants,
	),

	...generate_property_classes(
		'border-width',
		border_width_variants.map(String),
		(v) => `var(--border_width_${v})`,
	),
	...generate_property_classes(
		'outline-width',
		border_width_variants.map(String),
		(v) => `var(--border_width_${v})`,
	),
	outline_width_focus: {declaration: 'outline-width: var(--outline_width_focus);'},
	outline_width_active: {declaration: 'outline-width: var(--outline_width_active);'},

	...generate_property_classes(
		'border-radius',
		border_radius_variants,
		(v) => `var(--border_radius_${v})`,
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
		xl: '70',
	}),
	...generate_classes(
		(value: string) => ({
			name: `shadow_color_${value}`,
			css: `--shadow_color: var(--shadow_color_${value});`,
		}),
		shadow_semantic_values,
	),
	...generate_classes(
		(alpha: string) => ({
			name: `shadow_alpha_${alpha}`,
			css: `--shadow_alpha: var(--shadow_alpha_${alpha});`,
		}),
		shadow_alpha_variants,
	),
	// Shadow colors using hue + intensity (sets contextual variable only)
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `shadow_color_${hue}_${intensity}`,
			css: `--shadow_color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		intensity_variants,
	),

	/*

	layout

	*/
	...generate_property_classes('width', space_variants, (v) => `var(--space_${v})`),
	...generate_property_classes('height', space_variants, (v) => `var(--space_${v})`),

	...generate_classes(
		(v: string) => ({
			name: `width_atmost_${v}`,
			css: `width: 100%; max-width: var(--distance_${v});`,
		}),
		distance_variants,
	),
	...generate_classes(
		(v: string) => ({
			name: `width_atleast_${v}`,
			css: `width: 100%; min-width: var(--distance_${v});`,
		}),
		distance_variants,
	),
	...generate_classes(
		(v: string) => ({
			name: `height_atmost_${v}`,
			css: `height: 100%; max-height: var(--distance_${v});`,
		}),
		distance_variants,
	),
	...generate_classes(
		(v: string) => ({
			name: `height_atleast_${v}`,
			css: `height: 100%; min-height: var(--distance_${v});`,
		}),
		distance_variants,
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
	...generate_property_classes('row-gap', space_variants, format_spacing_value),
};
