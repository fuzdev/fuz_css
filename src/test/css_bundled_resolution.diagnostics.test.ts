/**
 * Diagnostics tests for bundled CSS resolution.
 *
 * Tests typo detection for variables and unmatched element warnings.
 *
 * @module
 */

import {test, assert, describe} from 'vitest';

import {resolve_css} from '../lib/css_bundled_resolution.js';
import {create_test_fixtures} from './css_bundled_resolution_fixtures.js';

describe('resolve_css diagnostics', () => {
	describe('typo detection for variables', () => {
		test('emits warning for typo of known variable', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_primary', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				// 'color_primry' is a typo of 'color_primary' (missing 'a')
				detected_css_variables: new Set(['color_primary', 'color_primry']),
				utility_variables_used: new Set(),
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'warning');
			assert.include(result.diagnostics[0]!.message, 'color_primry');
			assert.include(result.diagnostics[0]!.message, 'did you mean');
			assert.include(result.diagnostics[0]!.message, 'color_primary');
			assert.include(result.diagnostics[0]!.suggestion!, 'color_primary');
		});

		test('emits warning for typo in transitive dep', () => {
			// Variable references a typo that's similar to another variable
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'main_color', light: 'var(--main_colr)'}, // references typo
				{name: 'main_colour', light: 'red'}, // similar - will be suggested
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['main_color']),
				utility_variables_used: new Set(),
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.include(result.diagnostics[0]!.message, 'main_colr');
			// Should suggest the most similar variable (either main_color or main_colour)
			assert.include(result.diagnostics[0]!.message, 'did you mean');
		});

		test('handles multiple typos', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'background_color', light: '#fff'},
				{name: 'foreground_color', light: '#000'},
				{name: 'border_radius', light: '4px'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				// All typos of known variables
				detected_css_variables: new Set([
					'backgroud_color', // typo of background_color
					'forground_color', // typo of foreground_color
					'boarder_radius', // typo of border_radius
				]),
				utility_variables_used: new Set(),
			});

			assert.strictEqual(result.diagnostics.length, 3);
			const messages = result.diagnostics.map((d) => d.message);
			assert.isTrue(messages.some((m) => m.includes('backgroud_color')));
			assert.isTrue(messages.some((m) => m.includes('forground_color')));
			assert.isTrue(messages.some((m) => m.includes('boarder_radius')));
		});

		test('no warning for user-defined variables (not similar to theme vars)', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_primary', light: 'blue'},
				{name: 'spacing_md', light: '16px'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				// These are user-defined, not similar to any theme variable
				detected_css_variables: new Set(['fill', 'shadow', 'icon_size', 'my_custom_var']),
				utility_variables_used: new Set(),
			});

			// No warnings because these don't look like typos
			assert.strictEqual(result.diagnostics.length, 0);
		});

		test('no diagnostics when all exist', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color', light: 'blue'},
				{name: 'space', light: '16px'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color', 'space']),
				utility_variables_used: new Set(),
			});

			assert.strictEqual(result.diagnostics.length, 0);
		});
	});

	describe('unmatched elements', () => {
		test('no warning by default', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'custom-element', 'my-widget']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			assert.strictEqual(result.diagnostics.length, 0);
		});

		test('warns when warn_unmatched_elements enabled', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'custom-element']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				warn_unmatched_elements: true,
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'warning');
			assert.include(result.diagnostics[0]!.message, 'custom-element');
			assert.include(result.diagnostics[0]!.message, 'No style rules found');
		});

		test('warns for multiple unmatched', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'my-custom', 'another-custom', 'third-one']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				warn_unmatched_elements: true,
			});

			assert.strictEqual(result.diagnostics.length, 3);
			const messages = result.diagnostics.map((d) => d.message);
			assert.isTrue(messages.some((m) => m.includes('my-custom')));
			assert.isTrue(messages.some((m) => m.includes('another-custom')));
			assert.isTrue(messages.some((m) => m.includes('third-one')));
		});

		test('no warning when all have rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					input { border: 1px solid; }
					a { text-decoration: none; }
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
				warn_unmatched_elements: true,
			});

			assert.strictEqual(result.diagnostics.length, 0);
		});
	});

	describe('explicit variables (@fuz-variables)', () => {
		test('emits error for explicit variable not in theme', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a_50', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['nonexistent_var']),
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, '@fuz-variables');
			assert.include(result.diagnostics[0]!.message, 'nonexistent_var');
			assert.include(result.diagnostics[0]!.message, 'No theme variable found');
			assert.include(result.diagnostics[0]!.suggestion!, 'Remove from @fuz-variables');
		});

		test('no error when explicit variable exists in theme', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a_50', light: 'blue'},
				{name: 'shade_40', light: '#ccc'},
			]);

			// Callers (gen_fuz_css/vite_plugin) add explicit_variables to detected_css_variables
			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a_50', 'shade_40']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['color_a_50', 'shade_40']),
			});

			assert.strictEqual(result.diagnostics.length, 0);
			// Valid explicit variables should be resolved
			assert.isTrue(result.resolved_variables.has('color_a_50'));
			assert.isTrue(result.resolved_variables.has('shade_40'));
		});

		test('suggests similar variable for typo', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'shade_40', light: '#ccc'},
				{name: 'shade_50', light: '#999'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['shade_4']), // typo
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, 'shade_4');
			assert.include(result.diagnostics[0]!.message, 'did you mean');
			assert.include(result.diagnostics[0]!.suggestion!, 'Check spelling');
		});

		test('errors for multiple explicit variables with mix of valid and invalid', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a_50', light: 'blue'},
				{name: 'shade_40', light: '#ccc'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_a_50', 'shade_40']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['color_a_50', 'bad_var_1', 'shade_40', 'bad_var_2']),
			});

			// Only the 2 invalid variables produce errors
			assert.strictEqual(result.diagnostics.length, 2);
			assert.isTrue(result.diagnostics.every((d) => d.level === 'error'));
			const messages = result.diagnostics.map((d) => d.message);
			assert.isTrue(messages.some((m) => m.includes('bad_var_1')));
			assert.isTrue(messages.some((m) => m.includes('bad_var_2')));
			// Valid variables should still be resolved
			assert.isTrue(result.resolved_variables.has('color_a_50'));
			assert.isTrue(result.resolved_variables.has('shade_40'));
		});

		test('explicit variable resolves transitive dependencies', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'base_hue', light: '210'},
				{name: 'derived_color', light: 'hsl(var(--base_hue) 50% 50%)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['derived_color']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['derived_color']),
			});

			assert.strictEqual(result.diagnostics.length, 0);
			assert.isTrue(result.resolved_variables.has('derived_color'));
			assert.isTrue(result.resolved_variables.has('base_hue'));
		});

		test('exclude_variables suppresses explicit_variables error', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a_50', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['nonexistent_var', 'also_missing']),
				exclude_variables: ['nonexistent_var'],
			});

			// Only 'also_missing' errors - 'nonexistent_var' is suppressed by exclude_variables
			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, 'also_missing');
		});
	});

	describe('explicit elements (@fuz-elements)', () => {
		test('emits error for explicit element with no rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'dialog']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_elements: new Set(['dialog']),
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, '@fuz-elements');
			assert.include(result.diagnostics[0]!.message, 'dialog');
			assert.include(result.diagnostics[0]!.message, 'No style rules found');
		});

		test('no error when explicit element has rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					dialog { padding: 1rem; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'dialog']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_elements: new Set(['dialog']),
			});

			assert.strictEqual(result.diagnostics.length, 0);
		});

		test('suggests similar element for typo', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					button { color: red; }
					dialog { padding: 1rem; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'dilog']), // typo
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_elements: new Set(['dilog']), // typo
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, 'dilog');
			assert.include(result.diagnostics[0]!.message, 'did you mean');
			assert.include(result.diagnostics[0]!.message, 'dialog');
		});

		test('errors for multiple explicit elements without rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'dialog', 'details', 'summary']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_elements: new Set(['dialog', 'details', 'summary']),
			});

			assert.strictEqual(result.diagnostics.length, 3);
			assert.isTrue(result.diagnostics.every((d) => d.level === 'error'));
		});

		test('exclude_elements suppresses explicit_elements error', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: red; }`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button', 'dialog', 'details']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
				explicit_elements: new Set(['dialog', 'details']),
				exclude_elements: ['dialog'],
			});

			// Only 'details' errors - 'dialog' is suppressed by exclude_elements
			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, 'details');
		});
	});
});
