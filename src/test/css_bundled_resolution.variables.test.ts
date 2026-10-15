/**
 * Variable resolution tests for bundled CSS resolution.
 *
 * Tests variable collection from multiple sources, transitive resolution,
 * cycle handling, and theme CSS generation.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import { resolve_css } from '#lib/css_bundled_resolution.ts';
import { extract_css_variables } from '#lib/css_variable_utils.ts';
import { default_variables } from '#lib/variables.ts';
import { create_test_fixtures, empty_detection } from './css_bundled_resolution_fixtures.ts';
import { assert_css_order } from './test_helpers.ts';

describe('resolve_css variable resolution', () => {
	describe('source collection', () => {
		test('from style rules', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				`button { color: var(--btn_color); }`,
				[{ name: 'btn_color', base: 'blue' }]
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.resolved_variables.has('btn_color'));
		});

		test.each([
			[
				'two groups deep',
				'@media print { @supports (display: grid) { button { color: var(--deep); } } }'
			],
			[
				'@keyframes inside a group',
				'@media print { @keyframes spin { to { rotate: var(--deep); } } }'
			],
			['a rule nested in a style rule', 'button { &:hover { color: var(--deep); } }'],
			['an at-rule that always ships', '@page { margin: var(--deep); }']
		])('from style rules, nested however deep: %s', (_name, css) => {
			const { style_rule_index, variable_graph } = create_test_fixtures(css, [
				{ name: 'deep', base: '1px' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set()
			});

			// the theme defines what the shipped rule references
			assert.include(result.base_css, 'var(--deep)');
			assert.include(result.theme_css, '--deep: 1px;');
		});

		test('from utility_variables_used', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'space_md', base: '16px' },
				{ name: 'unused', base: '0' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(['space_md'])
			});

			assert.isTrue(result.resolved_variables.has('space_md'));
			assert.isFalse(result.resolved_variables.has('unused'));
		});

		test('from detected_css_variables', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'custom', base: 'red' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['custom']),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.resolved_variables.has('custom'));
		});

		test('from additional_variables option', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'forced', base: 'always' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				...empty_detection(),
				additional_variables: ['forced']
			});

			assert.isTrue(result.resolved_variables.has('forced'));
		});

		test('additional_variables: "all" includes every variable', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'palette_a', base: 'blue' },
				{ name: 'palette_b', base: 'green' },
				{ name: 'palette_c', base: 'red' },
				{ name: 'space_sm', base: '8px' },
				{ name: 'space_md', base: '16px' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				...empty_detection(),
				additional_variables: 'all'
			});

			// All 5 variables should be included
			assert.strictEqual(result.resolved_variables.size, 5);
			assert.isTrue(result.resolved_variables.has('palette_a'));
			assert.isTrue(result.resolved_variables.has('palette_b'));
			assert.isTrue(result.resolved_variables.has('palette_c'));
			assert.isTrue(result.resolved_variables.has('space_sm'));
			assert.isTrue(result.resolved_variables.has('space_md'));
		});

		test('additional_variables: "all" includes transitive deps', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'base', base: '10' },
				{ name: 'derived', base: 'calc(var(--base) * 2)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				...empty_detection(),
				additional_variables: 'all'
			});

			assert.isTrue(result.resolved_variables.has('base'));
			assert.isTrue(result.resolved_variables.has('derived'));
		});

		test('combines all sources', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				`button { color: var(--btn_color); }`,
				[
					{ name: 'btn_color', base: 'blue' },
					{ name: 'space_md', base: '16px' },
					{ name: 'space_sm', base: '8px' },
					{ name: 'custom', base: 'red' },
					{ name: 'forced', base: 'always' }
				]
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(['button']),
				detected_classes: new Set(['gap_sm']),
				detected_css_variables: new Set(['custom']),
				utility_variables_used: new Set(['space_md', 'space_sm']),
				additional_variables: ['forced']
			});

			// From style rules
			assert.isTrue(result.resolved_variables.has('btn_color'));
			// From utility_variables_used - what the generated classes reference
			assert.isTrue(result.resolved_variables.has('space_sm'));
			assert.isTrue(result.resolved_variables.has('space_md'));
			// From detected_css_variables
			assert.isTrue(result.resolved_variables.has('custom'));
			// From additional_variables
			assert.isTrue(result.resolved_variables.has('forced'));
		});
	});

	describe('transitive resolution', () => {
		test('resolves direct dependencies', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				`button { color: var(--color); }`,
				[
					{ name: 'hue', base: '210' },
					{ name: 'color', base: 'hsl(var(--hue) 50% 50%)' }
				]
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.resolved_variables.has('color'));
			assert.isTrue(result.resolved_variables.has('hue'));
		});

		test('resolves deep chains (A→B→C→D)', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'base', base: '10' },
				{ name: 'level_1', base: 'calc(var(--base) * 2)' },
				{ name: 'level_2', base: 'calc(var(--level_1) * 2)' },
				{ name: 'level_3', base: 'calc(var(--level_2) * 2)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['level_3']),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.resolved_variables.has('level_3'));
			assert.isTrue(result.resolved_variables.has('level_2'));
			assert.isTrue(result.resolved_variables.has('level_1'));
			assert.isTrue(result.resolved_variables.has('base'));
		});

		test('resolves diamond dependencies (A→{B,C}→D)', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'base', base: '10' },
				{ name: 'branch_a', base: 'calc(var(--base) + 1)' },
				{ name: 'branch_b', base: 'calc(var(--base) + 2)' },
				{ name: 'combined', base: 'calc(var(--branch_a) + var(--branch_b))' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['combined']),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.resolved_variables.has('combined'));
			assert.isTrue(result.resolved_variables.has('branch_a'));
			assert.isTrue(result.resolved_variables.has('branch_b'));
			assert.isTrue(result.resolved_variables.has('base'));
			// Should have exactly 4 variables (no duplicates)
			assert.strictEqual(result.resolved_variables.size, 4);
		});

		test('resolves both light and dark deps', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'light_base', base: '#fff' },
				{ name: 'dark_base', dark: '#000' },
				{ name: 'themed', base: 'var(--light_base)', dark: 'var(--dark_base)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['themed']),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.resolved_variables.has('themed'));
			assert.isTrue(result.resolved_variables.has('light_base'));
			assert.isTrue(result.resolved_variables.has('dark_base'));
		});

		test('handles empty initial set', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'unused', base: 'value' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				...empty_detection()
			});

			assert.strictEqual(result.resolved_variables.size, 0);
		});
	});

	describe('cycle handling', () => {
		test('detects simple cycle (A→B→A)', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'a', base: 'var(--b)' },
				{ name: 'b', base: 'var(--a)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['a']),
				utility_variables_used: new Set()
			});

			// Should still resolve both
			assert.isTrue(result.resolved_variables.has('a'));
			assert.isTrue(result.resolved_variables.has('b'));
			// Should warn about the cycle
			assert.isTrue(result.diagnostics.some((d) => d.message.includes('Circular dependency')));
		});

		test('detects longer cycle (A→B→C→A)', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'a', base: 'var(--b)' },
				{ name: 'b', base: 'var(--c)' },
				{ name: 'c', base: 'var(--a)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['a']),
				utility_variables_used: new Set()
			});

			assert.isTrue(result.diagnostics.some((d) => d.message.includes('Circular dependency')));
		});

		test('propagates warnings to diagnostics', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'x', base: 'var(--y)' },
				{ name: 'y', base: 'var(--x)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['x']),
				utility_variables_used: new Set()
			});

			assert.strictEqual(result.diagnostics.length, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'warning');
			assert.strictEqual(result.diagnostics[0]!.phase, 'generation');
		});
	});

	describe('theme CSS generation', () => {
		test('base-only variables produce :root block', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'space_sm', base: '8px' },
				{ name: 'space_md', base: '16px' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['space_sm', 'space_md']),
				utility_variables_used: new Set()
			});

			assert.include(result.theme_css, ':root {');
			assert.include(result.theme_css, '--space_sm: 8px;');
			assert.include(result.theme_css, '--space_md: 16px;');
			assert.notInclude(result.theme_css, ':root.dark');
		});

		test('dark-only variables produce :root.dark block', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'shadow_color', dark: 'rgba(0,0,0,0.5)' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['shadow_color']),
				utility_variables_used: new Set()
			});

			assert.notMatch(result.theme_css, /^:root\s*\{/);
			assert.include(result.theme_css, ':root.dark {');
			assert.include(result.theme_css, '--shadow_color: rgba(0,0,0,0.5);');
		});

		test('both produce separate blocks', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'text_color', base: 'black', dark: 'white' },
				{ name: 'bg_color', base: 'white', dark: 'black' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['text_color', 'bg_color']),
				utility_variables_used: new Set()
			});

			assert.include(result.theme_css, ':root {');
			assert.include(result.theme_css, ':root.dark {');
			// Light values
			assert.include(result.theme_css, '--text_color: black;');
			assert.include(result.theme_css, '--bg_color: white;');
			// Dark values
			assert.include(result.theme_css, '--text_color: white;');
			assert.include(result.theme_css, '--bg_color: black;');
		});

		test('variables sorted alphabetically', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'zebra', base: '3' },
				{ name: 'alpha', base: '1' },
				{ name: 'mid', base: '2' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['zebra', 'alpha', 'mid']),
				utility_variables_used: new Set()
			});

			assert_css_order(result.theme_css, '--alpha', '--mid', '--zebra');
		});

		test('theme variables render :root and :root.dark blocks', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, [
				{ name: 'color', base: 'blue', dark: 'lightblue' }
			]);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(['color']),
				utility_variables_used: new Set()
			});

			assert.include(result.theme_css, ':root {');
			assert.include(result.theme_css, ':root.dark {');
		});

		test('empty variables produce empty string', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				`button { color: red; }`,
				[]
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				detected_elements: new Set(['button']),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set()
			});

			assert.strictEqual(result.theme_css, '');
		});
	});

	describe('private ramp intermediates', () => {
		test('a source reference to one is detected', () => {
			assert.isTrue(
				extract_css_variables('color: var(--_palette_lightness_30);').has('_palette_lightness_30')
			);
		});

		test('a color stop pulls in only its own stop of each intermediate', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(``, default_variables);
			const result = resolve_css({
				style_rule_index,
				variable_graph,
				...empty_detection(),
				detected_css_variables: new Set(['palette_a_50'])
			});
			for (const name of [
				'_palette_lightness_50',
				'_palette_chroma_50',
				'_chroma_shape_50',
				'palette_lightness_00',
				'palette_lightness_curve',
				'palette_chroma_min'
			]) {
				assert.isTrue(result.resolved_variables.has(name), name);
			}
			for (const name of ['_palette_lightness_30', '_palette_chroma_30', '_chroma_shape_30']) {
				assert.isFalse(result.resolved_variables.has(name), name);
			}
			assert.include(result.theme_css, '--_palette_lightness_50:');
		});

		test('a hint naming one resolves like a source reference', () => {
			// reading an intermediate is unsupported but harmless, and the hint
			// matches what a var() reference to it would include
			const { style_rule_index, variable_graph } = create_test_fixtures(``, default_variables);
			const result = resolve_css({
				style_rule_index,
				variable_graph,
				...empty_detection(),
				detected_css_variables: new Set(['_palette_lightness_30']),
				explicit_variables: new Set(['_palette_lightness_30'])
			});
			assert.deepEqual(result.diagnostics, []);
			assert.isTrue(result.resolved_variables.has('_palette_lightness_30'));
			assert.isTrue(result.resolved_variables.has('palette_lightness_100'));
		});
	});
});
