/**
 * Variable resolution tests for bundled CSS resolution.
 *
 * Tests variable collection from multiple sources, transitive resolution,
 * cycle handling, and theme CSS generation.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {resolve_css} from '../lib/css_bundled_resolution.js';
import type {CssClassDefinition} from '../lib/css_class_generation.js';
import {
	create_test_fixtures,
	assert_order,
	empty_detection,
} from './css_bundled_resolution_fixtures.js';

describe('resolve_css variable resolution', () => {
	describe('source collection', () => {
		test('from style rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: var(--btn_color); }`,
				[{name: 'btn_color', light: 'blue'}],
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

			expect(result.resolved_variables.has('btn_color')).toBe(true);
		});

		test('from class definitions (via class_variable_index)', () => {
			const class_defs: Record<string, CssClassDefinition | undefined> = {
				p_md: {declaration: 'padding: var(--space_md)'},
			};
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				``,
				[{name: 'space_md', light: '16px'}],
				class_defs,
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(['p_md']),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.resolved_variables.has('space_md')).toBe(true);
		});

		test('from utility_variables_used', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'space_md', light: '16px'},
				{name: 'unused', light: '0'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(['space_md']),
			});

			expect(result.resolved_variables.has('space_md')).toBe(true);
			expect(result.resolved_variables.has('unused')).toBe(false);
		});

		test('from detected_css_variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'custom', light: 'red'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['custom']),
				utility_variables_used: new Set(),
			});

			expect(result.resolved_variables.has('custom')).toBe(true);
		});

		test('from additional_variables option', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'forced', light: 'always'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				additional_variables: ['forced'],
			});

			expect(result.resolved_variables.has('forced')).toBe(true);
		});

		test('include_all_variables: true includes every variable', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color_a', light: 'blue'},
				{name: 'color_b', light: 'green'},
				{name: 'color_c', light: 'red'},
				{name: 'space_sm', light: '8px'},
				{name: 'space_md', light: '16px'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				include_all_variables: true,
			});

			// All 5 variables should be included
			expect(result.resolved_variables.size).toBe(5);
			expect(result.resolved_variables.has('color_a')).toBe(true);
			expect(result.resolved_variables.has('color_b')).toBe(true);
			expect(result.resolved_variables.has('color_c')).toBe(true);
			expect(result.resolved_variables.has('space_sm')).toBe(true);
			expect(result.resolved_variables.has('space_md')).toBe(true);
		});

		test('include_all_variables: true includes transitive deps', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'base', light: '10'},
				{name: 'derived', light: 'calc(var(--base) * 2)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
				include_all_variables: true,
			});

			expect(result.resolved_variables.has('base')).toBe(true);
			expect(result.resolved_variables.has('derived')).toBe(true);
		});

		test('combines all sources', () => {
			const class_defs: Record<string, CssClassDefinition | undefined> = {
				gap_sm: {declaration: 'gap: var(--space_sm)'},
			};
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: var(--btn_color); }`,
				[
					{name: 'btn_color', light: 'blue'},
					{name: 'space_md', light: '16px'},
					{name: 'space_sm', light: '8px'},
					{name: 'custom', light: 'red'},
					{name: 'forced', light: 'always'},
				],
				class_defs,
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(['button']),
				detected_classes: new Set(['gap_sm']),
				detected_css_variables: new Set(['custom']),
				utility_variables_used: new Set(['space_md']),
				additional_variables: ['forced'],
			});

			// From style rules
			expect(result.resolved_variables.has('btn_color')).toBe(true);
			// From class definitions
			expect(result.resolved_variables.has('space_sm')).toBe(true);
			// From utility_variables_used
			expect(result.resolved_variables.has('space_md')).toBe(true);
			// From detected_css_variables
			expect(result.resolved_variables.has('custom')).toBe(true);
			// From additional_variables
			expect(result.resolved_variables.has('forced')).toBe(true);
		});
	});

	describe('transitive resolution', () => {
		test('resolves direct dependencies', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`button { color: var(--color); }`,
				[
					{name: 'hue', light: '210'},
					{name: 'color', light: 'hsl(var(--hue) 50% 50%)'},
				],
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

			expect(result.resolved_variables.has('color')).toBe(true);
			expect(result.resolved_variables.has('hue')).toBe(true);
		});

		test('resolves deep chains (A→B→C→D)', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'base', light: '10'},
				{name: 'level_1', light: 'calc(var(--base) * 2)'},
				{name: 'level_2', light: 'calc(var(--level_1) * 2)'},
				{name: 'level_3', light: 'calc(var(--level_2) * 2)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['level_3']),
				utility_variables_used: new Set(),
			});

			expect(result.resolved_variables.has('level_3')).toBe(true);
			expect(result.resolved_variables.has('level_2')).toBe(true);
			expect(result.resolved_variables.has('level_1')).toBe(true);
			expect(result.resolved_variables.has('base')).toBe(true);
		});

		test('resolves diamond dependencies (A→{B,C}→D)', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'base', light: '10'},
				{name: 'branch_a', light: 'calc(var(--base) + 1)'},
				{name: 'branch_b', light: 'calc(var(--base) + 2)'},
				{name: 'combined', light: 'calc(var(--branch_a) + var(--branch_b))'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['combined']),
				utility_variables_used: new Set(),
			});

			expect(result.resolved_variables.has('combined')).toBe(true);
			expect(result.resolved_variables.has('branch_a')).toBe(true);
			expect(result.resolved_variables.has('branch_b')).toBe(true);
			expect(result.resolved_variables.has('base')).toBe(true);
			// Should have exactly 4 variables (no duplicates)
			expect(result.resolved_variables.size).toBe(4);
		});

		test('resolves both light and dark deps', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'light_base', light: '#fff'},
				{name: 'dark_base', dark: '#000'},
				{name: 'themed', light: 'var(--light_base)', dark: 'var(--dark_base)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['themed']),
				utility_variables_used: new Set(),
			});

			expect(result.resolved_variables.has('themed')).toBe(true);
			expect(result.resolved_variables.has('light_base')).toBe(true);
			expect(result.resolved_variables.has('dark_base')).toBe(true);
		});

		test('handles empty initial set', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'unused', light: 'value'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				...empty_detection(),
			});

			expect(result.resolved_variables.size).toBe(0);
		});
	});

	describe('cycle handling', () => {
		test('detects simple cycle (A→B→A)', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'a', light: 'var(--b)'},
				{name: 'b', light: 'var(--a)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['a']),
				utility_variables_used: new Set(),
			});

			// Should still resolve both
			expect(result.resolved_variables.has('a')).toBe(true);
			expect(result.resolved_variables.has('b')).toBe(true);
			// Should warn about the cycle
			expect(result.diagnostics.some((d) => d.message.includes('Circular dependency'))).toBe(true);
		});

		test('detects longer cycle (A→B→C→A)', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'a', light: 'var(--b)'},
				{name: 'b', light: 'var(--c)'},
				{name: 'c', light: 'var(--a)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['a']),
				utility_variables_used: new Set(),
			});

			expect(result.diagnostics.some((d) => d.message.includes('Circular dependency'))).toBe(true);
		});

		test('propagates warnings to diagnostics', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'x', light: 'var(--y)'},
				{name: 'y', light: 'var(--x)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['x']),
				utility_variables_used: new Set(),
			});

			expect(result.diagnostics.length).toBeGreaterThan(0);
			expect(result.diagnostics[0]!.level).toBe('warning');
			expect(result.diagnostics[0]!.phase).toBe('generation');
		});
	});

	describe('theme CSS generation', () => {
		test('light-only variables produce :root block', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'space_sm', light: '8px'},
				{name: 'space_md', light: '16px'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['space_sm', 'space_md']),
				utility_variables_used: new Set(),
			});

			expect(result.theme_css).toContain(':root {');
			expect(result.theme_css).toContain('--space_sm: 8px;');
			expect(result.theme_css).toContain('--space_md: 16px;');
			expect(result.theme_css).not.toContain(':root.dark');
		});

		test('dark-only variables produce :root.dark block', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'shadow_color', dark: 'rgba(0,0,0,0.5)'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['shadow_color']),
				utility_variables_used: new Set(),
			});

			expect(result.theme_css).not.toMatch(/^:root\s*\{/);
			expect(result.theme_css).toContain(':root.dark {');
			expect(result.theme_css).toContain('--shadow_color: rgba(0,0,0,0.5);');
		});

		test('both produce separate blocks', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'text_color', light: 'black', dark: 'white'},
				{name: 'bg_color', light: 'white', dark: 'black'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['text_color', 'bg_color']),
				utility_variables_used: new Set(),
			});

			expect(result.theme_css).toContain(':root {');
			expect(result.theme_css).toContain(':root.dark {');
			// Light values
			expect(result.theme_css).toContain('--text_color: black;');
			expect(result.theme_css).toContain('--bg_color: white;');
			// Dark values
			expect(result.theme_css).toContain('--text_color: white;');
			expect(result.theme_css).toContain('--bg_color: black;');
		});

		test('variables sorted alphabetically', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'zebra', light: '3'},
				{name: 'alpha', light: '1'},
				{name: 'mid', light: '2'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['zebra', 'alpha', 'mid']),
				utility_variables_used: new Set(),
			});

			assert_order(result.theme_css, '--alpha', '--mid', '--zebra');
		});

		test('theme_specificity multiplies :root', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
				{name: 'color', light: 'blue', dark: 'lightblue'},
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color']),
				utility_variables_used: new Set(),
				theme_specificity: 3,
			});

			expect(result.theme_css).toContain(':root:root:root {');
			expect(result.theme_css).toContain(':root:root:root.dark {');
		});

		test('empty variables produce empty string', () => {
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
		});
	});
});
