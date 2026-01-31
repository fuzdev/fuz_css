import {test, expect, describe} from 'vitest';

import {split_selector_list, find_compound_end} from '$lib/css_ruleset_parser.js';

/**
 * Tests for selector parsing utilities: split_selector_list and find_compound_end.
 */
describe('split_selector_list', () => {
	// Table-driven test cases: [input, expected]
	const cases: Array<[string, Array<string>]> = [
		// Simple cases
		['.a, .b, .c', ['.a', '.b', '.c']],
		['.a', ['.a']],
		['', []],
		['   ', []],

		// Parentheses handling
		['.a:not(.b), .c', ['.a:not(.b)', '.c']],
		['.a:not(:is(.b, .c)), .d', ['.a:not(:is(.b, .c))', '.d']],

		// Attribute selector handling
		['.foo[data-x="a,b"], .bar', ['.foo[data-x="a,b"]', '.bar']],
		[".foo[data-x='a,b'], .bar", [".foo[data-x='a,b']", '.bar']],
		['.foo[data-x=value], .bar', ['.foo[data-x=value]', '.bar']],
		['.foo[data-x="a\\"b,c"], .bar', ['.foo[data-x="a\\"b,c"]', '.bar']],
		['.foo[data-x="a"]:not(.b), .bar', ['.foo[data-x="a"]:not(.b)', '.bar']],
	];

	test.each(cases)('split_selector_list("%s") → %j', (input, expected) => {
		expect(split_selector_list(input)).toEqual(expected);
	});
});

describe('find_compound_end', () => {
	// Table-driven test cases: [selector, startPos, expected]
	const cases: Array<[string, number, number, string]> = [
		// Basic cases
		['.menu_item', 0, 10, 'simple class'],
		['.menu_item .content', 0, 10, 'descendant combinator'],
		['.menu_item.selected', 0, 19, 'compound selector'],
		['.chevron::before', 0, 8, 'pseudo-element'],
		['.selectable:hover', 0, 17, 'pseudo-class'],
		['.plain:not(:hover)', 0, 18, 'functional pseudo-class'],

		// Combinators
		['.foo + .bar', 0, 4, 'adjacent sibling'],
		['.foo ~ .bar', 0, 4, 'general sibling'],

		// Attribute selectors
		['.foo[type="button"]', 0, 19, 'attribute selector'],
		['.foo[data-x].bar', 0, 16, 'attribute with class after'],
		['.foo[data-x="]"]', 0, 16, 'attribute with ] in quoted value'],
		[".foo[data-x=']']", 0, 16, 'attribute with ] in single-quoted value'],
		['.foo[data-x="\\""]', 0, 17, 'attribute with escaped quote'],

		// Misc
		['.foo123', 0, 7, 'class with numbers'],
		['.foo-bar-baz', 0, 12, 'class with hyphens'],
		['.foo#bar', 0, 8, 'ID selector after class'],
		['#bar.foo', 4, 8, 'class after ID selector'],
		['', 0, 1, 'empty selector'],
		['.btn:hover:focus', 0, 16, 'multiple pseudo-classes'],
		['.chevron:before', 0, 8, 'CSS2 single-colon pseudo-element'],
		['.foo*', 0, 4, 'universal selector after class'],
	];

	test.each(cases)('find_compound_end("%s", %d) → %d (%s)', (selector, startPos, expected) => {
		expect(find_compound_end(selector, startPos)).toBe(expected);
	});
});
