/**
 * Tests for CSS class generator utilities.
 *
 * These functions generate CssClassDefinition records from templates.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {
	generate_classes,
	generate_property_classes,
	generate_directional_classes,
	generate_border_radius_corners,
	generate_shadow_classes,
	format_spacing_value,
	format_dimension_value,
	format_variable_name,
} from '$lib/css_class_generators.js';
import type {CssClassDefinition} from '$lib/css_class_generation.js';

/* eslint-disable @typescript-eslint/dot-notation -- dynamic keys require bracket notation */

/**
 * Helper to safely extract declaration from CssClassDefinition.
 * The generators always produce declaration-type definitions.
 */
const get_declaration = (def: CssClassDefinition | undefined): string => {
	if (!def || !('declaration' in def)) return '';
	return def.declaration ?? '';
};

describe('format_variable_name', () => {
	test('converts hyphens to underscores', () => {
		expect(format_variable_name('font-size')).toBe('font_size');
	});

	test('converts spaces to underscores', () => {
		expect(format_variable_name('some value')).toBe('some_value');
	});

	test('converts multiple hyphens/spaces', () => {
		expect(format_variable_name('border-top-left-radius')).toBe('border_top_left_radius');
	});

	test('preserves underscores', () => {
		expect(format_variable_name('my_var')).toBe('my_var');
	});

	test('handles empty string', () => {
		expect(format_variable_name('')).toBe('');
	});
});

describe('format_spacing_value', () => {
	test('returns 0 as-is', () => {
		expect(format_spacing_value('0')).toBe('0');
	});

	test('returns auto as-is', () => {
		expect(format_spacing_value('auto')).toBe('auto');
	});

	test('converts 100 to 100%', () => {
		expect(format_spacing_value('100')).toBe('100%');
	});

	test('preserves pixel values', () => {
		expect(format_spacing_value('10px')).toBe('10px');
		expect(format_spacing_value('0px')).toBe('0px');
	});

	test('wraps other values in var(--space_*)', () => {
		expect(format_spacing_value('md')).toBe('var(--space_md)');
		expect(format_spacing_value('lg')).toBe('var(--space_lg)');
		expect(format_spacing_value('xs')).toBe('var(--space_xs)');
	});
});

describe('format_dimension_value', () => {
	test('returns 0 as-is', () => {
		expect(format_dimension_value('0')).toBe('0');
	});

	test('returns auto as-is', () => {
		expect(format_dimension_value('auto')).toBe('auto');
	});

	test('converts 100 to 100%', () => {
		expect(format_dimension_value('100')).toBe('100%');
	});

	test('preserves pixel values', () => {
		expect(format_dimension_value('200px')).toBe('200px');
	});

	test('preserves content keywords', () => {
		expect(format_dimension_value('max-content')).toBe('max-content');
		expect(format_dimension_value('min-content')).toBe('min-content');
		expect(format_dimension_value('fit-content')).toBe('fit-content');
		expect(format_dimension_value('stretch')).toBe('stretch');
	});

	test('wraps other values in var(--space_*)', () => {
		expect(format_dimension_value('md')).toBe('var(--space_md)');
		expect(format_dimension_value('xl')).toBe('var(--space_xl)');
	});
});

describe('generate_classes', () => {
	describe('single dimension', () => {
		test('generates from simple values', () => {
			const result = generate_classes(
				(v: string) => ({name: `pos_${v}`, css: `position: ${v};`}),
				['static', 'relative', 'absolute'],
			);

			expect(Object.keys(result)).toEqual(['pos_static', 'pos_relative', 'pos_absolute']);
			expect(get_declaration(result['pos_static'])).toBe('position: static;');
			expect(get_declaration(result['pos_relative'])).toBe('position: relative;');
		});

		test('skips null returns from template', () => {
			const result = generate_classes(
				(v: string) => (v === 'skip' ? null : {name: `val_${v}`, css: `value: ${v};`}),
				['a', 'skip', 'b'],
			);

			expect(Object.keys(result)).toEqual(['val_a', 'val_b']);
		});

		test('handles empty iterable', () => {
			const result = generate_classes((v: string) => ({name: v, css: `x: ${v};`}), []);

			expect(result).toEqual({});
		});
	});

	describe('two dimensions (multiplicative)', () => {
		test('generates all combinations', () => {
			const result = generate_classes(
				(dir: string, size: string) => ({name: `m${dir}_${size}`, css: `margin-${dir}: ${size};`}),
				['t', 'b'],
				['sm', 'lg'],
			);

			expect(Object.keys(result)).toEqual(['mt_sm', 'mt_lg', 'mb_sm', 'mb_lg']);
			expect(get_declaration(result['mt_sm'])).toBe('margin-t: sm;');
		});

		test('skips null returns', () => {
			const result = generate_classes(
				(a: string, b: string) =>
					a === 'x' && b === '1' ? null : {name: `${a}_${b}`, css: `v: ${a}${b};`},
				['x', 'y'],
				['1', '2'],
			);

			// x_1 is skipped
			expect(Object.keys(result)).toEqual(['x_2', 'y_1', 'y_2']);
		});
	});

	describe('three dimensions', () => {
		test('generates all combinations', () => {
			const result = generate_classes(
				(a: string, b: string, c: string) => ({name: `${a}_${b}_${c}`, css: `v: ${a}${b}${c};`}),
				['x', 'y'],
				['1', '2'],
				['a', 'b'],
			);

			expect(Object.keys(result)).toHaveLength(8); // 2 * 2 * 2
			expect(get_declaration(result['x_1_a'])).toBe('v: x1a;');
			expect(get_declaration(result['y_2_b'])).toBe('v: y2b;');
		});
	});
});

describe('generate_property_classes', () => {
	test('generates classes for property with values', () => {
		const result = generate_property_classes('display', ['flex', 'grid', 'block']);

		expect(Object.keys(result)).toEqual(['display_flex', 'display_grid', 'display_block']);
		expect(get_declaration(result['display_flex'])).toBe('display: flex;');
	});

	test('applies formatter to values', () => {
		const result = generate_property_classes('gap', ['sm', 'md'], (v) => `var(--space_${v})`);

		expect(get_declaration(result['gap_sm'])).toBe('gap: var(--space_sm);');
		expect(get_declaration(result['gap_md'])).toBe('gap: var(--space_md);');
	});

	test('uses custom prefix', () => {
		const result = generate_property_classes('font-size', ['sm', 'lg'], undefined, 'text');

		expect(Object.keys(result)).toEqual(['text_sm', 'text_lg']);
		expect(get_declaration(result['text_sm'])).toBe('font-size: sm;');
	});

	test('converts hyphens in property to underscores for default prefix', () => {
		const result = generate_property_classes('font-weight', ['bold', 'normal']);

		expect(Object.keys(result)).toEqual(['font_weight_bold', 'font_weight_normal']);
	});

	test('handles empty values', () => {
		const result = generate_property_classes('display', []);

		expect(result).toEqual({});
	});
});

describe('generate_directional_classes', () => {
	test('generates all 7 directional variants', () => {
		const result = generate_directional_classes('margin', ['md']);

		const keys = Object.keys(result);
		expect(keys).toContain('m_md'); // base
		expect(keys).toContain('mt_md'); // top
		expect(keys).toContain('mr_md'); // right
		expect(keys).toContain('mb_md'); // bottom
		expect(keys).toContain('ml_md'); // left
		expect(keys).toContain('mx_md'); // horizontal
		expect(keys).toContain('my_md'); // vertical
		expect(keys).toHaveLength(7);
	});

	test('generates correct CSS for each direction', () => {
		const result = generate_directional_classes('padding', ['10px']);

		expect(get_declaration(result['p_10px'])).toBe('padding: 10px;');
		expect(get_declaration(result['pt_10px'])).toBe('padding-top: 10px;');
		expect(get_declaration(result['pr_10px'])).toBe('padding-right: 10px;');
		expect(get_declaration(result['pb_10px'])).toBe('padding-bottom: 10px;');
		expect(get_declaration(result['pl_10px'])).toBe('padding-left: 10px;');
	});

	test('generates multi-property CSS for x and y variants', () => {
		const result = generate_directional_classes('margin', ['5px']);

		expect(get_declaration(result['mx_5px'])).toBe('margin-left: 5px;\tmargin-right: 5px;');
		expect(get_declaration(result['my_5px'])).toBe('margin-top: 5px;\tmargin-bottom: 5px;');
	});

	test('applies formatter to values', () => {
		const result = generate_directional_classes('padding', ['sm'], (v) => `var(--space_${v})`);

		expect(get_declaration(result['p_sm'])).toBe('padding: var(--space_sm);');
		expect(get_declaration(result['pt_sm'])).toBe('padding-top: var(--space_sm);');
	});

	test('generates for multiple values', () => {
		const result = generate_directional_classes('margin', ['0', 'auto']);

		expect(Object.keys(result)).toHaveLength(14); // 7 variants * 2 values
		expect(get_declaration(result['m_0'])).toBe('margin: 0;');
		expect(get_declaration(result['m_auto'])).toBe('margin: auto;');
	});
});

describe('generate_border_radius_corners', () => {
	test('generates all 4 corner variants', () => {
		const result = generate_border_radius_corners(['md']);

		const keys = Object.keys(result);
		expect(keys).toContain('border_top_left_radius_md');
		expect(keys).toContain('border_top_right_radius_md');
		expect(keys).toContain('border_bottom_left_radius_md');
		expect(keys).toContain('border_bottom_right_radius_md');
		expect(keys).toHaveLength(4);
	});

	test('generates correct CSS for each corner', () => {
		const result = generate_border_radius_corners(['8px']);

		expect(get_declaration(result['border_top_left_radius_8px'])).toBe(
			'border-top-left-radius: 8px;',
		);
		expect(get_declaration(result['border_bottom_right_radius_8px'])).toBe(
			'border-bottom-right-radius: 8px;',
		);
	});

	test('applies formatter', () => {
		const result = generate_border_radius_corners(['lg'], (v) => `var(--radius_${v})`);

		expect(get_declaration(result['border_top_left_radius_lg'])).toBe(
			'border-top-left-radius: var(--radius_lg);',
		);
	});

	test('generates for multiple values', () => {
		const result = generate_border_radius_corners(['sm', 'lg']);

		expect(Object.keys(result)).toHaveLength(8); // 4 corners * 2 values
	});
});

describe('generate_shadow_classes', () => {
	const alpha_mapping: Record<string, string> = {
		sm: '1',
		md: '2',
		lg: '3',
	};

	test('generates all 6 shadow types', () => {
		const result = generate_shadow_classes(['md'], alpha_mapping);

		const keys = Object.keys(result);
		expect(keys).toContain('shadow_md');
		expect(keys).toContain('shadow_top_md');
		expect(keys).toContain('shadow_bottom_md');
		expect(keys).toContain('shadow_inset_md');
		expect(keys).toContain('shadow_inset_top_md');
		expect(keys).toContain('shadow_inset_bottom_md');
		expect(keys).toHaveLength(6);
	});

	test('generates correct CSS with alpha mapping', () => {
		const result = generate_shadow_classes(['md'], alpha_mapping);

		expect(get_declaration(result['shadow_md'])).toContain('var(--shadow_md)');
		expect(get_declaration(result['shadow_md'])).toContain('var(--shadow_alpha_2)');
	});

	test('uses correct variable prefix for each shadow type', () => {
		const result = generate_shadow_classes(['sm'], alpha_mapping);

		expect(get_declaration(result['shadow_sm'])).toContain('var(--shadow_sm)');
		expect(get_declaration(result['shadow_top_sm'])).toContain('var(--shadow_top_sm)');
		expect(get_declaration(result['shadow_inset_sm'])).toContain('var(--shadow_inset_sm)');
	});

	test('generates for multiple sizes', () => {
		const result = generate_shadow_classes(['sm', 'md', 'lg'], alpha_mapping);

		expect(Object.keys(result)).toHaveLength(18); // 6 types * 3 sizes
	});
});
