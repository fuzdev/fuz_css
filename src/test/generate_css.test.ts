/**
 * Tests for the shared CSS-generation pipeline used by both the Gro generator
 * and the Vite plugin.
 *
 * @module
 */

import {test, describe, assert} from 'vitest';

import {generate_css, type GenerateCssOptions} from '$lib/generate_css.js';
import {create_test_fixtures} from './css_bundled_resolution_fixtures.js';
import type {StyleVariable} from '$lib/variable.js';
import {assert_css_contains, assert_css_not_contains} from './test_helpers.js';

const CLASS_DEFS = {
	p_lg: {declaration: 'padding: var(--space_lg);'},
};

/** Builds options with sensible defaults; override per test. */
const make_options = (overrides: Partial<GenerateCssOptions> = {}): GenerateCssOptions => ({
	all_classes: new Set(),
	all_classes_with_locations: new Map(),
	explicit_classes: null,
	all_elements: new Set(),
	explicit_elements: null,
	explicit_variables: null,
	extraction_diagnostics: [],
	detected_css_variables: new Set(),
	class_definitions: CLASS_DEFS,
	interpreters: [],
	css_properties: null,
	include_base: false,
	include_theme: false,
	resources: null,
	...overrides,
});

describe('generate_css', () => {
	describe('utility-only mode', () => {
		test('emits CSS for detected token classes, no base/theme', () => {
			const result = generate_css(make_options({all_classes: new Set(['p_lg'])}));

			assert_css_contains(result.css, '.p_lg { padding: var(--space_lg); }');
			assert.equal(result.diagnostics.length, 0);
		});

		test('ignores resources when base and theme are disabled', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: red; }',
				[],
			);

			const result = generate_css(
				make_options({
					all_classes: new Set(['p_lg']),
					all_elements: new Set(['button']),
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			assert_css_contains(result.css, '.p_lg {');
			// base styles excluded because include_base is false
			assert_css_not_contains(result.css, 'color: red');
		});

		test('forwards extraction diagnostics through unchanged', () => {
			const diagnostic = {
				level: 'warning' as const,
				message: 'test diagnostic',
				suggestion: null,
				phase: 'extraction' as const,
				location: {file: 'x.svelte', line: 1, column: 0},
			};
			const result = generate_css(make_options({extraction_diagnostics: [diagnostic]}));

			assert.equal(result.diagnostics.length, 1);
			assert.equal(result.diagnostics[0]!.message, 'test diagnostic');
		});
	});

	describe('bundled mode', () => {
		const VARIABLES: Array<StyleVariable> = [
			{name: 'space_lg', light: '24px'},
			{name: 'text_color', light: 'black', dark: 'white'},
		];

		test('includes base rules for detected elements and used theme variables', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: var(--text_color); }',
				VARIABLES,
			);

			const result = generate_css(
				make_options({
					all_classes: new Set(['p_lg']),
					all_elements: new Set(['button']),
					detected_css_variables: new Set(['text_color']),
					include_base: true,
					include_theme: true,
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			// utility class
			assert_css_contains(result.css, '.p_lg {');
			// base rule for detected element
			assert_css_contains(result.css, 'button');
			// theme variable that was referenced
			assert_css_contains(result.css, '--text_color');
		});

		test('merges explicit_variables into the detected set', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: red; }',
				VARIABLES,
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					// not in detected_css_variables — only reachable via @fuz-variables
					explicit_variables: new Set(['text_color']),
					include_theme: true,
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			assert_css_contains(result.css, '--text_color');
		});

		test('surfaces resolution diagnostics (unresolved explicit variable)', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: red; }',
				VARIABLES,
			);

			const result = generate_css(
				make_options({
					// not in the theme — resolve_css errors on the @fuz-variables annotation
					explicit_variables: new Set(['nonexistent_var']),
					include_theme: true,
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			const error = result.diagnostics.find((d) => d.level === 'error');
			assert.ok(error, 'expected an error diagnostic from resolve_css');
			assert.include(error.message, '@fuz-variables');
		});

		test('does not mutate the caller-supplied detected_css_variables set', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: red; }',
				VARIABLES,
			);
			const detected = new Set(['space_lg']);

			generate_css(
				make_options({
					explicit_variables: new Set(['text_color']),
					include_theme: true,
					detected_css_variables: detected,
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			assert.deepEqual([...detected], ['space_lg']);
		});

		test('warns when base styles are enabled but theme variables are disabled', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: var(--text_color); }',
				VARIABLES,
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					include_base: true,
					include_theme: false, // variables: null, but base styles stay on
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			const warning = result.diagnostics.find(
				(d) => d.level === 'warning' && d.message.includes('theme variables are disabled'),
			);
			assert.ok(warning, 'expected a warning about disabled theme variables');
			// base rule still emitted, but the theme variables section is not
			assert_css_contains(result.css, 'button');
			assert_css_not_contains(result.css, 'Theme Variables');
		});

		test('no theme-disabled warning when both base and theme are enabled', () => {
			const {style_rule_index, variable_graph, class_variable_index} = create_test_fixtures(
				'button { color: var(--text_color); }',
				VARIABLES,
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					include_base: true,
					include_theme: true,
					resources: {style_rule_index, variable_graph, class_variable_index},
				}),
			);

			assert.isUndefined(
				result.diagnostics.find((d) => d.message.includes('theme variables are disabled')),
			);
		});
	});
});
