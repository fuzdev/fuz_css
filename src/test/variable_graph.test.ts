import {test, expect, describe} from 'vitest';

import {
	build_variable_graph,
	build_default_variable_graph,
	resolve_variables_transitive,
	generate_theme_css,
	get_all_variable_names,
	has_variable,
	find_similar_variable,
	VARIABLE_GRAPH_VERSION,
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
			expect(graph.version).toBe(VARIABLE_GRAPH_VERSION);
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
			expect(result.missing.has('missing1')).toBe(true);
			expect(result.missing.has('missing2')).toBe(true);
			expect(result.missing.has('missing3')).toBe(true);
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
		test('detects simple cycle (A→B→A)', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: 'var(--b)'},
				{name: 'b', light: 'var(--a)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
		});

		test('detects longer cycle (A→B→C→A)', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: 'var(--b)'},
				{name: 'b', light: 'var(--c)'},
				{name: 'c', light: 'var(--a)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.variables.has('c')).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
		});

		test('detects self-reference (A→A)', () => {
			const variables: Array<StyleVariable> = [{name: 'a', light: 'calc(var(--a) + 1px)'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
			expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
		});

		test('detects cycle in dark mode deps only', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: 'blue', dark: 'var(--b)'},
				{name: 'b', light: 'red', dark: 'var(--a)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a']);

			expect(result.variables.has('a')).toBe(true);
			expect(result.variables.has('b')).toBe(true);
			expect(result.warnings.length).toBeGreaterThan(0);
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

describe('build_default_variable_graph', () => {
	test('loads actual variables', () => {
		const graph = build_default_variable_graph();

		expect(graph.variables.size).toBeGreaterThan(100);

		expect(graph.variables.has('hue_a')).toBe(true);
		expect(graph.variables.has('color_a_50')).toBe(true);
		expect(graph.variables.has('text_color')).toBe(true);

		const color_a_50 = graph.variables.get('color_a_50');
		expect(color_a_50).toBeDefined();
		expect(color_a_50!.light_deps.has('hue_a') || color_a_50!.dark_deps.has('hue_a')).toBe(true);
	});

	test('resolves common patterns', () => {
		const graph = build_default_variable_graph();

		const result = resolve_variables_transitive(graph, ['text_color']);

		expect(result.variables.has('text_color')).toBe(true);
		expect(result.variables.size).toBeGreaterThanOrEqual(1);
	});

	test('resolves color chain', () => {
		const graph = build_default_variable_graph();

		const result = resolve_variables_transitive(graph, ['color_a_50']);

		expect(result.variables.has('color_a_50')).toBe(true);
		expect(result.variables.has('hue_a')).toBe(true);
	});
});

describe('find_similar_variable', () => {
	test('finds similar variable for typo (missing character)', () => {
		const variables: Array<StyleVariable> = [
			{name: 'color_primary', light: 'blue'},
			{name: 'color_secondary', light: 'green'},
		];
		const graph = build_variable_graph(variables, 'test-hash');

		// Missing 'a' - should match color_primary
		expect(find_similar_variable(graph, 'color_primry')).toBe('color_primary');
	});

	test('finds similar variable for typo (extra character)', () => {
		const variables: Array<StyleVariable> = [
			{name: 'background', light: '#fff'},
			{name: 'foreground', light: '#000'},
		];
		const graph = build_variable_graph(variables, 'test-hash');

		// Extra 'u' - should match background
		expect(find_similar_variable(graph, 'backuground')).toBe('background');
	});

	test('finds similar variable for typo (swapped characters)', () => {
		const variables: Array<StyleVariable> = [{name: 'border_radius', light: '4px'}];
		const graph = build_variable_graph(variables, 'test-hash');

		// 'boarder' instead of 'border' - should match
		expect(find_similar_variable(graph, 'boarder_radius')).toBe('border_radius');
	});

	test('returns null for dissimilar variable', () => {
		const variables: Array<StyleVariable> = [
			{name: 'color_primary', light: 'blue'},
			{name: 'spacing_md', light: '16px'},
		];
		const graph = build_variable_graph(variables, 'test-hash');

		// Completely different - should return null
		expect(find_similar_variable(graph, 'fill')).toBeNull();
		expect(find_similar_variable(graph, 'shadow')).toBeNull();
		expect(find_similar_variable(graph, 'icon_size')).toBeNull();
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

		// 'color_a_' should match one of them (closest)
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

		// 'shadow' alone is too different from 'shadow_xs' (similarity ~0.67)
		expect(find_similar_variable(graph, 'shadow')).toBeNull();
	});
});
