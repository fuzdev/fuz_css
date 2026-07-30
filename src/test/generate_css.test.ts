/**
 * Tests for the shared CSS-generation pipeline used by both the Gro generator
 * and the Vite plugin.
 *
 * @module
 */

import { test, describe, assert } from 'vitest';

import { generate_css, type GenerateCssOptions } from '$lib/generate_css.ts';
import { create_test_fixtures } from './css_bundled_resolution_fixtures.ts';
import type { StyleVariable } from '$lib/variable.ts';
import { assert_css_contains, assert_css_not_contains } from './test_helpers.ts';

const CLASS_DEFS = {
	p_lg: { declaration: 'padding: var(--space_lg);' }
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
	...overrides
});

describe('generate_css', () => {
	describe('utility-only mode', () => {
		test('emits CSS for detected token classes, no base/theme', () => {
			const result = generate_css(make_options({ all_classes: new Set(['p_lg']) }));

			assert_css_contains(result.css, '.p_lg { padding: var(--space_lg); }');
			assert.equal(result.diagnostics.length, 0);
		});

		test('wraps output in the fuz.utilities layer with the order statement', () => {
			const result = generate_css(make_options({ all_classes: new Set(['p_lg']) }));

			assert.match(result.css, /^@layer fuz\.base, fuz\.preferences, fuz\.theme, fuz\.utilities;/);
			assert_css_contains(result.css, '@layer fuz.utilities {');
		});

		test('emits nothing when no classes are detected', () => {
			const result = generate_css(make_options());

			assert.equal(result.css, '');
		});

		test('ignores resources when base and theme are disabled', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: red; }',
				[]
			);

			const result = generate_css(
				make_options({
					all_classes: new Set(['p_lg']),
					all_elements: new Set(['button']),
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
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
				location: { file: 'x.svelte', line: 1, column: 0 }
			};
			const result = generate_css(make_options({ extraction_diagnostics: [diagnostic] }));

			assert.equal(result.diagnostics.length, 1);
			assert.equal(result.diagnostics[0]!.message, 'test diagnostic');
		});
	});

	describe('bundled mode', () => {
		const VARIABLES: Array<StyleVariable> = [
			{ name: 'space_lg', light: '24px' },
			{ name: 'text_color', light: 'black', dark: 'white' }
		];

		test('includes base rules for detected elements and used theme variables', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: var(--text_color); }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					all_classes: new Set(['p_lg']),
					all_elements: new Set(['button']),
					detected_css_variables: new Set(['text_color']),
					include_base: true,
					include_theme: true,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			// utility class
			assert_css_contains(result.css, '.p_lg {');
			// base rule for detected element
			assert_css_contains(result.css, 'button');
			// theme variable that was referenced
			assert_css_contains(result.css, '--text_color');
		});

		test('merges explicit_variables into the detected set', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					// not in detected_css_variables - only reachable via @fuz-variables
					explicit_variables: new Set(['text_color']),
					include_theme: true,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			assert_css_contains(result.css, '--text_color');
		});

		test('surfaces resolution diagnostics (unresolved explicit variable)', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					// not in the theme - resolve_css errors on the @fuz-variables annotation
					explicit_variables: new Set(['nonexistent_var']),
					include_theme: true,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			const error = result.diagnostics.find((d) => d.level === 'error');
			assert.ok(error, 'expected an error diagnostic from resolve_css');
			assert.include(error.message, '@fuz-variables');
		});

		test('does not mutate the caller-supplied detected_css_variables set', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);
			const detected = new Set(['space_lg']);

			generate_css(
				make_options({
					explicit_variables: new Set(['text_color']),
					include_theme: true,
					detected_css_variables: detected,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			assert.deepEqual([...detected], ['space_lg']);
		});

		test('warns when base styles are enabled but theme variables are disabled', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: var(--text_color); }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					include_base: true,
					include_theme: false, // variables: null, but base styles stay on
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			const warning = result.diagnostics.find(
				(d) => d.level === 'warning' && d.message.includes('theme variables are disabled')
			);
			assert.ok(warning, 'expected a warning about disabled theme variables');
			// base rule still emitted, but the theme variables section is not
			assert_css_contains(result.css, 'button');
			assert_css_not_contains(result.css, 'Theme Variables');
		});

		test('the disabled-theme warning fires with an empty variable graph', () => {
			// the real `variables: null` path builds the graph from that same option,
			// so it's empty - the guard keys on the default names, not the graph
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: var(--text_color); }',
				[]
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					include_base: true,
					include_theme: false,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			assert.ok(
				result.diagnostics.find(
					(d) => d.level === 'warning' && d.message.includes('theme variables are disabled')
				),
				'expected the warning to fire from the production-shaped empty graph'
			);
		});

		test('no theme-disabled warning when both base and theme are enabled', () => {
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: var(--text_color); }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					include_base: true,
					include_theme: true,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			assert.isUndefined(
				result.diagnostics.find((d) => d.message.includes('theme variables are disabled'))
			);
		});

		test('a configured theme discarded by variables: null warns', () => {
			const result = generate_css(make_options({ has_theme: true, include_theme: false }));
			const warning = result.diagnostics.find(
				(d) => d.level === 'warning' && 'identifier' in d && d.identifier === 'theme_discarded'
			);
			assert.ok(warning, 'expected a theme_discarded warning');
			// no warning when the theme can actually render
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);
			const ok_result = generate_css(
				make_options({
					has_theme: true,
					include_theme: true,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);
			assert.isUndefined(
				ok_result.diagnostics.find((d) => 'identifier' in d && d.identifier === 'theme_discarded')
			);
		});

		test('preference rules survive tree-shaking into the fuz.preferences layer', () => {
			// no detected elements or classes at all - the media block still ships
			// because its inner :root rule is core
			const base_css = `@layer fuz.preferences {
	@media (prefers-contrast: more) {
		:root { --text_color: black; }
	}
}
@layer fuz.base {
	button { color: var(--text_color); }
}`;
			const { style_rule_index, variable_graph, class_variable_index } = create_test_fixtures(
				base_css,
				VARIABLES
			);

			const result = generate_css(
				make_options({
					include_base: true,
					include_theme: true,
					resources: { style_rule_index, variable_graph, class_variable_index }
				})
			);

			assert_css_contains(result.css, '@layer fuz.preferences {');
			assert_css_contains(result.css, 'prefers-contrast: more');
			// the unused button rule is still shaken out
			assert_css_not_contains(result.css, 'button');
		});
	});
});
