import {test, assert, describe} from 'vitest';

import {StyleVariable, StyleVariableName} from '$lib/variable.js';

describe('StyleVariable', () => {
	describe('valid schemas', () => {
		test('validates light-only', () => {
			const result = StyleVariable.safeParse({name: 'foo', light: '10px'});
			assert.isTrue(result.success);
		});

		test('validates dark-only', () => {
			const result = StyleVariable.safeParse({name: 'foo', dark: '10px'});
			assert.isTrue(result.success);
		});

		test('validates different light and dark', () => {
			const result = StyleVariable.safeParse({name: 'foo', light: '10px', dark: '20px'});
			assert.isTrue(result.success);
		});
	});

	describe('invalid schemas', () => {
		test('rejects missing light and dark', () => {
			const result = StyleVariable.safeParse({name: 'foo'});
			assert.isFalse(result.success);
			assert.isTrue(result.error.issues.some((i) => i.message.includes('at least one')));
		});

		test('rejects identical light and dark', () => {
			const result = StyleVariable.safeParse({name: 'foo', light: '10px', dark: '10px'});
			assert.isFalse(result.success);
			assert.isTrue(result.error.issues.some((i) => i.message.includes('must differ')));
		});
	});
});

describe('StyleVariableName', () => {
	test.each(['foo', 'shade_40', 'color_a_50', 'a1', 'x'])('accepts valid name "%s"', (name) => {
		assert.isTrue(StyleVariableName.safeParse(name).success);
	});

	test.each([
		['Uppercase', 'starts with uppercase'],
		['_leading', 'starts with underscore'],
		['trailing_', 'ends with underscore'],
		['123abc', 'starts with digit'],
		['foo-bar', 'contains hyphen'],
		['', 'empty string'],
		['foo bar', 'contains space'],
	])('rejects invalid name "%s" (%s)', (name) => {
		assert.isFalse(StyleVariableName.safeParse(name).success);
	});
});
