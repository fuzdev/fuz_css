import { test, assert, describe, expectTypeOf } from 'vitest';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import {
	StyleVariable,
	StyleVariableName,
	Theme,
	ThemeScheme,
	parse_theme
} from '#lib/variable.ts';
import { render_theme_style } from '#lib/theme.ts';
import { render_chroma_stop_css } from '#lib/ramps.ts';

describe('StyleVariable', () => {
	describe('valid schemas', () => {
		test('validates base-only', () => {
			const result = s.parse(StyleVariable, { name: 'foo', base: '10px' });
			assert.isTrue(result.ok);
		});

		test('validates dark-only', () => {
			const result = s.parse(StyleVariable, { name: 'foo', dark: '10px' });
			assert.isTrue(result.ok);
		});

		test('validates different base and dark', () => {
			const result = s.parse(StyleVariable, { name: 'foo', base: '10px', dark: '20px' });
			assert.isTrue(result.ok);
		});
	});

	describe('invalid schemas', () => {
		test('rejects missing base and dark', () => {
			const result = s.parse(StyleVariable, { name: 'foo' });
			assert(!result.ok);
			assert.isTrue(
				result.issues.some((i) => i.message === 'must have at least one of base or dark')
			);
		});

		test('rejects identical base and dark', () => {
			const result = s.parse(StyleVariable, { name: 'foo', base: '10px', dark: '10px' });
			assert(!result.ok);
			assert.deepEqual(
				result.issues.map((i) => [i.path, i.message]),
				[[['dark'], 'base and dark must differ when both specified']]
			);
		});

		test('runs the cross-field rules only once the fields pass', () => {
			const result = s.parse(StyleVariable, { name: 'Foo' });
			assert(!result.ok);
			assert.deepEqual(
				result.issues.map((i) => [i.path, i.message]),
				[[['name'], 'invalid style variable name']]
			);
		});

		test('rejects a `light` key - the slot is `base`', () => {
			const result = s.parse(StyleVariable, { name: 'foo', light: '10px' });
			assert(!result.ok);
			assert.isTrue(result.issues.some((i) => i.kind === 'unknown_key' && i.path[0] === 'light'));
		});

		test('rejects a blank slot, which the renderer drops', () => {
			for (const blank of ['', '  ']) {
				const result = s.parse(StyleVariable, { name: 'foo', base: blank });
				assert(!result.ok, JSON.stringify(blank));
				assert.isTrue(result.issues.some((i) => i.message?.includes('blank')));
				assert.strictEqual(
					render_theme_style({ name: 't', variables: [{ name: 'foo', base: blank }] }),
					''
				);
			}
		});
	});
});

describe('StyleVariableName', () => {
	test.each(['foo', 'shade_40', 'palette_a_50', 'a1', 'x'])('accepts valid name "%s"', (name) => {
		assert.isTrue(s.parse(StyleVariableName, name).ok);
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
		assert.isFalse(s.parse(StyleVariableName, name).ok);
	});
});

describe('Theme', () => {
	test('accepts a minimal theme', () => {
		assert.isTrue(s.parse(Theme, { name: 'base', variables: [] }).ok);
	});

	test('rejects a blank name', () => {
		assert.isFalse(s.parse(Theme, { name: '', variables: [] }).ok);
	});

	test('rejects a missing variables array', () => {
		assert.isFalse(s.parse(Theme, { name: 't' }).ok);
	});

	test('rejects an unknown property - the schema is strict', () => {
		assert.isFalse(s.parse(Theme, { name: 't', variables: [], oops: 1 }).ok);
	});

	test('rejects a malformed variable, pathed to its index', () => {
		// base === dark trips the StyleVariable refine
		const result = s.parse(Theme, {
			name: 't',
			variables: [
				{ name: 'chroma_scale', base: '1' },
				{ name: 'radius_scale', base: '1', dark: '1' }
			]
		});
		assert(!result.ok);
		assert.deepEqual(result.issues[0]?.path, ['variables', 1, 'dark']);
	});

	test('keeps the slots rule off an earlier issue past the issue cap', () => {
		// the parse builds a hundred issues, so the same-slot variable's builds none
		const variables = [
			...Array.from({ length: 100 }, (_, i) => ({ name: `Bad${i}`, base: 'x' })),
			{ name: 'radius_scale', base: '1', dark: '1' }
		];
		const result = s.parse(Theme, { name: 't', variables });
		assert(!result.ok);
		assert.strictEqual(result.issues.length, 100);
		assert.deepEqual(result.issues[99]?.path, ['variables', 99, 'name']);
		assert.strictEqual(result.issues[99]?.message, 'invalid style variable name');
	});

	test('accepts every scheme stance and rejects anything else', () => {
		for (const scheme of ['dual', 'light', 'dark']) {
			assert.isTrue(s.parse(Theme, { name: 't', variables: [], scheme }).ok, scheme);
		}
		assert.isFalse(s.parse(Theme, { name: 't', variables: [], scheme: 'dusk' }).ok);
	});

	test('refuses a scheme_mirror - the mirror is derived, never wire data', () => {
		const result = s.parse(Theme, {
			name: 't',
			variables: [],
			scheme: 'dark',
			scheme_mirror: [{ name: 'shade_00', base: '#000' }]
		});
		assert.isFalse(result.ok);
	});
});

describe('parse_theme', () => {
	test('returns the theme when it matches', () => {
		const theme = parse_theme({ name: 't', variables: [{ name: 'chroma_scale', base: '1' }] });
		assert.deepEqual(theme, { name: 't', variables: [{ name: 'chroma_scale', base: '1' }] });
	});

	test('returns null rather than throwing on anything that does not', () => {
		// the storage/wire boundary this exists for: a malformed value falls back
		// to a default instead of taking the caller down
		for (const value of [null, undefined, 'a theme', 42, {}, { name: 't' }, { variables: [] }]) {
			assert.isNull(parse_theme(value), JSON.stringify(value ?? null));
		}
	});
	test('refuses a theme that sets a ramp intermediate', () => {
		for (const variable of [
			{ name: '_palette_lightness_30', base: '0.5' },
			{ name: '_chroma_shape_50', base: '0.5' },
			{ name: '_palette_chroma_50', base: '0.05' },
			// the capped form compile_theme emits too - caps travel beside a theme
			{ name: '_palette_chroma_50', base: render_chroma_stop_css('50', 0.05) },
			{
				name: '_palette_chroma_50',
				base: render_chroma_stop_css('50', 0.05),
				dark: render_chroma_stop_css('50', 0.04)
			}
		]) {
			assert.isNull(parse_theme({ name: 't', variables: [variable] }), JSON.stringify(variable));
		}
	});
});

describe('inferred types', () => {
	test('match the theme data shapes', () => {
		expectTypeOf<StyleVariable>().toEqualTypeOf<{
			name: string;
			base?: string | undefined;
			dark?: string | undefined;
			summary?: string | undefined;
		}>();
		expectTypeOf<ThemeScheme>().toEqualTypeOf<'dual' | 'light' | 'dark'>();
		expectTypeOf<StyleVariableName>().toEqualTypeOf<string>();
		expectTypeOf<Theme>().toEqualTypeOf<{
			name: string;
			summary?: string | undefined;
			variables: Array<StyleVariable>;
			scheme?: 'dual' | 'light' | 'dark' | undefined;
		}>();
	});
});
