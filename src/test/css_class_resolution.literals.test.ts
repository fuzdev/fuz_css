import {test, expect, describe} from 'vitest';

import {resolve_composes} from '$lib/css_class_resolution.js';
import type {CssClassDefinition} from '$lib/css_class_generation.js';
import {
	expect_ok,
	expect_error,
	expect_resolved_declaration,
	expect_resolution_error,
} from './test_helpers.js';

/**
 * Tests for CSS literal class handling in resolve_composes.
 *
 * CSS literals (e.g., "display:flex", "margin:0~auto") can be used in composes arrays
 * for simple unmodified property:value pairs. Modified literals are rejected.
 */
describe('resolve_composes with CSS literals', () => {
	const css_properties = new Set(['text-align', 'display', 'margin', 'padding', 'opacity']);

	describe('unmodified literal resolution', () => {
		// Table-driven test cases: [composes, expectedDeclaration, description]
		const success_cases: Array<[Array<string>, string, string]> = [
			[['text-align:center'], 'text-align: center;', 'simple literal'],
			[['margin:0~auto'], 'margin: 0 auto;', 'literal with space encoding'],
			[['--card-bg:blue'], '--card-bg: blue;', 'custom property'],
			[
				['text-align:center', 'display:flex', 'margin:0~auto'],
				'text-align: center; display: flex; margin: 0 auto;',
				'multiple literals',
			],
		];

		test.each(success_cases)('resolves %j → "%s" (%s)', (composes, expectedDeclaration) => {
			const result = resolve_composes(composes, {}, new Set(), new Set(), 'test', css_properties);
			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe(expectedDeclaration);
			}
		});
	});

	describe('mixed token classes and literals', () => {
		test('resolves mixed token classes and literals', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const result = resolve_composes(
				['p_lg', 'text-align:center'],
				definitions,
				new Set(),
				new Set(),
				'test',
				css_properties,
			);

			expect_resolved_declaration(result, 'padding: var(--space_lg); text-align: center;');
		});

		test('resolves literal in nested composes resolution', () => {
			const definitions: Record<string, CssClassDefinition> = {
				base: {composes: ['text-align:center']},
				card: {composes: ['base'], declaration: 'padding: 1rem;'},
			};
			const result = resolve_composes(
				['card'],
				definitions,
				new Set(),
				new Set(),
				'test',
				css_properties,
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toContain('text-align: center;');
				expect(result.declaration).toContain('padding: 1rem;');
			}
		});
	});

	describe('modified literal errors', () => {
		test('modified literal (hover:opacity:80%) errors', () => {
			const result = resolve_composes(
				['hover:opacity:80%'],
				{},
				new Set(),
				new Set(),
				'test',
				css_properties,
			);

			expect_resolution_error(result, 'cannot be used in composes array');
		});

		test('modified known class gives clear error', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex; flex-direction: column;'},
			};
			const result = resolve_composes(
				['hover:box'],
				definitions,
				new Set(),
				new Set(),
				'card',
				css_properties,
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('cannot be used in composes array');
				expect(result.error.suggestion).toContain('directly in markup');
			}
		});

		test('modified token class (md:p_lg) gives clear error', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const result = resolve_composes(
				['md:p_lg'],
				definitions,
				new Set(),
				new Set(),
				'responsive_card',
				css_properties,
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('Modified class "md:p_lg"');
				expect(result.error.message).toContain('cannot be used in composes array');
			}
		});
	});

	describe('modifier typo detection', () => {
		test('modifier with unknown base reports unknown class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex;'},
			};
			const result = resolve_composes(
				['hover:bx'], // bx doesn't exist (typo for box?)
				definitions,
				new Set(),
				new Set(),
				'card',
				css_properties,
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('Unknown class "bx"');
				expect(result.error.suggestion).toContain('bx');
			}
		});

		test('modifier typo with known class suggests correction', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex;'},
			};
			const result = resolve_composes(
				['hovr:box'], // typo: hovr → hover
				definitions,
				new Set(),
				new Set(),
				'card',
				css_properties,
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('Unknown modifier "hovr"');
				expect(result.error.suggestion).toContain('hover:box');
				expect(result.error.suggestion).toContain('cannot be used in composes');
			}
		});

		test('modifier typo in middle of chain suggests correction', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex;'},
			};
			const result = resolve_composes(
				['md:hovr:box'], // typo in middle: md:hovr:box → md:hover:box
				definitions,
				new Set(),
				new Set(),
				'card',
				css_properties,
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('Unknown modifier "hovr"');
				expect(result.error.suggestion).toContain('md:hover:box');
			}
		});

		test('non-typo unknown prefix falls back to property error', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex;'},
			};
			const result = resolve_composes(
				['xyz:box'], // not a modifier typo
				definitions,
				new Set(),
				new Set(),
				'card',
				css_properties,
			);

			expect_resolution_error(result, 'Unknown CSS property "xyz"');
		});
	});

	describe('unknown class errors', () => {
		test('unknown class (not literal, not defined) errors', () => {
			const result = resolve_composes(
				['unknown_class'],
				{},
				new Set(),
				new Set(),
				'test',
				css_properties,
			);

			expect_resolution_error(result, 'Unknown class');
		});

		test('invalid CSS property with suggestion', () => {
			const result = resolve_composes(
				['disply:flex'],
				{},
				new Set(),
				new Set(),
				'card',
				css_properties,
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('Unknown CSS property');
				expect(result.error.suggestion).toContain('display');
			}
		});
	});

	describe('deduplication', () => {
		test('deduplicates literal classes with warning', () => {
			const result = resolve_composes(
				['text-align:center', 'text-align:center'],
				{},
				new Set(),
				new Set(),
				'test',
				css_properties,
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('text-align: center;');
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "text-align:center" is redundant');
			}
		});

		test('diamond dependency with literals deduplicated silently', () => {
			// Both b and c include text-align:center (diamond), reaching it via different paths
			const definitions: Record<string, CssClassDefinition> = {
				b: {composes: ['text-align:center'], declaration: 'padding: 10px;'},
				c: {composes: ['text-align:center'], declaration: 'margin: 10px;'},
				a: {composes: ['b', 'c']},
			};
			const result = resolve_composes(
				['a'],
				definitions,
				new Set(),
				new Set(),
				'test',
				css_properties,
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('text-align: center; padding: 10px; margin: 10px;');
				// No warning for diamond dependencies
				expect(result.warnings).toBe(null);
			}
		});
	});
});
