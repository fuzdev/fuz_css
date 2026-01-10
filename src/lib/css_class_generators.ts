import type {CssClassDefinition} from './css_class_generation.js';

export type GeneratedClassResult = {
	name: string;
	css: string;
} | null;

export type ClassTemplateFn<T1 = string, T2 = string, T3 = string> =
	| ((v1: T1) => GeneratedClassResult)
	| ((v1: T1, v2: T2) => GeneratedClassResult)
	| ((v1: T1, v2: T2, v3: T3) => GeneratedClassResult);

/**
 * Generates CSS class declarations from templates.
 * Supports up to 3 dimensions of multiplicative combinations.
 *
 * @param template - Function that generates CSS from values, can return null to skip
 * @param values - Primary iterable of values
 * @param secondary - Optional second dimension (makes it multiplicative)
 * @param tertiary - Optional third dimension for even more combinations
 *
 * @example
 * // Simple list
 * generate_classes(
 *   v => ({ name: `position_${v}`, css: `position: ${v};` }),
 *   ['static', 'relative', 'absolute']
 * )
 *
 * @example
 * // Two dimensions (multiplicative)
 * generate_classes(
 *   (dir, size) => ({ name: `m${dir}_${size}`, css: `margin-${dir}: ${size};` }),
 *   ['top', 'bottom'],
 *   ['0', '1px', '2px']
 * )
 */
export const generate_classes = <T1 = string, T2 = string, T3 = string>(
	template: ClassTemplateFn<T1, T2, T3>,
	values: Iterable<T1>,
	secondary?: Iterable<T2>,
	tertiary?: Iterable<T3>,
): Record<string, CssClassDefinition> => {
	const result: Record<string, CssClassDefinition> = {};

	for (const v1 of values) {
		if (secondary) {
			for (const v2 of secondary) {
				if (tertiary) {
					for (const v3 of tertiary) {
						const generated = (template as any)(v1, v2, v3);
						if (generated) {
							result[generated.name] = {declaration: generated.css};
						}
					}
				} else {
					const generated = (template as any)(v1, v2);
					if (generated) {
						result[generated.name] = {declaration: generated.css};
					}
				}
			}
		} else {
			const generated = (template as any)(v1);
			if (generated) {
				result[generated.name] = {declaration: generated.css};
			}
		}
	}

	return result;
};

export const CSS_DIRECTIONS = ['top', 'right', 'bottom', 'left'] as const;
export type CssDirection = (typeof CSS_DIRECTIONS)[number];

// TODO add '0' and '10' ?
export const COLOR_INTENSITIES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export type ColorIntensity = (typeof COLOR_INTENSITIES)[number];

// Helper to convert any string to a valid CSS variable name (snake_case)
export const format_variable_name = (str: string): string => str.replace(/[-\s]+/g, '_');

/**
 * Format spacing values for CSS (handles 0, auto, percentages, pixels, and CSS variables).
 * Used by margin, padding, gap, inset, top/right/bottom/left, etc.
 */
export const format_spacing_value = (value: string): string => {
	if (value === '0') return '0';
	if (value === 'auto') return 'auto';
	if (value === '100') return '100%';
	if (value.endsWith('px')) return value;
	return `var(--space_${value})`;
};

/**
 * Format width/height values for CSS (handles 0, auto, percentages, pixels, content values, and CSS variables).
 * Used by width and height properties.
 */
export const format_dimension_value = (value: string): string => {
	if (value === '0') return '0';
	if (value === 'auto') return 'auto';
	if (value === '100') return '100%';
	if (value.endsWith('px')) return value;
	if (
		value === 'max-content' ||
		value === 'min-content' ||
		value === 'fit-content' ||
		value === 'stretch'
	) {
		return value;
	}
	return `var(--space_${value})`;
};

/**
 * Generate classes for a single CSS property with various values.
 *
 * @param property - The CSS property name (e.g. 'font-size', 'gap')
 * @param values - The values to generate classes for
 * @param formatter - Optional function to format values (e.g. v => `var(--space_${v})`)
 * @param prefix - Optional class name prefix (defaults to property with dashes replaced by underscores)
 */
export const generate_property_classes = (
	property: string,
	values: Iterable<string>,
	formatter?: (value: string) => string,
	prefix: string = format_variable_name(property),
): Record<string, CssClassDefinition> => {
	return generate_classes(
		(value: string) => ({
			name: `${prefix}_${format_variable_name(value)}`,
			css: `${property}: ${formatter?.(value) ?? value};`,
		}),
		values,
	);
};

/**
 * Generate directional classes for properties like margin and padding.
 * Creates classes for all directions: base, top, right, bottom, left, x (horizontal), y (vertical).
 *
 * @param property - The base CSS property name (e.g. 'margin', 'padding')
 * @param values - The values to generate classes for
 * @param formatter - Optional function to format values (defaults to identity)
 */
export const generate_directional_classes = (
	property: string,
	values: Iterable<string>,
	formatter?: (v: string) => string,
): Record<string, CssClassDefinition> => {
	const prefix = property[0]; // 'm' for margin, 'p' for padding

	return generate_classes(
		(variant: string, value: string) => {
			const formatted = formatter?.(value) ?? value;

			// Map variants to their configurations
			const configs: Record<string, {name: string; css: string} | undefined> = {
				'': {name: `${prefix}_${format_variable_name(value)}`, css: `${property}: ${formatted};`},
				t: {
					name: `${prefix}t_${format_variable_name(value)}`,
					css: `${property}-top: ${formatted};`,
				},
				r: {
					name: `${prefix}r_${format_variable_name(value)}`,
					css: `${property}-right: ${formatted};`,
				},
				b: {
					name: `${prefix}b_${format_variable_name(value)}`,
					css: `${property}-bottom: ${formatted};`,
				},
				l: {
					name: `${prefix}l_${format_variable_name(value)}`,
					css: `${property}-left: ${formatted};`,
				},
				x: {
					name: `${prefix}x_${format_variable_name(value)}`,
					css: `${property}-left: ${formatted};\t${property}-right: ${formatted};`,
				},
				y: {
					name: `${prefix}y_${format_variable_name(value)}`,
					css: `${property}-top: ${formatted};\t${property}-bottom: ${formatted};`,
				},
			};

			return configs[variant] || null;
		},
		['', 't', 'r', 'b', 'l', 'x', 'y'],
		values,
	);
};

/**
 * Generate border radius corner classes for all four corners.
 * Creates classes for top-left, top-right, bottom-left, bottom-right corners.
 *
 * @param values - The values to generate classes for
 * @param formatter - Optional function to format values
 */
export const generate_border_radius_corners = (
	values: Iterable<string>,
	formatter?: (value: string) => string,
): Record<string, CssClassDefinition> => {
	const corners = [
		{prop: 'border-top-left-radius', name: 'border_top_left_radius'},
		{prop: 'border-top-right-radius', name: 'border_top_right_radius'},
		{prop: 'border-bottom-left-radius', name: 'border_bottom_left_radius'},
		{prop: 'border-bottom-right-radius', name: 'border_bottom_right_radius'},
	];

	return generate_classes(
		(corner: (typeof corners)[0], value: string) => ({
			name: `${corner.name}_${format_variable_name(value)}`,
			css: `${corner.prop}: ${formatter?.(value) ?? value};`,
		}),
		corners,
		values,
	);
};

/**
 * Generate shadow classes for various shadow types and sizes.
 * Creates classes for regular, top, bottom, inset, inset-top, and inset-bottom shadows.
 * Each shadow uses color-mix with alpha values for transparency.
 *
 * @param sizes - The shadow size variants (xs, sm, md, lg, xl)
 * @param alpha_mapping - Mapping of sizes to alpha numbers (1-5)
 */
export const generate_shadow_classes = (
	sizes: Iterable<string>,
	alpha_mapping: Record<string, string>,
): Record<string, CssClassDefinition> => {
	const shadow_types = [
		{prefix: 'shadow', var_prefix: 'shadow'},
		{prefix: 'shadow_top', var_prefix: 'shadow_top'},
		{prefix: 'shadow_bottom', var_prefix: 'shadow_bottom'},
		{prefix: 'shadow_inset', var_prefix: 'shadow_inset'},
		{prefix: 'shadow_inset_top', var_prefix: 'shadow_inset_top'},
		{prefix: 'shadow_inset_bottom', var_prefix: 'shadow_inset_bottom'},
	];

	return generate_classes(
		(type: (typeof shadow_types)[0], size: string) => ({
			name: `${type.prefix}_${size}`,
			css: `box-shadow: var(--${type.var_prefix}_${size}) color-mix(in hsl, var(--shadow_color) var(--shadow_alpha, var(--shadow_alpha_${alpha_mapping[size]})), transparent);`,
		}),
		shadow_types,
		sizes,
	);
};
