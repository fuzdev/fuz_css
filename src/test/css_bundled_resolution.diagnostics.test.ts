/**
 * Diagnostics tests for bundled CSS resolution.
 *
 * Tests typo detection for variables and unmatched element warnings.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

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

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.level).toBe('warning');
			expect(result.diagnostics[0]!.message).toContain('color_primry');
			expect(result.diagnostics[0]!.message).toContain('did you mean');
			expect(result.diagnostics[0]!.message).toContain('color_primary');
			expect(result.diagnostics[0]!.suggestion).toContain('color_primary');
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

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.message).toContain('main_colr');
			// Should suggest the most similar variable (either main_color or main_colour)
			expect(result.diagnostics[0]!.message).toContain('did you mean');
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

			expect(result.diagnostics.length).toBe(3);
			const messages = result.diagnostics.map((d) => d.message);
			expect(messages.some((m) => m.includes('backgroud_color'))).toBe(true);
			expect(messages.some((m) => m.includes('forground_color'))).toBe(true);
			expect(messages.some((m) => m.includes('boarder_radius'))).toBe(true);
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
			expect(result.diagnostics.length).toBe(0);
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

			expect(result.diagnostics.length).toBe(0);
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

			expect(result.diagnostics.length).toBe(0);
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

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.level).toBe('warning');
			expect(result.diagnostics[0]!.message).toContain('custom-element');
			expect(result.diagnostics[0]!.message).toContain('No style rules found');
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

			expect(result.diagnostics.length).toBe(3);
			const messages = result.diagnostics.map((d) => d.message);
			expect(messages.some((m) => m.includes('my-custom'))).toBe(true);
			expect(messages.some((m) => m.includes('another-custom'))).toBe(true);
			expect(messages.some((m) => m.includes('third-one'))).toBe(true);
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

			expect(result.diagnostics.length).toBe(0);
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

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('@fuz-elements');
			expect(result.diagnostics[0]!.message).toContain('dialog');
			expect(result.diagnostics[0]!.message).toContain('No style rules found');
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

			expect(result.diagnostics.length).toBe(0);
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

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('dilog');
			expect(result.diagnostics[0]!.message).toContain('did you mean');
			expect(result.diagnostics[0]!.message).toContain('dialog');
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

			expect(result.diagnostics.length).toBe(3);
			expect(result.diagnostics.every((d) => d.level === 'error')).toBe(true);
		});
	});

	describe('explicit variables (@fuz-variables)', () => {
		test('emits error for explicit variable not found', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_primary', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_primary', 'unknown_var']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['unknown_var']),
			});

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('@fuz-variables');
			expect(result.diagnostics[0]!.message).toContain('unknown_var');
			expect(result.diagnostics[0]!.message).toContain('not found');
		});

		test('no error when explicit variable exists', () => {
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
				detected_css_variables: new Set(['color_primary', 'spacing_md']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['spacing_md']),
			});

			expect(result.diagnostics.length).toBe(0);
		});

		test('suggests similar variable for typo', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_primary', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_primry']), // typo
				utility_variables_used: new Set(),
				explicit_variables: new Set(['color_primry']), // typo
			});

			expect(result.diagnostics.length).toBe(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('color_primry');
			expect(result.diagnostics[0]!.message).toContain('did you mean');
			expect(result.diagnostics[0]!.message).toContain('color_primary');
		});

		test('errors for multiple explicit variables not found', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_primary', light: 'blue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['unknown_a', 'unknown_b', 'unknown_c']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['unknown_a', 'unknown_b', 'unknown_c']),
			});

			expect(result.diagnostics.length).toBe(3);
			expect(result.diagnostics.every((d) => d.level === 'error')).toBe(true);
		});

		test('explicit variable warning is error, not warning', () => {
			// Contrast with non-explicit: regular typo detection produces warnings,
			// but explicit variables produce errors
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_primary', light: 'blue'},
			]);

			// Non-explicit typo: warning
			const result1 = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_primry']),
				utility_variables_used: new Set(),
				// Not in explicit_variables
			});

			expect(result1.diagnostics.length).toBe(1);
			expect(result1.diagnostics[0]!.level).toBe('warning');

			// Explicit typo: error
			const result2 = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color_primry']),
				utility_variables_used: new Set(),
				explicit_variables: new Set(['color_primry']),
			});

			expect(result2.diagnostics.length).toBe(1);
			expect(result2.diagnostics[0]!.level).toBe('error');
		});
	});
});
