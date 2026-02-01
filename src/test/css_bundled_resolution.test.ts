/**
 * Core tests for bundled CSS resolution.
 *
 * Tests the basic resolution algorithm for core rules, element matching,
 * and class matching.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {resolve_css} from '../lib/css_bundled_resolution.js';
import {
	create_test_fixtures,
	assert_order,
	empty_detection,
} from './css_bundled_resolution_fixtures.js';

/**
 * Core rules that should always be included regardless of detected elements.
 */
const core_rules_cases = [
	{
		name: '* selector',
		css: '* { box-sizing: border-box; }',
		expected: 'box-sizing: border-box',
		not_expected: null,
	},
	{
		name: ':root selector',
		css: ':root { font-size: 16px; }\nbutton { color: red; }',
		expected: 'font-size: 16px',
		not_expected: 'color: red',
	},
	{
		name: 'body selector',
		css: 'body { margin: 0; background: white; }\nbutton { color: blue; }',
		expected: 'margin: 0',
		not_expected: null,
	},
	{
		name: '@font-face rules',
		css: '@font-face { font-family: "Custom"; src: url("font.woff2"); }\nbutton { color: red; }',
		expected: '@font-face',
		not_expected: 'button',
	},
	{
		name: '@media (prefers-reduced-motion) rules',
		css: '@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; } }\nbutton { color: red; }',
		expected: 'prefers-reduced-motion',
		not_expected: 'button',
	},
];

describe('resolve_css', () => {
	describe('core rules', () => {
		test.each(core_rules_cases)('includes $name', ({css, expected, not_expected}) => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				css,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
			});

			expect(result.base_css).toContain(expected);
			if (not_expected) {
				expect(result.base_css).not.toContain(not_expected);
			}
		});
	});

	describe('element matching', () => {
		test('includes rules for detected elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					* { margin: 0; }
					button { color: blue; }
					input { color: green; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('color: blue');
			expect(result.base_css).not.toContain('color: green');
			expect(result.included_elements.has('button')).toBe(true);
		});

		test('excludes rules for undetected elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { padding: 10px; }
					input { border: 1px solid; }
					a { text-decoration: none; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'a']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('button { padding: 10px; }');
			expect(result.base_css).toContain('a { text-decoration: none; }');
			expect(result.base_css).not.toContain('input');
		});

		test('additional_elements option forces inclusion', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					input { border: 1px solid; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_elements: ['button'],
			});

			expect(result.base_css).toContain('color: red');
			expect(result.base_css).not.toContain('border');
			expect(result.included_elements.has('button')).toBe(true);
		});

		test('additional_elements with multiple values', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					input { border: 1px solid; }
					dialog { padding: 16px; }
					select { appearance: none; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_elements: ['button', 'input', 'dialog'],
			});

			expect(result.base_css).toContain('color: red');
			expect(result.base_css).toContain('border: 1px solid');
			expect(result.base_css).toContain('padding: 16px');
			expect(result.base_css).not.toContain('appearance: none');
			expect(result.included_elements.has('button')).toBe(true);
			expect(result.included_elements.has('input')).toBe(true);
			expect(result.included_elements.has('dialog')).toBe(true);
			expect(result.included_elements.has('select')).toBe(false);
		});

		test('additional_elements combined with detected_elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					input { border: 1px solid; }
					a { text-decoration: none; }
					select { appearance: none; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'a']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				additional_elements: ['input'],
			});

			// Both detected and additional should be included
			expect(result.base_css).toContain('color: red');
			expect(result.base_css).toContain('border: 1px solid');
			expect(result.base_css).toContain('text-decoration: none');
			expect(result.base_css).not.toContain('appearance: none');
			expect(result.included_elements.has('button')).toBe(true);
			expect(result.included_elements.has('input')).toBe(true);
			expect(result.included_elements.has('a')).toBe(true);
		});

		test('additional_elements with overlapping detected_elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					input { border: 1px solid; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				additional_elements: ['button', 'input'], // button appears in both
			});

			// Both should be included, no errors from overlap
			expect(result.base_css).toContain('color: red');
			expect(result.base_css).toContain('border: 1px solid');
			expect(result.included_elements.has('button')).toBe(true);
			expect(result.included_elements.has('input')).toBe(true);
		});

		test('handles multiple elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { padding: 10px; }
					input { border: 1px solid; }
					a { text-decoration: none; }
					select { appearance: none; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'input', 'a']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('button');
			expect(result.base_css).toContain('input');
			expect(result.base_css).toContain('a { text-decoration');
			expect(result.base_css).not.toContain('select');
		});

		test('preserves cascade order', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					a { color: blue; }
					a:hover { color: darkblue; }
					a:active { color: navy; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['a']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			assert_order(result.base_css, 'color: blue', 'color: darkblue', 'color: navy');
		});
	});

	describe('class matching', () => {
		test('includes rules for detected classes', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button.selected { background: blue; }
					button.disabled { opacity: 0.5; }
					.hidden { display: none; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(['selected', 'hidden']),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('button.selected');
			expect(result.base_css).toContain('.hidden');
			expect(result.base_css).not.toContain('disabled');
		});

		test('excludes rules for undetected classes', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					.active { color: green; }
					.inactive { color: gray; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(['active']),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('color: green');
			expect(result.base_css).not.toContain('color: gray');
		});

		test('combines element and class matching', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { padding: 8px; }
					button.primary { background: blue; }
					.warning { color: orange; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(['primary', 'warning']),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('button { padding');
			expect(result.base_css).toContain('button.primary');
			expect(result.base_css).toContain('.warning');
		});
	});

	describe('base CSS generation', () => {
		test('includes matched rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { padding: 10px; }
					input { border: 1px solid; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('button { padding: 10px; }');
			expect(result.base_css).not.toContain('input');
		});

		test('preserves original order', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { padding: 5px; }
					button:hover { background: gray; }
					button:focus { outline: none; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			assert_order(result.base_css, 'padding: 5px', 'background: gray', 'outline: none');
		});

		test('includes @media rules for elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { font-size: 14px; }
					@media (min-width: 768px) { button { font-size: 16px; } }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('font-size: 14px');
			expect(result.base_css).toContain('@media (min-width: 768px)');
			expect(result.base_css).toContain('font-size: 16px');
		});

		test('includes @supports rules for elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { display: block; }
					@supports (display: grid) { button { display: grid; } }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('display: block');
			expect(result.base_css).toContain('@supports (display: grid)');
			expect(result.base_css).toContain('display: grid');
		});

		test('includes @container rules for elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { padding: 8px; }
					@container (min-width: 400px) { button { padding: 16px; } }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('padding: 8px');
			expect(result.base_css).toContain('@container (min-width: 400px)');
			expect(result.base_css).toContain('padding: 16px');
		});
	});

	describe('statistics', () => {
		test('not included by default', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.stats).toBeUndefined();
		});

		test('included when include_stats true', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					* { margin: 0; }
					button { color: blue; }
					input { color: green; }
				`,
				[{name: 'color', light: 'red'}],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color']),
				utility_variables_used: new Set(),
				include_stats: true,
			});

			expect(result.stats).toBeDefined();
			expect(result.stats?.element_count).toBe(1);
			expect(result.stats?.elements).toContain('button');
			expect(result.stats?.included_rules).toBeGreaterThan(0);
			expect(result.stats?.total_rules).toBe(3);
			expect(result.stats?.variable_count).toBe(1);
		});

		test('reflects actual counts', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					* { box-sizing: border-box; }
					button { color: blue; }
					input { border: 1px solid; }
					a { text-decoration: none; }
				`,
				[
					{name: 'color_a', light: 'blue'},
					{name: 'color_b', light: 'green'},
				],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'a']),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a']),
				utility_variables_used: new Set(),
				include_stats: true,
			});

			expect(result.stats!.element_count).toBe(2);
			expect(result.stats!.elements).toContain('button');
			expect(result.stats!.elements).toContain('a');
			expect(result.stats!.elements).not.toContain('input');
			expect(result.stats!.included_rules).toBe(3); // * + button + a
			expect(result.stats!.total_rules).toBe(4);
			expect(result.stats!.variable_count).toBe(1);
		});
	});

	describe('empty scenarios', () => {
		test('projects without any HTML elements still work', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					* { box-sizing: border-box; }
					:root { font-size: 16px; }
					body { margin: 0; }
					button { color: red; }
					input { border: 1px solid; }
				`,
				[
					{name: 'text_color', light: 'black'},
					{name: 'bg_color', light: 'white'},
				],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(['p_md', 'box']),
				detected_css_variables: new Set(['text_color']),
				utility_variables_used: new Set(['bg_color']),
			});

			// Core rules should still be included
			expect(result.base_css).toContain('box-sizing: border-box');
			expect(result.base_css).toContain('font-size: 16px');
			expect(result.base_css).toContain('margin: 0');
			// Non-core element rules should NOT be included
			expect(result.base_css).not.toContain('button');
			expect(result.base_css).not.toContain('input');
			// Theme CSS should work
			expect(result.theme_css).toContain('--text_color: black');
			expect(result.theme_css).toContain('--bg_color: white');
		});

		test('empty style_rule_index', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color']),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toBe('');
			expect(result.theme_css).toContain('--color: blue');
		});

		test('empty variable_graph', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.theme_css).toBe('');
			expect(result.base_css).toContain('button');
		});

		test('empty detected sets', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					* { margin: 0; }
					button { color: red; }
				`,
				[{name: 'unused', light: 'value'}],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
			});

			// Should only include core rules
			expect(result.base_css).toContain('margin: 0');
			expect(result.base_css).not.toContain('button');
			expect(result.theme_css).toBe('');
		});
	});

	describe('additional_variables option', () => {
		test('additional_variables forces inclusion', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_variables: ['color_b'],
			});

			// Only additional_variables should be included (nothing detected)
			expect(result.resolved_variables.has('color_a')).toBe(false);
			expect(result.resolved_variables.has('color_b')).toBe(true);
			expect(result.resolved_variables.has('color_c')).toBe(false);
			expect(result.theme_css).toContain('--color_b');
			expect(result.theme_css).not.toContain('--color_a');
		});

		test('additional_variables combined with detected_css_variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a']),
				utility_variables_used: new Set(),
				additional_variables: ['color_c'],
			});

			// Both detected and additional should be included
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(false);
			expect(result.resolved_variables.has('color_c')).toBe(true);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).toContain('--color_c');
		});

		test('additional_variables with overlapping detected_css_variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a']),
				utility_variables_used: new Set(),
				additional_variables: ['color_a', 'color_b'], // color_a in both
			});

			// Both should be included, no errors from overlap
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(true);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).toContain('--color_b');
		});

		test('additional_variables with include_all_variables: true', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_variables: ['color_a'],
				include_all_variables: true,
			});

			// With include_all on, all variables included regardless of additional_variables
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(true);
		});
	});

	describe('additional_elements and additional_variables combined', () => {
		test('both options work together', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: var(--btn_color); }
					input { border: 1px solid var(--input_border); }
				`,
				[
					{name: 'btn_color', light: 'blue'},
					{name: 'input_border', light: 'gray'},
					{name: 'extra_var', light: 'red'},
				],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_elements: ['button'],
				additional_variables: ['extra_var'],
			});

			// Button rules included
			expect(result.base_css).toContain('button');
			expect(result.base_css).not.toContain('input');
			// Extra var and transitive deps included
			expect(result.theme_css).toContain('--extra_var');
			expect(result.theme_css).toContain('--btn_color'); // transitive from button rule
		});

		test('additional_elements brings transitive variable dependencies', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: var(--btn_color); }`,
				[
					{name: 'btn_color', light: 'var(--base_color)'},
					{name: 'base_color', light: 'blue'},
				],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_elements: ['button'],
			});

			// Both btn_color and its dependency base_color should be included
			expect(result.theme_css).toContain('--btn_color');
			expect(result.theme_css).toContain('--base_color');
		});
	});

	describe('include_all options', () => {
		test('include_all_base_css: true includes all rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: blue; }
					input { color: green; }
					a { color: purple; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']), // Only detect button
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				include_all_base_css: true, // Include all rules
			});

			// Should include ALL rules, not just button
			expect(result.base_css).toContain('button');
			expect(result.base_css).toContain('input');
			expect(result.base_css).toContain('a { color: purple');
		});

		test('include_all_base_css: false (default) only includes matching rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: blue; }
					input { color: green; }
					a { color: purple; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				// include_all_base_css defaults to false
			});

			// Should only include button
			expect(result.base_css).toContain('button');
			expect(result.base_css).not.toContain('input');
			expect(result.base_css).not.toContain('a { color: purple');
		});

		test('include_all_variables: true includes all variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a']), // Only detect color_a
				utility_variables_used: new Set(),
				include_all_variables: true, // Include all variables
			});

			// Should include ALL variables, not just color_a
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(true);
			expect(result.resolved_variables.has('color_c')).toBe(true);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).toContain('--color_b');
			expect(result.theme_css).toContain('--color_c');
		});

		test('include_all_variables: false (default) only includes used variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a']),
				utility_variables_used: new Set(),
				// include_all_variables defaults to false
			});

			// Should only include color_a
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(false);
			expect(result.resolved_variables.has('color_c')).toBe(false);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).not.toContain('--color_b');
			expect(result.theme_css).not.toContain('--color_c');
		});

		test('both include_all options true includes everything', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: var(--btn_color); }
					input { border: 1px solid; }
				`,
				[
					{name: 'btn_color', light: 'blue'},
					{name: 'unused', light: 'red'},
				],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				include_all_base_css: true,
				include_all_variables: true,
			});

			// All rules included
			expect(result.base_css).toContain('button');
			expect(result.base_css).toContain('input');
			// All variables included
			expect(result.theme_css).toContain('--btn_color');
			expect(result.theme_css).toContain('--unused');
		});
	});

	describe('exclude options', () => {
		test('exclude_elements filters from included elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: blue; }
					input { color: green; }
					a { color: purple; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'input', 'a']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				exclude_elements: ['input'],
			});

			// button and a included, input excluded
			expect(result.base_css).toContain('button');
			expect(result.base_css).not.toContain('input');
			expect(result.base_css).toContain('a { color: purple');
			expect(result.included_elements.has('button')).toBe(true);
			expect(result.included_elements.has('input')).toBe(false);
			expect(result.included_elements.has('a')).toBe(true);
		});

		test('exclude_elements combined with additional_elements', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: blue; }
					input { color: green; }
					a { color: purple; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				additional_elements: ['input', 'a'],
				exclude_elements: ['input'], // Exclude even though it's in additional
			});

			// button and a included, input excluded
			expect(result.base_css).toContain('button');
			expect(result.base_css).not.toContain('input');
			expect(result.base_css).toContain('a { color: purple');
		});

		test('exclude_variables filters from resolved variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a', 'color_b', 'color_c']),
				utility_variables_used: new Set(),
				exclude_variables: ['color_b'],
			});

			// color_a and color_c included, color_b excluded
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(false);
			expect(result.resolved_variables.has('color_c')).toBe(true);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).not.toContain('--color_b');
			expect(result.theme_css).toContain('--color_c');
		});

		test('exclude_variables combined with additional_variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a']),
				utility_variables_used: new Set(),
				additional_variables: ['color_b', 'color_c'],
				exclude_variables: ['color_b'], // Exclude even though it's in additional
			});

			// color_a and color_c included, color_b excluded
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(false);
			expect(result.resolved_variables.has('color_c')).toBe(true);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).not.toContain('--color_b');
			expect(result.theme_css).toContain('--color_c');
		});
	});
});
