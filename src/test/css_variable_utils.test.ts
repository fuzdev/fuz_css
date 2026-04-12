import {test, assert, describe} from 'vitest';

import {extract_css_variables, has_css_variables} from '$lib/css_variable_utils.js';

describe('extract_css_variables', () => {
	test('returns empty set for empty string', () => {
		assert.deepEqual(extract_css_variables(''), new Set());
	});

	test('extracts single variable: var(--name)', () => {
		const result = extract_css_variables('color: var(--text_color);');
		assert.deepEqual(result, new Set(['text_color']));
	});

	test('extracts variable with fallback: var(--name, fallback)', () => {
		const result = extract_css_variables('color: var(--primary, blue);');
		assert.deepEqual(result, new Set(['primary']));
	});

	test('extracts nested var(): var(--a, var(--b))', () => {
		const result = extract_css_variables('background: var(--bg_1, var(--bg_2));');
		assert.deepEqual(result, new Set(['bg_1', 'bg_2']));
	});

	test('extracts multiple variables from same string', () => {
		const result = extract_css_variables('border: var(--border_width) solid var(--border_color);');
		assert.deepEqual(result, new Set(['border_width', 'border_color']));
	});

	test('returns empty set for no variables', () => {
		const result = extract_css_variables('padding: 1rem;');
		assert.deepEqual(result, new Set());
	});

	test('handles variable names with hyphens and numbers', () => {
		const result = extract_css_variables(
			'font-size: var(--font-size-md); margin: var(--spacing_2xl);',
		);
		assert.deepEqual(result, new Set(['font-size-md', 'spacing_2xl']));
	});

	test('handles malformed var( patterns', () => {
		// var( with no closing paren - still matches (regex doesn't require closing paren)
		assert.deepEqual(extract_css_variables('color: var(--incomplete'), new Set(['incomplete']));

		// var() with nothing inside - no match
		assert.deepEqual(extract_css_variables('color: var();'), new Set());

		// var(--) with empty name - no match (requires at least one char after --)
		assert.deepEqual(extract_css_variables('color: var(--);'), new Set());
	});

	test('deduplicates same variable appearing multiple times', () => {
		const result = extract_css_variables('color: var(--primary); background: var(--primary);');
		assert.deepEqual(result, new Set(['primary']));
		assert.strictEqual(result.size, 1);
	});

	test('lastIndex reset between calls (global regex safety)', () => {
		// First call
		const result1 = extract_css_variables('color: var(--a);');
		assert.deepEqual(result1, new Set(['a']));

		// Second call should still work correctly
		const result2 = extract_css_variables('color: var(--b);');
		assert.deepEqual(result2, new Set(['b']));

		// Third call with different input
		const result3 = extract_css_variables('margin: var(--c); padding: var(--d);');
		assert.deepEqual(result3, new Set(['c', 'd']));
	});

	test('handles complex nested fallbacks', () => {
		const result = extract_css_variables(
			'color: var(--primary, var(--secondary, var(--tertiary)));',
		);
		assert.deepEqual(result, new Set(['primary', 'secondary', 'tertiary']));
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
		assert.deepEqual(result, new Set(['text_color', 'bg_color', 'border_color']));
	});

	test('rejects variable names starting with number (invalid CSS)', () => {
		// CSS custom property names must start with a letter or underscore
		// var(--123) is invalid CSS syntax
		assert.deepEqual(extract_css_variables('color: var(--123invalid);'), new Set());
		assert.deepEqual(extract_css_variables('color: var(--9);'), new Set());
	});

	test('accepts variable names starting with underscore', () => {
		const result = extract_css_variables('color: var(--_private);');
		assert.deepEqual(result, new Set(['_private']));
	});

	test('case-sensitive: VAR() uppercase not matched (CSS is case-insensitive)', () => {
		// Bug: CSS function names are case-insensitive per spec
		// VAR(--name) is valid CSS but won't be detected
		assert.deepEqual(extract_css_variables('color: VAR(--primary);'), new Set());
		assert.deepEqual(extract_css_variables('color: Var(--primary);'), new Set());
	});

	test('handles whitespace inside var()', () => {
		// CSS allows whitespace: `var( --name )` is valid per spec
		assert.deepEqual(extract_css_variables('color: var( --spaced );'), new Set(['spaced']));
		assert.deepEqual(
			extract_css_variables('color: var(  --double_space );'),
			new Set(['double_space']),
		);
		assert.deepEqual(extract_css_variables('color: var(\t--tabbed );'), new Set(['tabbed']));
		assert.deepEqual(extract_css_variables('color: var(\n--newline );'), new Set(['newline']));
	});

	test('extracts variables inside calc()', () => {
		const result = extract_css_variables('width: calc(var(--base) * 2);');
		assert.deepEqual(result, new Set(['base']));
	});

	test('extracts variables inside other functions', () => {
		const result = extract_css_variables('color: hsl(var(--hue) var(--sat) var(--light));');
		assert.deepEqual(result, new Set(['hue', 'sat', 'light']));
	});

	test('extracts variables from component props (motivating use case)', () => {
		// This is why we use simple regex scanning instead of AST-based extraction:
		// variables in component props like <MdnLink size="var(--icon_size_xs)" />
		// aren't in style attributes but still reference theme variables
		const svelte_component = `<MdnLink size="var(--icon_size_xs)" color="var(--color_a_5)" />`;
		const result = extract_css_variables(svelte_component);
		assert.deepEqual(result, new Set(['icon_size_xs', 'color_a_5']));
	});

	test('extracts variables from JSX props', () => {
		const jsx_component = `<Icon size={styles.size || "var(--icon_size_md)"} />`;
		const result = extract_css_variables(jsx_component);
		assert.deepEqual(result, new Set(['icon_size_md']));
	});
});

describe('has_css_variables', () => {
	test('returns true for string with var()', () => {
		assert.isTrue(has_css_variables('color: var(--text);'));
	});

	test('returns false for string without var()', () => {
		assert.isFalse(has_css_variables('padding: 1rem;'));
	});

	test('returns false for empty string', () => {
		assert.isFalse(has_css_variables(''));
	});

	test('returns true for multiple variables', () => {
		assert.isTrue(has_css_variables('border: var(--w) solid var(--c);'));
	});

	test('lastIndex reset between calls', () => {
		// First call
		assert.isTrue(has_css_variables('color: var(--a);'));

		// Second call should still work correctly
		assert.isFalse(has_css_variables('padding: 1rem;'));

		// Third call
		assert.isTrue(has_css_variables('margin: var(--b);'));
	});

	test('returns false for malformed patterns without valid name', () => {
		assert.isFalse(has_css_variables('color: var();'));
		assert.isFalse(has_css_variables('color: var(--);'));
	});

	test('consistent with extract_css_variables for unclosed var(', () => {
		// Both functions should agree: var(--name without closing paren still matches
		const input = 'color: var(--incomplete';
		assert.isTrue(has_css_variables(input));
		assert.isAbove(extract_css_variables(input).size, 0);
	});

	test('case-sensitive: VAR() uppercase not matched', () => {
		// Same limitation as extract_css_variables
		assert.isFalse(has_css_variables('color: VAR(--primary);'));
		assert.isFalse(has_css_variables('color: Var(--primary);'));
	});
});
