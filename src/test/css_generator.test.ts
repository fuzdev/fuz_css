/**
 * Tests for the generator core the Vite plugin renders through - end to end
 * from extracted classes to dispatched diagnostics.
 *
 * @module
 */

import { test, describe, assert } from 'vitest';

import { create_css_generator } from '#lib/css_generator.ts';
import { extract_from_svelte } from '#lib/css_class_extractor.ts';
import type { CssGeneratorBaseOptions } from '#lib/css_plugin_options.ts';
import type { CssClassDefinitionInterpreter } from '#lib/css_class_generation.ts';
import { compute_theme_caps } from '#lib/theme_check.ts';
import type { Theme } from '#lib/variable.ts';
import { assert_css_contains } from './test_helpers.ts';

/** Renders one Svelte source through a generator, collecting logged diagnostics. */
const render_source = async (
	source: string,
	options: CssGeneratorBaseOptions
): Promise<{ css: string; errors: Array<string>; warnings: Array<string> }> => {
	const errors: Array<string> = [];
	const warnings: Array<string> = [];
	const generator = create_css_generator(
		{ on_error: 'log', ...options },
		{ error: (m) => errors.push(m), warn: (m) => warnings.push(m) }
	);
	await generator.ensure_ready();
	const css_classes = generator.create_css_classes();
	css_classes.add('App.svelte', extract_from_svelte(source, 'App.svelte'));
	const css = generator.render({ css_classes, detected_css_variables: [] });
	return { css, errors, warnings };
};

describe('create_css_generator', () => {
	describe('explicit classes that only base styles define', () => {
		const SOURCE = '<!-- @fuz-classes palette_a selected -->\n<div></div>';

		test('a hint for a default base-style class ships its rules without an error', async () => {
			const { css, errors } = await render_source(SOURCE, { on_error: 'throw' });

			assert.deepEqual(errors, []);
			// the base rules targeting the hinted classes ship, with no button in the markup
			assert_css_contains(css, 'button:not(.unstyled).palette_a');
			assert_css_contains(css, 'button:not(.unstyled).selected');
		});

		test('an additional_classes entry naming a base-style class does not error', async () => {
			const { css, errors } = await render_source('<div></div>', {
				additional_classes: ['palette_b'],
				on_error: 'throw'
			});

			assert.deepEqual(errors, []);
			assert_css_contains(css, 'button:not(.unstyled).palette_b');
		});

		test('a class from a custom base_css resolves', async () => {
			const { css, errors } = await render_source('<!-- @fuz-classes callout -->\n<div></div>', {
				base_css: '.callout { border-left: 4px solid; }',
				variables: null
			});

			assert.deepEqual(errors, []);
			assert_css_contains(css, '.callout { border-left: 4px solid; }');
		});

		test('a typo still errors in bundled mode', async () => {
			const { errors } = await render_source('<!-- @fuz-classes palete_a -->\n<div></div>', {});

			assert.lengthOf(errors, 1);
			assert.include(errors[0], 'palete_a');
			assert.include(errors[0], 'No matching class definition found');
		});

		test('utility-only mode still errors, naming the base styles', async () => {
			const { errors } = await render_source(SOURCE, { base_css: null, variables: null });

			assert.lengthOf(errors, 2);
			for (const error of errors) {
				assert.include(error, 'No matching class definition found');
				assert.include(error, 'base_css');
			}
		});

		test('theme-only output still errors, since no base styles ship', async () => {
			const { errors } = await render_source(SOURCE, { base_css: null });

			assert.lengthOf(errors, 2);
		});
	});
});

describe('class options over the defaults', () => {
	// utility-only, so the output is the utility classes alone
	const UTILITY_ONLY = { base_css: null, variables: null } as const;
	const SOURCE = '<div class="my_gap p_md p_lg display:flex grid-cols-3"></div>';
	const MY_GAP = { declaration: 'gap: 3px;' };

	const grid_cols_interpreter: CssClassDefinitionInterpreter = {
		pattern: /^grid-cols-(\d+)$/,
		interpret: (matched) => ({
			declaration: `grid-template-columns: repeat(${matched[1]}, 1fr);`
		})
	};

	const create = (options: CssGeneratorBaseOptions) =>
		create_css_generator({ ...UTILITY_ONLY, ...options }, { error: () => {}, warn: () => {} });

	describe('class_definitions', () => {
		test('a record merges over the defaults', async () => {
			const { css } = await render_source(SOURCE, {
				...UTILITY_ONLY,
				class_definitions: { my_gap: MY_GAP }
			});

			assert_css_contains(css, '.my_gap', 'gap: 3px;');
			assert.include(css, '.p_md');
			assert.include(css, '.p_lg');
		});

		test('a callback receives the defaults and returns the whole set', async () => {
			let received: Record<string, unknown> | null = null;
			const { css } = await render_source(SOURCE, {
				...UTILITY_ONLY,
				class_definitions: (defaults) => {
					received = defaults;
					return { my_gap: MY_GAP };
				}
			});

			assert.isNotNull(received);
			assert.property(received, 'p_md');
			assert_css_contains(css, '.my_gap', 'gap: 3px;');
			assert.notInclude(css, '.p_md');
			assert.notInclude(css, '.p_lg');
		});

		test('a callback can filter the defaults', async () => {
			const { css } = await render_source(SOURCE, {
				...UTILITY_ONLY,
				class_definitions: ({ p_md: _p_md, ...rest }) => rest
			});

			assert.notInclude(css, '.p_md');
			assert.include(css, '.p_lg');
		});

		test('a callback mutating its argument leaves the defaults intact', async () => {
			create({
				class_definitions: (defaults) => {
					delete defaults.p_md;
					return defaults;
				}
			});
			const { css } = await render_source(SOURCE, UTILITY_ONLY);

			assert.include(css, '.p_md');
		});

		test('a callback returning something other than an object fails creation', () => {
			for (const result of [null, [], 'p_md']) {
				assert.throws(
					() => create({ class_definitions: () => result as never }),
					/class_definitions callback must return an object/
				);
			}
		});
	});

	describe('class_interpreters', () => {
		test('the default is the CSS-literal interpreter', async () => {
			const { css } = await render_source(SOURCE, UTILITY_ONLY);

			assert_css_contains(css, '.display\\:flex', 'display: flex;');
			assert.notInclude(css, 'grid-template-columns');
		});

		test('an array replaces the defaults', async () => {
			const { css } = await render_source(SOURCE, {
				...UTILITY_ONLY,
				class_interpreters: [grid_cols_interpreter]
			});

			assert.include(css, 'grid-template-columns: repeat(3, 1fr);');
			assert.notInclude(css, 'display: flex');
		});

		test('a callback receives the defaults and returns the interpreters to use', async () => {
			const { css } = await render_source(SOURCE, {
				...UTILITY_ONLY,
				class_interpreters: (defaults) => [grid_cols_interpreter, ...defaults]
			});

			assert.include(css, 'grid-template-columns: repeat(3, 1fr);');
			assert_css_contains(css, '.display\\:flex', 'display: flex;');
		});

		test('a callback mutating its argument leaves the defaults intact', async () => {
			create({
				class_interpreters: (defaults) => {
					defaults.length = 0;
					return defaults;
				}
			});
			const { css } = await render_source(SOURCE, UTILITY_ONLY);

			assert.include(css, 'display: flex');
		});

		test('a callback returning something other than an array fails creation', () => {
			for (const result of [null, {}, grid_cols_interpreter]) {
				assert.throws(
					() => create({ class_interpreters: () => result as never }),
					/class_interpreters callback must return an array/
				);
			}
		});
	});
});

describe('a baked theme', () => {
	test('a rotated hue bakes its compiled caps into the baked sublayer', async () => {
		const theme: Theme = { name: 'cyan nudge', variables: [{ name: 'hue_i', base: '205' }] };
		const caps = compute_theme_caps(theme);
		assert.isAbove(caps.length, 0);
		const { css, warnings } = await render_source('<div></div>', {
			theme,
			additional_variables: 'all'
		});
		const baked = css.slice(css.indexOf('@layer fuz.theme.baked'));
		assert.isAbove(css.indexOf('@layer fuz.theme.baked'), -1);
		for (const cap of caps) assert_css_contains(baked, `--${cap.name}: ${cap.base};`);
		// the caps clear the gates the nudge fails on the baked table
		assert.deepEqual(warnings, []);
	});

	test("a theme's failed gates warn once, however many renders", async () => {
		const warnings: Array<string> = [];
		const generator = create_css_generator(
			{ theme: { name: 'vivid', variables: [{ name: 'chroma_scale', base: '2' }] } },
			{ error: () => {}, warn: (m) => warnings.push(m) }
		);
		await generator.ensure_ready();
		for (let i = 0; i < 3; i++) {
			generator.render({ css_classes: generator.create_css_classes(), detected_css_variables: [] });
		}
		assert.strictEqual(warnings.filter((w) => w.includes('fails accessibility gates')).length, 1);
	});
});
