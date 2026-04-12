/**
 * Tests for CSS class generator utilities.
 *
 * These functions generate CssClassDefinition records from templates.
 *
 * @module
 */

import {test, assert, describe} from 'vitest';

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
		assert.strictEqual(format_variable_name('font-size'), 'font_size');
	});

	test('converts spaces to underscores', () => {
		assert.strictEqual(format_variable_name('some value'), 'some_value');
	});

	test('converts multiple hyphens/spaces', () => {
		assert.strictEqual(format_variable_name('border-top-left-radius'), 'border_top_left_radius');
	});

	test('preserves underscores', () => {
		assert.strictEqual(format_variable_name('my_var'), 'my_var');
	});

	test('handles empty string', () => {
		assert.strictEqual(format_variable_name(''), '');
	});
});

describe('format_spacing_value', () => {
	test('returns 0 as-is', () => {
		assert.strictEqual(format_spacing_value('0'), '0');
	});

	test('returns auto as-is', () => {
		assert.strictEqual(format_spacing_value('auto'), 'auto');
	});

	test('converts 100 to 100%', () => {
		assert.strictEqual(format_spacing_value('100'), '100%');
	});

	test('preserves pixel values', () => {
		assert.strictEqual(format_spacing_value('10px'), '10px');
		assert.strictEqual(format_spacing_value('0px'), '0px');
	});

	test('wraps other values in var(--space_*)', () => {
		assert.strictEqual(format_spacing_value('md'), 'var(--space_md)');
		assert.strictEqual(format_spacing_value('lg'), 'var(--space_lg)');
		assert.strictEqual(format_spacing_value('xs'), 'var(--space_xs)');
	});
});

describe('format_dimension_value', () => {
	test('returns 0 as-is', () => {
		assert.strictEqual(format_dimension_value('0'), '0');
	});

	test('returns auto as-is', () => {
		assert.strictEqual(format_dimension_value('auto'), 'auto');
	});

	test('converts 100 to 100%', () => {
		assert.strictEqual(format_dimension_value('100'), '100%');
	});

	test('preserves pixel values', () => {
		assert.strictEqual(format_dimension_value('200px'), '200px');
	});

	test('preserves content keywords', () => {
		assert.strictEqual(format_dimension_value('max-content'), 'max-content');
		assert.strictEqual(format_dimension_value('min-content'), 'min-content');
		assert.strictEqual(format_dimension_value('fit-content'), 'fit-content');
		assert.strictEqual(format_dimension_value('stretch'), 'stretch');
	});

	test('wraps other values in var(--space_*)', () => {
		assert.strictEqual(format_dimension_value('md'), 'var(--space_md)');
		assert.strictEqual(format_dimension_value('xl'), 'var(--space_xl)');
	});
});

describe('generate_classes', () => {
	describe('single dimension', () => {
		test('generates from simple values', () => {
			const result = generate_classes(
				(v: string) => ({name: `pos_${v}`, css: `position: ${v};`}),
				['static', 'relative', 'absolute'],
			);

			assert.deepEqual(Object.keys(result), ['pos_static', 'pos_relative', 'pos_absolute']);
			assert.strictEqual(get_declaration(result['pos_static']), 'position: static;');
			assert.strictEqual(get_declaration(result['pos_relative']), 'position: relative;');
		});

		test('skips null returns from template', () => {
			const result = generate_classes(
				(v: string) => (v === 'skip' ? null : {name: `val_${v}`, css: `value: ${v};`}),
				['a', 'skip', 'b'],
			);

			assert.deepEqual(Object.keys(result), ['val_a', 'val_b']);
		});

		test('handles empty iterable', () => {
			const result = generate_classes((v: string) => ({name: v, css: `x: ${v};`}), []);

			assert.deepEqual(result, {});
		});
	});

	describe('two dimensions (multiplicative)', () => {
		test('generates all combinations', () => {
			const result = generate_classes(
				(dir: string, size: string) => ({name: `m${dir}_${size}`, css: `margin-${dir}: ${size};`}),
				['t', 'b'],
				['sm', 'lg'],
			);

			assert.deepEqual(Object.keys(result), ['mt_sm', 'mt_lg', 'mb_sm', 'mb_lg']);
			assert.strictEqual(get_declaration(result['mt_sm']), 'margin-t: sm;');
		});

		test('skips null returns', () => {
			const result = generate_classes(
				(a: string, b: string) =>
					a === 'x' && b === '1' ? null : {name: `${a}_${b}`, css: `v: ${a}${b};`},
				['x', 'y'],
				['1', '2'],
			);

			// x_1 is skipped
			assert.deepEqual(Object.keys(result), ['x_2', 'y_1', 'y_2']);
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

			assert.lengthOf(Object.keys(result), 8); // 2 * 2 * 2
			assert.strictEqual(get_declaration(result['x_1_a']), 'v: x1a;');
			assert.strictEqual(get_declaration(result['y_2_b']), 'v: y2b;');
		});
	});
});

describe('generate_property_classes', () => {
	test('generates classes for property with values', () => {
		const result = generate_property_classes('display', ['flex', 'grid', 'block']);

		assert.deepEqual(Object.keys(result), ['display_flex', 'display_grid', 'display_block']);
		assert.strictEqual(get_declaration(result['display_flex']), 'display: flex;');
	});

	test('applies formatter to values', () => {
		const result = generate_property_classes('gap', ['sm', 'md'], (v) => `var(--space_${v})`);

		assert.strictEqual(get_declaration(result['gap_sm']), 'gap: var(--space_sm);');
		assert.strictEqual(get_declaration(result['gap_md']), 'gap: var(--space_md);');
	});

	test('uses custom prefix', () => {
		const result = generate_property_classes('font-size', ['sm', 'lg'], undefined, 'text');

		assert.deepEqual(Object.keys(result), ['text_sm', 'text_lg']);
		assert.strictEqual(get_declaration(result['text_sm']), 'font-size: sm;');
	});

	test('converts hyphens in property to underscores for default prefix', () => {
		const result = generate_property_classes('font-weight', ['bold', 'normal']);

		assert.deepEqual(Object.keys(result), ['font_weight_bold', 'font_weight_normal']);
	});

	test('handles empty values', () => {
		const result = generate_property_classes('display', []);

		assert.deepEqual(result, {});
	});
});

describe('generate_directional_classes', () => {
	test('generates all 7 directional variants', () => {
		const result = generate_directional_classes('margin', ['md']);

		const keys = Object.keys(result);
		assert.include(keys, 'm_md'); // base
		assert.include(keys, 'mt_md'); // top
		assert.include(keys, 'mr_md'); // right
		assert.include(keys, 'mb_md'); // bottom
		assert.include(keys, 'ml_md'); // left
		assert.include(keys, 'mx_md'); // horizontal
		assert.include(keys, 'my_md'); // vertical
		assert.lengthOf(keys, 7);
	});

	test('generates correct CSS for each direction', () => {
		const result = generate_directional_classes('padding', ['10px']);

		assert.strictEqual(get_declaration(result['p_10px']), 'padding: 10px;');
		assert.strictEqual(get_declaration(result['pt_10px']), 'padding-top: 10px;');
		assert.strictEqual(get_declaration(result['pr_10px']), 'padding-right: 10px;');
		assert.strictEqual(get_declaration(result['pb_10px']), 'padding-bottom: 10px;');
		assert.strictEqual(get_declaration(result['pl_10px']), 'padding-left: 10px;');
	});

	test('generates multi-property CSS for x and y variants', () => {
		const result = generate_directional_classes('margin', ['5px']);

		assert.strictEqual(get_declaration(result['mx_5px']), 'margin-left: 5px;\tmargin-right: 5px;');
		assert.strictEqual(get_declaration(result['my_5px']), 'margin-top: 5px;\tmargin-bottom: 5px;');
	});

	test('applies formatter to values', () => {
		const result = generate_directional_classes('padding', ['sm'], (v) => `var(--space_${v})`);

		assert.strictEqual(get_declaration(result['p_sm']), 'padding: var(--space_sm);');
		assert.strictEqual(get_declaration(result['pt_sm']), 'padding-top: var(--space_sm);');
	});

	test('generates for multiple values', () => {
		const result = generate_directional_classes('margin', ['0', 'auto']);

		assert.lengthOf(Object.keys(result), 14); // 7 variants * 2 values
		assert.strictEqual(get_declaration(result['m_0']), 'margin: 0;');
		assert.strictEqual(get_declaration(result['m_auto']), 'margin: auto;');
	});
});

describe('generate_border_radius_corners', () => {
	test('generates all 4 corner variants', () => {
		const result = generate_border_radius_corners(['md']);

		const keys = Object.keys(result);
		assert.include(keys, 'border_top_left_radius_md');
		assert.include(keys, 'border_top_right_radius_md');
		assert.include(keys, 'border_bottom_left_radius_md');
		assert.include(keys, 'border_bottom_right_radius_md');
		assert.lengthOf(keys, 4);
	});

	test('generates correct CSS for each corner', () => {
		const result = generate_border_radius_corners(['8px']);

		assert.strictEqual(
			get_declaration(result['border_top_left_radius_8px']),
			'border-top-left-radius: 8px;',
		);
		assert.strictEqual(
			get_declaration(result['border_bottom_right_radius_8px']),
			'border-bottom-right-radius: 8px;',
		);
	});

	test('applies formatter', () => {
		const result = generate_border_radius_corners(
			['lg'],
			(v) => `var(--test_border_top_left_radius_${v})`,
		);

		assert.strictEqual(
			get_declaration(result['border_top_left_radius_lg']),
			'border-top-left-radius: var(--test_border_top_left_radius_lg);',
		);
	});

	test('generates for multiple values', () => {
		const result = generate_border_radius_corners(['sm', 'lg']);

		assert.lengthOf(Object.keys(result), 8); // 4 corners * 2 values
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
		assert.include(keys, 'shadow_md');
		assert.include(keys, 'shadow_top_md');
		assert.include(keys, 'shadow_bottom_md');
		assert.include(keys, 'shadow_inset_md');
		assert.include(keys, 'shadow_inset_top_md');
		assert.include(keys, 'shadow_inset_bottom_md');
		assert.lengthOf(keys, 6);
	});

	test('generates correct CSS with alpha mapping', () => {
		const result = generate_shadow_classes(['md'], alpha_mapping);

		assert.include(get_declaration(result['shadow_md']), 'var(--shadow_md)');
		assert.include(get_declaration(result['shadow_md']), 'var(--shadow_alpha_2)');
	});

	test('uses correct variable prefix for each shadow type', () => {
		const result = generate_shadow_classes(['sm'], alpha_mapping);

		assert.include(get_declaration(result['shadow_sm']), 'var(--shadow_sm)');
		assert.include(get_declaration(result['shadow_top_sm']), 'var(--shadow_top_sm)');
		assert.include(get_declaration(result['shadow_inset_sm']), 'var(--shadow_inset_sm)');
	});

	test('generates for multiple sizes', () => {
		const result = generate_shadow_classes(['sm', 'md', 'lg'], alpha_mapping);

		assert.lengthOf(Object.keys(result), 18); // 6 types * 3 sizes
	});
});
