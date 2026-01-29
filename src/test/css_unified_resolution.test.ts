/**
 * Core tests for unified CSS resolution.
 *
 * Tests the basic resolution algorithm for core rules, element matching,
 * and class matching.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {resolve_css} from '../lib/css_unified_resolution.js';
import {
	create_test_fixtures,
	assert_order,
	empty_detection,
} from './css_unified_resolution_fixtures.js';

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

		test('include_elements option forces inclusion', () => {
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
				include_elements: ['button'],
			});

			expect(result.base_css).toContain('color: red');
			expect(result.base_css).not.toContain('border');
			expect(result.included_elements.has('button')).toBe(true);
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

	describe('treeshake options', () => {
		test('treeshake_base_css: false includes all rules', () => {
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
				treeshake_base_css: false, // Disable tree-shaking
			});

			// Should include ALL rules, not just button
			expect(result.base_css).toContain('button');
			expect(result.base_css).toContain('input');
			expect(result.base_css).toContain('a { color: purple');
		});

		test('treeshake_base_css: true (default) only includes matching rules', () => {
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
				// treeshake_base_css defaults to true
			});

			// Should only include button
			expect(result.base_css).toContain('button');
			expect(result.base_css).not.toContain('input');
			expect(result.base_css).not.toContain('a { color: purple');
		});

		test('treeshake_variables: false includes all variables', () => {
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
				treeshake_variables: false, // Disable tree-shaking
			});

			// Should include ALL variables, not just color_a
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(true);
			expect(result.resolved_variables.has('color_c')).toBe(true);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).toContain('--color_b');
			expect(result.theme_css).toContain('--color_c');
		});

		test('treeshake_variables: true (default) only includes used variables', () => {
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
				// treeshake_variables defaults to true
			});

			// Should only include color_a
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(false);
			expect(result.resolved_variables.has('color_c')).toBe(false);
			expect(result.theme_css).toContain('--color_a');
			expect(result.theme_css).not.toContain('--color_b');
			expect(result.theme_css).not.toContain('--color_c');
		});

		test('both treeshake options false includes everything', () => {
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
				treeshake_base_css: false,
				treeshake_variables: false,
			});

			// All rules included
			expect(result.base_css).toContain('button');
			expect(result.base_css).toContain('input');
			// All variables included
			expect(result.theme_css).toContain('--btn_color');
			expect(result.theme_css).toContain('--unused');
		});
	});
});
