import { test, assert, describe } from 'vitest';

import {
	apply_theme_variables,
	bake_theme,
	build_variable_graph,
	build_variable_graph_from_options,
	resolve_variables_transitive,
	generate_theme_css,
	get_all_variable_names,
	find_similar_variable
} from '#lib/variable_graph.ts';
import type { StyleVariable, Theme } from '#lib/variable.ts';
import type { GenerationDiagnostic } from '#lib/diagnostics.ts';
import { scheme_adaptive_variables } from '#lib/scheme_adaptive_variables.ts';
import { scheme_stance_variables } from '#lib/theme_stance.ts';
import { compute_theme_caps } from '#lib/theme_check.ts';
import { default_variables } from '#lib/variables.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';

// the containment errors among a graph's diagnostics, apart from a baked
// theme's gate warnings
const uncontained = (graph: { diagnostics: Array<GenerationDiagnostic> }) =>
	graph.diagnostics.filter((d) => d.identifier === 'uncontained_theme_value');

describe('build_variable_graph', () => {
	describe('basic building', () => {
		test('builds graph with basic variable', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'palette_a', base: 'blue', dark: 'lightblue' }
			];

			const graph = build_variable_graph(variables);

			assert.strictEqual(graph.variables.size, 1);
			assert.strictEqual(graph.variables.get('palette_a')!.base_value, 'blue');
			assert.strictEqual(graph.variables.get('palette_a')!.dark_value, 'lightblue');
		});

		test('extracts dependencies from var() references', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'hue_a', base: '210' },
				{ name: 'palette_a', base: 'hsl(var(--hue_a) 50% 50%)' }
			];

			const graph = build_variable_graph(variables);

			assert.isTrue(graph.variables.get('palette_a')!.base_deps.has('hue_a'));
			assert.strictEqual(graph.variables.get('hue_a')!.base_deps.size, 0);
		});
	});

	describe('base/dark values', () => {
		test('handles base-only variable', () => {
			const variables: Array<StyleVariable> = [{ name: 'spacing', base: '16px' }];

			const graph = build_variable_graph(variables);

			assert.strictEqual(graph.variables.get('spacing')!.base_value, '16px');
			assert.isUndefined(graph.variables.get('spacing')!.dark_value);
			assert.strictEqual(graph.variables.get('spacing')!.dark_deps.size, 0);
		});

		test('handles dark-only variable', () => {
			const variables: Array<StyleVariable> = [{ name: 'shadow', dark: 'none' }];

			const graph = build_variable_graph(variables);

			assert.isUndefined(graph.variables.get('shadow')!.base_value);
			assert.strictEqual(graph.variables.get('shadow')!.dark_value, 'none');
		});

		test('handles different base/dark dependencies', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'base_light', base: '100' },
				{ name: 'base_dark', dark: '200' },
				{ name: 'composite', base: 'var(--base_light)', dark: 'var(--base_dark)' }
			];

			const graph = build_variable_graph(variables);

			assert.isTrue(graph.variables.get('composite')!.base_deps.has('base_light'));
			assert.isFalse(graph.variables.get('composite')!.base_deps.has('base_dark'));
			assert.isTrue(graph.variables.get('composite')!.dark_deps.has('base_dark'));
			assert.isFalse(graph.variables.get('composite')!.dark_deps.has('base_light'));
		});
	});
});

describe('build_variable_graph containment', () => {
	test('leaves out a slot that would escape its declaration, with an error', () => {
		const graph = build_variable_graph([
			{ name: 'text_color', base: 'red} body{background:lime', dark: 'white' },
			{ name: 'ok', base: '1' }
		]);
		assert.deepEqual(
			{ ...graph.variables.get('text_color'), base_deps: null, dark_deps: null },
			{
				name: 'text_color',
				base_deps: null,
				dark_deps: null,
				base_value: undefined,
				dark_value: 'white'
			}
		);
		assert.isTrue(graph.variables.has('ok'));
		assert.deepEqual(
			graph.diagnostics.map((d) => [d.level, d.identifier]),
			[['error', 'uncontained_theme_value']]
		);
		assert.include(graph.diagnostics[0]!.message, 'text_color');
	});

	test('leaves out a variable with no containable slot or an unsafe name', () => {
		const graph = build_variable_graph([
			{ name: 'blank', base: '  ' },
			{ name: 'bad: 1; --x', base: '1' }
		]);
		assert.strictEqual(graph.variables.size, 0);
		assert.strictEqual(graph.diagnostics.length, 2);
	});

	test('a baked theme value that escapes never reaches the theme CSS', () => {
		const graph = build_variable_graph_from_options(undefined, {
			name: 't',
			variables: [{ name: 'text_color', base: 'red} body{background:lime' }]
		});
		const { root_css } = generate_theme_css(graph, new Set(['text_color']));
		assert.notInclude(root_css, 'lime');
		assert.strictEqual(uncontained(graph).length, 1);
	});

	test('a baked theme slot that escapes leaves the default in place', () => {
		const graph = build_variable_graph_from_options(undefined, {
			name: 't',
			variables: [{ name: 'text_color', base: 'red;' }]
		});
		const fallback = default_variables.find((v) => v.name === 'text_color')!;
		assert.strictEqual(graph.variables.get('text_color')?.base_value, fallback.base);
		assert.deepEqual(
			graph.diagnostics.map((d) => d.identifier),
			// the gates measure the contained theme, so they don't see the value
			['uncontained_theme_value']
		);
	});

	test('an uncontained hue is left out before the caps and gates read it', () => {
		const theme: Theme = { name: 'j', variables: [{ name: 'hue_a', base: '20; } x {' }] };
		const diagnostics: Array<GenerationDiagnostic> = [];
		const baked = bake_theme(theme, default_variables, diagnostics);
		assert.deepEqual(baked, { theme: { name: 'j', variables: [] } });
		assert.deepEqual(
			diagnostics.map((d) => d.identifier),
			['uncontained_theme_value']
		);
	});

	test('a theme entry with no name is reported and left out, not thrown on', () => {
		// untyped data, like a theme loaded from JSON
		const nameless = { base: '1' } as unknown as StyleVariable;
		const theme: Theme = { name: 'j', variables: [nameless, { name: 'hue_a', base: '20' }] };
		const graph = build_variable_graph_from_options(undefined, theme);
		assert.deepEqual(
			graph.diagnostics.map((d) => d.identifier),
			['uncontained_theme_value']
		);
		assert.strictEqual(graph.variables.get('hue_a')!.base_value, '20');
		assert.deepEqual(graph.theme!.theme.variables, [{ name: 'hue_a', base: '20' }]);
		// the overlay is total over one too, when handed the theme directly
		const applied = apply_theme_variables([{ name: 'hue_a', base: '0' }], { theme });
		assert.deepEqual(applied, [{ name: 'hue_a', base: '20' }]);
	});

	test('an escaping value both the variables and the theme carry is reported once', () => {
		const bad: StyleVariable = { name: 'text_color', base: 'red;' };
		const graph = build_variable_graph_from_options((d) => [...d, bad], {
			name: 't',
			variables: [bad]
		});
		assert.strictEqual(uncontained(graph).length, 1);
	});

	test('the default variables are all contained', () => {
		assert.deepEqual(build_variable_graph_from_options(undefined).diagnostics, []);
	});
});

describe('resolve_variables_transitive', () => {
	describe('basic resolution', () => {
		test('resolves single variable', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'a', base: '1' },
				{ name: 'b', base: '2' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['a']);

			assert.isTrue(result.variables.has('a'));
			assert.isFalse(result.variables.has('b'));
			assert.strictEqual(result.warnings.length, 0);
		});

		test('includes direct dependencies', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'hue', base: '210' },
				{ name: 'color', base: 'hsl(var(--hue) 50% 50%)' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['color']);

			assert.isTrue(result.variables.has('color'));
			assert.isTrue(result.variables.has('hue'));
		});

		test('resolves multiple initial variables', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'a', base: '1' },
				{ name: 'b', base: '2' },
				{ name: 'c', base: '3' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['a', 'c']);

			assert.isTrue(result.variables.has('a'));
			assert.isFalse(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
		});
	});

	describe('deep dependency chains', () => {
		test('resolves deep chain (A→B→C→D)', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'a', base: '1' },
				{ name: 'b', base: 'var(--a)' },
				{ name: 'c', base: 'var(--b)' },
				{ name: 'd', base: 'var(--c)' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['d']);

			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
			assert.isTrue(result.variables.has('d'));
		});

		test('resolves sibling dependencies', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'd', base: 'base-value' },
				{ name: 'b', base: 'var(--d)' },
				{ name: 'c', base: 'independent-value' },
				{ name: 'a', base: 'calc(var(--b) + var(--c))' }
			];
			const graph = build_variable_graph(variables);

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
				{ name: 'f', base: 'leaf-f' },
				{ name: 'c', base: 'leaf-c' },
				{ name: 'e', base: 'leaf-e' },
				{ name: 'd', base: 'var(--f)' },
				{ name: 'a', base: 'calc(var(--c) + var(--d))' },
				{ name: 'b', base: 'calc(var(--d) + var(--e))' },
				{ name: 'root', base: 'calc(var(--a) + var(--b))' }
			];
			const graph = build_variable_graph(variables);

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
				{ name: 'shared', base: 'shared-value' },
				{ name: 'x', base: 'var(--shared)' },
				{ name: 'y', base: 'var(--shared)' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['x', 'y']);

			assert.isTrue(result.variables.has('x'));
			assert.isTrue(result.variables.has('y'));
			assert.isTrue(result.variables.has('shared'));
			assert.strictEqual(result.variables.size, 3);
		});
	});

	describe('base/dark dependency resolution', () => {
		test('includes both base and dark deps', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'light_base', base: 'white' },
				{ name: 'dark_base', dark: 'black' },
				{ name: 'combo', base: 'var(--light_base)', dark: 'var(--dark_base)' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['combo']);

			assert.isTrue(result.variables.has('combo'));
			assert.isTrue(result.variables.has('light_base'));
			assert.isTrue(result.variables.has('dark_base'));
		});

		test('resolves mixed base/dark dependencies at multiple depths', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'light_leaf', base: '#fff' },
				{ name: 'dark_leaf', dark: '#000' },
				{ name: 'light_mid', base: 'var(--light_leaf)' },
				{ name: 'dark_mid', dark: 'var(--dark_leaf)' },
				{ name: 'themed', base: 'var(--light_mid)', dark: 'var(--dark_mid)' }
			];
			const graph = build_variable_graph(variables);

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
				{ name: 'a', base: '1' },
				{ name: 'b', base: '2' },
				{ name: 'c', base: '3' },
				{ name: 'composed', base: 'var(--a, var(--b, var(--c)))' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['composed']);

			assert.isTrue(result.variables.has('composed'));
			assert.isTrue(result.variables.has('a'));
			assert.isTrue(result.variables.has('b'));
			assert.isTrue(result.variables.has('c'));
		});
	});

	describe('missing variables', () => {
		test('tracks missing variables', () => {
			const variables: Array<StyleVariable> = [{ name: 'known', base: '1' }];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['known', 'unknown']);

			assert.isTrue(result.variables.has('known'));
			assert.isTrue(result.variables.has('unknown'));
			assert.isTrue(result.missing.has('unknown'));
			assert.isFalse(result.missing.has('known'));
			assert.strictEqual(result.warnings.length, 0);
		});

		test('tracks multiple missing variables', () => {
			const variables: Array<StyleVariable> = [{ name: 'exists', base: '1' }];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, [
				'exists',
				'missing1',
				'missing2',
				'missing3'
			]);

			assert.strictEqual(result.missing.size, 3);
			for (const name of ['missing1', 'missing2', 'missing3']) {
				assert.isTrue(result.missing.has(name), `Expected "${name}" to be missing`);
			}
		});

		test('tracks missing dependencies', () => {
			const variables: Array<StyleVariable> = [{ name: 'root', base: 'var(--missing_dep)' }];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['root']);

			assert.isTrue(result.variables.has('root'));
			assert.isTrue(result.variables.has('missing_dep'));
			assert.isTrue(result.missing.has('missing_dep'));
			assert.isFalse(result.missing.has('root'));
		});

		test('empty missing set when all exist', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'a', base: '1' },
				{ name: 'b', base: 'var(--a)' }
			];
			const graph = build_variable_graph(variables);

			const result = resolve_variables_transitive(graph, ['b']);

			assert.strictEqual(result.missing.size, 0);
		});
	});

	describe('cycle detection', () => {
		test.each<[string, Array<StyleVariable>, Array<string>]>([
			[
				'simple cycle (A→B→A)',
				[
					{ name: 'a', base: 'var(--b)' },
					{ name: 'b', base: 'var(--a)' }
				],
				['a', 'b']
			],
			[
				'longer cycle (A→B→C→A)',
				[
					{ name: 'a', base: 'var(--b)' },
					{ name: 'b', base: 'var(--c)' },
					{ name: 'c', base: 'var(--a)' }
				],
				['a', 'b', 'c']
			],
			['self-reference (A→A)', [{ name: 'a', base: 'calc(var(--a) + 1px)' }], ['a']],
			[
				'cycle in dark mode deps only',
				[
					{ name: 'a', base: 'blue', dark: 'var(--b)' },
					{ name: 'b', base: 'red', dark: 'var(--a)' }
				],
				['a', 'b']
			]
		])('detects %s', (_name, variables, expected_vars) => {
			const graph = build_variable_graph(variables);
			const result = resolve_variables_transitive(graph, ['a']);

			for (const v of expected_vars) {
				assert.isTrue(result.variables.has(v), `Expected "${v}" in result`);
			}
			assert.isAbove(result.warnings.length, 0);
			assert.isTrue(result.warnings.some((w) => w.includes('Circular dependency')));
		});

		test('self-reference in both base and dark triggers cycle warning', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'x', base: 'var(--x, 1)', dark: 'var(--x, 2)' }
			];
			const graph = build_variable_graph(variables);
			const result = resolve_variables_transitive(graph, ['x']);

			assert.isTrue(result.variables.has('x'));
			assert.isAbove(result.warnings.length, 0);
			assert.isTrue(result.warnings.some((w) => w.includes('Circular dependency')));
		});
	});

	describe('deep fallback chains', () => {
		test('resolves 5-level nested fallbacks', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'a', base: '1' },
				{ name: 'b', base: '2' },
				{ name: 'c', base: '3' },
				{ name: 'd', base: '4' },
				{ name: 'e', base: '5' },
				{ name: 'deep', base: 'var(--a, var(--b, var(--c, var(--d, var(--e)))))' }
			];
			const graph = build_variable_graph(variables);
			const result = resolve_variables_transitive(graph, ['deep']);

			for (const v of ['a', 'b', 'c', 'd', 'e', 'deep']) {
				assert.isTrue(result.variables.has(v), `Expected "${v}" in result`);
			}
			assert.strictEqual(result.missing.size, 0);
		});

		test('6-level chain with mixed base/dark', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'l1', base: 'white' },
				{ name: 'l2', base: 'var(--l1)' },
				{ name: 'l3', base: 'var(--l2)' },
				{ name: 'd1', dark: 'black' },
				{ name: 'd2', dark: 'var(--d1)' },
				{ name: 'd3', dark: 'var(--d2)' },
				{ name: 'themed', base: 'var(--l3)', dark: 'var(--d3)' }
			];
			const graph = build_variable_graph(variables);
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
				{ name: 'c', base: 'fallback-value' },
				{ name: 'a', base: 'var(--b, var(--c))' }
			];
			const graph = build_variable_graph(variables);
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
				{ name: 'width', base: '100px' },
				{ name: 'padding', base: '20px' },
				{ name: 'content_width', base: 'calc(var(--width) - var(--padding) * 2)' }
			];
			const graph = build_variable_graph(variables);
			const result = resolve_variables_transitive(graph, ['content_width']);

			assert.isTrue(result.variables.has('content_width'));
			assert.isTrue(result.variables.has('width'));
			assert.isTrue(result.variables.has('padding'));
			assert.strictEqual(result.variables.size, 3);
		});

		test('resolves calc with mixed var and fallback', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'base', base: '10px' },
				{ name: 'computed', base: 'calc(var(--base) + var(--missing, 5px))' }
			];
			const graph = build_variable_graph(variables);
			const result = resolve_variables_transitive(graph, ['computed']);

			assert.isTrue(result.variables.has('computed'));
			assert.isTrue(result.variables.has('base'));
			assert.isTrue(result.variables.has('missing'));
			assert.isTrue(result.missing.has('missing'));
		});

		test('resolves nested calc expressions', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'a', base: '10' },
				{ name: 'b', base: '20' },
				{ name: 'c', base: '30' },
				{ name: 'nested', base: 'calc(var(--a) + calc(var(--b) * var(--c)))' }
			];
			const graph = build_variable_graph(variables);
			const result = resolve_variables_transitive(graph, ['nested']);

			for (const v of ['a', 'b', 'c', 'nested']) {
				assert.isTrue(result.variables.has(v), `Expected "${v}" in result`);
			}
		});
	});
});

describe('generate_theme_css', () => {
	describe('basic output', () => {
		test('generates :root and dark blocks', () => {
			const variables: Array<StyleVariable> = [{ name: 'color', base: 'blue', dark: 'lightblue' }];
			const graph = build_variable_graph(variables);

			const { root_css, dark_css } = generate_theme_css(graph, new Set(['color']));

			assert.include(root_css, ':root');
			assert.include(root_css, '--color: blue;');
			assert.include(dark_css, ':root.dark');
			assert.include(dark_css, '--color: lightblue;');
		});

		test('renders single :root scopes', () => {
			const variables: Array<StyleVariable> = [{ name: 'color', base: 'blue', dark: 'lightblue' }];
			const graph = build_variable_graph(variables);

			const { root_css, dark_css } = generate_theme_css(graph, new Set(['color']));

			assert.include(root_css, ':root {');
			assert.include(dark_css, ':root.dark {');
		});
	});

	describe('base-only and dark-only variables', () => {
		test('base-only produces only the :root block', () => {
			const variables: Array<StyleVariable> = [{ name: 'spacing', base: '16px' }];
			const graph = build_variable_graph(variables);

			const { root_css, dark_css } = generate_theme_css(graph, new Set(['spacing']));

			assert.include(root_css, '--spacing: 16px;');
			assert.strictEqual(dark_css, '');
		});

		test('dark-only produces only dark block', () => {
			const variables: Array<StyleVariable> = [{ name: 'glow', dark: 'none' }];
			const graph = build_variable_graph(variables);

			const { root_css, dark_css } = generate_theme_css(graph, new Set(['glow']));

			assert.strictEqual(root_css, '');
			assert.include(dark_css, '--glow: none;');
		});
	});

	describe('sorting', () => {
		test('outputs variables in sorted order', () => {
			const variables: Array<StyleVariable> = [
				{ name: 'zebra', base: '3' },
				{ name: 'alpha', base: '1' },
				{ name: 'mid', base: '2' }
			];
			const graph = build_variable_graph(variables);

			const { root_css } = generate_theme_css(graph, new Set(['zebra', 'alpha', 'mid']));

			const alpha_pos = root_css.indexOf('--alpha');
			const mid_pos = root_css.indexOf('--mid');
			const zebra_pos = root_css.indexOf('--zebra');

			assert.isBelow(alpha_pos, mid_pos);
			assert.isBelow(mid_pos, zebra_pos);
		});
	});
});

describe('utility functions', () => {
	test('get_all_variable_names returns all names', () => {
		const variables: Array<StyleVariable> = [
			{ name: 'a', base: '1' },
			{ name: 'b', base: '2' },
			{ name: 'c', base: '3' }
		];
		const graph = build_variable_graph(variables);

		const names = get_all_variable_names(graph);

		assert.strictEqual(names.size, 3);
		assert.isTrue(names.has('a'));
		assert.isTrue(names.has('b'));
		assert.isTrue(names.has('c'));
	});
});

describe('build_variable_graph_from_options', () => {
	test('loads actual variables', () => {
		const graph = build_variable_graph_from_options(undefined);

		assert.isAbove(graph.variables.size, 100);

		assert.isTrue(graph.variables.has('hue_a'));
		assert.isTrue(graph.variables.has('palette_a_50'));
		assert.isTrue(graph.variables.has('text_color'));

		const palette_a_50 = graph.variables.get('palette_a_50');
		assert.isDefined(palette_a_50);
		assert.isTrue(palette_a_50.base_deps.has('hue_a') || palette_a_50.dark_deps.has('hue_a'));
	});

	test('resolves common patterns', () => {
		const graph = build_variable_graph_from_options(undefined);

		const result = resolve_variables_transitive(graph, ['text_color']);

		assert.isTrue(result.variables.has('text_color'));
		assert.isAtLeast(result.variables.size, 1);
	});

	test('resolves color chain', () => {
		const graph = build_variable_graph_from_options(undefined);

		const result = resolve_variables_transitive(graph, ['palette_a_50']);

		assert.isTrue(result.variables.has('palette_a_50'));
		assert.isTrue(result.variables.has('hue_a'));
	});
});

describe('find_similar_variable', () => {
	describe('finds typos', () => {
		test.each<[string, string, Array<StyleVariable>, string]>([
			['color_primry', 'color_primary', [{ name: 'color_primary', base: 'blue' }], 'missing char'],
			['backuground', 'background', [{ name: 'background', base: '#fff' }], 'extra char'],
			['boarder_radius', 'border_radius', [{ name: 'border_radius', base: '4px' }], 'swapped chars']
		])('%s → %s (%s)', (typo, expected, variables) => {
			const graph = build_variable_graph(variables);
			assert.strictEqual(find_similar_variable(graph, typo), expected);
		});
	});

	describe('returns null for dissimilar', () => {
		test.each([['fill'], ['shadow'], ['icon_size']])('%s has no match', (name) => {
			const variables: Array<StyleVariable> = [
				{ name: 'color_primary', base: 'blue' },
				{ name: 'spacing_md', base: '16px' }
			];
			const graph = build_variable_graph(variables);
			assert.isNull(find_similar_variable(graph, name));
		});
	});

	test('returns null for empty graph', () => {
		const graph = build_variable_graph([]);
		assert.isNull(find_similar_variable(graph, 'anything'));
	});

	test('finds best match among multiple similar variables', () => {
		const variables: Array<StyleVariable> = [
			{ name: 'palette_a_1', base: '1' },
			{ name: 'palette_a_2', base: '2' },
			{ name: 'palette_a_3', base: '3' }
		];
		const graph = build_variable_graph(variables);

		const result = find_similar_variable(graph, 'palette_a_');
		assert.isNotNull(result);
		assert.match(result, /^palette_a_[123]$/);
	});

	test('returns null for short dissimilar strings', () => {
		const variables: Array<StyleVariable> = [
			{ name: 'shadow_xs', base: '1px' },
			{ name: 'shadow_sm', base: '2px' }
		];
		const graph = build_variable_graph(variables);
		assert.isNull(find_similar_variable(graph, 'shadow'));
	});
});

describe('apply_theme_variables', () => {
	const defaults: Array<StyleVariable> = [
		{ name: 'hue_a', base: '210' },
		{ name: 'hue_b', base: '120' },
		{ name: 'shade_00', base: '#fff', dark: '#000' }
	];

	test('returns the input unchanged with no theme', () => {
		assert.strictEqual(apply_theme_variables(defaults, null), defaults);
		assert.strictEqual(apply_theme_variables(defaults, undefined), defaults);
	});

	test("overlays the theme's variables last-wins by name", () => {
		const theme: Theme = { name: 't', variables: [{ name: 'hue_a', base: '30' }] };
		const result = apply_theme_variables(defaults, { theme });
		assert.deepEqual(
			result.find((v) => v.name === 'hue_a'),
			{ name: 'hue_a', base: '30' }
		);
		// untouched names survive, and the set doesn't grow
		assert.lengthOf(result, 3);
		assert.deepEqual(
			result.find((v) => v.name === 'hue_b'),
			{ name: 'hue_b', base: '120' }
		);
	});

	test('appends variables the defaults lack', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'my_brand', base: '#f60' }] };
		const result = apply_theme_variables(defaults, { theme });
		assert.lengthOf(result, 4);
		assert.isDefined(result.find((v) => v.name === 'my_brand'));
	});

	test('the mirror applies first, minus the names the theme or its caps set', () => {
		const result = apply_theme_variables(defaults, {
			theme: {
				name: 't',
				scheme: 'dark',
				variables: [
					{ name: 'shade_00', dark: '#111' },
					{ name: '_hue_a', base: 'x' }
				]
			},
			scheme_mirror: [
				{ name: 'shade_00', base: '#000' },
				{ name: 'hue_a', base: 'mirrored' },
				{ name: 'hue_b', base: 'mirrored' }
			],
			caps: [{ name: 'hue_b', base: 'capped' }]
		});
		// the theme's dark-only value keeps the default's base beneath it, not
		// the mirror's, which the theme's name shadows
		assert.deepEqual(
			result.find((v) => v.name === 'shade_00'),
			{ name: 'shade_00', base: '#fff', dark: '#111' }
		);
		assert.deepEqual(
			result.find((v) => v.name === 'hue_a'),
			{ name: 'hue_a', base: 'mirrored' }
		);
		assert.deepEqual(
			result.find((v) => v.name === 'hue_b'),
			{ name: 'hue_b', base: 'capped' }
		);
		// an internal name in the theme is dropped, as the renderer drops it
		assert.isUndefined(result.find((v) => v.name === '_hue_a'));
	});

	test('build_variable_graph_from_options bakes the theme into the graph', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'hue_a', base: '30' }] };
		const graph = build_variable_graph_from_options(defaults, theme);
		assert.strictEqual(graph.variables.get('hue_a')!.base_value, '30');
		assert.strictEqual(graph.theme?.theme, theme);
		// a different theme produces a different graph
		const other = build_variable_graph_from_options(defaults, {
			name: 't2',
			variables: [{ name: 'hue_a', base: '40' }]
		});
		assert.strictEqual(other.variables.get('hue_a')!.base_value, '40');
	});
});

describe('apply_theme_variables slot semantics', () => {
	const defaults: Array<StyleVariable> = [{ name: 'shade_00', base: '#fff', dark: '#000' }];

	test('a base-only theme value replaces both slots, matching the runtime cascade', () => {
		// at runtime a fuz.theme :root declaration beats the fuz.base :root.dark
		// default by layer order, so the baked entry drops the dark slot
		const result = apply_theme_variables(defaults, {
			theme: { name: 't', variables: [{ name: 'shade_00', base: '#eee' }] }
		});
		assert.deepEqual(result, [{ name: 'shade_00', base: '#eee' }]);
	});

	test("a dark-only theme value keeps the default's base slot", () => {
		// at runtime the theme's :root.dark only shadows under `.dark`, so the
		// light scheme still resolves the default - the baked entry must too
		const result = apply_theme_variables(defaults, {
			theme: { name: 't', variables: [{ name: 'shade_00', dark: '#111' }] }
		});
		assert.deepEqual(result, [{ name: 'shade_00', base: '#fff', dark: '#111' }]);
	});
});

describe('build-time theme against the real defaults', () => {
	test("a theme's var() reference pulls the variable in transitively", () => {
		const graph = build_variable_graph_from_options(undefined, {
			name: 't',
			variables: [{ name: 'hue_accent', base: 'var(--hue_d)' }]
		});
		const { variables, missing } = resolve_variables_transitive(graph, ['accent_50']);
		assert.strictEqual(missing.size, 0);
		assert.isTrue(variables.has('hue_accent'));
		// the rebinding's target rides along even though nothing else uses it
		assert.isTrue(variables.has('hue_d'));
		const { root_css } = generate_theme_css(graph, variables);
		assert.include(root_css, '--hue_accent: var(--hue_d);');
		assert.include(root_css, '--hue_d:');
	});
});

describe('bake_theme', () => {
	test('a stanced theme mirrors the configured variables, not the defaults', () => {
		const adaptive = scheme_adaptive_variables.find((v) => v.name === 'shade_lightness_00')!;
		const custom: StyleVariable = { name: adaptive.name, base: '0.97', dark: '0.11' };
		const configured = [...default_variables.filter((v) => v.name !== adaptive.name), custom];
		const baked = bake_theme({ name: 't', scheme: 'dark', variables: [] }, configured);
		assert.deepEqual(baked.scheme_mirror, scheme_stance_variables('dark', configured));
		assert.deepEqual(
			baked.scheme_mirror!.find((v) => v.name === adaptive.name),
			{ name: adaptive.name, base: '0.11' }
		);
		// the graph carries the custom value under the stance, in both schemes
		const graph = build_variable_graph_from_options(configured, {
			name: 't',
			scheme: 'dark',
			variables: []
		});
		const info = graph.variables.get(adaptive.name)!;
		assert.strictEqual(info.base_value, '0.11');
		assert.isUndefined(info.dark_value);
	});

	test('a dual theme gets no mirror, and an unmoved one no caps', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'chroma_scale', base: '0.9' }] };
		assert.deepEqual(bake_theme(theme, default_variables), { theme });
	});

	test('a rotated hue compiles caps, baked last into the graph', () => {
		const theme: Theme = { name: 'rotated', variables: [{ name: 'hue_i', base: '205' }] };
		const caps = compute_theme_caps(theme);
		assert.isAbove(caps.length, 0);
		const baked = bake_theme(theme, default_variables);
		assert.deepEqual(baked.caps, caps);
		const graph = build_variable_graph_from_options(undefined, theme);
		for (const cap of caps) {
			assert.strictEqual(graph.variables.get(cap.name)!.base_value, cap.base, cap.name);
		}
		const { root_css } = generate_theme_css(graph, new Set(caps.map((v) => v.name)));
		assert.include(root_css, `--${caps[0]!.name}: ${caps[0]!.base};`);
	});

	test("a supplied ResolvedTheme's derived data is recomputed, not trusted", () => {
		const theme: Theme = {
			name: 'rotated',
			scheme: 'dark',
			variables: [{ name: 'hue_i', base: '205' }]
		};
		const stale = {
			theme,
			scheme_mirror: [{ name: 'shade_00', base: 'stale' }],
			caps: [{ name: '_palette_chroma_50', base: 'stale' }]
		};
		assert.deepEqual(bake_theme(stale, default_variables), bake_theme(theme, default_variables));
	});

	test('the gates report as warnings', () => {
		const diagnostics: Array<GenerationDiagnostic> = [];
		bake_theme(
			{
				name: 'loud',
				variables: [
					{ name: 'chroma_scale', base: '2' },
					{ name: 'hue_j', base: '170deg' }
				]
			},
			default_variables,
			diagnostics
		);
		assert.isTrue(diagnostics.every((d) => d.level === 'warning'));
		assert.sameMembers(
			[...new Set(diagnostics.map((d) => d.identifier))],
			['theme_gate_failed', 'theme_gate_unchecked']
		);
		const failed = diagnostics.find((d) => d.identifier === 'theme_gate_failed')!;
		assert.include(failed.message, 'Baked theme "loud"');
		assert.include(failed.message, 'gamut');
		const unchecked = diagnostics.find((d) => d.identifier === 'theme_gate_unchecked')!;
		assert.include(unchecked.message, 'hue_j: 170deg');
	});

	test("the caps and gates measure the configured set's retuned knobs", () => {
		const theme: Theme = { name: 'rot', variables: [{ name: 'hue_a', base: '120' }] };
		const retune: StyleVariable = { name: 'palette_lightness_00', base: '0.5', dark: '0.5' };
		const configured = default_variables.map((v) => (v.name === retune.name ? retune : v));
		const diagnostics: Array<GenerationDiagnostic> = [];
		const baked = bake_theme(theme, configured, diagnostics);
		const expected = compute_theme_caps({ ...theme, variables: [retune, ...theme.variables] });
		assert.notDeepEqual(expected, compute_theme_caps(theme));
		assert.deepEqual(baked.caps, expected);
		const stop_50 = baked.caps!.find((v) => v.name === '_palette_chroma_50')!;
		assert.match(stop_50.base!, /0\.0565\)$/);
		assert.match(stop_50.dark!, /0\.1276\)$/);
		// the baked theme itself stays what was authored
		assert.strictEqual(baked.theme, theme);
		// measured at the default lightness, the caps would fail gamut here
		const failed = diagnostics.find((d) => d.identifier === 'theme_gate_failed');
		assert.notInclude(failed?.message ?? '', 'gamut');
	});

	test('a retuned knob folds in re-slotted for a stance', () => {
		const fallback = default_variables.find((v) => v.name === 'palette_lightness_00')!;
		const retune: StyleVariable = { ...fallback, dark: '0.3' };
		const configured = default_variables.map((v) => (v.name === retune.name ? retune : v));
		const hue: StyleVariable = { name: 'hue_a', base: '120' };
		const light: Theme = { name: 'l', scheme: 'light', variables: [hue] };
		const dark: Theme = { name: 'd', scheme: 'dark', variables: [hue] };
		// the light stance renders the unchanged base slot in both schemes
		assert.deepEqual(bake_theme(light, configured).caps, compute_theme_caps(light));
		// the dark stance renders the retuned dark slot in both schemes
		const expected = compute_theme_caps({
			...dark,
			variables: [{ name: retune.name, base: '0.3' }, hue]
		});
		assert.notDeepEqual(expected, compute_theme_caps(dark));
		assert.deepEqual(bake_theme(dark, configured).caps, expected);
	});

	test("a stanced theme's gates list only the stanced scheme", () => {
		// marquee clips gamut by design, and that's the whole of its bake warning
		const diagnostics: Array<GenerationDiagnostic> = [];
		bake_theme(marquee_theme, default_variables, diagnostics);
		assert.deepEqual(
			diagnostics.map((d) => d.identifier),
			['theme_gate_failed']
		);
		const { message } = diagnostics[0]!;
		assert.match(message, /^Baked theme "marquee" fails accessibility gates: gamut dark /);
		assert.notInclude(message, ' light ');
		assert.notInclude(message, 'contrast');
	});

	test('a theme that passes everything bakes silently', () => {
		const diagnostics: Array<GenerationDiagnostic> = [];
		bake_theme({ name: 'quiet', variables: [] }, default_variables, diagnostics);
		assert.deepEqual(diagnostics, []);
	});
});
