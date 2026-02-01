import {test, expect, describe} from 'vitest';

import {
	parse_ruleset,
	is_single_selector_ruleset,
	ruleset_contains_class,
	extract_css_comment,
} from '$lib/css_ruleset_parser.js';

/**
 * Tests for parse_ruleset and related ruleset analysis functions.
 */
describe('parse_ruleset', () => {
	test('parses simple rule', () => {
		const result = parse_ruleset('.box { display: flex; }');

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.box');
		expect(result.rules[0]!.declarations).toBe('display: flex;');
	});

	test('parses multiple declarations', () => {
		const result = parse_ruleset('.box { display: flex; flex-direction: column; }');

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.declarations).toContain('display: flex');
		expect(result.rules[0]!.declarations).toContain('flex-direction: column');
	});

	test('parses multiple rules', () => {
		const result = parse_ruleset('.foo { color: red; } .bar { color: blue; }');

		expect(result.rules).toHaveLength(2);
		expect(result.rules[0]!.selector).toBe('.foo');
		expect(result.rules[1]!.selector).toBe('.bar');
	});

	test('handles multi-line CSS', () => {
		const result = parse_ruleset(`
			.box {
				display: flex;
				flex-direction: column;
				align-items: center;
			}
		`);

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector.trim()).toBe('.box');
	});

	test('handles compound selectors', () => {
		const result = parse_ruleset('.selectable:hover { background: blue; }');

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.selectable:hover');
	});

	test('handles grouped selectors', () => {
		const result = parse_ruleset('.foo, .bar { color: red; }');

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.foo, .bar');
	});

	test('handles pseudo-elements', () => {
		const result = parse_ruleset('.chevron::before { content: ""; }');

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('.chevron::before');
	});

	test('returns correct positions', () => {
		const result = parse_ruleset('.box { display: flex; }');

		expect(result.rules[0]!.selector_start).toBe(0);
		expect(result.rules[0]!.selector_end).toBe(4);
		expect(result.rules[0]!.rule_start).toBe(0);
		expect(result.rules[0]!.rule_end).toBe(23);
	});

	test('handles empty CSS', () => {
		const result = parse_ruleset('');
		expect(result.rules).toHaveLength(0);
	});

	test('handles CSS with only whitespace', () => {
		const result = parse_ruleset('   \n\t   ');
		expect(result.rules).toHaveLength(0);
	});

	test('handles element+class selectors', () => {
		const result = parse_ruleset('a.chip { font-weight: 600; }');

		expect(result.rules).toHaveLength(1);
		expect(result.rules[0]!.selector).toBe('a.chip');
	});

	test('handles descendant selectors', () => {
		const result = parse_ruleset('.menu_item .content { display: flex; }');

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

		expect(result.rules).toHaveLength(2);
		expect(result.rules[0]!.selector.trim()).toBe('0%');
		expect(result.rules[1]!.selector.trim()).toBe('100%');
	});

	test('handles @font-face (no selector)', () => {
		const css = '@font-face { font-family: "Test"; src: url(test.woff2); }';
		const result = parse_ruleset(css);

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
		const result = parse_ruleset('.box { display: flex; }');
		expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
	});

	test('returns false for multiple rules', () => {
		const result = parse_ruleset('.box { display: flex; } .box:hover { color: red; }');
		expect(is_single_selector_ruleset(result.rules, 'box')).toBe(false);
	});

	test('returns false for compound selector', () => {
		const result = parse_ruleset('.selectable:hover { background: blue; }');
		expect(is_single_selector_ruleset(result.rules, 'selectable')).toBe(false);
	});

	test('returns false for grouped selector', () => {
		const result = parse_ruleset('.foo, .bar { color: red; }');
		expect(is_single_selector_ruleset(result.rules, 'foo')).toBe(false);
	});

	test('returns false for wrong class name', () => {
		const result = parse_ruleset('.box { display: flex; }');
		expect(is_single_selector_ruleset(result.rules, 'row')).toBe(false);
	});

	test('handles whitespace in ruleset', () => {
		const result = parse_ruleset(`
			.box {
				display: flex;
			}
		`);
		expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
	});
});

describe('ruleset_contains_class', () => {
	test('returns true for simple matching selector', () => {
		const result = parse_ruleset('.clickable { cursor: pointer; }');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns true when class appears in any rule', () => {
		const result = parse_ruleset(`
			.other { color: red; }
			.clickable:hover { opacity: 0.8; }
		`);
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns false when class not present', () => {
		const result = parse_ruleset('.foobar { cursor: pointer; }');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('returns false for partial class name match (prefix)', () => {
		const result = parse_ruleset('.clickable_extended { cursor: pointer; }');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('returns false for partial class name match (suffix)', () => {
		const result = parse_ruleset('.my_clickable { cursor: pointer; }');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('returns true for class in compound selector', () => {
		const result = parse_ruleset('.clickable.selected { background: blue; }');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns true for class with pseudo-class', () => {
		const result = parse_ruleset('.clickable:hover { opacity: 0.8; }');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(true);
	});

	test('returns true for class with pseudo-element', () => {
		const result = parse_ruleset('.chevron::before { content: ""; }');
		expect(ruleset_contains_class(result.rules, 'chevron')).toBe(true);
	});

	test('returns true for class in descendant selector', () => {
		const result = parse_ruleset('.menu_item .content { display: flex; }');
		expect(ruleset_contains_class(result.rules, 'menu_item')).toBe(true);
	});

	test('returns true for element.class selector', () => {
		const result = parse_ruleset('a.chip { font-weight: 600; }');
		expect(ruleset_contains_class(result.rules, 'chip')).toBe(true);
	});

	test('returns false for empty rules', () => {
		const result = parse_ruleset('');
		expect(ruleset_contains_class(result.rules, 'clickable')).toBe(false);
	});

	test('handles class name with numbers', () => {
		const result = parse_ruleset('.color_a_50 { color: var(--color_a_50); }');
		expect(ruleset_contains_class(result.rules, 'color_a_50')).toBe(true);
		expect(ruleset_contains_class(result.rules, 'color_a')).toBe(false);
	});

	test('handles class name with hyphens', () => {
		const result = parse_ruleset('.my-class { color: red; }');
		expect(ruleset_contains_class(result.rules, 'my-class')).toBe(true);
		expect(ruleset_contains_class(result.rules, 'my')).toBe(false);
	});

	test('matches escaped class name in selector', () => {
		const result = parse_ruleset('.hover\\:card:hover { opacity: 0.8; }');
		expect(ruleset_contains_class(result.rules, 'hover:card')).toBe(false);
		expect(ruleset_contains_class(result.rules, 'hover\\:card')).toBe(true);
	});

	test('escaped class name handles multiple special characters', () => {
		const result = parse_ruleset('.md\\:dark\\:hover\\:box:hover { display: flex; }');
		expect(ruleset_contains_class(result.rules, 'md:dark:hover:box')).toBe(false);
		expect(ruleset_contains_class(result.rules, 'md\\:dark\\:hover\\:box')).toBe(true);
	});

	test('matches class followed by attribute selector', () => {
		const result = parse_ruleset('.btn[disabled] { opacity: 0.5; }');
		expect(ruleset_contains_class(result.rules, 'btn')).toBe(true);
	});

	test('does not match class name inside attribute value', () => {
		const result = parse_ruleset('.other[data-class="btn"] { color: red; }');
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
