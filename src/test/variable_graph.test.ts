import {test, assert, describe} from 'vitest';

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

			assert.strictEqual(graph.variables.size, 1);
			assert.strictEqual(graph.variables.get('color_a')!.light_css, 'blue');
			assert.strictEqual(graph.variables.get('color_a')!.dark_css, 'lightblue');
			assert.strictEqual(graph.content_hash, 'test-hash');
		});

		test('extracts dependencies from var() references', () => {
			const variables: Array<StyleVariable> = [
				{name: 'hue_a', light: '210'},
				{name: 'color_a', light: 'hsl(var(--hue_a) 50% 50%)'},
			];

			const graph = build_variable_graph(variables, 'test-hash');

			assert.isTrue(graph.variables.get('color_a')!.light_deps.has('hue_a'));
			assert.strictEqual(graph.variables.get('hue_a')!.light_deps.size, 0);
		});
	});

	describe('light/dark values', () => {
		test('handles light-only variable', () => {
			const variables: Array<StyleVariable> = [{name: 'spacing', light: '16px'}];

			const graph = build_variable_graph(variables, 'test-hash');

			assert.strictEqual(graph.variables.get('spacing')!.light_css, '16px');
			assert.isUndefined(graph.variables.get('spacing')!.dark_css);
			assert.strictEqual(graph.variables.get('spacing')!.dark_deps.size, 0);
		});

		test('handles dark-only variable', () => {
			const variables: Array<StyleVariable> = [{name: 'shadow', dark: 'none'}];

			const graph = build_variable_graph(variables, 'test-hash');

			assert.isUndefined(graph.variables.get('shadow')!.light_css);
			assert.strictEqual(graph.variables.get('shadow')!.dark_css, 'none');
		});

		test('handles different light/dark dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'base_light', light: '100'},
				{name: 'base_dark', dark: '200'},
				{name: 'composite', light: 'var(--base_light)', dark: 'var(--base_dark)'},
			];

			const graph = build_variable_graph(variables, 'test-hash');

			assert.isTrue(graph.variables.get('composite')!.light_deps.has('base_light'));
			assert.isFalse(graph.variables.get('composite')!.light_deps.has('base_dark'));
			assert.isTrue(graph.variables.get('composite')!.dark_deps.has('base_dark'));
			assert.isFalse(graph.variables.get('composite')!.dark_deps.has('base_light'));
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

			assert.isTrue(result.variables.has('a'));
			assert.isFalse(result.variables.has('b'));
			assert.strictEqual(result.warnings.length, 0);
		});

		test('includes direct dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'hue', light: '210'},
				{name: 'color', light: 'hsl(var(--hue) 50% 50%)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['color']);

			assert.isTrue(result.variables.has('color'));
			assert.isTrue(result.variables.has('hue'));
		});

		test('resolves multiple initial variables', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: '2'},
				{name: 'c', light: '3'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['a', 'c']);

			assert.isTrue(result.variables.has('a'));
			assert.isFalse(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
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

			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
			assert.isTrue(result.variables.has('d'));
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

			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
			assert.isTrue(result.variables.has('d'));
			assert.strictEqual(result.variables.size, 4);
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

			assert.strictEqual(result.variables.size, 7);
			assert.isTrue(result.variables.has('root'));
			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
			assert.isTrue(result.variables.has('d'));
			assert.isTrue(result.variables.has('e'));
			assert.isTrue(result.variables.has('f'));
		});

		test('multiple starting points share dependencies', () => {
			const variables: Array<StyleVariable> = [
				{name: 'shared', light: 'shared-value'},
				{name: 'x', light: 'var(--shared)'},
				{name: 'y', light: 'var(--shared)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['x', 'y']);

			assert.isTrue(result.variables.has('x'));
			assert.isTrue(result.variables.has('y'));
			assert.isTrue(result.variables.has('shared'));
			assert.strictEqual(result.variables.size, 3);
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

			assert.isTrue(result.variables.has('combo'));
			assert.isTrue(result.variables.has('light_base'));
			assert.isTrue(result.variables.has('dark_base'));
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

			assert.isTrue(result.variables.has('themed'));
			assert.isTrue(result.variables.has('light_mid'));
			assert.isTrue(result.variables.has('dark_mid'));
			assert.isTrue(result.variables.has('light_leaf'));
			assert.isTrue(result.variables.has('dark_leaf'));
			assert.strictEqual(result.variables.size, 5);
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

			assert.isTrue(result.variables.has('composed'));
			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
		});
	});

	describe('missing variables', () => {
		test('tracks missing variables', () => {
			const variables: Array<StyleVariable> = [{name: 'known', light: '1'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['known', 'unknown']);

			assert.isTrue(result.variables.has('known'));
			assert.isTrue(result.variables.has('unknown'));
			assert.isTrue(result.missing.has('unknown'));
			assert.isFalse(result.missing.has('known'));
			assert.strictEqual(result.warnings.length, 0);
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

			assert.strictEqual(result.missing.size, 3);
			for (const name of ['missing1', 'missing2', 'missing3']) {
				assert.isTrue(result.missing.has(name), `Expected "${name}" to be missing`);
			}
		});

		test('tracks missing dependencies', () => {
			const variables: Array<StyleVariable> = [{name: 'root', light: 'var(--missing_dep)'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['root']);

			assert.isTrue(result.variables.has('root'));
			assert.isTrue(result.variables.has('missing_dep'));
			assert.isTrue(result.missing.has('missing_dep'));
			assert.isFalse(result.missing.has('root'));
		});

		test('empty missing set when all exist', () => {
			const variables: Array<StyleVariable> = [
				{name: 'a', light: '1'},
				{name: 'b', light: 'var(--a)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');

			const result = resolve_variables_transitive(graph, ['b']);

			assert.strictEqual(result.missing.size, 0);
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
				assert.isTrue(result.variables.has(v), `Expected "${v}" in result`);
			}
			assert.isAbove(result.warnings.length, 0);
			assert.isTrue(result.warnings.some((w) => w.includes('Circular dependency')));
		});

		test('self-reference in both light and dark triggers cycle warning', () => {
			const variables: Array<StyleVariable> = [
				{name: 'x', light: 'var(--x, 1)', dark: 'var(--x, 2)'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['x']);

			assert.isTrue(result.variables.has('x'));
			assert.isAbove(result.warnings.length, 0);
			assert.isTrue(result.warnings.some((w) => w.includes('Circular dependency')));
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
				assert.isTrue(result.variables.has(v), `Expected "${v}" in result`);
			}
			assert.strictEqual(result.missing.size, 0);
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

			assert.strictEqual(result.variables.size, 7);
			assert.strictEqual(result.missing.size, 0);
			// All light chain variables
			for (const v of ['l1', 'l2', 'l3']) {
				assert.isTrue(result.variables.has(v), `Expected light chain "${v}" in result`);
			}
			// All dark chain variables
			for (const v of ['d1', 'd2', 'd3']) {
				assert.isTrue(result.variables.has(v), `Expected dark chain "${v}" in result`);
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

			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b')); // added even though missing
			assert.isTrue(result.variables.has('c'));
			assert.isTrue(result.missing.has('b'));
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

			assert.isTrue(result.variables.has('content_width'));
			assert.isTrue(result.variables.has('width'));
			assert.isTrue(result.variables.has('padding'));
			assert.strictEqual(result.variables.size, 3);
		});

		test('resolves calc with mixed var and fallback', () => {
			const variables: Array<StyleVariable> = [
				{name: 'base', light: '10px'},
				{name: 'computed', light: 'calc(var(--base) + var(--missing, 5px))'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			const result = resolve_variables_transitive(graph, ['computed']);

			assert.isTrue(result.variables.has('computed'));
			assert.isTrue(result.variables.has('base'));
			assert.isTrue(result.variables.has('missing'));
			assert.isTrue(result.missing.has('missing'));
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
				assert.isTrue(result.variables.has(v), `Expected "${v}" in result`);
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

			assert.include(light_css, ':root');
			assert.include(light_css, '--color: blue;');
			assert.include(dark_css, ':root.dark');
			assert.include(dark_css, '--color: lightblue;');
		});

		test('applies specificity multiplier', () => {
			const variables: Array<StyleVariable> = [{name: 'color', light: 'blue', dark: 'lightblue'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['color']), 2);

			assert.include(light_css, ':root:root');
			assert.include(dark_css, ':root:root.dark');
		});
	});

	describe('light/dark only variables', () => {
		test('light-only produces only light block', () => {
			const variables: Array<StyleVariable> = [{name: 'spacing', light: '16px'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['spacing']));

			assert.include(light_css, '--spacing: 16px;');
			assert.strictEqual(dark_css, '');
		});

		test('dark-only produces only dark block', () => {
			const variables: Array<StyleVariable> = [{name: 'glow', dark: 'none'}];
			const graph = build_variable_graph(variables, 'test-hash');

			const {light_css, dark_css} = generate_theme_css(graph, new Set(['glow']));

			assert.strictEqual(light_css, '');
			assert.include(dark_css, '--glow: none;');
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

			assert.isBelow(alpha_pos, mid_pos);
			assert.isBelow(mid_pos, zebra_pos);
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

		assert.strictEqual(names.size, 3);
		assert.isTrue(names.has('a'));
		assert.isTrue(names.has('b'));
		assert.isTrue(names.has('c'));
	});

	test('has_variable checks existence', () => {
		const variables: Array<StyleVariable> = [{name: 'exists', light: '1'}];
		const graph = build_variable_graph(variables, 'test-hash');

		assert.isTrue(has_variable(graph, 'exists'));
		assert.isFalse(has_variable(graph, 'missing'));
	});
});

describe('build_variable_graph_from_options', () => {
	test('loads actual variables', () => {
		const graph = build_variable_graph_from_options(undefined);

		assert.isAbove(graph.variables.size, 100);

		assert.isTrue(graph.variables.has('hue_a'));
		assert.isTrue(graph.variables.has('color_a_50'));
		assert.isTrue(graph.variables.has('text_color'));

		const color_a_50 = graph.variables.get('color_a_50');
		assert.isDefined(color_a_50);
		assert.isTrue(color_a_50.light_deps.has('hue_a') || color_a_50.dark_deps.has('hue_a'));
	});

	test('resolves common patterns', () => {
		const graph = build_variable_graph_from_options(undefined);

		const result = resolve_variables_transitive(graph, ['text_color']);

		assert.isTrue(result.variables.has('text_color'));
		assert.isAtLeast(result.variables.size, 1);
	});

	test('resolves color chain', () => {
		const graph = build_variable_graph_from_options(undefined);

		const result = resolve_variables_transitive(graph, ['color_a_50']);

		assert.isTrue(result.variables.has('color_a_50'));
		assert.isTrue(result.variables.has('hue_a'));
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
			assert.strictEqual(find_similar_variable(graph, typo), expected);
		});
	});

	describe('returns null for dissimilar', () => {
		test.each([['fill'], ['shadow'], ['icon_size']])('%s has no match', (name) => {
			const variables: Array<StyleVariable> = [
				{name: 'color_primary', light: 'blue'},
				{name: 'spacing_md', light: '16px'},
			];
			const graph = build_variable_graph(variables, 'test-hash');
			assert.isNull(find_similar_variable(graph, name));
		});
	});

	test('returns null for empty graph', () => {
		const graph = build_variable_graph([], 'test-hash');
		assert.isNull(find_similar_variable(graph, 'anything'));
	});

	test('finds best match among multiple similar variables', () => {
		const variables: Array<StyleVariable> = [
			{name: 'color_a_1', light: '1'},
			{name: 'color_a_2', light: '2'},
			{name: 'color_a_3', light: '3'},
		];
		const graph = build_variable_graph(variables, 'test-hash');

		const result = find_similar_variable(graph, 'color_a_');
		assert.isNotNull(result);
		assert.match(result, /^color_a_[123]$/);
	});

	test('returns null for short dissimilar strings', () => {
		const variables: Array<StyleVariable> = [
			{name: 'shadow_xs', light: '1px'},
			{name: 'shadow_sm', light: '2px'},
		];
		const graph = build_variable_graph(variables, 'test-hash');
		assert.isNull(find_similar_variable(graph, 'shadow'));
	});
});
