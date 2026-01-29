/**
 * Tests for unified CSS resolution.
 *
 * Tests the resolution algorithm that determines which CSS rules, theme variables,
 * and utility classes to include based on what elements and classes are actually
 * used in the project.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {resolve_css, generate_unified_css} from '../lib/css_unified_resolution.js';
import {parse_style_css} from '../lib/style_rule_parser.js';
import {build_variable_graph} from '../lib/variable_graph.js';
import {build_class_variable_index} from '../lib/class_variable_index.js';
import type {StyleVariable} from '../lib/variable.js';
import type {CssClassDefinition} from '../lib/css_class_generation.js';

/**
 * Helper to create minimal test fixtures for CSS resolution tests.
 */
const create_test_fixtures = (
	css: string,
	variables: Array<StyleVariable>,
	class_defs: Record<string, CssClassDefinition | undefined> = {},
) => {
	const style_rule_index = parse_style_css(css, 'test-hash');
	const variable_graph = build_variable_graph(variables, 'test-hash');
	const class_variable_index = build_class_variable_index(class_defs);
	return {style_rule_index, variable_graph, class_variable_index};
};

describe('resolve_css', () => {
	describe('core rules', () => {
		test('includes * selector', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					* { box-sizing: border-box; }
					button { color: red; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('box-sizing: border-box');
			expect(result.base_css).not.toContain('button');
		});

		test('includes :root selector', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					:root { font-size: 16px; }
					button { color: red; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('font-size: 16px');
			expect(result.base_css).not.toContain('color: red');
		});

		test('includes body selector', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					body { margin: 0; background: white; }
					button { color: blue; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('margin: 0');
			expect(result.base_css).toContain('background: white');
		});

		test('includes @font-face rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					@font-face { font-family: "Custom"; src: url("font.woff2"); }
					button { color: red; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('@font-face');
			expect(result.base_css).toContain('font-family: "Custom"');
		});

		test('includes @media (prefers-reduced-motion) rules', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				`
					@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; } }
					button { color: red; }
				`,
				[],
			);

			const result = resolve_css({
				style_rule_index,
				variable_graph,
				class_variable_index,
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			expect(result.base_css).toContain('prefers-reduced-motion');
			expect(result.base_css).not.toContain('button');
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
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
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

			const blue_pos = result.base_css.indexOf('color: blue');
			const darkblue_pos = result.base_css.indexOf('color: darkblue');
			const navy_pos = result.base_css.indexOf('color: navy');

			expect(blue_pos).toBeLessThan(darkblue_pos);
			expect(darkblue_pos).toBeLessThan(navy_pos);
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

	describe('variable resolution', () => {
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

			test('from include_variables option', () => {
				const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
					{name: 'forced', light: 'always'},
				]);

				const result = resolve_css({
					style_rule_index,
					variable_graph,
					class_variable_index,
					detected_elements: new Set(),
					detected_classes: new Set(),
					detected_css_variables: new Set(),
					utility_variables_used: new Set(),
					include_variables: ['forced'],
				});

				expect(result.resolved_variables.has('forced')).toBe(true);
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
					include_variables: ['forced'],
				});

				// From style rules
				expect(result.resolved_variables.has('btn_color')).toBe(true);
				// From class definitions
				expect(result.resolved_variables.has('space_sm')).toBe(true);
				// From utility_variables_used
				expect(result.resolved_variables.has('space_md')).toBe(true);
				// From detected_css_variables
				expect(result.resolved_variables.has('custom')).toBe(true);
				// From include_variables
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
					detected_elements: new Set(),
					detected_classes: new Set(),
					detected_css_variables: new Set(),
					utility_variables_used: new Set(),
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
				expect(result.diagnostics.some((d) => d.message.includes('Circular dependency'))).toBe(
					true,
				);
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

				expect(result.diagnostics.some((d) => d.message.includes('Circular dependency'))).toBe(
					true,
				);
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

			const alpha_pos = result.theme_css.indexOf('--alpha');
			const mid_pos = result.theme_css.indexOf('--mid');
			const zebra_pos = result.theme_css.indexOf('--zebra');

			expect(alpha_pos).toBeLessThan(mid_pos);
			expect(mid_pos).toBeLessThan(zebra_pos);
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

			const padding_pos = result.base_css.indexOf('padding: 5px');
			const hover_pos = result.base_css.indexOf('background: gray');
			const focus_pos = result.base_css.indexOf('outline: none');

			expect(padding_pos).toBeLessThan(hover_pos);
			expect(hover_pos).toBeLessThan(focus_pos);
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

	describe('diagnostics', () => {
		describe('missing variables', () => {
			test('emits warning for missing variable', () => {
				const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
					{name: 'exists', light: 'blue'},
				]);

				const result = resolve_css({
					style_rule_index,
					variable_graph,
					class_variable_index,
					detected_elements: new Set(),
					detected_classes: new Set(),
					detected_css_variables: new Set(['exists', 'does_not_exist']),
					utility_variables_used: new Set(),
				});

				expect(result.diagnostics.length).toBe(1);
				expect(result.diagnostics[0]!.level).toBe('warning');
				expect(result.diagnostics[0]!.message).toContain('does_not_exist');
				expect(result.diagnostics[0]!.message).toContain('not found');
				expect(result.diagnostics[0]!.suggestion).toContain('include_variables');
			});

			test('emits warning for missing transitive dep', () => {
				const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(``, [
					{name: 'color', light: 'var(--missing_hue)'},
				]);

				const result = resolve_css({
					style_rule_index,
					variable_graph,
					class_variable_index,
					detected_elements: new Set(),
					detected_classes: new Set(),
					detected_css_variables: new Set(['color']),
					utility_variables_used: new Set(),
				});

				expect(result.diagnostics.length).toBe(1);
				expect(result.diagnostics[0]!.message).toContain('missing_hue');
			});

			test('handles multiple missing variables', () => {
				const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
					``,
					[],
				);

				const result = resolve_css({
					style_rule_index,
					variable_graph,
					class_variable_index,
					detected_elements: new Set(),
					detected_classes: new Set(),
					detected_css_variables: new Set(['missing1', 'missing2', 'missing3']),
					utility_variables_used: new Set(),
				});

				expect(result.diagnostics.length).toBe(3);
				const messages = result.diagnostics.map((d) => d.message);
				expect(messages.some((m) => m.includes('missing1'))).toBe(true);
				expect(messages.some((m) => m.includes('missing2'))).toBe(true);
				expect(messages.some((m) => m.includes('missing3'))).toBe(true);
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
				detected_elements: new Set(),
				detected_classes: new Set(),
				detected_css_variables: new Set(),
				utility_variables_used: new Set(),
			});

			// Should only include core rules
			expect(result.base_css).toContain('margin: 0');
			expect(result.base_css).not.toContain('button');
			expect(result.theme_css).toBe('');
		});
	});
});

describe('generate_unified_css', () => {
	describe('section ordering', () => {
		test('theme before base before utilities', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: 'button { color: red; }',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const combined = generate_unified_css(result, '.p_md { padding: 16px; }');

			const theme_pos = combined.indexOf('/* Theme Variables */');
			const base_pos = combined.indexOf('/* Base Styles */');
			const utility_pos = combined.indexOf('/* Utility Classes */');

			expect(theme_pos).toBeLessThan(base_pos);
			expect(base_pos).toBeLessThan(utility_pos);
		});

		test('includes section comments', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: 'button { padding: 10px; }',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const unified = generate_unified_css(result, '.p_md { padding: 16px; }');

			expect(unified).toContain('/* Theme Variables */');
			expect(unified).toContain('/* Base Styles */');
			expect(unified).toContain('/* Utility Classes */');
		});
	});

	describe('exclusion options', () => {
		test('include_theme: false excludes theme', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: 'button { color: red; }',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const no_theme = generate_unified_css(result, '.p_md {}', {include_theme: false});

			expect(no_theme).not.toContain('/* Theme Variables */');
			expect(no_theme).not.toContain('--color');
			expect(no_theme).toContain('/* Base Styles */');
			expect(no_theme).toContain('/* Utility Classes */');
		});

		test('include_base: false excludes base', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: 'button { color: red; }',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const no_base = generate_unified_css(result, '.p_md {}', {include_base: false});

			expect(no_base).toContain('/* Theme Variables */');
			expect(no_base).not.toContain('/* Base Styles */');
			expect(no_base).not.toContain('button { color');
			expect(no_base).toContain('/* Utility Classes */');
		});

		test('include_utilities: false excludes utilities', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: 'button { color: red; }',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const no_utility = generate_unified_css(result, '.p_md { padding: 16px; }', {
				include_utilities: false,
			});

			expect(no_utility).toContain('/* Theme Variables */');
			expect(no_utility).toContain('/* Base Styles */');
			expect(no_utility).not.toContain('/* Utility Classes */');
			expect(no_utility).not.toContain('.p_md');
		});
	});

	describe('empty handling', () => {
		test('empty theme produces no section', () => {
			const result = {
				theme_css: '',
				base_css: 'button { color: red; }',
				resolved_variables: new Set<string>(),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const unified = generate_unified_css(result, '.p_md {}');

			expect(unified).not.toContain('/* Theme Variables */');
			expect(unified).toContain('/* Base Styles */');
			expect(unified).toContain('/* Utility Classes */');
		});

		test('empty base produces no section', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: '',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>(),
				diagnostics: [],
			};

			const unified = generate_unified_css(result, '.p_md {}');

			expect(unified).toContain('/* Theme Variables */');
			expect(unified).not.toContain('/* Base Styles */');
			expect(unified).toContain('/* Utility Classes */');
		});

		test('empty utilities produces no section', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: 'button { color: red; }',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set([0]),
				included_elements: new Set(['button']),
				diagnostics: [],
			};

			const unified = generate_unified_css(result, '');

			expect(unified).toContain('/* Theme Variables */');
			expect(unified).toContain('/* Base Styles */');
			expect(unified).not.toContain('/* Utility Classes */');
		});

		test('all empty produces empty string', () => {
			const result = {
				theme_css: '',
				base_css: '',
				resolved_variables: new Set<string>(),
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>(),
				diagnostics: [],
			};

			const unified = generate_unified_css(result, '');

			expect(unified).toBe('');
		});

		test('only theme generates single section', () => {
			const result = {
				theme_css: ':root { --color: blue; }',
				base_css: '',
				resolved_variables: new Set(['color']),
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>(),
				diagnostics: [],
			};

			const unified = generate_unified_css(result, '');

			expect(unified).toContain('/* Theme Variables */');
			expect(unified).not.toContain('/* Base Styles */');
			expect(unified).not.toContain('/* Utility Classes */');
		});
	});
});
