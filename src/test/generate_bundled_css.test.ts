/**
 * Tests for generate_bundled_css function.
 *
 * Tests the CSS output assembly including section ordering, exclusion options,
 * and empty handling.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {generate_bundled_css, type CssResolutionResult} from '../lib/css_bundled_resolution.js';
import {expect_css_order} from './test_helpers.ts';

/**
 * Creates a mock resolution result for testing generate_bundled_css.
 */
const create_mock_result = (overrides: Partial<CssResolutionResult> = {}): CssResolutionResult => ({
	theme_css: ':root { --color: blue; }',
	base_css: 'button { color: red; }',
	resolved_variables: new Set(['color']),
	included_rule_indices: new Set([0]),
	included_elements: new Set(['button']),
	diagnostics: [],
	...overrides,
});

describe('generate_bundled_css', () => {
	describe('section ordering', () => {
		test('theme before base before utilities', () => {
			const result = create_mock_result();
			const combined = generate_bundled_css(result, '.p_md { padding: 16px; }');

			expect_css_order(
				combined,
				'/* Theme Variables */',
				'/* Base Styles */',
				'/* Utility Classes */',
			);
		});

		test('includes section comments', () => {
			const result = create_mock_result();
			const bundled = generate_bundled_css(result, '.p_md { padding: 16px; }');

			expect(bundled).toContain('/* Theme Variables */');
			expect(bundled).toContain('/* Base Styles */');
			expect(bundled).toContain('/* Utility Classes */');
		});
	});

	describe('exclusion options', () => {
		test('include_theme: false excludes theme', () => {
			const result = create_mock_result();
			const no_theme = generate_bundled_css(result, '.p_md {}', {include_theme: false});

			expect(no_theme).not.toContain('/* Theme Variables */');
			expect(no_theme).not.toContain('--color');
			expect(no_theme).toContain('/* Base Styles */');
			expect(no_theme).toContain('/* Utility Classes */');
		});

		test('include_base: false excludes base', () => {
			const result = create_mock_result();
			const no_base = generate_bundled_css(result, '.p_md {}', {include_base: false});

			expect(no_base).toContain('/* Theme Variables */');
			expect(no_base).not.toContain('/* Base Styles */');
			expect(no_base).not.toContain('button { color');
			expect(no_base).toContain('/* Utility Classes */');
		});

		test('include_utilities: false excludes utilities', () => {
			const result = create_mock_result();
			const no_utility = generate_bundled_css(result, '.p_md { padding: 16px; }', {
				include_utilities: false,
			});

			expect(no_utility).toContain('/* Theme Variables */');
			expect(no_utility).toContain('/* Base Styles */');
			expect(no_utility).not.toContain('/* Utility Classes */');
			expect(no_utility).not.toContain('.p_md');
		});
	});

	describe('empty handling', () => {
		test('empty theme produces no section', () => {
			const result = create_mock_result({
				theme_css: '',
				resolved_variables: new Set<string>(),
			});
			const bundled = generate_bundled_css(result, '.p_md {}');

			expect(bundled).not.toContain('/* Theme Variables */');
			expect(bundled).toContain('/* Base Styles */');
			expect(bundled).toContain('/* Utility Classes */');
		});

		test('empty base produces no section', () => {
			const result = create_mock_result({
				base_css: '',
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>(),
			});
			const bundled = generate_bundled_css(result, '.p_md {}');

			expect(bundled).toContain('/* Theme Variables */');
			expect(bundled).not.toContain('/* Base Styles */');
			expect(bundled).toContain('/* Utility Classes */');
		});

		test('empty utilities produces no section', () => {
			const result = create_mock_result();
			const bundled = generate_bundled_css(result, '');

			expect(bundled).toContain('/* Theme Variables */');
			expect(bundled).toContain('/* Base Styles */');
			expect(bundled).not.toContain('/* Utility Classes */');
		});

		test('all empty produces empty string', () => {
			const result = create_mock_result({
				theme_css: '',
				base_css: '',
				resolved_variables: new Set<string>(),
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>(),
			});
			const bundled = generate_bundled_css(result, '');

			expect(bundled).toBe('');
		});

		test('only theme generates single section', () => {
			const result = create_mock_result({
				base_css: '',
				included_rule_indices: new Set<number>(),
				included_elements: new Set<string>(),
			});
			const bundled = generate_bundled_css(result, '');

			expect(bundled).toContain('/* Theme Variables */');
			expect(bundled).not.toContain('/* Base Styles */');
			expect(bundled).not.toContain('/* Utility Classes */');
		});
	});
});
