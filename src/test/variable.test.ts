import { test, assert, describe } from 'vitest';

import { StyleVariable, StyleVariableName, Theme, parse_theme } from '$lib/variable.ts';

describe('StyleVariable', () => {
	describe('valid schemas', () => {
		test('validates light-only', () => {
			const result = StyleVariable.safeParse({ name: 'foo', light: '10px' });
			assert.isTrue(result.success);
		});

		test('validates dark-only', () => {
			const result = StyleVariable.safeParse({ name: 'foo', dark: '10px' });
			assert.isTrue(result.success);
		});

		test('validates different light and dark', () => {
			const result = StyleVariable.safeParse({ name: 'foo', light: '10px', dark: '20px' });
			assert.isTrue(result.success);
		});
	});

	describe('invalid schemas', () => {
		test('rejects missing light and dark', () => {
			const result = StyleVariable.safeParse({ name: 'foo' });
			assert.isFalse(result.success);
			assert.isTrue(result.error.issues.some((i) => i.message.includes('at least one')));
		});

		test('rejects identical light and dark', () => {
			const result = StyleVariable.safeParse({ name: 'foo', light: '10px', dark: '10px' });
			assert.isFalse(result.success);
			assert.isTrue(result.error.issues.some((i) => i.message.includes('must differ')));
		});
	});
});

describe('StyleVariableName', () => {
	test.each(['foo', 'shade_40', 'palette_a_50', 'a1', 'x'])('accepts valid name "%s"', (name) => {
		assert.isTrue(StyleVariableName.safeParse(name).success);
	});

	test.each([
		['Uppercase', 'starts with uppercase'],
		['_leading', 'starts with underscore'],
		['trailing_', 'ends with underscore'],
		['123abc', 'starts with digit'],
		['foo-bar', 'contains hyphen'],
		['', 'empty string'],
		['foo bar', 'contains space']
	])('rejects invalid name "%s" (%s)', (name) => {
		assert.isFalse(StyleVariableName.safeParse(name).success);
	});
});

describe('Theme', () => {
	test('accepts a minimal theme', () => {
		assert.isTrue(Theme.safeParse({ name: 'base', variables: [] }).success);
	});

	test('rejects a blank name', () => {
		assert.isFalse(Theme.safeParse({ name: '', variables: [] }).success);
	});

	test('rejects a missing variables array', () => {
		assert.isFalse(Theme.safeParse({ name: 't' }).success);
	});

	test('rejects an unknown property - the schema is strict', () => {
		assert.isFalse(Theme.safeParse({ name: 't', variables: [], oops: 1 }).success);
	});

	test('rejects a malformed variable, pathed to its index', () => {
		// light === dark trips the StyleVariable refine
		const result = Theme.safeParse({
			name: 't',
			variables: [
				{ name: 'chroma_scale', light: '1' },
				{ name: 'radius_scale', light: '1', dark: '1' }
			]
		});
		assert.isFalse(result.success);
		assert.deepEqual(result.error?.issues[0]?.path.slice(0, 2), ['variables', 1]);
	});

	test('accepts every scheme stance and rejects anything else', () => {
		for (const scheme of ['dual', 'light', 'dark']) {
			assert.isTrue(Theme.safeParse({ name: 't', variables: [], scheme }).success, scheme);
		}
		assert.isFalse(Theme.safeParse({ name: 't', variables: [], scheme: 'dusk' }).success);
	});

	test('accepts a resolved stance mirror', () => {
		const result = Theme.safeParse({
			name: 't',
			variables: [],
			scheme: 'dark',
			scheme_mirror: [{ name: 'shade_00', light: '#000' }]
		});
		assert.isTrue(result.success);
	});
});

describe('parse_theme', () => {
	test('returns the theme when it matches', () => {
		const theme = parse_theme({ name: 't', variables: [{ name: 'chroma_scale', light: '1' }] });
		assert.deepEqual(theme, { name: 't', variables: [{ name: 'chroma_scale', light: '1' }] });
	});

	test('returns null rather than throwing on anything that does not', () => {
		// the storage/wire boundary this exists for: a malformed value falls back
		// to a default instead of taking the caller down
		for (const value of [null, undefined, 'a theme', 42, {}, { name: 't' }, { variables: [] }]) {
			assert.isNull(parse_theme(value), JSON.stringify(value ?? null));
		}
	});
});
