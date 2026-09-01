/**
 * Tests for generate_bundled_css function.
 *
 * Tests the CSS output assembly including section ordering, exclusion options,
 * and empty handling.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import { generate_bundled_css, type CssResolutionResult } from '$lib/css_bundled_resolution.ts';
import { assert_css_order } from './test_helpers.ts';

/**
 * Creates a mock resolution result for testing generate_bundled_css.
 */
const create_mock_result = (overrides: Partial<CssResolutionResult> = {}): CssResolutionResult => ({
	theme_css: ':root { --color: blue; }',
	base_css: 'button { color: red; }',
	preferences_css: '',
	resolved_variables: new Set(['color']),
	included_rule_indices: new Set([0]),
	included_elements: new Set(['button']),
	diagnostics: [],
	...overrides
});

describe('generate_bundled_css', () => {
	describe('section ordering', () => {
		test('theme before base before utilities', () => {
			const result = create_mock_result();
			const combined = generate_bundled_css(result, '.p_md { padding: 16px; }');

			assert_css_order(
				combined,
				'/* Theme Variables */',
				'/* Base Styles */',
				'/* Utility Classes */'
			);
		});

		test('includes section comments', () => {
			const result = create_mock_result();
			const bundled = generate_bundled_css(result, '.p_md { padding: 16px; }');

			assert.include(bundled, '/* Theme Variables */');
			assert.include(bundled, '/* Base Styles */');
			assert.include(bundled, '/* Utility Classes */');
		});

		test('emits the layer order statement and wraps each section in its layer', () => {
			const result = create_mock_result();
			const bundled = generate_bundled_css(result, '.p_md { padding: 16px; }');

			assert.match(bundled, /^@layer fuz\.base, fuz\.preferences, fuz\.theme, fuz\.utilities;/);
			// theme variables and base styles both live in fuz.base; utilities above
			assert.equal(bundled.match(/@layer fuz\.base \{/gu)?.length, 2);
			assert.include(bundled, '@layer fuz.utilities {\n.p_md { padding: 16px; }\n}');
		});

		test('preference rules are wrapped in fuz.preferences', () => {
			const result = create_mock_result({
				preferences_css: '@media (prefers-contrast: more) {\n:root { --x: 1; }\n}'
			});
			const bundled = generate_bundled_css(result, '');

			assert.include(bundled, '/* User-Preference Mappings */');
			assert.include(
				bundled,
				'@layer fuz.preferences {\n@media (prefers-contrast: more) {\n:root { --x: 1; }\n}\n}'
			);
			// the mappings set only theme variables, so they ship whenever either
			// the theme or the base styles that consume them do
			const no_base = generate_bundled_css(result, '', { include_base: false });
			assert.include(no_base, 'fuz.preferences {');
			const neither = generate_bundled_css(result, '', {
				include_base: false,
				include_theme: false
			});
			assert.notInclude(neither, 'fuz.preferences {');
		});

		test('a baked theme overlay renders into fuz.theme above the preferences', () => {
			const result = create_mock_result();
			const bundled = generate_bundled_css(result, '', {
				theme_overlay_css: ':root {\n\tcolor-scheme: dark;\n\t--hue_neutral: var(--hue_b);\n}'
			});
			assert.include(bundled, '/* Theme Overrides */');
			assert.include(bundled, '@layer fuz.theme {\n:root {\n\tcolor-scheme: dark;');
			// disabled theme output drops the overlay with the rest of the theme
			const no_theme = generate_bundled_css(result, '', {
				include_theme: false,
				theme_overlay_css: ':root {\n\tcolor-scheme: dark;\n}'
			});
			assert.notInclude(no_theme, 'fuz.theme {');
		});
	});

	describe('exclusion options', () => {
		test('include_theme: false excludes theme', () => {
			const result = create_mock_result();
			const no_theme = generate_bundled_css(result, '.p_md {}', { include_theme: false });

			assert.notInclude(no_theme, '/* Theme Variables */');
			assert.notInclude(no_theme, '--color');
			assert.include(no_theme, '/* Base Styles */');
			assert.include(no_theme, '/* Utility Classes */');
		});

		test('include_base: false excludes base', () => {
			const result = create_mock_result();
			const no_base = generate_bundled_css(result, '.p_md {}', { include_base: false });

			assert.include(no_base, '/* Theme Variables */');
			assert.notInclude(no_base, '/* Base Styles */');
			assert.notInclude(no_base, 'button { color');
			assert.include(no_base, '/* Utility Classes */');
		});

		test('include_utilities: false excludes utilities', () => {
			const result = create_mock_result();
			const no_utility = generate_bundled_css(result, '.p_md { padding: 16px; }', {
				include_utilities: false
			});

			assert.include(no_utility, '/* Theme Variables */');
			assert.include(no_utility, '/* Base Styles */');
			assert.notInclude(no_utility, '/* Utility Classes */');
			assert.notInclude(no_utility, '.p_md');
		});
	});

	describe('empty handling', () => {
		test('empty theme produces no section', () => {
			const result = create_mock_result({
				theme_css: '',
				resolved_variables: new Set<string>()
			});
			const bundled = generate_bundled_css(result, '.p_md {}');

			assert.notInclude(bundled, '/* Theme Variables */');
			assert.include(bundled, '/* Base Styles */');
			assert.include(bundled, '/* Utility Classes */');
		});

		test('empty base produces no section', () => {
			const result = create_mock_result({
				base_css: '',
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>()
			});
			const bundled = generate_bundled_css(result, '.p_md {}');

			assert.include(bundled, '/* Theme Variables */');
			assert.notInclude(bundled, '/* Base Styles */');
			assert.include(bundled, '/* Utility Classes */');
		});

		test('empty utilities produces no section', () => {
			const result = create_mock_result();
			const bundled = generate_bundled_css(result, '');

			assert.include(bundled, '/* Theme Variables */');
			assert.include(bundled, '/* Base Styles */');
			assert.notInclude(bundled, '/* Utility Classes */');
		});

		test('all empty produces empty string', () => {
			const result = create_mock_result({
				theme_css: '',
				base_css: '',
				resolved_variables: new Set<string>(),
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>()
			});
			const bundled = generate_bundled_css(result, '');

			assert.strictEqual(bundled, '');
		});

		test('only theme generates single section', () => {
			const result = create_mock_result({
				base_css: '',
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>()
			});
			const bundled = generate_bundled_css(result, '');

			assert.include(bundled, '/* Theme Variables */');
			assert.notInclude(bundled, '/* Base Styles */');
			assert.notInclude(bundled, '/* Utility Classes */');
		});
	});
});
