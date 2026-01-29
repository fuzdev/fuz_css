import {test, expect} from 'vitest';

import {
	build_variable_graph,
	build_default_variable_graph,
	resolve_variables_transitive,
	generate_theme_css,
	get_all_variable_names,
	has_variable,
	VARIABLE_GRAPH_VERSION,
} from '../lib/variable_graph.js';
import type {StyleVariable} from '../lib/variable.js';

test('build_variable_graph - basic variable', () => {
	const variables: Array<StyleVariable> = [{name: 'color_a', light: 'blue', dark: 'lightblue'}];

	const graph = build_variable_graph(variables, 'test-hash');

	expect(graph.variables.size).toBe(1);
	expect(graph.variables.get('color_a')!.light_css).toBe('blue');
	expect(graph.variables.get('color_a')!.dark_css).toBe('lightblue');
	expect(graph.version).toBe(VARIABLE_GRAPH_VERSION);
	expect(graph.content_hash).toBe('test-hash');
});

test('build_variable_graph - extracts dependencies', () => {
	const variables: Array<StyleVariable> = [
		{name: 'hue_a', light: '210'},
		{name: 'color_a', light: 'hsl(var(--hue_a) 50% 50%)'},
	];

	const graph = build_variable_graph(variables, 'test-hash');

	expect(graph.variables.get('color_a')!.light_deps.has('hue_a')).toBe(true);
	expect(graph.variables.get('hue_a')!.light_deps.size).toBe(0);
});

test('build_variable_graph - light only variable', () => {
	const variables: Array<StyleVariable> = [{name: 'spacing', light: '16px'}];

	const graph = build_variable_graph(variables, 'test-hash');

	expect(graph.variables.get('spacing')!.light_css).toBe('16px');
	expect(graph.variables.get('spacing')!.dark_css).toBeUndefined();
	expect(graph.variables.get('spacing')!.dark_deps.size).toBe(0);
});

test('build_variable_graph - dark only variable', () => {
	const variables: Array<StyleVariable> = [{name: 'shadow', dark: 'none'}];

	const graph = build_variable_graph(variables, 'test-hash');

	expect(graph.variables.get('shadow')!.light_css).toBeUndefined();
	expect(graph.variables.get('shadow')!.dark_css).toBe('none');
});

test('build_variable_graph - different light/dark dependencies', () => {
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

test('resolve_variables_transitive - basic resolution', () => {
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

test('resolve_variables_transitive - includes dependencies', () => {
	const variables: Array<StyleVariable> = [
		{name: 'hue', light: '210'},
		{name: 'color', light: 'hsl(var(--hue) 50% 50%)'},
	];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['color']);

	expect(result.variables.has('color')).toBe(true);
	expect(result.variables.has('hue')).toBe(true);
});

test('resolve_variables_transitive - deep dependencies', () => {
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

test('resolve_variables_transitive - multiple initial variables', () => {
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

test('resolve_variables_transitive - tracks missing variables', () => {
	const variables: Array<StyleVariable> = [{name: 'known', light: '1'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['known', 'unknown']);

	expect(result.variables.has('known')).toBe(true);
	expect(result.variables.has('unknown')).toBe(true); // Still included in resolved set
	expect(result.missing.has('unknown')).toBe(true); // But tracked as missing
	expect(result.missing.has('known')).toBe(false); // Known is not missing
	expect(result.warnings.length).toBe(0); // No cycle warnings
});

test('resolve_variables_transitive - tracks multiple missing variables', () => {
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

test('resolve_variables_transitive - tracks missing dependencies', () => {
	const variables: Array<StyleVariable> = [{name: 'root', light: 'var(--missing_dep)'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['root']);

	expect(result.variables.has('root')).toBe(true);
	expect(result.variables.has('missing_dep')).toBe(true); // Still resolved
	expect(result.missing.has('missing_dep')).toBe(true); // But tracked as missing
	expect(result.missing.has('root')).toBe(false); // root exists, not missing
});

test('resolve_variables_transitive - empty missing set when all exist', () => {
	const variables: Array<StyleVariable> = [
		{name: 'a', light: '1'},
		{name: 'b', light: 'var(--a)'},
	];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['b']);

	expect(result.missing.size).toBe(0);
});

test('resolve_variables_transitive - includes both light and dark deps', () => {
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

test('generate_theme_css - basic output', () => {
	const variables: Array<StyleVariable> = [{name: 'color', light: 'blue', dark: 'lightblue'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const {light_css, dark_css} = generate_theme_css(graph, new Set(['color']));

	expect(light_css).toContain(':root');
	expect(light_css).toContain('--color: blue;');
	expect(dark_css).toContain(':root.dark');
	expect(dark_css).toContain('--color: lightblue;');
});

test('generate_theme_css - specificity multiplier', () => {
	const variables: Array<StyleVariable> = [{name: 'color', light: 'blue', dark: 'lightblue'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const {light_css, dark_css} = generate_theme_css(graph, new Set(['color']), 2);

	expect(light_css).toContain(':root:root');
	expect(dark_css).toContain(':root:root.dark');
});

test('generate_theme_css - light only', () => {
	const variables: Array<StyleVariable> = [{name: 'spacing', light: '16px'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const {light_css, dark_css} = generate_theme_css(graph, new Set(['spacing']));

	expect(light_css).toContain('--spacing: 16px;');
	expect(dark_css).toBe('');
});

test('generate_theme_css - dark only', () => {
	const variables: Array<StyleVariable> = [{name: 'glow', dark: 'none'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const {light_css, dark_css} = generate_theme_css(graph, new Set(['glow']));

	expect(light_css).toBe('');
	expect(dark_css).toContain('--glow: none;');
});

test('generate_theme_css - sorted output', () => {
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

test('get_all_variable_names', () => {
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

test('has_variable', () => {
	const variables: Array<StyleVariable> = [{name: 'exists', light: '1'}];
	const graph = build_variable_graph(variables, 'test-hash');

	expect(has_variable(graph, 'exists')).toBe(true);
	expect(has_variable(graph, 'missing')).toBe(false);
});

test('build_default_variable_graph - loads actual variables', () => {
	const graph = build_default_variable_graph();

	// Should have many variables
	expect(graph.variables.size).toBeGreaterThan(100);

	// Should have common variables
	expect(graph.variables.has('hue_a')).toBe(true);
	expect(graph.variables.has('color_a_50')).toBe(true);
	expect(graph.variables.has('text_color')).toBe(true);

	// Color variables should have deps on hue
	const color_a_50 = graph.variables.get('color_a_50');
	expect(color_a_50).toBeDefined();
	expect(color_a_50!.light_deps.has('hue_a') || color_a_50!.dark_deps.has('hue_a')).toBe(true);
});

test('resolve with default graph - common pattern', () => {
	const graph = build_default_variable_graph();

	// Resolve text_color which depends on other vars
	const result = resolve_variables_transitive(graph, ['text_color']);

	expect(result.variables.has('text_color')).toBe(true);
	// text_color typically depends on other vars
	expect(result.variables.size).toBeGreaterThanOrEqual(1);
});

test('resolve with default graph - color chain', () => {
	const graph = build_default_variable_graph();

	// color_a_50 should depend on hue_a
	const result = resolve_variables_transitive(graph, ['color_a_50']);

	expect(result.variables.has('color_a_50')).toBe(true);
	expect(result.variables.has('hue_a')).toBe(true);
});

// Cycle detection tests

test('resolve_variables_transitive - detects simple cycle (A→B→A)', () => {
	const variables: Array<StyleVariable> = [
		{name: 'a', light: 'var(--b)'},
		{name: 'b', light: 'var(--a)'},
	];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['a']);

	// Both variables should still be resolved
	expect(result.variables.has('a')).toBe(true);
	expect(result.variables.has('b')).toBe(true);
	// Should generate a warning about the cycle
	expect(result.warnings.length).toBeGreaterThan(0);
	expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
});

test('resolve_variables_transitive - detects longer cycle (A→B→C→A)', () => {
	const variables: Array<StyleVariable> = [
		{name: 'a', light: 'var(--b)'},
		{name: 'b', light: 'var(--c)'},
		{name: 'c', light: 'var(--a)'},
	];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['a']);

	// All variables should be resolved
	expect(result.variables.has('a')).toBe(true);
	expect(result.variables.has('b')).toBe(true);
	expect(result.variables.has('c')).toBe(true);
	// Should generate a warning
	expect(result.warnings.length).toBeGreaterThan(0);
	expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
});

test('resolve_variables_transitive - detects self-reference (A→A)', () => {
	const variables: Array<StyleVariable> = [{name: 'a', light: 'calc(var(--a) + 1px)'}];
	const graph = build_variable_graph(variables, 'test-hash');

	const result = resolve_variables_transitive(graph, ['a']);

	// Variable should still be resolved
	expect(result.variables.has('a')).toBe(true);
	// Should generate a warning
	expect(result.warnings.length).toBeGreaterThan(0);
	expect(result.warnings.some((w) => w.includes('Circular dependency'))).toBe(true);
});

test('resolve_variables_transitive - cycle in dark mode deps only', () => {
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
