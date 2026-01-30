/**
 * Tests for the shared plugin options interface.
 *
 * Verifies that the shared options work correctly with both
 * the Gro generator and Vite plugin.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import type {
	CssGeneratorBaseOptions,
	CssExtractionOptions,
	CssClassOptions,
	UnifiedCssOptions,
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
			include_default_definitions: true,
			class_interpreters: [],
			additional_classes: ['p_md'],
			exclude_classes: ['hidden'],
			// UnifiedCssOptions
			base_css: undefined,
			variables: undefined,
			treeshake_base_css: true,
			treeshake_variables: true,
			theme_specificity: 1,
			additional_elements: ['dialog'],
			additional_variables: ['hue_a'],
			// CssDiagnosticsOptions
			on_error: 'log',
			on_warning: 'ignore',
			// CssCacheOptions
			cache_dir: '.cache',
		};

		expect(base_options).toBeDefined();
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

		expect(gro_options).toBeDefined();
		expect(gro_options.include_stats).toBe(true);
		expect(gro_options.project_root).toBe('/path/to/project');
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

		expect(vite_options).toBeDefined();
		expect(vite_options.theme_specificity).toBe(2);
	});

	test('options interfaces are assignable', () => {
		// Verify sub-interfaces can be used independently
		const extraction: CssExtractionOptions = {
			filter_file: (id) => id.endsWith('.svelte'),
		};

		const class_opts: CssClassOptions = {
			additional_classes: ['box', 'row'],
			exclude_classes: ['test-class'],
		};

		const unified: UnifiedCssOptions = {
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

		expect(extraction).toBeDefined();
		expect(class_opts).toBeDefined();
		expect(unified).toBeDefined();
		expect(diagnostics).toBeDefined();
		expect(cache).toBeDefined();
	});

	test('base_css accepts string | null | undefined', () => {
		// Test undefined (default behavior)
		const default_opts: UnifiedCssOptions = {};
		expect(default_opts.base_css).toBeUndefined();

		// Test null (disabled)
		const disabled_opts: UnifiedCssOptions = {
			base_css: null,
		};
		expect(disabled_opts.base_css).toBeNull();

		// Test string (custom CSS)
		const custom_opts: UnifiedCssOptions = {
			base_css: 'button { color: red; }',
		};
		expect(typeof custom_opts.base_css).toBe('string');
	});

	test('variables accepts StyleVariable[] | null | undefined | callback', () => {
		// Test undefined (default behavior)
		const default_opts: UnifiedCssOptions = {};
		expect(default_opts.variables).toBeUndefined();

		// Test null (disabled)
		const disabled_opts: UnifiedCssOptions = {
			variables: null,
		};
		expect(disabled_opts.variables).toBeNull();

		// Test array (custom variables)
		const custom_opts: UnifiedCssOptions = {
			variables: [{name: 'my_var', light: 'blue', dark: 'lightblue'}],
		};
		expect(Array.isArray(custom_opts.variables)).toBe(true);

		// Test callback (modify defaults)
		const callback_opts: UnifiedCssOptions = {
			variables: (defaults) => defaults.filter((v) => v.name.startsWith('color_')),
		};
		expect(typeof callback_opts.variables).toBe('function');
	});

	test('treeshake options default to true conceptually', () => {
		// When undefined, generators should treat treeshake options as true
		// This test documents the expected behavior
		const opts: UnifiedCssOptions = {};
		expect(opts.treeshake_base_css).toBeUndefined();
		expect(opts.treeshake_variables).toBeUndefined();
		// Actual default is applied in gen_fuz_css.ts and vite_plugin_fuz_css.ts
	});
});

describe('options default behavior', () => {
	test('all options have sensible defaults in type', () => {
		// Empty object should be valid - all options are optional
		const minimal: CssGeneratorBaseOptions = {};
		expect(minimal).toBeDefined();
	});

	test('include_default_definitions defaults to true conceptually', () => {
		// When undefined, generators should treat include_default_definitions as true
		// This test documents the expected behavior
		const opts: CssClassOptions = {};
		expect(opts.include_default_definitions).toBeUndefined();
		// Actual default is applied in gen_fuz_css.ts and vite_plugin_fuz_css.ts
	});
});
