/**
 * Tests for the generator core both the Vite plugin and the Gro generator
 * render through - end to end from extracted classes to dispatched
 * diagnostics.
 *
 * @module
 */

import { test, describe, assert } from 'vitest';

import { create_css_generator } from '#lib/css_generator.ts';
import { extract_from_svelte } from '#lib/css_class_extractor.ts';
import type { CssGeneratorBaseOptions } from '#lib/css_plugin_options.ts';
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
