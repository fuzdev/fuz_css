import {test, describe, expect} from 'vitest';

import {escape_css_selector} from '$lib/css_class_generation.js';

/**
 * Tests for CSS selector escaping.
 *
 * The escape_css_selector function escapes special characters in class names
 * so they can be used safely in CSS selectors.
 */
describe('escape_css_selector', () => {
	// Table-driven test cases: [input, expected]
	const escape_cases: Array<[input: string, expected: string]> = [
		// Basic cases - no escaping needed
		['foo', 'foo'],
		['foo_bar', 'foo_bar'],
		['foo-bar', 'foo-bar'],

		// CSS-literal syntax - colons need escaping
		['display:flex', 'display\\:flex'],
		['display:none', 'display\\:none'],
		['justify-content:center', 'justify-content\\:center'],

		// Percent signs
		['opacity:80%', 'opacity\\:80\\%'],
		['width:100%', 'width\\:100\\%'],

		// Parentheses
		['nth-child(2n)', 'nth-child\\(2n\\)'],
		['min-width(800px)', 'min-width\\(800px\\)'],
		['calc(100%-20px)', 'calc\\(100\\%-20px\\)'],

		// Tilde (space encoding)
		['margin:0~auto', 'margin\\:0\\~auto'],
		['padding:10px~20px', 'padding\\:10px\\~20px'],

		// Combined - CSS-literal with modifiers
		['hover:opacity:80%', 'hover\\:opacity\\:80\\%'],
		['md:display:flex', 'md\\:display\\:flex'],
		['md:hover:opacity:80%', 'md\\:hover\\:opacity\\:80\\%'],
		['dark:color:white', 'dark\\:color\\:white'],

		// Complex cases
		['nth-child(3n+1):color:red', 'nth-child\\(3n\\+1\\)\\:color\\:red'],
		['min-width(800px):display:flex', 'min-width\\(800px\\)\\:display\\:flex'],
		['background:url(data:image/png)', 'background\\:url\\(data\\:image\\/png\\)'],

		// All special characters that need escaping
		['a!b', 'a\\!b'],
		['a"b', 'a\\"b'],
		['a#b', 'a\\#b'],
		['a$b', 'a\\$b'],
		['a%b', 'a\\%b'],
		['a&b', 'a\\&b'],
		["a'b", "a\\'b"],
		['a(b', 'a\\(b'],
		['a)b', 'a\\)b'],
		['a*b', 'a\\*b'],
		['a+b', 'a\\+b'],
		['a,b', 'a\\,b'],
		['a.b', 'a\\.b'],
		['a/b', 'a\\/b'],
		['a:b', 'a\\:b'],
		['a;b', 'a\\;b'],
		['a<b', 'a\\<b'],
		['a=b', 'a\\=b'],
		['a>b', 'a\\>b'],
		['a?b', 'a\\?b'],
		['a@b', 'a\\@b'],
		['a[b', 'a\\[b'],
		['a\\b', 'a\\\\b'],
		['a]b', 'a\\]b'],
		['a^b', 'a\\^b'],
		['a`b', 'a\\`b'],
		['a{b', 'a\\{b'],
		['a|b', 'a\\|b'],
		['a}b', 'a\\}b'],
		['a~b', 'a\\~b'],
	];

	test.each(escape_cases)('escapes "%s" to "%s"', (input, expected) => {
		expect(escape_css_selector(input)).toBe(expected);
	});
});
