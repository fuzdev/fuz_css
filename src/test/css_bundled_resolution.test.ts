/**
 * Core tests for bundled CSS resolution.
 *
 * Tests the basic resolution algorithm for core rules, element matching,
 * and class matching.
 *
 * @module
 */

import {test, assert, describe} from 'vitest';

import {resolve_css} from '../lib/css_bundled_resolution.js';
import {create_test_fixtures, empty_detection} from './css_bundled_resolution_fixtures.js';
import {assert_css_order} from './test_helpers.js';

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

			assert.include(result.base_css, expected);
			if (not_expected) {
				assert.notInclude(result.base_css, not_expected);
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

			assert.include(result.base_css, 'color: blue');
			assert.notInclude(result.base_css, 'color: green');
			assert.isTrue(result.included_elements.has('button'));
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

			assert.include(result.base_css, 'button { padding: 10px; }');
			assert.include(result.base_css, 'a { text-decoration: none; }');
			assert.notInclude(result.base_css, 'input');
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

			assert.include(result.base_css, 'color: red');
			assert.notInclude(result.base_css, 'border');
			assert.isTrue(result.included_elements.has('button'));
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

			assert.include(result.base_css, 'color: red');
			assert.include(result.base_css, 'border: 1px solid');
			assert.include(result.base_css, 'padding: 16px');
			assert.notInclude(result.base_css, 'appearance: none');
			assert.isTrue(result.included_elements.has('button'));
			assert.isTrue(result.included_elements.has('input'));
			assert.isTrue(result.included_elements.has('dialog'));
			assert.isFalse(result.included_elements.has('select'));
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
			assert.include(result.base_css, 'color: red');
			assert.include(result.base_css, 'border: 1px solid');
			assert.include(result.base_css, 'text-decoration: none');
			assert.notInclude(result.base_css, 'appearance: none');
			assert.isTrue(result.included_elements.has('button'));
			assert.isTrue(result.included_elements.has('input'));
			assert.isTrue(result.included_elements.has('a'));
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
			assert.include(result.base_css, 'color: red');
			assert.include(result.base_css, 'border: 1px solid');
			assert.isTrue(result.included_elements.has('button'));
			assert.isTrue(result.included_elements.has('input'));
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

			assert.include(result.base_css, 'button');
			assert.include(result.base_css, 'input');
			assert.include(result.base_css, 'a { text-decoration');
			assert.notInclude(result.base_css, 'select');
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

			assert_css_order(result.base_css, 'color: blue', 'color: darkblue', 'color: navy');
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

			assert.include(result.base_css, 'button.selected');
			assert.include(result.base_css, '.hidden');
			assert.notInclude(result.base_css, 'disabled');
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

			assert.include(result.base_css, 'color: green');
			assert.notInclude(result.base_css, 'color: gray');
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

			assert.include(result.base_css, 'button { padding');
			assert.include(result.base_css, 'button.primary');
			assert.include(result.base_css, '.warning');
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

			assert.include(result.base_css, 'button { padding: 10px; }');
			assert.notInclude(result.base_css, 'input');
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

			assert_css_order(result.base_css, 'padding: 5px', 'background: gray', 'outline: none');
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

			assert.include(result.base_css, 'font-size: 14px');
			assert.include(result.base_css, '@media (min-width: 768px)');
			assert.include(result.base_css, 'font-size: 16px');
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

			assert.include(result.base_css, 'display: block');
			assert.include(result.base_css, '@supports (display: grid)');
			assert.include(result.base_css, 'display: grid');
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

			assert.include(result.base_css, 'padding: 8px');
			assert.include(result.base_css, '@container (min-width: 400px)');
			assert.include(result.base_css, 'padding: 16px');
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

			assert.isUndefined(result.stats);
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

			assert.isDefined(result.stats);
			assert.strictEqual(result.stats.element_count, 1);
			assert.include(result.stats.elements as unknown as string, 'button');
			assert.isAbove(result.stats.included_rules, 0);
			assert.strictEqual(result.stats.total_rules, 3);
			assert.strictEqual(result.stats.variable_count, 1);
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

			assert.strictEqual(result.stats!.element_count, 2);
			assert.include(result.stats!.elements as unknown as string, 'button');
			assert.include(result.stats!.elements as unknown as string, 'a');
			assert.notInclude(result.stats!.elements as unknown as string, 'input');
			assert.strictEqual(result.stats!.included_rules, 3); // * + button + a
			assert.strictEqual(result.stats!.total_rules, 4);
			assert.strictEqual(result.stats!.variable_count, 1);
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
			assert.include(result.base_css, 'box-sizing: border-box');
			assert.include(result.base_css, 'font-size: 16px');
			assert.include(result.base_css, 'margin: 0');
			// Non-core element rules should NOT be included
			assert.notInclude(result.base_css, 'button');
			assert.notInclude(result.base_css, 'input');
			// Theme CSS should work
			assert.include(result.theme_css, '--text_color: black');
			assert.include(result.theme_css, '--bg_color: white');
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

			assert.strictEqual(result.base_css, '');
			assert.include(result.theme_css, '--color: blue');
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

			assert.strictEqual(result.theme_css, '');
			assert.include(result.base_css, 'button');
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
			assert.include(result.base_css, 'margin: 0');
			assert.notInclude(result.base_css, 'button');
			assert.strictEqual(result.theme_css, '');
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
			assert.isFalse(result.resolved_variables.has('color_a'));
			assert.isTrue(result.resolved_variables.has('color_b'));
			assert.isFalse(result.resolved_variables.has('color_c'));
			assert.include(result.theme_css, '--color_b');
			assert.notInclude(result.theme_css, '--color_a');
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
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isFalse(result.resolved_variables.has('color_b'));
			assert.isTrue(result.resolved_variables.has('color_c'));
			assert.include(result.theme_css, '--color_a');
			assert.include(result.theme_css, '--color_c');
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
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isTrue(result.resolved_variables.has('color_b'));
			assert.include(result.theme_css, '--color_a');
			assert.include(result.theme_css, '--color_b');
		});

		test('additional_variables: "all" includes all variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_variables: 'all',
			});

			// With 'all', all variables included
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isTrue(result.resolved_variables.has('color_b'));
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
			assert.include(result.base_css, 'button');
			assert.notInclude(result.base_css, 'input');
			// Extra var and transitive deps included
			assert.include(result.theme_css, '--extra_var');
			assert.include(result.theme_css, '--btn_color'); // transitive from button rule
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
			assert.include(result.theme_css, '--btn_color');
			assert.include(result.theme_css, '--base_color');
		});
	});

	describe('additional_elements and additional_variables "all" option', () => {
		test('additional_elements: "all" includes all rules', () => {
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
				additional_elements: 'all', // Include all rules
			});

			// Should include ALL rules, not just button
			assert.include(result.base_css, 'button');
			assert.include(result.base_css, 'input');
			assert.include(result.base_css, 'a { color: purple');
		});

		test('default behavior only includes matching rules', () => {
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
				// no additional_elements
			});

			// Should only include button
			assert.include(result.base_css, 'button');
			assert.notInclude(result.base_css, 'input');
			assert.notInclude(result.base_css, 'a { color: purple');
		});

		test('additional_variables: "all" includes all variables', () => {
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
				additional_variables: 'all', // Include all variables
			});

			// Should include ALL variables, not just color_a
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isTrue(result.resolved_variables.has('color_b'));
			assert.isTrue(result.resolved_variables.has('color_c'));
			assert.include(result.theme_css, '--color_a');
			assert.include(result.theme_css, '--color_b');
			assert.include(result.theme_css, '--color_c');
		});

		test('default behavior only includes used variables', () => {
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
				// no additional_variables
			});

			// Should only include color_a
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isFalse(result.resolved_variables.has('color_b'));
			assert.isFalse(result.resolved_variables.has('color_c'));
			assert.include(result.theme_css, '--color_a');
			assert.notInclude(result.theme_css, '--color_b');
			assert.notInclude(result.theme_css, '--color_c');
		});

		test('both "all" options includes everything', () => {
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
				additional_elements: 'all',
				additional_variables: 'all',
			});

			// All rules included
			assert.include(result.base_css, 'button');
			assert.include(result.base_css, 'input');
			// All variables included
			assert.include(result.theme_css, '--btn_color');
			assert.include(result.theme_css, '--unused');
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
			assert.include(result.base_css, 'button');
			assert.notInclude(result.base_css, 'input');
			assert.include(result.base_css, 'a { color: purple');
			assert.isTrue(result.included_elements.has('button'));
			assert.isFalse(result.included_elements.has('input'));
			assert.isTrue(result.included_elements.has('a'));
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
			assert.include(result.base_css, 'button');
			assert.notInclude(result.base_css, 'input');
			assert.include(result.base_css, 'a { color: purple');
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
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isFalse(result.resolved_variables.has('color_b'));
			assert.isTrue(result.resolved_variables.has('color_c'));
			assert.include(result.theme_css, '--color_a');
			assert.notInclude(result.theme_css, '--color_b');
			assert.include(result.theme_css, '--color_c');
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
			assert.isTrue(result.resolved_variables.has('color_a'));
			assert.isFalse(result.resolved_variables.has('color_b'));
			assert.isTrue(result.resolved_variables.has('color_c'));
			assert.include(result.theme_css, '--color_a');
			assert.notInclude(result.theme_css, '--color_b');
			assert.include(result.theme_css, '--color_c');
		});
	});
});
