import {test, describe, assert} from 'vitest';

import {generate_classes_css} from '$lib/css_class_generation.js';
import {css_class_composites} from '$lib/css_class_composites.js';
import {assert_css_contains, loc} from './test_helpers.js';

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

		assert.strictEqual(result.css, '');
		assert.lengthOf(result.diagnostics, 1);
		assert.strictEqual(result.diagnostics[0]!.level, 'error');
		assert.strictEqual(result.diagnostics[0]!.identifier, 'unknown_class');
		assert.include(result.diagnostics[0]!.message, 'No matching class definition');
	});

	test('no diagnostic for non-explicit unresolved class without colon', () => {
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			// Not in explicit_classes
		});

		assert.strictEqual(result.css, '');
		assert.lengthOf(result.diagnostics, 0);
	});

	test('no diagnostic when explicit class resolves to definition', () => {
		const result = generate_classes_css({
			class_names: ['box'],
			class_definitions: css_class_composites,
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['box']),
		});

		assert_css_contains(result.css, '.box');
		assert.lengthOf(result.diagnostics, 0);
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
							identifier: 'invalid-property:value',
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

		assert.lengthOf(result.diagnostics, 1);
		assert.strictEqual(result.diagnostics[0]!.level, 'error');
		assert.strictEqual(result.diagnostics[0]!.message, 'Unknown CSS property "invalid-property"');
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
							identifier: 'invalid-property:value',
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
		assert.lengthOf(result.diagnostics, 1);
		assert.strictEqual(result.diagnostics[0]!.level, 'warning');
		assert.strictEqual(result.diagnostics[0]!.message, 'Unknown CSS property "invalid-property"');
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
							identifier: 'some-class:value',
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
		assert.lengthOf(result.diagnostics, 1);
		assert.strictEqual(result.diagnostics[0]!.level, 'error');
		assert.strictEqual(result.diagnostics[0]!.message, 'Circular reference detected');
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

		assert.lengthOf(result.diagnostics, 1);
		assert.deepEqual(result.diagnostics[0]!.locations, [source_loc]);
	});
});
