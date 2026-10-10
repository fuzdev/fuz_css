/**
 * Tests for the shared CSS-generation pipeline used by both the Gro generator
 * and the Vite plugin.
 *
 * @module
 */

import { test, describe, assert } from 'vitest';

import { generate_css, type GenerateCssOptions } from '#lib/generate_css.ts';
import { create_test_fixtures } from './css_bundled_resolution_fixtures.ts';
import type { StyleVariable } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
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
			const { style_rule_index, variable_graph } = create_test_fixtures(
				'button { color: red; }',
				[]
			);

			const result = generate_css(
				make_options({
					all_classes: new Set(['p_lg']),
					all_elements: new Set(['button']),
					resources: { style_rule_index, variable_graph }
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
			const { style_rule_index, variable_graph } = create_test_fixtures(
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
					resources: { style_rule_index, variable_graph }
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
			const { style_rule_index, variable_graph } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					// not in detected_css_variables - only reachable via @fuz-variables
					explicit_variables: new Set(['text_color']),
					include_theme: true,
					resources: { style_rule_index, variable_graph }
				})
			);

			assert_css_contains(result.css, '--text_color');
		});

		test('surfaces resolution diagnostics (unresolved explicit variable)', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);

			const result = generate_css(
				make_options({
					// not in the theme - resolve_css errors on the @fuz-variables annotation
					explicit_variables: new Set(['nonexistent_var']),
					include_theme: true,
					resources: { style_rule_index, variable_graph }
				})
			);

			const error = result.diagnostics.find((d) => d.level === 'error');
			assert.ok(error, 'expected an error diagnostic from resolve_css');
			assert.include(error.message, '@fuz-variables');
		});

		test('does not mutate the caller-supplied detected_css_variables set', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);
			const detected = new Set(['space_lg']);

			generate_css(
				make_options({
					explicit_variables: new Set(['text_color']),
					include_theme: true,
					detected_css_variables: detected,
					resources: { style_rule_index, variable_graph }
				})
			);

			assert.deepEqual([...detected], ['space_lg']);
		});

		test('a configured theme discarded by variables: null warns', () => {
			const result = generate_css(
				make_options({ theme: { name: 't', variables: [] }, include_theme: false })
			);
			const warning = result.diagnostics.find(
				(d) => d.level === 'warning' && 'identifier' in d && d.identifier === 'theme_discarded'
			);
			assert.ok(warning, 'expected a theme_discarded warning');
			// no warning when the theme can actually render
			const { style_rule_index, variable_graph } = create_test_fixtures(
				'button { color: red; }',
				VARIABLES
			);
			const ok_result = generate_css(
				make_options({
					theme: { name: 't', variables: [] },
					include_theme: true,
					resources: { style_rule_index, variable_graph }
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
			const { style_rule_index, variable_graph } = create_test_fixtures(base_css, VARIABLES);

			const result = generate_css(
				make_options({
					include_base: true,
					include_theme: true,
					resources: { style_rule_index, variable_graph }
				})
			);

			assert_css_contains(result.css, '@layer fuz.preferences {');
			assert_css_contains(result.css, 'prefers-contrast: more');
			// the unused button rule is still shaken out
			assert_css_not_contains(result.css, 'button');
		});
	});

	describe('explicit base-style classes', () => {
		const BASE_CSS = 'button.callout { color: red; }';

		test('an explicit class only base styles target ships its rules without an error', () => {
			const result = generate_css(
				make_options({
					all_classes: new Set(['callout']),
					explicit_classes: new Set(['callout']),
					include_base: true,
					resources: create_test_fixtures(BASE_CSS, [])
				})
			);

			assert_css_contains(result.css, 'button.callout { color: red; }');
			assert.deepEqual(result.diagnostics, []);
		});

		test('a typo still errors with base styles bundled', () => {
			const result = generate_css(
				make_options({
					all_classes: new Set(['calout']),
					explicit_classes: new Set(['calout']),
					include_base: true,
					resources: create_test_fixtures(BASE_CSS, [])
				})
			);

			assert.lengthOf(result.diagnostics, 1);
			const diagnostic = result.diagnostics[0]!;
			assert.strictEqual(diagnostic.level, 'error');
			assert('identifier' in diagnostic);
			assert.strictEqual(diagnostic.identifier, 'calout');
		});

		test('errors when base output is off, even with resources loaded for the theme', () => {
			const result = generate_css(
				make_options({
					all_classes: new Set(['callout']),
					explicit_classes: new Set(['callout']),
					include_theme: true,
					resources: create_test_fixtures(BASE_CSS, [])
				})
			);

			assert_css_not_contains(result.css, 'callout');
			assert.lengthOf(result.diagnostics, 1);
			const diagnostic = result.diagnostics[0]!;
			assert('identifier' in diagnostic);
			assert.strictEqual(diagnostic.identifier, 'callout');
		});

		test('errors in utility-only mode', () => {
			const result = generate_css(
				make_options({
					all_classes: new Set(['callout']),
					explicit_classes: new Set(['callout'])
				})
			);

			assert.lengthOf(result.diagnostics, 1);
			const diagnostic = result.diagnostics[0]!;
			assert('identifier' in diagnostic);
			assert.strictEqual(diagnostic.identifier, 'callout');
		});
	});

	describe('undefined_theme_variables', () => {
		// `text_color`, `text_80`, `shade_00`, and `space_md` are names the
		// default variables define; `my_brand` is not
		const BASE_CSS = 'button { color: var(--text_color); background: var(--shade_00); }';

		interface Case {
			name: string;
			base_css: string;
			variables: Array<StyleVariable>;
			/** `false` models `variables: null`, which also builds an empty graph. */
			include_theme?: boolean;
			overrides?: Partial<GenerateCssOptions>;
			/** The names the error lists in order, or `null` for no error. */
			expected: Array<string> | null;
		}

		const cases: Array<Case> = [
			{
				name: 'variables: null',
				base_css: BASE_CSS,
				variables: [],
				include_theme: false,
				expected: ['--shade_00', '--text_color']
			},
			{
				// a configured theme populates the graph, but nothing renders it
				name: 'variables: null with a theme defining them',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', light: 'black' },
					{ name: 'shade_00', light: 'white' }
				],
				include_theme: false,
				expected: ['--shade_00', '--text_color']
			},
			{
				name: 'variables: []',
				base_css: BASE_CSS,
				variables: [],
				expected: ['--shade_00', '--text_color']
			},
			{
				name: 'a set missing one of the referenced defaults',
				base_css: BASE_CSS,
				variables: [{ name: 'text_color', light: 'black' }],
				expected: ['--shade_00']
			},
			{
				name: 'a default missing behind a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', light: 'var(--text_80)' },
					{ name: 'shade_00', light: 'white' }
				],
				expected: ['--text_80']
			},
			{
				name: 'a set defining everything referenced',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', light: 'black' },
					{ name: 'shade_00', light: 'white' }
				],
				expected: null
			},
			{
				name: 'a default missing behind the dark value of a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', light: 'black', dark: 'var(--text_80)' },
					{ name: 'shade_00', light: 'white' }
				],
				expected: ['--text_80']
			},
			{
				// a selector that only mentions the root doesn't define the name
				// for the whole document
				name: 'a name declared on a qualified root or wildcard selector',
				base_css:
					':root.dark { --text_color: white; }\n[class*="x"] { --shade_00: black; }\nbutton { color: var(--text_color); background: var(--shade_00); }',
				variables: [],
				expected: ['--shade_00', '--text_color']
			},
			{
				name: 'a default missing behind a fallback-less reference inside a fallback',
				base_css: 'button { color: var(--my_brand, var(--text_color)); }',
				variables: [],
				expected: ['--text_color']
			},
			{
				// a declaration scoped to some other selector doesn't define the
				// name for the rest of the document
				name: 'a name another, element-scoped rule declares',
				base_css: '.card { --text_color: red; }\nbutton { color: var(--text_color); }',
				variables: [],
				overrides: { all_classes: new Set(['card']) },
				expected: ['--text_color']
			},
			{
				name: 'a name declared at the root only inside a conditional group',
				base_css:
					'@media print { :root { --text_color: black; } }\nbutton { color: var(--text_color); }',
				variables: [],
				expected: ['--text_color']
			},
			{
				name: 'a name the base declares at the root, with variables: []',
				base_css: ':root { --text_color: #222; }\nbody { color: var(--text_color); }',
				variables: [],
				expected: null
			},
			{
				name: 'a name the base declares at the root, with variables: null',
				base_css: ':root { --text_color: #222; }\nbody { color: var(--text_color); }',
				variables: [],
				include_theme: false,
				expected: null
			},
			{
				name: 'a name the base declares on html, body, or *',
				base_css:
					'html { --text_color: #222; }\nbody { --shade_00: #fff; }\n* { --border_color: #ccc; }\nbutton { color: var(--text_color); background: var(--shade_00); border-color: var(--border_color); }',
				variables: [],
				expected: null
			},
			{
				name: 'a name declared and referenced in the same rule',
				base_css: 'button { --border_color: red; border-color: var(--border_color); }',
				variables: [],
				include_theme: false,
				expected: null
			},
			{
				name: 'a reference inside a comment',
				base_css: 'button { /* color: var(--text_color); */ color: red; }',
				variables: [],
				expected: null
			},
			{
				name: 'a reference with a fallback',
				base_css: 'button { color: var(--text_color, black); margin: var( --space_md , 4px ); }',
				variables: [],
				include_theme: false,
				expected: null
			},
			{
				name: 'a default missing behind a fallback in a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', light: 'var(--text_80, black)' },
					{ name: 'shade_00', light: 'white', dark: 'var(--shade_100, black)' }
				],
				expected: null
			},
			{
				name: 'an excluded name reached through a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', light: 'var(--text_80)' },
					{ name: 'shade_00', light: 'white' }
				],
				overrides: { exclude_variables: ['text_80'] },
				expected: null
			},
			{
				name: 'a variable-free base with variables: null',
				base_css: 'button { color: red; }',
				variables: [],
				include_theme: false,
				expected: null
			},
			{
				name: 'a variable-free base with variables: []',
				base_css: 'button { color: red; }',
				variables: [],
				expected: null
			},
			{
				name: "the consumer's own custom property names",
				base_css: 'button { color: var(--my_brand); margin: var(--my-gap, 4px); }',
				variables: [],
				expected: null
			},
			{
				name: 'a reference in a rule that tree-shaking leaves out',
				base_css: BASE_CSS,
				variables: [],
				overrides: { all_elements: new Set(['input']) },
				expected: null
			},
			{
				name: 'a reference nested in a group that ships',
				base_css:
					'@media print { @supports (display: grid) { button { color: var(--text_color); } } }',
				variables: [],
				expected: ['--text_color']
			},
			{
				name: 'names listed in exclude_variables',
				base_css: BASE_CSS,
				variables: [],
				overrides: { exclude_variables: ['text_color', 'shade_00'] },
				expected: null
			},
			{
				name: 'base styles disabled',
				base_css: ':root { color: var(--text_color); }',
				variables: [],
				overrides: { include_base: false },
				expected: null
			},
			{
				name: 'utility classes alone',
				base_css: 'button { color: red; }',
				variables: [],
				overrides: {
					all_classes: new Set(['p_md']),
					class_definitions: { p_md: { declaration: 'padding: var(--space_md);' } }
				},
				expected: null
			}
		];

		test.each(cases)(
			'$name',
			({ base_css, variables, include_theme = true, overrides, expected }) => {
				const result = generate_css(
					make_options({
						all_elements: new Set(['button']),
						include_base: true,
						include_theme,
						resources: create_test_fixtures(base_css, variables),
						...overrides
					})
				);

				const errors = result.diagnostics.filter(
					(d) => 'identifier' in d && d.identifier === 'undefined_theme_variables'
				);
				if (expected === null) {
					assert.deepEqual(errors, []);
					return;
				}
				assert.strictEqual(errors.length, 1);
				const error = errors[0]!;
				assert.strictEqual(error.level, 'error');
				assert.isTrue(error.message.endsWith(`: ${expected.join(', ')}`), error.message);
				// names the cause: disabled theme output, or a set that lacks them
				assert.include(error.message, include_theme ? 'do not define' : 'variables: null');
				// the base rule still ships
				assert_css_contains(result.css, 'button');
			}
		);

		test('utility-only mode stays silent', () => {
			const result = generate_css(
				make_options({
					all_classes: new Set(['p_lg']),
					all_elements: new Set(['button']),
					include_base: false,
					include_theme: false,
					resources: create_test_fixtures(BASE_CSS, [])
				})
			);

			assert.deepEqual(result.diagnostics, []);
		});

		test('every undefined name is listed, sorted', () => {
			const names = default_variables.slice(0, 20).map((v) => v.name);
			const result = generate_css(
				make_options({
					all_elements: new Set(['button']),
					include_base: true,
					include_theme: true,
					resources: create_test_fixtures(
						`button { margin: ${names.map((n) => `var(--${n})`).join(' ')}; }`,
						[]
					)
				})
			);

			const error = result.diagnostics.find(
				(d) => 'identifier' in d && d.identifier === 'undefined_theme_variables'
			);
			assert.ok(error);
			assert.isTrue(
				error.message.endsWith(
					`: ${names
						.toSorted()
						.map((n) => `--${n}`)
						.join(', ')}`
				),
				error.message
			);
		});

		test('the suggestion names the remedies for each cause', () => {
			const suggestion = (include_theme: boolean): string => {
				const result = generate_css(
					make_options({
						all_elements: new Set(['button']),
						include_base: true,
						include_theme,
						resources: create_test_fixtures(BASE_CSS, [])
					})
				);
				return result.diagnostics.find((d) => d.level === 'error')!.suggestion!;
			};

			// a set that lacks them: define them, or exclude the ones defined elsewhere
			assert.include(suggestion(true), 'Define them in variables');
			assert.include(suggestion(true), 'exclude_variables');
			// theme output off: bundle the theme, go utility-only, or exclude the default set
			assert.include(suggestion(false), "additional_variables: 'all'");
			assert.include(suggestion(false), 'base_css: null');
			assert.include(suggestion(false), 'exclude_variables: default_variables.map((v) => v.name)');
		});
	});
});
