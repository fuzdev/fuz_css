/**
 * Tests for the CSS-generation pipeline the generator core renders through.
 *
 * @module
 */

import { test, describe, assert } from 'vitest';

import { generate_css, to_class_inputs, type GenerateCssOptions } from '#lib/generate_css.ts';
import { CssClasses } from '#lib/css_classes.ts';
import type { SourceLocation } from '#lib/diagnostics.ts';
import { create_test_fixtures } from './css_bundled_resolution_fixtures.ts';
import type { StyleVariable } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
import {
	assert_css_contains,
	assert_css_not_contains,
	make_extraction_data
} from './test_helpers.ts';

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
				code: 'hint_colon' as const,
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
			{ name: 'space_lg', base: '24px' },
			{ name: 'text_color', base: 'black', dark: 'white' }
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

		test('applies all six include and exclude options itself', () => {
			const { style_rule_index, variable_graph } = create_test_fixtures(
				'button { color: red; } a { color: blue; } input { color: green; }',
				[
					{ name: 'space_lg', base: '24px' },
					{ name: 'kept_var', base: '1px' },
					{ name: 'added_var', base: '2px' },
					{ name: 'dropped_var', base: '3px' }
				]
			);
			const loc: SourceLocation = { file: 'a.svelte', line: 1, column: 1 };
			const result = generate_css(
				make_options({
					class_definitions: { ...CLASS_DEFS, m_lg: { declaration: 'margin: 1px;' } },
					all_classes: new Set(['m_lg']),
					all_classes_with_locations: new Map([['m_lg', [loc]]]),
					all_elements: new Set(['a', 'input']),
					detected_css_variables: new Set(['kept_var', 'dropped_var']),
					include_base: true,
					include_theme: true,
					resources: { style_rule_index, variable_graph },
					additional_classes: ['p_lg', 'missing_class'],
					exclude_classes: ['m_lg'],
					additional_elements: ['button'],
					exclude_elements: ['input'],
					additional_variables: ['added_var'],
					exclude_variables: ['dropped_var']
				})
			);

			assert_css_contains(result.css, '.p_lg {');
			assert_css_not_contains(result.css, '.m_lg');
			assert_css_contains(result.css, 'color: red');
			assert_css_contains(result.css, 'color: blue');
			assert_css_not_contains(result.css, 'color: green');
			assert_css_contains(result.css, '--kept_var');
			assert_css_contains(result.css, '--added_var');
			assert_css_not_contains(result.css, '--dropped_var');
			// an additional class is explicit, so an unresolvable one errors, with no locations
			const unresolved = result.diagnostics.filter((d) => d.code === 'class_unresolved');
			assert.strictEqual(unresolved.length, 1);
			assert.strictEqual(unresolved[0]!.level, 'error');
			assert(unresolved[0]!.phase === 'generation');
			assert.strictEqual(unresolved[0]!.identifier, 'missing_class');
			assert.isNull(unresolved[0]!.locations);
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

		test.each([['x'], [42], [{}], [{ theme: null }], [[]], [() => {}]])(
			'a junk theme %j discarded by variables: null warns once, not thrown on',
			(theme) => {
				const result = generate_css(
					make_options({
						theme: theme as unknown as GenerateCssOptions['theme'],
						include_theme: false
					})
				);
				assert.deepEqual(
					result.diagnostics
						.filter((d) => d.code === 'theme_discarded')
						.map((d) => [d.level, d.phase === 'generation' && d.identifier]),
					[['warning', 'theme']]
				);
			}
		);

		test('a configured theme discarded by variables: null warns', () => {
			const result = generate_css(
				make_options({ theme: { name: 't', variables: [] }, include_theme: false })
			);
			const warning = result.diagnostics.find(
				(d) => d.level === 'warning' && d.code === 'theme_discarded'
			);
			assert(warning?.phase === 'generation', 'expected a theme_discarded warning');
			assert.strictEqual(warning.identifier, 't');
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
			assert.isUndefined(ok_result.diagnostics.find((d) => d.code === 'theme_discarded'));
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
			assert.strictEqual(diagnostic.code, 'class_unresolved');
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
			assert.strictEqual(diagnostic.code, 'class_unresolved');
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
			assert.strictEqual(diagnostic.code, 'class_unresolved');
			assert('identifier' in diagnostic);
			assert.strictEqual(diagnostic.identifier, 'callout');
		});
	});

	describe('base_css_variables_undefined', () => {
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
					{ name: 'text_color', base: 'black' },
					{ name: 'shade_00', base: 'white' }
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
				variables: [{ name: 'text_color', base: 'black' }],
				expected: ['--shade_00']
			},
			{
				name: 'a default missing behind a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', base: 'var(--text_80)' },
					{ name: 'shade_00', base: 'white' }
				],
				expected: ['--text_80']
			},
			{
				name: 'a set defining everything referenced',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', base: 'black' },
					{ name: 'shade_00', base: 'white' }
				],
				expected: null
			},
			{
				name: 'a default missing behind the dark value of a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', base: 'black', dark: 'var(--text_80)' },
					{ name: 'shade_00', base: 'white' }
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
					{ name: 'text_color', base: 'var(--text_80, black)' },
					{ name: 'shade_00', base: 'white', dark: 'var(--shade_100, black)' }
				],
				expected: null
			},
			{
				name: 'an excluded name reached through a defined variable',
				base_css: BASE_CSS,
				variables: [
					{ name: 'text_color', base: 'var(--text_80)' },
					{ name: 'shade_00', base: 'white' }
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

				const errors = result.diagnostics.filter((d) => d.code === 'base_css_variables_undefined');
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

			const error = result.diagnostics.find((d) => d.code === 'base_css_variables_undefined');
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

describe('to_class_inputs', () => {
	test('additional_classes always included', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['extracted', [loc]]]) })
		);

		const result = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['always-included'])
		}).all_classes;
		assert.isTrue(result.has('always-included'));
		assert.isTrue(result.has('extracted'));
	});

	test('locations are null for additional_classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['extracted', [loc]]]) })
		);

		const result = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['included'])
		}).all_classes_with_locations;
		assert.isNull(result.get('included'));
		assert.deepEqual(result.get('extracted'), [loc]);
	});

	test('additional_classes are included in explicit_classes', () => {
		const css_classes = new CssClasses();

		const { explicit_classes } = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['included_class'])
		});
		assert.isNotNull(explicit_classes);
		assert.isTrue(explicit_classes.has('included_class'));
	});

	test('exclude_classes filters from all_classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([
					['kept', [loc]],
					['excluded', [loc]]
				])
			})
		);

		const { all_classes } = to_class_inputs({
			...css_classes.get_all(),
			exclude_classes: new Set(['excluded'])
		});
		assert.isTrue(all_classes.has('kept'));
		assert.isFalse(all_classes.has('excluded'));
	});

	test('exclude_classes filters from explicit_classes', () => {
		const include = new Set(['included_explicit']);
		const exclude = new Set(['included_explicit']);
		const css_classes = new CssClasses();

		const { explicit_classes } = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: include,
			exclude_classes: exclude
		});
		// included_explicit is in both include and exclude, so it should be excluded
		assert.isNull(explicit_classes);
	});

	test('exclude_classes suppresses @fuz-classes warnings', () => {
		const exclude = new Set(['annotated_but_excluded']);
		const css_classes = new CssClasses();
		const explicit = new Set(['annotated_but_excluded']);

		css_classes.add(
			'file1.ts',
			make_extraction_data({ classes: new Map(), explicit_classes: explicit })
		);

		const { explicit_classes } = to_class_inputs({
			...css_classes.get_all(),
			exclude_classes: exclude
		});
		// Should be filtered out by exclude
		assert.isNull(explicit_classes);
	});

	test('additional_classes merged with file data', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		// Simulate adding file data (could be from cache or fresh extraction)
		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['extracted_class', [loc]]]) })
		);

		const result = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['additional_a', 'additional_b'])
		}).all_classes;
		// Both additional and extracted should be present
		assert.isTrue(result.has('additional_a'));
		assert.isTrue(result.has('additional_b'));
		assert.isTrue(result.has('extracted_class'));
	});

	test('exclude_classes filters additional_classes', () => {
		const include = new Set(['keep_me', 'exclude_me']);
		const exclude = new Set(['exclude_me']);
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['extracted', [loc]]]) })
		);

		const result = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: include,
			exclude_classes: exclude
		}).all_classes;
		assert.isTrue(result.has('keep_me'));
		assert.isFalse(result.has('exclude_me'));
		assert.isTrue(result.has('extracted'));
	});

	test('multiple files combined with additional_classes', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = { file: 'file1.svelte', line: 1, column: 1 };
		const loc2: SourceLocation = { file: 'file2.svelte', line: 5, column: 10 };

		// Add multiple files (simulating cache-restored data)
		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['from_file1', [loc1]]]) })
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({ classes: new Map([['from_file2', [loc2]]]) })
		);

		const result = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['always_included'])
		}).all_classes;
		assert.isTrue(result.has('always_included'));
		assert.isTrue(result.has('from_file1'));
		assert.isTrue(result.has('from_file2'));
	});

	test('empty additional_classes has no effect on file data', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['extracted', [loc]]]) })
		);

		const result = to_class_inputs({ ...css_classes.get_all() }).all_classes;
		assert.strictEqual(result.size, 1);
		assert.isTrue(result.has('extracted'));
	});

	test('additional_classes appear in explicit_classes for warning tracking', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['regular', [loc]]]) })
		);

		const { explicit_classes } = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['additional_class'])
		});
		// additional_classes should be in explicit_classes
		assert.isTrue(explicit_classes!.has('additional_class'));
		// Regular extracted classes are not explicit unless via @fuz-classes
		assert.isFalse(explicit_classes!.has('regular'));
	});

	test('file explicit classes combined with additional_classes in explicit_classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.ts', line: 1, column: 1 };
		const file_explicit = new Set(['from_fuz_classes_annotation']);

		css_classes.add(
			'file1.ts',
			make_extraction_data({
				classes: new Map([['regular', [loc]]]),
				explicit_classes: file_explicit
			})
		);

		const { explicit_classes } = to_class_inputs({
			...css_classes.get_all(),
			additional_classes: new Set(['additional'])
		});
		assert.isTrue(explicit_classes!.has('additional'));
		assert.isTrue(explicit_classes!.has('from_fuz_classes_annotation'));
		assert.isFalse(explicit_classes!.has('regular'));
	});
});
