import {test, assert, describe} from 'vitest';

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

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, '.box');
		assert.strictEqual(result.rules[0]!.declarations, 'display: flex;');
	});

	test('parses multiple declarations', () => {
		const result = parse_ruleset('.box { display: flex; flex-direction: column; }');

		assert.lengthOf(result.rules, 1);
		assert.include(result.rules[0]!.declarations, 'display: flex');
		assert.include(result.rules[0]!.declarations, 'flex-direction: column');
	});

	test('parses multiple rules', () => {
		const result = parse_ruleset('.foo { color: red; } .bar { color: blue; }');

		assert.lengthOf(result.rules, 2);
		assert.strictEqual(result.rules[0]!.selector, '.foo');
		assert.strictEqual(result.rules[1]!.selector, '.bar');
	});

	test('handles multi-line CSS', () => {
		const result = parse_ruleset(`
			.box {
				display: flex;
				flex-direction: column;
				align-items: center;
			}
		`);

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector.trim(), '.box');
	});

	test('handles compound selectors', () => {
		const result = parse_ruleset('.selectable:hover { background: blue; }');

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, '.selectable:hover');
	});

	test('handles grouped selectors', () => {
		const result = parse_ruleset('.foo, .bar { color: red; }');

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, '.foo, .bar');
	});

	test('handles pseudo-elements', () => {
		const result = parse_ruleset('.chevron::before { content: ""; }');

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, '.chevron::before');
	});

	test('returns correct positions', () => {
		const result = parse_ruleset('.box { display: flex; }');

		assert.strictEqual(result.rules[0]!.selector_start, 0);
		assert.strictEqual(result.rules[0]!.selector_end, 4);
		assert.strictEqual(result.rules[0]!.rule_start, 0);
		assert.strictEqual(result.rules[0]!.rule_end, 23);
	});

	test('handles empty CSS', () => {
		const result = parse_ruleset('');
		assert.lengthOf(result.rules, 0);
	});

	test('handles CSS with only whitespace', () => {
		const result = parse_ruleset('   \n\t   ');
		assert.lengthOf(result.rules, 0);
	});

	test('handles element+class selectors', () => {
		const result = parse_ruleset('a.chip { font-weight: 600; }');

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, 'a.chip');
	});

	test('handles descendant selectors', () => {
		const result = parse_ruleset('.menuitem .content { display: flex; }');

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, '.menuitem .content');
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

			assert.isAbove(result.rules.length, 1);
			assert.isFalse(is_single_selector_ruleset(result.rules, 'selectable'));
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

			assert.lengthOf(result.rules, 2);
			assert.strictEqual(result.rules[0]!.selector.trim(), '.chip');
			assert.strictEqual(result.rules[1]!.selector.trim(), 'a.chip');
			assert.isFalse(is_single_selector_ruleset(result.rules, 'chip'));
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

			assert.lengthOf(result.rules, 2);
			assert.isFalse(is_single_selector_ruleset(result.rules, 'chevron'));
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

			assert.lengthOf(result.rules, 1);
			assert.isTrue(is_single_selector_ruleset(result.rules, 'box'));
		});
	});
});

describe('parse_ruleset edge cases', () => {
	test('extracts rules from @keyframes (percentage selectors)', () => {
		const css = '@keyframes fade { 0% { opacity: 0; } 100% { opacity: 1; } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 2);
		assert.strictEqual(result.rules[0]!.selector.trim(), '0%');
		assert.strictEqual(result.rules[1]!.selector.trim(), '100%');
	});

	test('handles @font-face (no selector)', () => {
		const css = '@font-face { font-family: "Test"; src: url(test.woff2); }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 0);
	});

	test('handles @layer', () => {
		const css = '@layer utilities { .box { display: flex; } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector.trim(), '.box');
	});

	test('handles @container queries', () => {
		const css = '@container (width > 400px) { .card { display: grid; } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector.trim(), '.card');
	});

	test('handles deeply nested selectors', () => {
		const css = '.a .b .c .d .e .f { color: red; }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector, '.a .b .c .d .e .f');
	});
});

describe('parse_ruleset at-rules', () => {
	test('extracts rules from inside @media', () => {
		const css = '@media (width >= 48rem) { .box { display: flex; } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector.trim(), '.box');
		assert.include(result.rules[0]!.declarations, 'display: flex');
	});

	test('extracts multiple rules from inside @media', () => {
		const css = '@media (width >= 48rem) { .foo { color: red; } .bar { color: blue; } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 2);
		assert.strictEqual(result.rules[0]!.selector.trim(), '.foo');
		assert.strictEqual(result.rules[1]!.selector.trim(), '.bar');
	});

	test('extracts rules from nested at-rules', () => {
		const css = '@supports (display: grid) { @media (width >= 48rem) { .box { display: grid; } } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 1);
		assert.strictEqual(result.rules[0]!.selector.trim(), '.box');
	});

	test('extracts rules at top level alongside at-rules', () => {
		const css = '.foo { color: red; } @media (width >= 48rem) { .bar { color: blue; } }';
		const result = parse_ruleset(css);

		assert.lengthOf(result.rules, 2);
		assert.strictEqual(result.rules[0]!.selector, '.foo');
		assert.strictEqual(result.rules[1]!.selector.trim(), '.bar');
	});
});

describe('is_single_selector_ruleset', () => {
	test('returns true for single simple selector', () => {
		const result = parse_ruleset('.box { display: flex; }');
		assert.isTrue(is_single_selector_ruleset(result.rules, 'box'));
	});

	test('returns false for multiple rules', () => {
		const result = parse_ruleset('.box { display: flex; } .box:hover { color: red; }');
		assert.isFalse(is_single_selector_ruleset(result.rules, 'box'));
	});

	test('returns false for compound selector', () => {
		const result = parse_ruleset('.selectable:hover { background: blue; }');
		assert.isFalse(is_single_selector_ruleset(result.rules, 'selectable'));
	});

	test('returns false for grouped selector', () => {
		const result = parse_ruleset('.foo, .bar { color: red; }');
		assert.isFalse(is_single_selector_ruleset(result.rules, 'foo'));
	});

	test('returns false for wrong class name', () => {
		const result = parse_ruleset('.box { display: flex; }');
		assert.isFalse(is_single_selector_ruleset(result.rules, 'row'));
	});

	test('handles whitespace in ruleset', () => {
		const result = parse_ruleset(`
			.box {
				display: flex;
			}
		`);
		assert.isTrue(is_single_selector_ruleset(result.rules, 'box'));
	});
});

describe('ruleset_contains_class', () => {
	test('returns true for simple matching selector', () => {
		const result = parse_ruleset('.clickable { cursor: pointer; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns true when class appears in any rule', () => {
		const result = parse_ruleset(`
			.other { color: red; }
			.clickable:hover { opacity: 0.8; }
		`);
		assert.isTrue(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns false when class not present', () => {
		const result = parse_ruleset('.foobar { cursor: pointer; }');
		assert.isFalse(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns false for partial class name match (prefix)', () => {
		const result = parse_ruleset('.clickable_extended { cursor: pointer; }');
		assert.isFalse(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns false for partial class name match (suffix)', () => {
		const result = parse_ruleset('.my_clickable { cursor: pointer; }');
		assert.isFalse(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns true for class in compound selector', () => {
		const result = parse_ruleset('.clickable.selected { background: blue; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns true for class with pseudo-class', () => {
		const result = parse_ruleset('.clickable:hover { opacity: 0.8; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('returns true for class with pseudo-element', () => {
		const result = parse_ruleset('.chevron::before { content: ""; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'chevron'));
	});

	test('returns true for class in descendant selector', () => {
		const result = parse_ruleset('.menuitem .content { display: flex; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'menuitem'));
	});

	test('returns true for element.class selector', () => {
		const result = parse_ruleset('a.chip { font-weight: 600; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'chip'));
	});

	test('returns false for empty rules', () => {
		const result = parse_ruleset('');
		assert.isFalse(ruleset_contains_class(result.rules, 'clickable'));
	});

	test('handles class name with numbers', () => {
		const result = parse_ruleset('.color_a_50 { color: var(--color_a_50); }');
		assert.isTrue(ruleset_contains_class(result.rules, 'color_a_50'));
		assert.isFalse(ruleset_contains_class(result.rules, 'color_a'));
	});

	test('handles class name with hyphens', () => {
		const result = parse_ruleset('.my-class { color: red; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'my-class'));
		assert.isFalse(ruleset_contains_class(result.rules, 'my'));
	});

	test('matches escaped class name in selector', () => {
		const result = parse_ruleset('.hover\\:card:hover { opacity: 0.8; }');
		assert.isFalse(ruleset_contains_class(result.rules, 'hover:card'));
		assert.isTrue(ruleset_contains_class(result.rules, 'hover\\:card'));
	});

	test('escaped class name handles multiple special characters', () => {
		const result = parse_ruleset('.md\\:dark\\:hover\\:box:hover { display: flex; }');
		assert.isFalse(ruleset_contains_class(result.rules, 'md:dark:hover:box'));
		assert.isTrue(ruleset_contains_class(result.rules, 'md\\:dark\\:hover\\:box'));
	});

	test('matches class followed by attribute selector', () => {
		const result = parse_ruleset('.btn[disabled] { opacity: 0.5; }');
		assert.isTrue(ruleset_contains_class(result.rules, 'btn'));
	});

	test('does not match class name inside attribute value', () => {
		const result = parse_ruleset('.other[data-class="btn"] { color: red; }');
		assert.isFalse(ruleset_contains_class(result.rules, 'btn'));
	});
});

describe('extract_css_comment', () => {
	test('extracts comment before rule', () => {
		const css = '/* Centered flex container */ .box { display: flex; }';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.strictEqual(comment, 'Centered flex container');
	});

	test('handles multi-line comments', () => {
		const css = `/* Multi-line
			comment */ .box { display: flex; }`;
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.include(comment!, 'Multi-line');
	});

	test('returns null when no comment', () => {
		const css = '.box { display: flex; }';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.isNull(comment);
	});

	test('returns null for empty rules', () => {
		const css = '';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.isNull(comment);
	});

	test('extracts only first comment when multiple present', () => {
		const css = '/* First comment */ /* Second comment */ .box { display: flex; }';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.strictEqual(comment, 'First comment');
	});

	test('ignores comment after rule', () => {
		const css = '.box { display: flex; } /* After comment */';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.isNull(comment);
	});

	test('handles comment with asterisks inside', () => {
		const css = '/* Rating: ***** */ .box { display: flex; }';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.strictEqual(comment, 'Rating: *****');
	});

	test('handles whitespace-only comment', () => {
		const css = '/*   */ .box { display: flex; }';
		const result = parse_ruleset(css);
		const comment = extract_css_comment(css, result.rules);
		assert.strictEqual(comment, '');
	});
});
