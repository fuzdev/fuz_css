/**
 * Tests for the shared plugin options interface.
 *
 * Verifies that the shared options work correctly with both
 * the Gro generator and Vite plugin.
 *
 * @module
 */

import {test, assert, describe} from 'vitest';

import type {
	CssGeneratorBaseOptions,
	CssExtractionOptions,
	CssClassOptions,
	CssOutputOptions,
	CssDiagnosticsOptions,
	CssCacheOptions,
} from '../lib/css_plugin_options.js';
import type {GenFuzCssOptions} from '../lib/gen_fuz_css.js';
import type {VitePluginFuzCssOptions} from '../lib/vite_plugin_fuz_css.js';

describe('shared options interface', () => {
	test('CssGeneratorBaseOptions includes all expected interfaces', () => {
		// Type-level test: if this compiles, the interface composition is correct
		const base_options: CssGeneratorBaseOptions = {
			// CssExtractionOptions
			filter_file: () => true,
			acorn_plugins: [],
			// CssClassOptions
			class_definitions: {},
			include_default_classes: true,
			class_interpreters: [],
			exclude_classes: ['hidden'],
			// CssOutputOptions
			base_css: undefined,
			variables: undefined,
			theme_specificity: 1,
			additional_classes: ['p_md'],
			additional_elements: ['dialog'],
			additional_variables: ['hue_a'],
			exclude_elements: ['custom-element'],
			exclude_variables: ['unused_var'],
			// CssDiagnosticsOptions
			on_error: 'log',
			on_warning: 'ignore',
			// CssCacheOptions
			cache_dir: '.cache',
		};

		assert.isDefined(base_options);
	});

	test('GenFuzCssOptions extends CssGeneratorBaseOptions', () => {
		// Type-level test: GenFuzCssOptions should accept all base options plus Gro-specific ones
		const gro_options: GenFuzCssOptions = {
			// Base options
			filter_file: () => true,
			base_css: undefined,
			variables: undefined,
			on_error: 'throw',
			// Gro-specific options
			include_stats: true,
			project_root: '/path/to/project',
			concurrency: 4,
			cache_io_concurrency: 100,
		};

		assert.isDefined(gro_options);
		assert.isTrue(gro_options.include_stats);
		assert.strictEqual(gro_options.project_root, '/path/to/project');
	});

	test('VitePluginFuzCssOptions extends CssGeneratorBaseOptions', () => {
		// Type-level test: VitePluginFuzCssOptions should accept all base options
		const vite_options: VitePluginFuzCssOptions = {
			// Base options
			filter_file: () => true,
			base_css: undefined,
			variables: undefined,
			on_error: 'throw',
			theme_specificity: 2,
			additional_elements: ['custom-element'],
		};

		assert.isDefined(vite_options);
		assert.strictEqual(vite_options.theme_specificity, 2);
	});

	test('options interfaces are assignable', () => {
		// Verify sub-interfaces can be used independently
		const extraction: CssExtractionOptions = {
			filter_file: (id) => id.endsWith('.svelte'),
		};

		const class_opts: CssClassOptions = {
			include_default_classes: true,
		};

		const output: CssOutputOptions = {
			base_css: null, // disabled
			variables: null, // disabled
		};

		const diagnostics: CssDiagnosticsOptions = {
			on_error: 'throw',
			on_warning: 'log',
		};

		const cache: CssCacheOptions = {
			cache_dir: '.custom-cache',
		};

		assert.isDefined(extraction);
		assert.isDefined(class_opts);
		assert.isDefined(output);
		assert.isDefined(diagnostics);
		assert.isDefined(cache);
	});

	test('base_css accepts string | null | undefined', () => {
		// Test undefined (default behavior)
		const default_opts: CssOutputOptions = {};
		assert.isUndefined(default_opts.base_css);

		// Test null (disabled)
		const disabled_opts: CssOutputOptions = {
			base_css: null,
		};
		assert.isNull(disabled_opts.base_css);

		// Test string (custom CSS)
		const custom_opts: CssOutputOptions = {
			base_css: 'button { color: red; }',
		};
		assert.strictEqual(typeof custom_opts.base_css, 'string');
	});

	test('variables accepts StyleVariable[] | null | undefined | callback', () => {
		// Test undefined (default behavior)
		const default_opts: CssOutputOptions = {};
		assert.isUndefined(default_opts.variables);

		// Test null (disabled)
		const disabled_opts: CssOutputOptions = {
			variables: null,
		};
		assert.isNull(disabled_opts.variables);

		// Test array (custom variables)
		const custom_opts: CssOutputOptions = {
			variables: [{name: 'my_var', light: 'blue', dark: 'lightblue'}],
		};
		assert.isTrue(Array.isArray(custom_opts.variables));

		// Test callback (modify defaults)
		const callback_opts: CssOutputOptions = {
			variables: (defaults) => defaults.filter((v) => v.name.startsWith('color_')),
		};
		assert.strictEqual(typeof callback_opts.variables, 'function');
	});
});

describe('options default behavior', () => {
	test('all options have sensible defaults in type', () => {
		// Empty object should be valid - all options are optional
		const minimal: CssGeneratorBaseOptions = {};
		assert.isDefined(minimal);
	});

	test('include_default_classes defaults to true conceptually', () => {
		// When undefined, generators should treat include_default_classes as true
		// This test documents the expected behavior
		const opts: CssClassOptions = {};
		assert.isUndefined(opts.include_default_classes);
		// Actual default is applied in gen_fuz_css.ts and vite_plugin_fuz_css.ts
	});
});
