import {test, expect, describe} from 'vitest';

import {extract_css_variables, has_css_variables} from '$lib/css_variable_utils.js';

describe('extract_css_variables', () => {
	test('returns empty set for empty string', () => {
		expect(extract_css_variables('')).toEqual(new Set());
	});

	test('extracts single variable: var(--name)', () => {
		const result = extract_css_variables('color: var(--text_color);');
		expect(result).toEqual(new Set(['text_color']));
	});

	test('extracts variable with fallback: var(--name, fallback)', () => {
		const result = extract_css_variables('color: var(--primary, blue);');
		expect(result).toEqual(new Set(['primary']));
	});

	test('extracts nested var(): var(--a, var(--b))', () => {
		const result = extract_css_variables('background: var(--bg_1, var(--bg_2));');
		expect(result).toEqual(new Set(['bg_1', 'bg_2']));
	});

	test('extracts multiple variables from same string', () => {
		const result = extract_css_variables(
			'border: var(--border_width) solid var(--border_color);',
		);
		expect(result).toEqual(new Set(['border_width', 'border_color']));
	});

	test('returns empty set for no variables', () => {
		const result = extract_css_variables('padding: 1rem;');
		expect(result).toEqual(new Set());
	});

	test('handles variable names with hyphens and numbers', () => {
		const result = extract_css_variables(
			'font-size: var(--font-size-md); margin: var(--spacing_2xl);',
		);
		expect(result).toEqual(new Set(['font-size-md', 'spacing_2xl']));
	});

	test('handles malformed var( patterns', () => {
		// var( with no closing paren - still matches (regex doesn't require closing paren)
		expect(extract_css_variables('color: var(--incomplete')).toEqual(new Set(['incomplete']));

		// var() with nothing inside - no match
		expect(extract_css_variables('color: var();')).toEqual(new Set());

		// var(--) with empty name - no match (requires at least one char after --)
		expect(extract_css_variables('color: var(--);')).toEqual(new Set());
	});

	test('deduplicates same variable appearing multiple times', () => {
		const result = extract_css_variables(
			'color: var(--primary); background: var(--primary);',
		);
		expect(result).toEqual(new Set(['primary']));
		expect(result.size).toBe(1);
	});

	test('lastIndex reset between calls (global regex safety)', () => {
		// First call
		const result1 = extract_css_variables('color: var(--a);');
		expect(result1).toEqual(new Set(['a']));

		// Second call should still work correctly
		const result2 = extract_css_variables('color: var(--b);');
		expect(result2).toEqual(new Set(['b']));

		// Third call with different input
		const result3 = extract_css_variables('margin: var(--c); padding: var(--d);');
		expect(result3).toEqual(new Set(['c', 'd']));
	});

	test('handles complex nested fallbacks', () => {
		const result = extract_css_variables(
			'color: var(--primary, var(--secondary, var(--tertiary)));',
		);
		expect(result).toEqual(new Set(['primary', 'secondary', 'tertiary']));
	});

	test('handles variables in multiline CSS', () => {
		const css = `
			.box {
				color: var(--text_color);
				background: var(--bg_color);
				border: 1px solid var(--border_color);
			}
		`;
		const result = extract_css_variables(css);
		expect(result).toEqual(new Set(['text_color', 'bg_color', 'border_color']));
	});

	test('rejects variable names starting with number (invalid CSS)', () => {
		// CSS custom property names must start with a letter or underscore
		// var(--123) is invalid CSS syntax
		expect(extract_css_variables('color: var(--123invalid);')).toEqual(new Set());
		expect(extract_css_variables('color: var(--9);')).toEqual(new Set());
	});

	test('accepts variable names starting with underscore', () => {
		const result = extract_css_variables('color: var(--_private);');
		expect(result).toEqual(new Set(['_private']));
	});

	test('case-sensitive: VAR() uppercase not matched (CSS is case-insensitive)', () => {
		// Bug: CSS function names are case-insensitive per spec
		// VAR(--name) is valid CSS but won't be detected
		expect(extract_css_variables('color: VAR(--primary);')).toEqual(new Set());
		expect(extract_css_variables('color: Var(--primary);')).toEqual(new Set());
	});

	test('whitespace inside var() not matched', () => {
		// CSS allows whitespace: `var( --name )` is valid
		// Current regex requires `var(--` with no space
		expect(extract_css_variables('color: var( --spaced );')).toEqual(new Set());
	});

	test('extracts variables inside calc()', () => {
		const result = extract_css_variables('width: calc(var(--base) * 2);');
		expect(result).toEqual(new Set(['base']));
	});

	test('extracts variables inside other functions', () => {
		const result = extract_css_variables(
			'color: hsl(var(--hue) var(--sat) var(--light));',
		);
		expect(result).toEqual(new Set(['hue', 'sat', 'light']));
	});
});

describe('has_css_variables', () => {
	test('returns true for string with var()', () => {
		expect(has_css_variables('color: var(--text);')).toBe(true);
	});

	test('returns false for string without var()', () => {
		expect(has_css_variables('padding: 1rem;')).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(has_css_variables('')).toBe(false);
	});

	test('returns true for multiple variables', () => {
		expect(has_css_variables('border: var(--w) solid var(--c);')).toBe(true);
	});

	test('lastIndex reset between calls', () => {
		// First call
		expect(has_css_variables('color: var(--a);')).toBe(true);

		// Second call should still work correctly
		expect(has_css_variables('padding: 1rem;')).toBe(false);

		// Third call
		expect(has_css_variables('margin: var(--b);')).toBe(true);
	});

	test('returns false for malformed patterns without valid name', () => {
		expect(has_css_variables('color: var();')).toBe(false);
		expect(has_css_variables('color: var(--);')).toBe(false);
	});

	test('consistent with extract_css_variables for unclosed var(', () => {
		// Both functions should agree: var(--name without closing paren still matches
		const input = 'color: var(--incomplete';
		expect(has_css_variables(input)).toBe(true);
		expect(extract_css_variables(input).size).toBeGreaterThan(0);
	});

	test('case-sensitive: VAR() uppercase not matched', () => {
		// Same limitation as extract_css_variables
		expect(has_css_variables('color: VAR(--primary);')).toBe(false);
		expect(has_css_variables('color: Var(--primary);')).toBe(false);
	});
});
