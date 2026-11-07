/**
 * The templates that build the token class families from the variant lists,
 * one class per combination of values.
 *
 * @internal
 *
 * @module
 */

import type { CssClassDefinition } from './css_class_generation.ts';

export type GeneratedClassResult = {
	name: string;
	css: string;
} | null;

/**
 * A class template over up to three dimensions. A template declaring fewer
 * parameters is assignable, and is called with only the dimensions given.
 */
export type ClassTemplateFn<T1 = string, T2 = string, T3 = string> = (
	v1: T1,
	v2: T2,
	v3: T3
) => GeneratedClassResult;

/**
 * Generates CSS class declarations from templates.
 * Supports up to 3 dimensions of multiplicative combinations.
 *
 * @param template - function that generates CSS from values, can return null to skip
 * @param values - primary iterable of values
 * @param secondary - optional second dimension (makes it multiplicative)
 * @param tertiary - optional third dimension for even more combinations
 *
 * @example
 * ```ts
 * // Simple list
 * generate_classes(
 *   (v) => ({ name: `width_atmost_${v}`, css: `width: 100%; max-width: var(--distance_${v});` }),
 *   distance_variants
 * )
 * ```
 *
 * @example
 * ```ts
 * // Two dimensions (multiplicative)
 * generate_classes(
 *   (dir, size) => ({ name: `m${dir}_${size}`, css: `margin-${dir}: ${size};` }),
 *   ['top', 'bottom'],
 *   ['0', '1px', '2px']
 * )
 * ```
 */
export const generate_classes = <T1 = string, T2 = string, T3 = string>(
	template: ClassTemplateFn<T1, T2, T3>,
	values: Iterable<T1>,
	secondary?: Iterable<T2>,
	tertiary?: Iterable<T3>
): Record<string, CssClassDefinition> => {
	const result: Record<string, CssClassDefinition> = {};

	// a missing dimension iterates once with `undefined`, which a template
	// over fewer dimensions doesn't declare a parameter for
	const secondary_values: Iterable<T2> = secondary ?? [undefined as T2];
	const tertiary_values: Iterable<T3> = tertiary ?? [undefined as T3];

	for (const v1 of values) {
		for (const v2 of secondary_values) {
			for (const v3 of tertiary_values) {
				const generated = template(v1, v2, v3);
				if (generated) result[generated.name] = { declaration: generated.css };
			}
		}
	}

	return result;
};

/** Converts a string to a class-name segment, each run of hyphens and whitespace becoming one underscore. */
export const to_class_segment = (str: string): string => str.replace(/[-\s]+/g, '_');

/**
 * Format spacing values for CSS: `0` and `auto` as-is, a space variant as its
 * `--space_*` variable. Used by the margin, padding, and gap classes.
 */
export const format_spacing_value = (value: string): string => {
	if (value === '0') return '0';
	if (value === 'auto') return 'auto';
	return `var(--space_${value})`;
};

/**
 * Generate classes for a single CSS property with various values.
 *
 * @param property - the CSS property name (e.g. 'font-size', 'gap')
 * @param values - the values to generate classes for
 * @param formatter - optional function to format values (e.g. v => `var(--space_${v})`)
 * @param prefix - optional class name prefix (defaults to property with dashes replaced by underscores)
 */
export const generate_property_classes = (
	property: string,
	values: Iterable<string>,
	formatter?: (value: string) => string,
	prefix: string = to_class_segment(property)
): Record<string, CssClassDefinition> => {
	return generate_classes(
		(value: string) => ({
			name: `${prefix}_${to_class_segment(value)}`,
			css: `${property}: ${formatter?.(value) ?? value};`
		}),
		values
	);
};

/**
 * Generate directional classes for properties like margin and padding.
 * Creates classes for all directions: base, top, right, bottom, left, x (horizontal), y (vertical).
 *
 * @param property - the base CSS property name (e.g. 'margin', 'padding')
 * @param values - the values to generate classes for
 * @param formatter - optional function to format values (defaults to identity)
 */
export const generate_directional_classes = (
	property: string,
	values: Iterable<string>,
	formatter?: (v: string) => string
): Record<string, CssClassDefinition> => {
	const prefix = property[0]; // 'm' for margin, 'p' for padding

	return generate_classes(
		(variant: string, value: string) => {
			const formatted = formatter?.(value) ?? value;

			// Map variants to their configurations
			const configs: Record<string, { name: string; css: string } | undefined> = {
				'': { name: `${prefix}_${to_class_segment(value)}`, css: `${property}: ${formatted};` },
				t: {
					name: `${prefix}t_${to_class_segment(value)}`,
					css: `${property}-top: ${formatted};`
				},
				r: {
					name: `${prefix}r_${to_class_segment(value)}`,
					css: `${property}-right: ${formatted};`
				},
				b: {
					name: `${prefix}b_${to_class_segment(value)}`,
					css: `${property}-bottom: ${formatted};`
				},
				l: {
					name: `${prefix}l_${to_class_segment(value)}`,
					css: `${property}-left: ${formatted};`
				},
				x: {
					name: `${prefix}x_${to_class_segment(value)}`,
					css: `${property}-left: ${formatted};\t${property}-right: ${formatted};`
				},
				y: {
					name: `${prefix}y_${to_class_segment(value)}`,
					css: `${property}-top: ${formatted};\t${property}-bottom: ${formatted};`
				}
			};

			return configs[variant] || null;
		},
		['', 't', 'r', 'b', 'l', 'x', 'y'],
		values
	);
};

/**
 * Generate border radius corner classes for all four corners.
 * Creates classes for top-left, top-right, bottom-left, bottom-right corners.
 *
 * @param values - the values to generate classes for
 * @param formatter - optional function to format values
 */
export const generate_border_radius_corners = (
	values: Iterable<string>,
	formatter?: (value: string) => string
): Record<string, CssClassDefinition> => {
	const corners = [
		{ prop: 'border-top-left-radius', name: 'border_top_left_radius' },
		{ prop: 'border-top-right-radius', name: 'border_top_right_radius' },
		{ prop: 'border-bottom-left-radius', name: 'border_bottom_left_radius' },
		{ prop: 'border-bottom-right-radius', name: 'border_bottom_right_radius' }
	];

	return generate_classes(
		(corner: (typeof corners)[0], value: string) => ({
			name: `${corner.name}_${to_class_segment(value)}`,
			css: `${corner.prop}: ${formatter?.(value) ?? value};`
		}),
		corners,
		values
	);
};

/**
 * Generate shadow classes for various shadow types and sizes.
 * Creates classes for regular, top, bottom, inset, inset-top, and inset-bottom shadows.
 * Each shadow uses color-mix with alpha values for transparency.
 *
 * @param sizes - the shadow size variants (xs, sm, md, lg, xl)
 * @param alpha_mapping - mapping of sizes to alpha numbers (1-5)
 */
export const generate_shadow_classes = (
	sizes: Iterable<string>,
	alpha_mapping: Record<string, string>
): Record<string, CssClassDefinition> => {
	const shadow_types = [
		{ prefix: 'shadow', var_prefix: 'shadow' },
		{ prefix: 'shadow_top', var_prefix: 'shadow_top' },
		{ prefix: 'shadow_bottom', var_prefix: 'shadow_bottom' },
		{ prefix: 'shadow_inset', var_prefix: 'shadow_inset' },
		{ prefix: 'shadow_inset_top', var_prefix: 'shadow_inset_top' },
		{ prefix: 'shadow_inset_bottom', var_prefix: 'shadow_inset_bottom' }
	];

	return generate_classes(
		(type: (typeof shadow_types)[0], size: string) => ({
			name: `${type.prefix}_${size}`,
			css: `box-shadow: var(--${type.var_prefix}_${
				size
			}) color-mix(in oklab, var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha, var(--shadow_alpha_${
				alpha_mapping[size]
			})), transparent);`
		}),
		shadow_types,
		sizes
	);
};
