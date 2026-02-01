import {test, expect, describe} from 'vitest';

import {
	build_variable_graph,
	build_variable_graph_from_options,
	resolve_variables_transitive,
	generate_theme_css,
	get_all_variable_names,
	has_variable,
	find_similar_variable,
} from '../lib/variable_graph.js';
import type {StyleVariable} from '../lib/variable.js';

describe('build_variable_graph', () => {
	describe('basic building', () => {
		test('builds graph with basic variable', () => {
			const variables: Array<StyleVariable> = [{name: 'color_a', light: 'blue', dark: 'lightblue'}];

			const graph = build_variable_graph(variables, 'test-hash');

			expect(graph.variables.size).toBe(1);
			expect(graph.variables.get('color_a')!.light_css).toBe('blue');
			expect(graph.variables.get('color_a')!.dark_css).toBe('lightblue');
			expect(graph.content_hash).toBe('test-hash');
		});

		test('extracts dependencies from var() references', () => {
			const variables: Array<StyleVariable> = [
				{name: 'hue_a', light: '210'},
				{name: 'color_a', light: 'hsl(var(--hue_a) 50% 50%)'},
			];

			const graph = build_variable_graph(variables, 'test-hash');

			expect(graph.variables.get('color_a')!.light_deps.has('hue_a')).toBe(true);
			expect(graph.variables.get('hue_a')!.light_deps.size).toBe(0);
		});
	});

	describe('light/dark values', () => {
		test('handles light-only variable', () => {
			const variables: Array<StyleVariable> = [{name: 'spacing', light: '16px'}];

			const graph = build_variable_graph(variables, 'test-hash');

			expect(graph.variables.get('spacing')!.light_css).toBe('16px');
			expect(graph.variables.get('spacing')!.dark_css).toBeUndefined();
			expect(graph.variables.get('spacing')!.dark_deps.size).toBe(0);
		});

		test('handles dark-only variable', () => {
			const variables: Array<StyleVariable> = [{name: 'shadow', dark: 'none'}];

			const graph = build_variable_graph(variables, 'test-hash');

			expect(graph.variables.get('shadow')!.light_css).toBeUndefined();
			expect(graph.variables.get('shadow')!.dark_css).toBe('none');
		});

		test('handles different light/dark dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'base_light', light: '100'},
				{name: 'base_dark', dark: '200'},
				{name: 'composite', light: 'var(--base_light)', dark: 'var(--base_dark)'},
			];

			const graph = build_variable_graph(variables, 'test-hash');

			expect(graph.variables.get('composite')!.light_deps.has('base_light')).toBe(true);
			expect(graph.variables.get('composite')!.light_deps.has('base_dark')).toBe(false);
			expect(graph.variables.get('composite')!.dark_deps.has('base_dark')).toBe(true);
			expect(graph.variables.get('composite')!.dark_deps.has('base_light')).toBe(false);
		});
	});
});

describe('resolve_variables_transitive', () => {
	describe('basic resolution', () => {
		test('resolves single variable', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: '2'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(false);
			expect(result.warnings.length).toBe(0);
		});

		test('includes direct dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'hue', light: '210'},
				{name: 'color', light: 'hsl(var(--hue) 50% 50%)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['color']);

			expect(result.variables.has('color')).toBe(true);
			expect(result.variables.has('hue')).toBe(true);
		});

		test('resolves multiple initial variables', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: '2'},
				{name: 'c', light: '3'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a', 'c']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(false);
			expect(result.variables.has('c')).toBe(true);
		});
	});

	describe('deep dependency chains', () => {
		test('resolves deep chain (A→B→C→D)', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: 'var(--a)'},
				{name: 'c', light: 'var(--b)'},
				{name: 'd', light: 'var(--c)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['d']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.variables.has('c')).toBe(true);
			expect(result.variables.has('d')).toBe(true);
		});

		test('resolves sibling dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'd', light: 'base-value'},
				{name: 'b', light: 'var(--d)'},
				{name: 'c', light: 'independent-value'},
				{name: 'a', light: 'calc(var(--b) + var(--c))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.variables.has('c')).toBe(true);
			expect(result.variables.has('d')).toBe(true);
			expect(result.variables.size).toBe(4);
		});

		test('handles complex tree with shared nodes', () => {
			// Diamond dependency: root → a,b → d ← (shared)
			const variables: Array<StyleVariable> = [
				{name: 'f', light: 'leaf-f'},
				{name: 'c', light: 'leaf-c'},
				{name: 'e', light: 'leaf-e'},
				{name: 'd', light: 'var(--f)'},
				{name: 'a', light: 'calc(var(--c) + var(--d))'},
				{name: 'b', light: 'calc(var(--d) + var(--e))'},
				{name: 'root', light: 'calc(var(--a) + var(--b))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['root']);

			expect(result.variables.size).toBe(7);
			expect(result.variables.has('root')).toBe(true);
			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.variables.has('c')).toBe(true);
			expect(result.variables.has('d')).toBe(true);
			expect(result.variables.has('e')).toBe(true);
			expect(result.variables.has('f')).toBe(true);
		});

		test('multiple starting points share dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'shared', light: 'shared-value'},
				{name: 'x', light: 'var(--shared)'},
				{name: 'y', light: 'var(--shared)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['x', 'y']);

			expect(result.variables.has('x')).toBe(true);
			expect(result.variables.has('y')).toBe(true);
			expect(result.variables.has('shared')).toBe(true);
			expect(result.variables.size).toBe(3);
		});
	});

	describe('light/dark dependency resolution', () => {
		test('includes both light and dark deps', () => {
			const variables: Array<StyleVariable> = [
				{name: 'light_base', light: 'white'},
				{name: 'dark_base', dark: 'black'},
				{name: 'combo', light: 'var(--light_base)', dark: 'var(--dark_base)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['combo']);

			expect(result.variables.has('combo')).toBe(true);
			expect(result.variables.has('light_base')).toBe(true);
			expect(result.variables.has('dark_base')).toBe(true);
		});

		test('resolves mixed light/dark dependencies at multiple depths', () => {
			const variables: Array<StyleVariable> = [
				{name: 'light_leaf', light: '#fff'},
				{name: 'dark_leaf', dark: '#000'},
				{name: 'light_mid', light: 'var(--light_leaf)'},
				{name: 'dark_mid', dark: 'var(--dark_leaf)'},
				{name: 'themed', light: 'var(--light_mid)', dark: 'var(--dark_mid)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['themed']);

			expect(result.variables.has('themed')).toBe(true);
			expect(result.variables.has('light_mid')).toBe(true);
			expect(result.variables.has('dark_mid')).toBe(true);
			expect(result.variables.has('light_leaf')).toBe(true);
			expect(result.variables.has('dark_leaf')).toBe(true);
			expect(result.variables.size).toBe(5);
		});
	});

	describe('var() with fallbacks', () => {
		test('resolves nested var() fallbacks', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: '2'},
				{name: 'c', light: '3'},
				{name: 'composed', light: 'var(--a, var(--b, var(--c)))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['composed']);

			expect(result.variables.has('composed')).toBe(true);
			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.variables.has('c')).toBe(true);
		});
	});

	describe('missing variables', () => {
		test('tracks missing variables', () => {
			const variables: Array<StyleVariable> = [{name: 'known', light: '1'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['known', 'unknown']);

			expect(result.variables.has('known')).toBe(true);
			expect(result.variables.has('unknown')).toBe(true);
			expect(result.missing.has('unknown')).toBe(true);
			expect(result.missing.has('known')).toBe(false);
			expect(result.warnings.length).toBe(0);
		});

		test('tracks multiple missing variables', () => {
			const variables: Array<StyleVariable> = [{name: 'exists', light: '1'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, [
				'exists',
				'missing1',
				'missing2',
				'missing3',
			]);

			expect(result.missing.size).toBe(3);
			for (const name of ['missing1', 'missing2', 'missing3']) {
				expect(result.missing.has(name), `Expected "${name}" to be missing`).toBe(true);
			}
		});

		test('tracks missing dependencies', () => {
			const variables: Array<StyleVariable> = [{name: 'root', light: 'var(--missing_dep)'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['root']);

			expect(result.variables.has('root')).toBe(true);
			expect(result.variables.has('missing_dep')).toBe(true);
			expect(result.missing.has('missing_dep')).toBe(true);
			expect(result.missing.has('root')).toBe(false);
		});

		test('empty missing set when all exist', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: 'var(--a)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['b']);

			expect(result.missing.size).toBe(0);
		});
	});

	describe('cycle detection', () => {
		test.each<[string, Array<StyleVariable>, Array<string>]>([
			[
				'simple cycle (A→B→A)',
				[
					{name: 'a', light: 'var(--b)'},
					{name: 'b', light: 'var(--a)'},
				],
				['a', 'b'],
			],
			[
				'longer cycle (A→B→C→A)',
				[
					{name: 'a', light: 'var(--b)'},
					{name: 'b', light: 'var(--c)'},
					{name: 'c', light: 'var(--a)'},
				],
				['a', 'b', 'c'],
			],
			['self-reference (A→A)', [{name: 'a', light: 'calc(var(--a) + 1px)'}], ['a']],
			[
				'cycle in dark mode deps only',
				[
					{name: 'a', light: 'blue', dark: 'var(--b)'},
					{name: 'b', light: 'red', dark: 'var(--a)'},
				],
				['a', 'b'],
			],
		])('detects %s', (_name, variables, expected_vars) => {
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['a']);

			for (const v of expected_vars) {
				expect(result.variables.has(v), `Expected "${v}" in result`).toBe(true);
			}
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
		});

		test('self-reference in both light and dark triggers cycle warning', () => {
			const variables: Array<StyleVariable> = [
				{name: 'x', light: 'var(--x, 1)', dark: 'var(--x, 2)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['x']);

			expect(result.variables.has('x')).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
		});
	});

	describe('deep fallback chains', () => {
		test('resolves 5-level nested fallbacks', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: '2'},
				{name: 'c', light: '3'},
				{name: 'd', light: '4'},
				{name: 'e', light: '5'},
				{name: 'deep', light: 'var(--a, var(--b, var(--c, var(--d, var(--e)))))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['deep']);

			for (const v of ['a', 'b', 'c', 'd', 'e', 'deep']) {
				expect(result.variables.has(v), `Expected "${v}" in result`).toBe(true);
			}
			expect(result.missing.size).toBe(0);
		});

		test('6-level chain with mixed light/dark', () => {
			const variables: Array<StyleVariable> = [
				{name: 'l1', light: 'white'},
				{name: 'l2', light: 'var(--l1)'},
				{name: 'l3', light: 'var(--l2)'},
				{name: 'd1', dark: 'black'},
				{name: 'd2', dark: 'var(--d1)'},
				{name: 'd3', dark: 'var(--d2)'},
				{name: 'themed', light: 'var(--l3)', dark: 'var(--d3)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['themed']);

			expect(result.variables.size).toBe(7);
			expect(result.missing.size).toBe(0);
			// All light chain variables
			for (const v of ['l1', 'l2', 'l3']) {
				expect(result.variables.has(v), `Expected light chain "${v}" in result`).toBe(true);
			}
			// All dark chain variables
			for (const v of ['d1', 'd2', 'd3']) {
				expect(result.variables.has(v), `Expected dark chain "${v}" in result`).toBe(true);
			}
		});

		test('fallback with missing intermediate', () => {
			// a depends on b which doesn't exist, c is fallback
			const variables: Array<StyleVariable> = [
				{name: 'c', light: 'fallback-value'},
				{name: 'a', light: 'var(--b, var(--c))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true); // added even though missing
			expect(result.variables.has('c')).toBe(true);
			expect(result.missing.has('b')).toBe(true);
		});
	});

	describe('calc() with multiple var() references', () => {
		test('resolves calc with two var references', () => {
			const variables: Array<StyleVariable> = [
				{name: 'width', light: '100px'},
				{name: 'padding', light: '20px'},
				{name: 'content_width', light: 'calc(var(--width) - var(--padding) * 2)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['content_width']);

			expect(result.variables.has('content_width')).toBe(true);
			expect(result.variables.has('width')).toBe(true);
			expect(result.variables.has('padding')).toBe(true);
			expect(result.variables.size).toBe(3);
		});

		test('resolves calc with mixed var and fallback', () => {
			const variables: Array<StyleVariable> = [
				{name: 'base', light: '10px'},
				{name: 'computed', light: 'calc(var(--base) + var(--missing, 5px))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['computed']);

			expect(result.variables.has('computed')).toBe(true);
			expect(result.variables.has('base')).toBe(true);
			expect(result.variables.has('missing')).toBe(true);
			expect(result.missing.has('missing')).toBe(true);
		});

		test('resolves nested calc expressions', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '10'},
				{name: 'b', light: '20'},
				{name: 'c', light: '30'},
				{name: 'nested', light: 'calc(var(--a) + calc(var(--b) * var(--c)))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['nested']);

			for (const v of ['a', 'b', 'c', 'nested']) {
				expect(result.variables.has(v), `Expected "${v}" in result`).toBe(true);
			}
		});
	});
});

describe('generate_theme_css', () => {
	describe('basic output', () => {
		test('generates light and dark blocks', () => {
			const variables: Array<StyleVariable> = [{name: 'color', light: 'blue', dark: 'lightblue'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['color']));

			expect(light_css).toContain(':root');
			expect(light_css).toContain('--color: blue;');
			expect(dark_css).toContain(':root.dark');
			expect(dark_css).toContain('--color: lightblue;');
		});

		test('applies specificity multiplier', () => {
			const variables: Array<StyleVariable> = [{name: 'color', light: 'blue', dark: 'lightblue'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['color']), 2);

			expect(light_css).toContain(':root:root');
			expect(dark_css).toContain(':root:root.dark');
		});
	});

	describe('light/dark only variables', () => {
		test('light-only produces only light block', () => {
			const variables: Array<StyleVariable> = [{name: 'spacing', light: '16px'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['spacing']));

			expect(light_css).toContain('--spacing: 16px;');
			expect(dark_css).toBe('');
		});

		test('dark-only produces only dark block', () => {
			const variables: Array<StyleVariable> = [{name: 'glow', dark: 'none'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['glow']));

			expect(light_css).toBe('');
			expect(dark_css).toContain('--glow: none;');
		});
	});

	describe('sorting', () => {
		test('outputs variables in sorted order', () => {
			const variables: Array<StyleVariable> = [
				{name: 'zebra', light: '3'},
				{name: 'alpha', light: '1'},
				{name: 'mid', light: '2'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css} = generate_theme_css(graph, new Set(['zebra', 'alpha', 'mid']));

			const alpha_pos = light_css.indexOf('--alpha');
			const mid_pos = light_css.indexOf('--mid');
			const zebra_pos = light_css.indexOf('--zebra');

			expect(alpha_pos).toBeLessThan(mid_pos);
			expect(mid_pos).toBeLessThan(zebra_pos);
		});
	});
});

describe('utility functions', () => {
	test('get_all_variable_names returns all names', () => {
		const variables: Array<StyleVariable> = [
			{name: 'a', light: '1'},
			{name: 'b', light: '2'},
			{name: 'c', light: '3'},
		];
		const graph = build_variable_graph(variables, 'test-hash');

		const names = get_all_variable_names(graph);

		expect(names.size).toBe(3);
		expect(names.has('a')).toBe(true);
		expect(names.has('b')).toBe(true);
		expect(names.has('c')).toBe(true);
	});

	test('has_variable checks existence', () => {
		const variables: Array<StyleVariable> = [{name: 'exists', light: '1'}];
		const graph = build_variable_graph(variables, 'test-hash');

		expect(has_variable(graph, 'exists')).toBe(true);
		expect(has_variable(graph, 'missing')).toBe(false);
	});
});

describe('build_variable_graph_from_options', () => {
	test('loads actual variables', () => {
		const graph = build_variable_graph_from_options(undefined);

		expect(graph.variables.size).toBeGreaterThan(100);

		expect(graph.variables.has('hue_a')).toBe(true);
		expect(graph.variables.has('color_a_50')).toBe(true);
		expect(graph.variables.has('text_color')).toBe(true);

		const color_a_50 = graph.variables.get('color_a_50');
		expect(color_a_50).toBeDefined();
		expect(color_a_50!.light_deps.has('hue_a') || color_a_50!.dark_deps.has('hue_a')).toBe(true);
	});

	test('resolves common patterns', () => {
		const graph = build_variable_graph_from_options(undefined);

		const result = resolve_variables_transitive(graph, ['text_color']);

		expect(result.variables.has('text_color')).toBe(true);
		expect(result.variables.size).toBeGreaterThanOrEqual(1);
	});

	test('resolves color chain', () => {
		const graph = build_variable_graph_from_options(undefined);

		const result = resolve_variables_transitive(graph, ['color_a_50']);

		expect(result.variables.has('color_a_50')).toBe(true);
		expect(result.variables.has('hue_a')).toBe(true);
	});
});

describe('find_similar_variable', () => {
	describe('finds typos', () => {
		test.each<[string, string, Array<StyleVariable>, string]>([
			['color_primry', 'color_primary', [{name: 'color_primary', light: 'blue'}], 'missing char'],
			['backuground', 'background', [{name: 'background', light: '#fff'}], 'extra char'],
			['boarder_radius', 'border_radius', [{name: 'border_radius', light: '4px'}], 'swapped chars'],
		])('%s → %s (%s)', (typo, expected, variables) => {
			const graph = build_variable_graph(variables, 'test-hash');
			expect(find_similar_variable(graph, typo)).toBe(expected);
		});
	});

	describe('returns null for dissimilar', () => {
		test.each([['fill'], ['shadow'], ['icon_size']])('%s has no match', (name) => {
			const variables: Array<StyleVariable> = [
				{name: 'color_primary', light: 'blue'},
				{name: 'spacing_md', light: '16px'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			expect(find_similar_variable(graph, name)).toBeNull();
		});
	});

	test('returns null for empty graph', () => {
		const graph = build_variable_graph([], 'test-hash');
		expect(find_similar_variable(graph, 'anything')).toBeNull();
	});

	test('finds best match among multiple similar variables', () => {
		const variables: Array<StyleVariable> = [
			{name: 'color_a_1', light: '1'},
			{name: 'color_a_2', light: '2'},
			{name: 'color_a_3', light: '3'},
		];
		const graph = build_variable_graph(variables, 'test-hash');

		const result = find_similar_variable(graph, 'color_a_');
		expect(result).not.toBeNull();
		expect(result).toMatch(/^color_a_[123]$/);
	});

	test('returns null for short dissimilar strings', () => {
		const variables: Array<StyleVariable> = [
			{name: 'shadow_xs', light: '1px'},
			{name: 'shadow_sm', light: '2px'},
		];
		const graph = build_variable_graph(variables, 'test-hash');
		expect(find_similar_variable(graph, 'shadow')).toBeNull();
	});
});
