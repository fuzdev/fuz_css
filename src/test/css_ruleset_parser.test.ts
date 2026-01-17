import {test, expect, describe} from 'vitest';

import {
	parse_ruleset,
	is_single_selector_ruleset,
	ruleset_contains_class,
	extract_css_comment,
	split_selector_list,
	find_compound_end,
	modify_single_selector,
	modify_selector_group,
	generate_modified_ruleset,
} from '$lib/css_ruleset_parser.js';

describe('parse_ruleset', () => {
	test('parses simple rule', () => {
		const css = '.box { display: flex; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.box');
		expect(result.rules[0]!.declarations).toBe('display: flex;');
	});

	test('parses multiple declarations', () => {
		const css = '.box { display: flex; flex-direction: column; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.declarations).toContain('display: flex');
		expect(result.rules[0]!.declarations).toContain('flex-direction: column');
	});

	test('parses multiple rules', () => {
		const css = '.foo { color: red; } .bar { color: blue; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(2);
		expect(result.rules[0]!.selector).toBe('.foo');
		expect(result.rules[1]!.selector).toBe('.bar');
	});

	test('handles multi-line CSS', () => {
		const css = `
			.box {
				display: flex;
				flex-direction: column;
				align-items: center;
			}
		`;
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector.trim()).toBe('.box');
	});

	test('handles compound selectors', () => {
		const css = '.selectable:hover { background: blue; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.selectable:hover');
	});

	test('handles grouped selectors', () => {
		const css = '.foo, .bar { color: red; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.foo, .bar');
	});

	test('handles pseudo-elements', () => {
		const css = '.chevron::before { content: ""; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.chevron::before');
	});

	test('returns correct positions', () => {
		const css = '.box { display: flex; }';
		const result = parse_ruleset(css);

		expect(result.rules[0]!.selector_start).toBe(0);
		expect(result.rules[0]!.selector_end).toBe(4);
		expect(result.rules[0]!.rule_start).toBe(0);
		expect(result.rules[0]!.rule_end).toBe(23);
	});

	test('handles empty CSS', () => {
		const css = '';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(0);
	});

	test('handles CSS with only whitespace', () => {
		const css = '   \n\t   ';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(0);
	});

	test('handles element+class selectors', () => {
		const css = 'a.chip { font-weight: 600; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('a.chip');
	});

	test('handles descendant selectors', () => {
		const css = '.menu_item .content { display: flex; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.menu_item .content');
	});

	describe('real-world composite classes', () => {
		test('handles selectable composite', () => {
			const css = `
				.selectable {
					cursor: pointer;
					background-color: var(--button_fill);
				}
				.selectable:hover {
					background-color: var(--button_fill_hover);
				}
				.selectable.selected,
				.selectable:active {
					background-color: var(--button_fill_active);
				}
			`;
			const result = parse_ruleset(css);

			expect(result.rules.length).toBeGreaterThan(1);
			expect(is_single_selector_ruleset(result.rules, 'selectable')).toBe(false);
		});

		test('handles chip composite with element selector', () => {
			const css = `
				.chip {
					font-weight: 500;
					padding-left: var(--space_xs);
				}
				a.chip {
					font-weight: 600;
				}
			`;
			const result = parse_ruleset(css);

			expect(result.rules).toHaveLength(2);
			expect(result.rules[0]!.selector.trim()).toBe('.chip');
			expect(result.rules[1]!.selector.trim()).toBe('a.chip');
			expect(is_single_selector_ruleset(result.rules, 'chip')).toBe(false);
		});

		test('handles chevron with pseudo-element', () => {
			const css = `
				.chevron {
					position: relative;
					height: 8px;
				}
				.chevron::before {
					display: block;
					content: '';
					border: 4px solid transparent;
				}
			`;
			const result = parse_ruleset(css);

			expect(result.rules).toHaveLength(2);
			expect(is_single_selector_ruleset(result.rules, 'chevron')).toBe(false);
		});

		test('handles box composite (convertible)', () => {
			const css = `
				.box {
					display: flex;
					flex-direction: column;
					align-items: center;
					justify-content: center;
				}
			`;
			const result = parse_ruleset(css);

			expect(result.rules).toHaveLength(1);
			expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
		});
	});
});

describe('parse_ruleset edge cases', () => {
	test('extracts rules from @keyframes (percentage selectors)', () => {
		const css = '@keyframes fade { 0% { opacity: 0; } 100% { opacity: 1; } }';
		const result = parse_ruleset(css);

		// Keyframe rules are extracted - they have percentage "selectors"
		expect(result.rules).toHaveLength(2);
		expect(result.rules[0]!.selector.trim()).toBe('0%');
		expect(result.rules[1]!.selector.trim()).toBe('100%');
	});

	test('handles @font-face (no selector)', () => {
		const css = '@font-face { font-family: "Test"; src: url(test.woff2); }';
		const result = parse_ruleset(css);

		// @font-face has no rules with selectors
		expect(result.rules).toHaveLength(0);
	});

	test('handles @layer', () => {
		const css = '@layer utilities { .box { display: flex; } }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector.trim()).toBe('.box');
	});

	test('handles @container queries', () => {
		const css = '@container (width > 400px) { .card { display: grid; } }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector.trim()).toBe('.card');
	});

	test('handles deeply nested selectors', () => {
		const css = '.a .b .c .d .e .f { color: red; }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.a .b .c .d .e .f');
	});
});

describe('parse_ruleset at-rules', () => {
	test('extracts rules from inside @media', () => {
		const css = '@media (width >= 48rem) { .box { display: flex; } }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector.trim()).toBe('.box');
		expect(result.rules[0]!.declarations).toContain('display: flex');
	});

	test('extracts multiple rules from inside @media', () => {
		const css = '@media (width >= 48rem) { .foo { color: red; } .bar { color: blue; } }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(2);
		expect(result.rules[0]!.selector.trim()).toBe('.foo');
		expect(result.rules[1]!.selector.trim()).toBe('.bar');
	});

	test('extracts rules from nested at-rules', () => {
		const css = '@supports (display: grid) { @media (width >= 48rem) { .box { display: grid; } } }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector.trim()).toBe('.box');
	});

	test('extracts rules at top level alongside at-rules', () => {
		const css = '.foo { color: red; } @media (width >= 48rem) { .bar { color: blue; } }';
		const result = parse_ruleset(css);

		expect(result.rules).toHaveLength(2);
		expect(result.rules[0]!.selector).toBe('.foo');
		expect(result.rules[1]!.selector.trim()).toBe('.bar');
	});
});

describe('is_single_selector_ruleset', () => {
	test('returns true for single simple selector', () => {
		const css = '.box { display: flex; }';
		const result = parse_ruleset(css);

		expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
	});

	test('returns false for multiple rules', () => {
		const css = '.box { display: flex; } .box:hover { color: red; }';
		const result = parse_ruleset(css);

		expect(is_single_selector_ruleset(result.rules, 'box')).toBe(false);
	});

	test('returns false for compound selector', () => {
		const css = '.selectable:hover { background: blue; }';
		const result = parse_ruleset(css);

		expect(is_single_selector_ruleset(result.rules, 'selectable')).toBe(false);
	});

	test('returns false for grouped selector', () => {
		const css = '.foo, .bar { color: red; }';
		const result = parse_ruleset(css);

		expect(is_single_selector_ruleset(result.rules, 'foo')).toBe(false);
	});

	test('returns false for wrong class name', () => {
		const css = '.box { display: flex; }';
		const result = parse_ruleset(css);

		expect(is_single_selector_ruleset(result.rules, 'row')).toBe(false);
	});

	test('handles whitespace in ruleset', () => {
		const css = `
			.box {
				display: flex;
			}
		`;
		const result = parse_ruleset(css);

		expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
	});
});

describe('ruleset_contains_class', () => {
	test('returns true for simple matching selector', () => {
		const css = '.clickable { cursor: pointer; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns true when class appears in any rule', () => {
		const css = `
			.other { color: red; }
			.clickable:hover { opacity: 0.8; }
		`;
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns false when class not present', () => {
		const css = '.foobar { cursor: pointer; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('returns false for partial class name match (prefix)', () => {
		const css = '.clickable_extended { cursor: pointer; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('returns false for partial class name match (suffix)', () => {
		const css = '.my_clickable { cursor: pointer; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('returns true for class in compound selector', () => {
		const css = '.clickable.selected { background: blue; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns true for class with pseudo-class', () => {
		const css = '.clickable:hover { opacity: 0.8; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns true for class with pseudo-element', () => {
		const css = '.chevron::before { content: ""; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'chevron')).toBe(true);
	});

	test('returns true for class in descendant selector', () => {
		const css = '.menu_item .content { display: flex; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'menu_item')).toBe(true);
	});

	test('returns true for element.class selector', () => {
		const css = 'a.chip { font-weight: 600; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'chip')).toBe(true);
	});

	test('returns false for empty rules', () => {
		const css = '';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('handles class name with numbers', () => {
		const css = '.color_a_5 { color: var(--color_a_5); }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'color_a_5')).toBe(true);
		expect(ruleset_contains_class(result.rules, 'color_a')).toBe(false);
	});

	test('handles class name with hyphens', () => {
		const css = '.my-class { color: red; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'my-class')).toBe(true);
		expect(ruleset_contains_class(result.rules, 'my')).toBe(false);
	});

	test('matches escaped class name in selector', () => {
		// Selector has escaped colon (as generated by CSS escaping)
		const css = '.hover\\:card:hover { opacity: 0.8; }';
		const result = parse_ruleset(css);

		// Unescaped class name doesn't match (colon not escaped in pattern)
		expect(ruleset_contains_class(result.rules, 'hover:card')).toBe(false);

		// Escaped class name matches the selector
		expect(ruleset_contains_class(result.rules, 'hover\\:card')).toBe(true);
	});

	test('escaped class name handles multiple special characters', () => {
		const css = '.md\\:dark\\:hover\\:box:hover { display: flex; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'md:dark:hover:box')).toBe(false);
		expect(ruleset_contains_class(result.rules, 'md\\:dark\\:hover\\:box')).toBe(true);
	});

	test('matches class followed by attribute selector', () => {
		const css = '.btn[disabled] { opacity: 0.5; }';
		const result = parse_ruleset(css);

		expect(ruleset_contains_class(result.rules, 'btn')).toBe(true);
	});

	test('does not match class name inside attribute value', () => {
		const css = '.other[data-class="btn"] { color: red; }';
		const result = parse_ruleset(css);

		// Should not match - btn is in attribute value, not a class selector
		expect(ruleset_contains_class(result.rules, 'btn')).toBe(false);
	});
});

describe('extract_css_comment', () => {
	test('extracts comment before rule', () => {
		const css = '/* Centered flex container */ .box { display: flex; }';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toBe('Centered flex container');
	});

	test('handles multi-line comments', () => {
		const css = `/* Multi-line
			comment */ .box { display: flex; }`;
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toContain('Multi-line');
	});

	test('returns null when no comment', () => {
		const css = '.box { display: flex; }';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toBeNull();
	});

	test('returns null for empty rules', () => {
		const css = '';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toBeNull();
	});

	test('extracts only first comment when multiple present', () => {
		const css = '/* First comment */ /* Second comment */ .box { display: flex; }';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		// The regex only matches the first comment
		expect(comment).toBe('First comment');
	});

	test('ignores comment after rule', () => {
		const css = '.box { display: flex; } /* After comment */';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toBeNull();
	});

	test('handles comment with asterisks inside', () => {
		const css = '/* Rating: ***** */ .box { display: flex; }';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toBe('Rating: *****');
	});

	test('handles whitespace-only comment', () => {
		const css = '/*   */ .box { display: flex; }';
		const result = parse_ruleset(css);

		const comment = extract_css_comment(css, result.rules);
		expect(comment).toBe('');
	});
});

describe('split_selector_list', () => {
	test('splits simple selectors', () => {
		const result = split_selector_list('.a, .b, .c');
		expect(result).toEqual(['.a', '.b', '.c']);
	});

	test('handles parentheses', () => {
		const result = split_selector_list('.a:not(.b), .c');
		expect(result).toEqual(['.a:not(.b)', '.c']);
	});

	test('handles nested parentheses', () => {
		const result = split_selector_list('.a:not(:is(.b, .c)), .d');
		expect(result).toEqual(['.a:not(:is(.b, .c))', '.d']);
	});

	test('handles single selector', () => {
		const result = split_selector_list('.a');
		expect(result).toEqual(['.a']);
	});

	test('handles empty string', () => {
		const result = split_selector_list('');
		expect(result).toEqual([]);
	});

	test('handles whitespace-only string', () => {
		const result = split_selector_list('   ');
		expect(result).toEqual([]);
	});

	test('handles attribute selectors with commas in quoted value', () => {
		const result = split_selector_list('.foo[data-x="a,b"], .bar');
		expect(result).toEqual(['.foo[data-x="a,b"]', '.bar']);
	});

	test('handles attribute selectors with single quotes', () => {
		const result = split_selector_list(".foo[data-x='a,b'], .bar");
		expect(result).toEqual([".foo[data-x='a,b']", '.bar']);
	});

	test('handles attribute selectors without quotes', () => {
		const result = split_selector_list('.foo[data-x=value], .bar');
		expect(result).toEqual(['.foo[data-x=value]', '.bar']);
	});

	test('handles escaped quotes in attribute values', () => {
		const result = split_selector_list('.foo[data-x="a\\"b,c"], .bar');
		expect(result).toEqual(['.foo[data-x="a\\"b,c"]', '.bar']);
	});

	test('handles mixed brackets and parentheses', () => {
		const result = split_selector_list('.foo[data-x="a"]:not(.b), .bar');
		expect(result).toEqual(['.foo[data-x="a"]:not(.b)', '.bar']);
	});
});

describe('find_compound_end', () => {
	test('finds end of simple class', () => {
		const selector = '.menu_item';
		const end = find_compound_end(selector, 0);
		expect(end).toBe(10);
	});

	test('finds end before descendant combinator', () => {
		const selector = '.menu_item .content';
		const end = find_compound_end(selector, 0);
		expect(end).toBe(10);
	});

	test('finds end of compound selector', () => {
		const selector = '.menu_item.selected';
		const end = find_compound_end(selector, 0);
		expect(end).toBe(19);
	});

	test('finds end before pseudo-element', () => {
		const selector = '.chevron::before';
		const end = find_compound_end(selector, 0);
		expect(end).toBe(8);
	});

	test('includes pseudo-classes', () => {
		const selector = '.selectable:hover';
		const end = find_compound_end(selector, 0);
		expect(end).toBe(17);
	});

	test('includes functional pseudo-classes', () => {
		const selector = '.plain:not(:hover)';
		const end = find_compound_end(selector, 0);
		expect(end).toBe(18);
	});

	describe('edge cases', () => {
		test('handles adjacent sibling combinator', () => {
			const selector = '.foo + .bar';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(4);
		});

		test('handles general sibling combinator', () => {
			const selector = '.foo ~ .bar';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(4);
		});

		test('handles attribute selector', () => {
			const selector = '.foo[type="button"]';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(19);
		});

		test('handles attribute selector with class after', () => {
			const selector = '.foo[data-x].bar';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(16);
		});

		test('handles class names with numbers', () => {
			const selector = '.foo123';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(7);
		});

		test('handles class names with hyphens', () => {
			const selector = '.foo-bar-baz';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(12);
		});

		test('handles ID selector after class', () => {
			const selector = '.foo#bar';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(8);
		});

		test('handles class after ID selector', () => {
			// When starting from the class position (5), should find compound end
			const selector = '#bar.foo';
			const end = find_compound_end(selector, 4);
			expect(end).toBe(8);
		});

		test('handles empty selector', () => {
			// find_compound_end expects to start at a '.' and skips it (pos + 1)
			// For empty string starting at 0, it returns 1 (past the expected dot)
			const selector = '';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(1);
		});

		test('handles multiple pseudo-classes', () => {
			const selector = '.btn:hover:focus';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(16);
		});

		test('stops before CSS2 single-colon pseudo-element', () => {
			// CSS2 used single colon for pseudo-elements (:before, :after)
			// We should stop before them so state can be inserted in correct position
			const selector = '.chevron:before';
			const end = find_compound_end(selector, 0);
			// Should stop at position 8 (before :before), not 15
			expect(end).toBe(8);
		});

		test('handles attribute selector with ] in quoted value', () => {
			const selector = '.foo[data-x="]"]';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(16);
		});

		test('handles attribute selector with ] in single-quoted value', () => {
			const selector = ".foo[data-x=']']";
			const end = find_compound_end(selector, 0);
			expect(end).toBe(16);
		});

		test('handles attribute selector with escaped quote', () => {
			const selector = '.foo[data-x="\\""]';
			const end = find_compound_end(selector, 0);
			expect(end).toBe(17);
		});

		test('handles universal selector after class', () => {
			// .foo* is valid CSS (though unusual)
			const selector = '.foo*';
			const end = find_compound_end(selector, 0);
			// * is not handled, so stops at it
			expect(end).toBe(4);
		});
	});
});

describe('modify_single_selector', () => {
	test('adds state to simple selector', () => {
		const result = modify_single_selector(
			'.menu_item',
			'menu_item',
			'hover\\:menu_item',
			':hover',
			'',
		);
		expect(result).toBe('.hover\\:menu_item:hover');
	});

	test('adds state before descendant', () => {
		const result = modify_single_selector(
			'.menu_item .content',
			'menu_item',
			'hover\\:menu_item',
			':hover',
			'',
		);
		expect(result).toBe('.hover\\:menu_item:hover .content');
	});

	test('adds state after compound', () => {
		const result = modify_single_selector(
			'.menu_item.selected',
			'menu_item',
			'hover\\:menu_item',
			':hover',
			'',
		);
		expect(result).toBe('.hover\\:menu_item.selected:hover');
	});

	test('adds state after existing pseudo-class', () => {
		const result = modify_single_selector(
			'.selectable:active',
			'selectable',
			'hover\\:selectable',
			':hover',
			'',
		);
		expect(result).toBe('.hover\\:selectable:active:hover');
	});

	test('adds state before pseudo-element', () => {
		const result = modify_single_selector(
			'.chevron::before',
			'chevron',
			'hover\\:chevron',
			':hover',
			'',
		);
		expect(result).toBe('.hover\\:chevron:hover::before');
	});

	test('adds pseudo-element', () => {
		const result = modify_single_selector('.box', 'box', 'before\\:box', '', '::before');
		expect(result).toBe('.before\\:box::before');
	});

	test('handles element.class selector', () => {
		const result = modify_single_selector('a.chip', 'chip', 'hover\\:chip', ':hover', '');
		expect(result).toBe('a.hover\\:chip:hover');
	});

	test('handles child combinator', () => {
		const result = modify_single_selector(
			'.parent > .child',
			'parent',
			'hover\\:parent',
			':hover',
			'',
		);
		expect(result).toBe('.hover\\:parent:hover > .child');
	});

	test('returns unchanged if class not found', () => {
		const result = modify_single_selector('.other', 'menu_item', 'hover\\:menu_item', ':hover', '');
		expect(result).toBe('.other');
	});

	describe('edge cases', () => {
		test('handles adjacent sibling combinator', () => {
			const result = modify_single_selector('.foo + .bar', 'foo', 'hover\\:foo', ':hover', '');
			expect(result).toBe('.hover\\:foo:hover + .bar');
		});

		test('handles general sibling combinator', () => {
			const result = modify_single_selector('.foo ~ .bar', 'foo', 'hover\\:foo', ':hover', '');
			expect(result).toBe('.hover\\:foo:hover ~ .bar');
		});

		test('handles attribute selector in compound', () => {
			const result = modify_single_selector('.btn[disabled]', 'btn', 'hover\\:btn', ':hover', '');
			expect(result).toBe('.hover\\:btn[disabled]:hover');
		});

		test('handles deeply nested functional pseudo-class', () => {
			const result = modify_single_selector(
				'.foo:not(:is(.a, .b))',
				'foo',
				'hover\\:foo',
				':hover',
				'',
			);
			expect(result).toBe('.hover\\:foo:not(:is(.a, .b)):hover');
		});

		test('handles :where() pseudo-class', () => {
			const result = modify_single_selector(
				'.foo:where(.a, .b)',
				'foo',
				'hover\\:foo',
				':hover',
				'',
			);
			expect(result).toBe('.hover\\:foo:where(.a, .b):hover');
		});

		test('handles :has() pseudo-class', () => {
			const result = modify_single_selector(
				'.parent:has(.child)',
				'parent',
				'hover\\:parent',
				':hover',
				'',
			);
			expect(result).toBe('.hover\\:parent:has(.child):hover');
		});

		test('handles class with ID selector', () => {
			const result = modify_single_selector('.foo#bar', 'foo', 'hover\\:foo', ':hover', '');
			expect(result).toBe('.hover\\:foo#bar:hover');
		});

		test('handles class with ID and existing pseudo-class', () => {
			const result = modify_single_selector('.foo#bar:focus', 'foo', 'hover\\:foo', ':hover', '');
			expect(result).toBe('.hover\\:foo#bar:focus:hover');
		});

		test('does not match class name as prefix of another class', () => {
			// .box should not match .boxed
			const result = modify_single_selector('.boxed', 'box', 'hover\\:box', ':hover', '');
			expect(result).toBe('.boxed'); // Unchanged - class not found
		});

		test('does not match class name as suffix of another class', () => {
			// .box should not match .checkbox
			const result = modify_single_selector('.checkbox', 'box', 'hover\\:box', ':hover', '');
			expect(result).toBe('.checkbox'); // Unchanged - class not found
		});

		test('handles class names with numbers', () => {
			const result = modify_single_selector('.p_md', 'p_md', 'hover\\:p_md', ':hover', '');
			expect(result).toBe('.hover\\:p_md:hover');
		});

		test('handles multiple occurrences of same class', () => {
			// Only the first occurrence should be replaced
			const result = modify_single_selector('.foo.foo', 'foo', 'hover\\:foo', ':hover', '');
			// The regex replaces only first match, state added after compound
			expect(result).toBe('.hover\\:foo.foo:hover');
		});

		test('handles class in descendant that matches target', () => {
			// When the class appears in a descendant, it should still be found
			const result = modify_single_selector('.container .box', 'box', 'hover\\:box', ':hover', '');
			expect(result).toBe('.container .hover\\:box:hover');
		});

		test('handles both state and pseudo-element together', () => {
			const result = modify_single_selector(
				'.box',
				'box',
				'hover\\:before\\:box',
				':hover',
				'::before',
			);
			expect(result).toBe('.hover\\:before\\:box:hover::before');
		});

		test('handles empty state and pseudo-element', () => {
			// Just renaming the class, no modifiers
			const result = modify_single_selector('.box', 'box', 'md\\:box', '', '');
			expect(result).toBe('.md\\:box');
		});

		test('handles ::part() pseudo-element', () => {
			const result = modify_single_selector(
				'.component::part(button)',
				'component',
				'hover\\:component',
				':hover',
				'',
			);
			// State should come before ::part()
			expect(result).toBe('.hover\\:component:hover::part(button)');
		});

		test('handles ::slotted() pseudo-element', () => {
			const result = modify_single_selector(
				'.host::slotted(.item)',
				'host',
				'focus\\:host',
				':focus',
				'',
			);
			expect(result).toBe('.focus\\:host:focus::slotted(.item)');
		});

		test('handles class name with underscores and numbers', () => {
			const result = modify_single_selector(
				'.color_a_5',
				'color_a_5',
				'hover\\:color_a_5',
				':hover',
				'',
			);
			expect(result).toBe('.hover\\:color_a_5:hover');
		});

		test('inserts state before CSS2 :before pseudo-element', () => {
			const result = modify_single_selector('.foo:before', 'foo', 'hover\\:foo', ':hover', '');
			// State should come BEFORE the pseudo-element
			expect(result).toBe('.hover\\:foo:hover:before');
		});

		test('inserts state before CSS2 :after pseudo-element', () => {
			const result = modify_single_selector('.foo:after', 'foo', 'hover\\:foo', ':hover', '');
			expect(result).toBe('.hover\\:foo:hover:after');
		});

		test('inserts state before CSS2 :first-letter pseudo-element', () => {
			const result = modify_single_selector(
				'.foo:first-letter',
				'foo',
				'hover\\:foo',
				':hover',
				'',
			);
			expect(result).toBe('.hover\\:foo:hover:first-letter');
		});
	});
});

describe('modify_selector_group', () => {
	test('handles grouped selectors', () => {
		const result = modify_selector_group(
			'.selectable.selected, .selectable:active',
			'selectable',
			'hover\\:selectable',
			[':hover'],
			'',
		);
		expect(result.selector).toBe(
			'.hover\\:selectable.selected:hover,\n.hover\\:selectable:active:hover',
		);
		expect(result.skipped_modifiers).toBeNull();
	});

	test('handles functional pseudo-classes in group', () => {
		const result = modify_selector_group(
			'.plain:not(:hover), .plain:active',
			'plain',
			'focus\\:plain',
			[':focus'],
			'',
		);
		expect(result.selector).toBe('.focus\\:plain:not(:hover):focus,\n.focus\\:plain:active:focus');
		expect(result.skipped_modifiers).toBeNull();
	});

	describe('per-selector conflict detection', () => {
		test('applies state only to selectors without conflict', () => {
			const result = modify_selector_group(
				'.plain:hover, .plain:active',
				'plain',
				'hover\\:plain',
				[':hover'],
				'',
			);
			expect(result.selector).toBe('.hover\\:plain:hover,\n.hover\\:plain:active:hover');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers).toHaveLength(1);
			expect(result.skipped_modifiers![0]!.selector).toBe('.plain:hover');
			expect(result.skipped_modifiers![0]!.reason).toBe('state_conflict');
			expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
		});

		test('applies non-conflicting states when some conflict', () => {
			const result = modify_selector_group(
				'.selectable:hover',
				'selectable',
				'hover\\:focus\\:selectable',
				[':hover', ':focus'],
				'',
			);
			expect(result.selector).toBe('.hover\\:focus\\:selectable:hover:focus');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers).toHaveLength(1);
			expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
		});

		test('handles pseudo-element conflict per-selector', () => {
			const result = modify_selector_group(
				'.chevron, .chevron::before',
				'chevron',
				'before\\:chevron',
				[],
				'::before',
			);
			expect(result.selector).toBe('.before\\:chevron::before,\n.before\\:chevron::before');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers).toHaveLength(1);
			expect(result.skipped_modifiers![0]!.selector).toBe('.chevron::before');
			expect(result.skipped_modifiers![0]!.reason).toBe('pseudo_element_conflict');
		});
	});
});

describe('generate_modified_ruleset', () => {
	test('handles simple ruleset with hover', () => {
		const ruleset = '.chip { font-weight: 500; }';
		const result = generate_modified_ruleset(
			ruleset,
			'chip',
			'hover\\:chip',
			':hover',
			'',
			null,
			null,
		);

		expect(result.css).toContain('.hover\\:chip:hover');
		expect(result.css).toContain('font-weight: 500;');
	});

	test('handles media wrapper', () => {
		const ruleset = '.chip { font-weight: 500; }';
		const result = generate_modified_ruleset(
			ruleset,
			'chip',
			'md\\:chip',
			'',
			'',
			'@media (width >= 48rem)',
			null,
		);

		expect(result.css).toContain('@media (width >= 48rem) {');
		expect(result.css).toContain('.md\\:chip');
		expect(result.css).toContain('}');
	});

	test('handles ancestor wrapper', () => {
		const ruleset = '.chip { font-weight: 500; }';
		const result = generate_modified_ruleset(
			ruleset,
			'chip',
			'dark\\:chip',
			'',
			'',
			null,
			':root.dark',
		);

		expect(result.css).toContain(':root.dark {');
		expect(result.css).toContain('.dark\\:chip');
	});

	test('handles both media and ancestor', () => {
		const ruleset = '.chip { font-weight: 500; }';
		const result = generate_modified_ruleset(
			ruleset,
			'chip',
			'md\\:dark\\:chip',
			'',
			'',
			'@media (width >= 48rem)',
			':root.dark',
		);

		expect(result.css).toContain('@media (width >= 48rem) {');
		expect(result.css).toContain(':root.dark {');
		expect(result.css).toContain('.md\\:dark\\:chip');
	});

	test('handles multi-rule ruleset', () => {
		const ruleset = `
			.selectable { cursor: pointer; }
			.selectable:hover { background: blue; }
		`;
		const result = generate_modified_ruleset(
			ruleset,
			'selectable',
			'md\\:selectable',
			'',
			'',
			'@media (width >= 48rem)',
			null,
		);

		expect(result.css).toContain('.md\\:selectable');
		expect(result.css).toContain('.md\\:selectable:hover');
		expect(result.css).toContain('@media (width >= 48rem) {');
	});

	test('applies state to multi-rule ruleset', () => {
		const ruleset = `
			.selectable { cursor: pointer; }
			.selectable:hover { background: blue; }
			.selectable.selected { border: solid; }
		`;
		const result = generate_modified_ruleset(
			ruleset,
			'selectable',
			'focus\\:selectable',
			':focus',
			'',
			null,
			null,
		);

		expect(result.css).toContain('.focus\\:selectable:focus');
		expect(result.css).toContain('.focus\\:selectable:hover:focus');
		expect(result.css).toContain('.focus\\:selectable.selected:focus');
	});

	test('handles descendant selectors', () => {
		const ruleset = `
			.menu_item { display: flex; }
			.menu_item .content { flex: 1; }
			.menu_item .icon { width: 24px; }
		`;
		const result = generate_modified_ruleset(
			ruleset,
			'menu_item',
			'hover\\:menu_item',
			':hover',
			'',
			null,
			null,
		);

		expect(result.css).toContain('.hover\\:menu_item:hover');
		expect(result.css).toContain('.hover\\:menu_item:hover .content');
		expect(result.css).toContain('.hover\\:menu_item:hover .icon');
	});

	test('handles pseudo-element composite', () => {
		const ruleset = `
			.chevron { position: relative; }
			.chevron::before { content: ''; }
		`;
		const result = generate_modified_ruleset(
			ruleset,
			'chevron',
			'hover\\:chevron',
			':hover',
			'',
			null,
			null,
		);

		expect(result.css).toContain('.hover\\:chevron:hover');
		expect(result.css).toContain('.hover\\:chevron:hover::before');
	});

	test('handles element.class selector', () => {
		const ruleset = `
			.chip { padding: 4px; }
			a.chip { font-weight: 600; }
		`;
		const result = generate_modified_ruleset(
			ruleset,
			'chip',
			'hover\\:chip',
			':hover',
			'',
			null,
			null,
		);

		expect(result.css).toContain('.hover\\:chip:hover');
		expect(result.css).toContain('a.hover\\:chip:hover');
	});

	describe('CSS2 single-colon pseudo-elements', () => {
		test('detects CSS2 :before as pseudo-element conflict', () => {
			const ruleset = `
				.chevron { position: relative; }
				.chevron:before { content: ''; }
			`;
			const result = generate_modified_ruleset(
				ruleset,
				'chevron',
				'before\\:chevron',
				'',
				'::before',
				null,
				null,
			);

			// The :before rule now triggers pseudo-element conflict detection
			// So it doesn't produce invalid :before::before
			expect(result.css).not.toContain(':before::before');
			// First rule gets ::before, second rule keeps :before (no extra modifier)
			expect(result.css).toContain('.before\\:chevron::before');
			expect(result.css).toContain('.before\\:chevron:before');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.some((s) => s.reason === 'pseudo_element_conflict')).toBe(
				true,
			);
		});

		test('detects CSS2 :after as pseudo-element conflict', () => {
			const ruleset = '.icon:after { content: "→"; }';
			const result = generate_modified_ruleset(
				ruleset,
				'icon',
				'after\\:icon',
				'',
				'::after',
				null,
				null,
			);

			expect(result.css).not.toContain(':after::after');
			expect(result.skipped_modifiers).not.toBeNull();
		});

		test('detects CSS2 :first-letter as pseudo-element conflict', () => {
			const ruleset = '.text:first-letter { font-size: 2em; }';
			const result = generate_modified_ruleset(
				ruleset,
				'text',
				'first-letter\\:text',
				'',
				'::first-letter',
				null,
				null,
			);

			expect(result.css).not.toContain(':first-letter::first-letter');
			expect(result.skipped_modifiers).not.toBeNull();
		});
	});

	describe('pseudo-element conflicts', () => {
		test('skips rules with pseudo-element when adding pseudo-element modifier', () => {
			const ruleset = `
				.chevron { position: relative; }
				.chevron::before { content: ''; border: 4px solid; }
			`;
			const result = generate_modified_ruleset(
				ruleset,
				'chevron',
				'before\\:chevron',
				'',
				'::before',
				null,
				null,
			);

			expect(result.css).toContain('.before\\:chevron::before');
			expect(result.css).toContain('position: relative');
			expect(result.css).toContain('border: 4px solid');
			expect(result.css).not.toContain('::before::before');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(1);
			expect(result.skipped_modifiers![0]!.reason).toBe('pseudo_element_conflict');
		});

		test('skips ::after rules when adding ::before modifier', () => {
			const ruleset = `
				.icon { display: inline; }
				.icon::after { content: '→'; }
			`;
			const result = generate_modified_ruleset(
				ruleset,
				'icon',
				'before\\:icon',
				'',
				'::before',
				null,
				null,
			);

			expect(result.css).toContain('.before\\:icon::before');
			expect(result.css).toContain('display: inline');
			expect(result.css).toContain('.before\\:icon::after');
			expect(result.css).toContain("content: '→'");
			expect(result.css).not.toContain('::after::before');
			expect(result.css).not.toContain('::before::after');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(1);
		});

		test('keeps all rules when adding state modifier (no pseudo-element conflict)', () => {
			const ruleset = `
				.chevron { position: relative; }
				.chevron::before { content: ''; }
			`;
			const result = generate_modified_ruleset(
				ruleset,
				'chevron',
				'hover\\:chevron',
				':hover',
				'',
				null,
				null,
			);

			expect(result.css).toContain('.hover\\:chevron:hover');
			expect(result.css).toContain('.hover\\:chevron:hover::before');
			expect(result.css).toContain('position: relative');
			expect(result.css).toContain("content: ''");
			expect(result.skipped_modifiers).toBeNull();
		});
	});

	describe('per-selector conflict detection', () => {
		test('handles selector list with partial state conflict', () => {
			const ruleset = '.plain:hover, .plain:active { background: blue; }';
			const result = generate_modified_ruleset(
				ruleset,
				'plain',
				'hover\\:plain',
				':hover',
				'',
				null,
				null,
			);

			expect(result.css).toContain('.hover\\:plain:hover');
			expect(result.css).toContain('.hover\\:plain:active:hover');
			expect(result.css).not.toContain(':hover:hover');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(1);
			expect(result.skipped_modifiers![0]!.selector).toBe('.plain:hover');
		});

		test('applies non-conflicting states with multiple states', () => {
			const ruleset = '.selectable:hover { background: blue; }';
			const result = generate_modified_ruleset(
				ruleset,
				'selectable',
				'hover\\:focus\\:selectable',
				':hover:focus',
				'',
				null,
				null,
			);

			expect(result.css).toContain('.hover\\:focus\\:selectable:hover:focus');
			expect(result.css).not.toContain(':hover:hover');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(1);
			expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
		});

		test('handles complex selector list with mixed conflicts', () => {
			const ruleset = '.btn:hover, .btn:focus, .btn:active { outline: none; }';
			const result = generate_modified_ruleset(
				ruleset,
				'btn',
				'hover\\:focus\\:btn',
				':hover:focus',
				'',
				null,
				null,
			);

			expect(result.css).toContain('.hover\\:focus\\:btn:hover:focus');
			expect(result.css).toContain('.hover\\:focus\\:btn:focus:hover');
			expect(result.css).toContain('.hover\\:focus\\:btn:active:hover:focus');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(2);
		});
	});

	describe('state parsing edge cases', () => {
		test('handles empty state_css', () => {
			const ruleset = '.box { display: flex; }';
			const result = generate_modified_ruleset(ruleset, 'box', 'md\\:box', '', '', null, null);

			expect(result.css).toContain('.md\\:box');
			expect(result.skipped_modifiers).toBeNull();
		});

		test('handles hyphenated pseudo-class names', () => {
			const ruleset = '.box { display: flex; }';
			const result = generate_modified_ruleset(
				ruleset,
				'box',
				'focus-visible\\:box',
				':focus-visible',
				'',
				null,
				null,
			);

			expect(result.css).toContain('.focus-visible\\:box:focus-visible');
		});

		test('handles three states combined', () => {
			const ruleset = '.box { display: flex; }';
			const result = generate_modified_ruleset(
				ruleset,
				'box',
				'hover\\:focus\\:active\\:box',
				':hover:focus:active',
				'',
				null,
				null,
			);

			expect(result.css).toContain('.hover\\:focus\\:active\\:box:hover:focus:active');
		});

		test('handles empty ruleset', () => {
			const ruleset = '';
			const result = generate_modified_ruleset(
				ruleset,
				'box',
				'hover\\:box',
				':hover',
				'',
				null,
				null,
			);

			// Should produce no rules but structure for wrappers
			expect(result.css).toBe('');
			expect(result.skipped_modifiers).toBeNull();
		});

		test('handles whitespace-only ruleset', () => {
			const ruleset = '   \n\t   ';
			const result = generate_modified_ruleset(
				ruleset,
				'box',
				'hover\\:box',
				':hover',
				'',
				null,
				null,
			);

			expect(result.css).toBe('');
			expect(result.skipped_modifiers).toBeNull();
		});
	});
});
