import {test, expect, describe} from 'vitest';

import {StyleVariable} from '$lib/variable.js';

describe('StyleVariable', () => {
	describe('valid schemas', () => {
		test('validates light-only', () => {
			const result = StyleVariable.safeParse({name: 'foo', light: '10px'});
			expect(result.success).toBe(true);
		});

		test('validates dark-only', () => {
			const result = StyleVariable.safeParse({name: 'foo', dark: '10px'});
			expect(result.success).toBe(true);
		});

		test('validates different light and dark', () => {
			const result = StyleVariable.safeParse({name: 'foo', light: '10px', dark: '20px'});
			expect(result.success).toBe(true);
		});
	});

	describe('invalid schemas', () => {
		test('rejects missing light and dark', () => {
			const result = StyleVariable.safeParse({name: 'foo'});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.some((i) => i.message.includes('at least one'))).toBe(true);
			}
		});

		test('rejects identical light and dark', () => {
			const result = StyleVariable.safeParse({name: 'foo', light: '10px', dark: '10px'});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.some((i) => i.message.includes('must differ'))).toBe(true);
			}
		});
	});
});
