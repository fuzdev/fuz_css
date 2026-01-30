import {test, describe, expect} from 'vitest';

import {generate_classes_css} from '$lib/css_class_generation.js';
import {css_class_composites} from '$lib/css_class_composites.js';
import {
	expect_css_contains,
	expect_diagnostic,
	loc,
} from './test_helpers.js';

/**
 * Tests for explicit_classes handling in generate_classes_css.
 *
 * Explicit classes (from @fuz-classes comments) produce errors when they
 * can't be resolved, unlike implicitly extracted classes which may come
 * from other CSS frameworks.
 */
describe('explicit_classes diagnostics', () => {
	test('errors for unresolved explicit class', () => {
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['unknown_class']),
		});

		expect(result.css).toBe('');
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('error');
		expect(result.diagnostics[0]!.class_name).toBe('unknown_class');
		expect(result.diagnostics[0]!.message).toContain('No matching class definition');
	});

	test('no diagnostic for non-explicit unresolved class without colon', () => {
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			// Not in explicit_classes
		});

		expect(result.css).toBe('');
		expect(result.diagnostics).toHaveLength(0);
	});

	test('no diagnostic when explicit class resolves to definition', () => {
		const result = generate_classes_css({
			class_names: ['box'],
			class_definitions: css_class_composites,
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['box']),
		});

		expect_css_contains(result.css, '.box');
		expect(result.diagnostics).toHaveLength(0);
	});

	test('error when interpreter pattern matches but returns error for explicit class', () => {
		const result = generate_classes_css({
			class_names: ['invalid-property:value'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^([^:]+):(.+)$/,
					interpret: (_match, ctx) => {
						ctx.diagnostics.push({
							level: 'error',
							class_name: 'invalid-property:value',
							message: 'Unknown CSS property "invalid-property"',
							suggestion: null,
						});
						return null;
					},
				},
			],
			css_properties: null,
			explicit_classes: new Set(['invalid-property:value']),
		});

		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('error');
		expect(result.diagnostics[0]!.message).toBe('Unknown CSS property "invalid-property"');
	});

	test('warning when CSS property error for non-explicit class', () => {
		const result = generate_classes_css({
			class_names: ['invalid-property:value'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^([^:]+):(.+)$/,
					interpret: (_match, ctx) => {
						ctx.diagnostics.push({
							level: 'error',
							class_name: 'invalid-property:value',
							message: 'Unknown CSS property "invalid-property"',
							suggestion: null,
						});
						return null;
					},
				},
			],
			css_properties: null,
			// Not in explicit_classes - class was implicitly extracted from code
		});

		// Should have interpreter diagnostic but downgraded to warning
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('warning');
		expect(result.diagnostics[0]!.message).toBe('Unknown CSS property "invalid-property"');
	});

	test('structural errors remain errors for non-explicit classes', () => {
		// Structural errors like unknown composes or circular refs stay as errors
		// regardless of whether the class is explicit - they indicate broken definitions
		const result = generate_classes_css({
			class_names: ['some-class:value'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^([^:]+):(.+)$/,
					interpret: (_match, ctx) => {
						ctx.diagnostics.push({
							level: 'error',
							class_name: 'some-class:value',
							message: 'Circular reference detected',
							suggestion: null,
						});
						return null;
					},
				},
			],
			css_properties: null,
			// Not explicit
		});

		// Structural errors should NOT be downgraded
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('error');
		expect(result.diagnostics[0]!.message).toBe('Circular reference detected');
	});

	test('error includes locations when provided', () => {
		const source_loc = loc('test.ts', 42, 5);
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['unknown_class']),
			class_locations: new Map([['unknown_class', [source_loc]]]),
		});

		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.locations).toEqual([source_loc]);
	});
});
