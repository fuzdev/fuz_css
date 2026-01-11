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
	COLOR_INTENSITIES,
	generate_property_classes,
	generate_directional_classes,
	generate_border_radius_corners,
	generate_shadow_classes,
	format_spacing_value,
	format_dimension_value,
} from './css_class_generators.js';
import {
	space_variants,
	color_variants,
	text_color_variants,
	font_size_variants,
	icon_size_variants,
	line_height_variants,
	border_radius_variants,
	border_width_variants,
	shadow_semantic_values,
	shadow_alpha_variants,
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

	...generate_property_classes('line-height', ['0', '1', ...line_height_variants], (v) =>
		v === '0' || v === '1' ? v : `var(--line_height_${v})`,
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
	...generate_property_classes(
		'color',
		text_color_variants.map(String),
		(v) => `var(--text_color_${v})`,
		'text_color',
	),
	...generate_property_classes(
		'background-color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--darken_${v})`,
		'darken',
	),
	...generate_property_classes(
		'background-color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--lighten_${v})`,
		'lighten',
	),
	bg: {declaration: 'background-color: var(--bg);'},
	fg: {declaration: 'background-color: var(--fg);'},
	...generate_property_classes(
		'background-color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--bg_${v})`,
		'bg',
	),
	...generate_property_classes(
		'background-color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--fg_${v})`,
		'fg',
	),
	...generate_property_classes(
		'color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--darken_${v})`,
		'color_darken',
	),
	...generate_property_classes(
		'color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--lighten_${v})`,
		'color_lighten',
	),
	color_bg: {declaration: 'color: var(--bg);'},
	color_fg: {declaration: 'color: var(--fg);'},
	...generate_property_classes(
		'color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--bg_${v})`,
		'color_bg',
	),
	...generate_property_classes(
		'color',
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map(String),
		(v) => `var(--fg_${v})`,
		'color_fg',
	),
	...generate_classes(
		(hue: string) => ({
			name: `hue_${hue}`,
			css: `--hue: var(--hue_${hue});`,
		}),
		color_variants,
	),
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `color_${hue}_${intensity}`,
			css: `color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		COLOR_INTENSITIES,
	),
	...generate_classes(
		(hue: string, intensity: string) => ({
			name: `bg_${hue}_${intensity}`,
			css: `background-color: var(--color_${hue}_${intensity});`,
		}),
		color_variants,
		COLOR_INTENSITIES,
	),

	/*

	borders

	*/
	...generate_property_classes(
		'border-color',
		[1, 2, 3, 4, 5].map(String),
		(v) => `var(--border_color_${v})`,
	),
	...generate_property_classes('border-color', color_variants, (v) => `var(--border_color_${v})`),
	...generate_property_classes(
		'outline-color',
		[1, 2, 3, 4, 5].map(String),
		(v) => `var(--border_color_${v})`,
	),
	...generate_property_classes('outline-color', color_variants, (v) => `var(--border_color_${v})`),

	...generate_property_classes('border-width', ['0', ...border_width_variants.map(String)], (v) =>
		v === '0' ? '0' : `var(--border_width_${v})`,
	),
	...generate_property_classes('outline-width', ['0', ...border_width_variants.map(String)], (v) =>
		v === '0' ? '0' : `var(--border_width_${v})`,
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
	...generate_shadow_classes(['xs', 'sm', 'md', 'lg', 'xl'], {
		xs: '1',
		sm: '2',
		md: '3',
		lg: '4',
		xl: '5',
	}),
	...generate_classes(
		(value: string) => ({
			name: `shadow_color_${value}`,
			css: `--shadow_color: var(--shadow_color_${value});`,
		}),
		shadow_semantic_values,
	),
	...generate_classes(
		(hue: string) => ({
			name: `shadow_color_${hue}`,
			css: `--shadow_color: var(--shadow_color_${hue});`,
		}),
		color_variants,
	),
	...generate_classes(
		(alpha: number) => ({
			name: `shadow_alpha_${alpha}`,
			css: `--shadow_alpha: var(--shadow_alpha_${alpha});`,
		}),
		shadow_alpha_variants,
	),

	/*

	layout

	*/
	...generate_property_classes(
		'width',
		[
			'0',
			'100',
			'1px',
			'2px',
			'3px',
			'auto',
			'max-content',
			'min-content',
			'fit-content',
			'stretch',
			...space_variants,
		],
		format_dimension_value,
	),
	...generate_property_classes(
		'height',
		[
			'0',
			'100',
			'1px',
			'2px',
			'3px',
			'auto',
			'max-content',
			'min-content',
			'fit-content',
			'stretch',
			...space_variants,
		],
		format_dimension_value,
	),

	...generate_property_classes(
		'top',
		['0', '100', '1px', '2px', '3px', 'auto', ...space_variants],
		format_spacing_value,
	),
	...generate_property_classes(
		'right',
		['0', '100', '1px', '2px', '3px', 'auto', ...space_variants],
		format_spacing_value,
	),
	...generate_property_classes(
		'bottom',
		['0', '100', '1px', '2px', '3px', 'auto', ...space_variants],
		format_spacing_value,
	),
	...generate_property_classes(
		'left',
		['0', '100', '1px', '2px', '3px', 'auto', ...space_variants],
		format_spacing_value,
	),

	...generate_property_classes(
		'inset',
		['0', '100', '1px', '2px', '3px', 'auto', ...space_variants],
		format_spacing_value,
	),

	...generate_directional_classes(
		'padding',
		['0', '100', '1px', '2px', '3px', ...space_variants],
		format_spacing_value,
	),
	...generate_directional_classes(
		'margin',
		['0', '100', '1px', '2px', '3px', 'auto', ...space_variants],
		format_spacing_value,
	),
	...generate_property_classes('gap', space_variants, format_spacing_value),
	...generate_property_classes('column-gap', space_variants, format_spacing_value),
	...generate_property_classes('row-gap', space_variants, format_spacing_value),
};
