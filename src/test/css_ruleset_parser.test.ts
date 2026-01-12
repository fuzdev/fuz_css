import {test, expect} from 'vitest';

import {
	parse_ruleset,
	is_single_selector_ruleset,
	extract_css_comment,
	split_selector_list,
	find_compound_end,
	modify_single_selector,
	modify_selector_group,
	generate_modified_ruleset,
} from '$lib/css_ruleset_parser.js';

// parse_ruleset basic tests

test('parse_ruleset parses simple rule', () => {
	const css = '.box { display: flex; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.selector).toBe('.box');
	expect(result.rules[0]!.declarations).toBe('display: flex;');
});

test('parse_ruleset parses multiple declarations', () => {
	const css = '.box { display: flex; flex-direction: column; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.declarations).toContain('display: flex');
	expect(result.rules[0]!.declarations).toContain('flex-direction: column');
});

test('parse_ruleset parses multiple rules', () => {
	const css = '.foo { color: red; } .bar { color: blue; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(2);
	expect(result.rules[0]!.selector).toBe('.foo');
	expect(result.rules[1]!.selector).toBe('.bar');
});

test('parse_ruleset handles multi-line CSS', () => {
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

test('parse_ruleset handles compound selectors', () => {
	const css = '.selectable:hover { background: blue; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.selector).toBe('.selectable:hover');
});

test('parse_ruleset handles grouped selectors', () => {
	const css = '.foo, .bar { color: red; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.selector).toBe('.foo, .bar');
});

test('parse_ruleset handles pseudo-elements', () => {
	const css = '.chevron::before { content: ""; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.selector).toBe('.chevron::before');
});

test('parse_ruleset returns correct positions', () => {
	const css = '.box { display: flex; }';
	const result = parse_ruleset(css);

	expect(result.rules[0]!.selector_start).toBe(0);
	expect(result.rules[0]!.selector_end).toBe(4);
	expect(result.rules[0]!.rule_start).toBe(0);
	expect(result.rules[0]!.rule_end).toBe(23);
});

test('parse_ruleset handles empty CSS', () => {
	const css = '';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(0);
});

test('parse_ruleset handles CSS with only whitespace', () => {
	const css = '   \n\t   ';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(0);
});

test('parse_ruleset handles element+class selectors', () => {
	const css = 'a.chip { font-weight: 600; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.selector).toBe('a.chip');
});

test('parse_ruleset handles descendant selectors', () => {
	const css = '.menu_item .content { display: flex; }';
	const result = parse_ruleset(css);

	expect(result.rules).toHaveLength(1);
	expect(result.rules[0]!.selector).toBe('.menu_item .content');
});

// is_single_selector_ruleset tests

test('is_single_selector_ruleset returns true for single simple selector', () => {
	const css = '.box { display: flex; }';
	const result = parse_ruleset(css);

	expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
});

test('is_single_selector_ruleset returns false for multiple rules', () => {
	const css = '.box { display: flex; } .box:hover { color: red; }';
	const result = parse_ruleset(css);

	expect(is_single_selector_ruleset(result.rules, 'box')).toBe(false);
});

test('is_single_selector_ruleset returns false for compound selector', () => {
	const css = '.selectable:hover { background: blue; }';
	const result = parse_ruleset(css);

	expect(is_single_selector_ruleset(result.rules, 'selectable')).toBe(false);
});

test('is_single_selector_ruleset returns false for grouped selector', () => {
	const css = '.foo, .bar { color: red; }';
	const result = parse_ruleset(css);

	expect(is_single_selector_ruleset(result.rules, 'foo')).toBe(false);
});

test('is_single_selector_ruleset returns false for wrong class name', () => {
	const css = '.box { display: flex; }';
	const result = parse_ruleset(css);

	expect(is_single_selector_ruleset(result.rules, 'row')).toBe(false);
});

test('is_single_selector_ruleset handles whitespace in ruleset', () => {
	const css = `
		.box {
			display: flex;
		}
	`;
	const result = parse_ruleset(css);

	expect(is_single_selector_ruleset(result.rules, 'box')).toBe(true);
});

// extract_css_comment tests

test('extract_css_comment extracts comment before rule', () => {
	const css = '/* Centered flex container */ .box { display: flex; }';
	const result = parse_ruleset(css);

	const comment = extract_css_comment(css, result.rules);
	expect(comment).toBe('Centered flex container');
});

test('extract_css_comment handles multi-line comments', () => {
	const css = `/* Multi-line
		comment */ .box { display: flex; }`;
	const result = parse_ruleset(css);

	const comment = extract_css_comment(css, result.rules);
	expect(comment).toContain('Multi-line');
});

test('extract_css_comment returns null when no comment', () => {
	const css = '.box { display: flex; }';
	const result = parse_ruleset(css);

	const comment = extract_css_comment(css, result.rules);
	expect(comment).toBeNull();
});

test('extract_css_comment returns null for empty rules', () => {
	const css = '';
	const result = parse_ruleset(css);

	const comment = extract_css_comment(css, result.rules);
	expect(comment).toBeNull();
});

// Real-world composite class tests

test('parse_ruleset handles selectable composite', () => {
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

test('parse_ruleset handles chip composite with element selector', () => {
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

test('parse_ruleset handles chevron with pseudo-element', () => {
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

test('parse_ruleset handles box composite (convertible)', () => {
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

// Selector modification tests

// split_selector_list tests

test('split_selector_list splits simple selectors', () => {
	const result = split_selector_list('.a, .b, .c');
	expect(result).toEqual(['.a', '.b', '.c']);
});

test('split_selector_list handles parentheses', () => {
	const result = split_selector_list('.a:not(.b), .c');
	expect(result).toEqual(['.a:not(.b)', '.c']);
});

test('split_selector_list handles nested parentheses', () => {
	const result = split_selector_list('.a:not(:is(.b, .c)), .d');
	expect(result).toEqual(['.a:not(:is(.b, .c))', '.d']);
});

test('split_selector_list handles single selector', () => {
	const result = split_selector_list('.a');
	expect(result).toEqual(['.a']);
});

// find_compound_end tests

test('find_compound_end finds end of simple class', () => {
	const selector = '.menu_item';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(10);
});

test('find_compound_end finds end before descendant combinator', () => {
	const selector = '.menu_item .content';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(10);
});

test('find_compound_end finds end of compound selector', () => {
	const selector = '.menu_item.selected';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(19);
});

test('find_compound_end finds end before pseudo-element', () => {
	const selector = '.chevron::before';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(8);
});

test('find_compound_end includes pseudo-classes', () => {
	const selector = '.selectable:hover';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(17);
});

test('find_compound_end includes functional pseudo-classes', () => {
	const selector = '.plain:not(:hover)';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(18);
});

// modify_single_selector tests

test('modify_single_selector adds state to simple selector', () => {
	const result = modify_single_selector(
		'.menu_item',
		'menu_item',
		'hover\\:menu_item',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:menu_item:hover');
});

test('modify_single_selector adds state before descendant', () => {
	const result = modify_single_selector(
		'.menu_item .content',
		'menu_item',
		'hover\\:menu_item',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:menu_item:hover .content');
});

test('modify_single_selector adds state after compound', () => {
	const result = modify_single_selector(
		'.menu_item.selected',
		'menu_item',
		'hover\\:menu_item',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:menu_item.selected:hover');
});

test('modify_single_selector adds state after existing pseudo-class', () => {
	const result = modify_single_selector(
		'.selectable:active',
		'selectable',
		'hover\\:selectable',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:selectable:active:hover');
});

test('modify_single_selector adds state before pseudo-element', () => {
	const result = modify_single_selector(
		'.chevron::before',
		'chevron',
		'hover\\:chevron',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:chevron:hover::before');
});

test('modify_single_selector adds pseudo-element', () => {
	const result = modify_single_selector('.box', 'box', 'before\\:box', '', '::before');
	expect(result).toBe('.before\\:box::before');
});

test('modify_single_selector handles element.class selector', () => {
	const result = modify_single_selector('a.chip', 'chip', 'hover\\:chip', ':hover', '');
	expect(result).toBe('a.hover\\:chip:hover');
});

test('modify_single_selector handles child combinator', () => {
	const result = modify_single_selector(
		'.parent > .child',
		'parent',
		'hover\\:parent',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:parent:hover > .child');
});

test('modify_single_selector returns unchanged if class not found', () => {
	const result = modify_single_selector('.other', 'menu_item', 'hover\\:menu_item', ':hover', '');
	expect(result).toBe('.other');
});

// modify_selector_group tests

test('modify_selector_group handles grouped selectors', () => {
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

test('modify_selector_group handles functional pseudo-classes in group', () => {
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

// Per-selector conflict detection tests

test('modify_selector_group applies state only to selectors without conflict', () => {
	// .plain:hover already has :hover, .plain:active does not
	const result = modify_selector_group(
		'.plain:hover, .plain:active',
		'plain',
		'hover\\:plain',
		[':hover'],
		'',
	);
	// .plain:hover should NOT get another :hover, .plain:active SHOULD get :hover
	expect(result.selector).toBe('.hover\\:plain:hover,\n.hover\\:plain:active:hover');
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers).toHaveLength(1);
	expect(result.skipped_modifiers![0]!.selector).toBe('.plain:hover');
	expect(result.skipped_modifiers![0]!.reason).toBe('state_conflict');
	expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
});

test('modify_selector_group applies non-conflicting states when some conflict', () => {
	// Adding :hover:focus to selector that already has :hover
	const result = modify_selector_group(
		'.selectable:hover',
		'selectable',
		'hover\\:focus\\:selectable',
		[':hover', ':focus'],
		'',
	);
	// Should skip :hover (already exists) but add :focus
	expect(result.selector).toBe('.hover\\:focus\\:selectable:hover:focus');
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers).toHaveLength(1);
	expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
});

test('modify_selector_group handles pseudo-element conflict per-selector', () => {
	// Only the ::before selector should skip the pseudo-element
	const result = modify_selector_group(
		'.chevron, .chevron::before',
		'chevron',
		'before\\:chevron',
		[],
		'::before',
	);
	// First selector gets ::before, second doesn't (already has pseudo-element)
	expect(result.selector).toBe('.before\\:chevron::before,\n.before\\:chevron::before');
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers).toHaveLength(1);
	expect(result.skipped_modifiers![0]!.selector).toBe('.chevron::before');
	expect(result.skipped_modifiers![0]!.reason).toBe('pseudo_element_conflict');
});

// generate_modified_ruleset tests

test('generate_modified_ruleset handles simple ruleset with hover', () => {
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

test('generate_modified_ruleset handles media wrapper', () => {
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

test('generate_modified_ruleset handles ancestor wrapper', () => {
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

test('generate_modified_ruleset handles both media and ancestor', () => {
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

test('generate_modified_ruleset handles multi-rule ruleset', () => {
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

test('generate_modified_ruleset applies state to multi-rule ruleset', () => {
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

	// Check that :focus is added to each rule's first compound containing .selectable
	expect(result.css).toContain('.focus\\:selectable:focus');
	expect(result.css).toContain('.focus\\:selectable:hover:focus');
	expect(result.css).toContain('.focus\\:selectable.selected:focus');
});

test('generate_modified_ruleset handles descendant selectors', () => {
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

test('generate_modified_ruleset handles pseudo-element composite', () => {
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
	// State should come BEFORE existing pseudo-element
	expect(result.css).toContain('.hover\\:chevron:hover::before');
});

test('generate_modified_ruleset handles element.class selector', () => {
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

// Edge case tests

test('find_compound_end handles adjacent sibling combinator', () => {
	const selector = '.foo + .bar';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(4); // Stops at space before +
});

test('find_compound_end handles general sibling combinator', () => {
	const selector = '.foo ~ .bar';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(4); // Stops at space before ~
});

test('find_compound_end handles attribute selector', () => {
	const selector = '.foo[type="button"]';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(19); // Includes the attribute selector
});

test('find_compound_end handles attribute selector with class after', () => {
	const selector = '.foo[data-x].bar';
	const end = find_compound_end(selector, 0);
	expect(end).toBe(16); // Includes both attribute and subsequent class
});

test('modify_single_selector handles adjacent sibling combinator', () => {
	const result = modify_single_selector('.foo + .bar', 'foo', 'hover\\:foo', ':hover', '');
	expect(result).toBe('.hover\\:foo:hover + .bar');
});

test('modify_single_selector handles general sibling combinator', () => {
	const result = modify_single_selector('.foo ~ .bar', 'foo', 'hover\\:foo', ':hover', '');
	expect(result).toBe('.hover\\:foo:hover ~ .bar');
});

test('modify_single_selector handles attribute selector in compound', () => {
	const result = modify_single_selector('.btn[disabled]', 'btn', 'hover\\:btn', ':hover', '');
	expect(result).toBe('.hover\\:btn[disabled]:hover');
});

test('modify_single_selector handles deeply nested functional pseudo-class', () => {
	const result = modify_single_selector(
		'.foo:not(:is(.a, .b))',
		'foo',
		'hover\\:foo',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:foo:not(:is(.a, .b)):hover');
});

test('modify_single_selector handles :where() pseudo-class', () => {
	const result = modify_single_selector('.foo:where(.a, .b)', 'foo', 'hover\\:foo', ':hover', '');
	expect(result).toBe('.hover\\:foo:where(.a, .b):hover');
});

test('modify_single_selector handles :has() pseudo-class', () => {
	const result = modify_single_selector(
		'.parent:has(.child)',
		'parent',
		'hover\\:parent',
		':hover',
		'',
	);
	expect(result).toBe('.hover\\:parent:has(.child):hover');
});

// Pseudo-element conflict tests

test('generate_modified_ruleset skips rules with pseudo-element when adding pseudo-element modifier', () => {
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

	// First rule gets ::before added
	expect(result.css).toContain('.before\\:chevron::before');
	expect(result.css).toContain('position: relative');
	// Second rule is included but without extra ::before (just class renamed)
	expect(result.css).toContain('border: 4px solid');
	// Should NOT have ::before::before (invalid)
	expect(result.css).not.toContain('::before::before');
	// Should have skipped modifier info
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers!.length).toBe(1);
	expect(result.skipped_modifiers![0]!.reason).toBe('pseudo_element_conflict');
});

test('generate_modified_ruleset skips ::after rules when adding ::before modifier', () => {
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
	// ::after rule is included but without ::before modifier (just class renamed)
	expect(result.css).toContain('.before\\:icon::after');
	expect(result.css).toContain("content: '→'");
	// Should NOT have ::before on the ::after rule
	expect(result.css).not.toContain('::after::before');
	expect(result.css).not.toContain('::before::after');
	// Should have skipped modifier info
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers!.length).toBe(1);
});

test('generate_modified_ruleset keeps all rules when adding state modifier (no pseudo-element conflict)', () => {
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

	// Both rules should be present
	expect(result.css).toContain('.hover\\:chevron:hover');
	expect(result.css).toContain('.hover\\:chevron:hover::before');
	expect(result.css).toContain('position: relative');
	expect(result.css).toContain("content: ''");
	// No skipped modifiers
	expect(result.skipped_modifiers).toBeNull();
});

// Per-selector conflict detection in generate_modified_ruleset

test('generate_modified_ruleset handles selector list with partial state conflict', () => {
	// Rule has selector list where only some selectors have the state
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

	// .plain:hover already has :hover - should NOT add another
	// .plain:active does NOT have :hover - SHOULD add :hover
	expect(result.css).toContain('.hover\\:plain:hover');
	expect(result.css).toContain('.hover\\:plain:active:hover');
	// Verify it's NOT :hover:hover on the first selector
	expect(result.css).not.toContain(':hover:hover');
	// Should report one skipped modifier for the specific selector
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers!.length).toBe(1);
	expect(result.skipped_modifiers![0]!.selector).toBe('.plain:hover');
});

test('generate_modified_ruleset applies non-conflicting states with multiple states', () => {
	// Adding :hover:focus to a selector that already has :hover
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

	// Should skip :hover (already present) but still add :focus
	expect(result.css).toContain('.hover\\:focus\\:selectable:hover:focus');
	// Should NOT have :hover:hover
	expect(result.css).not.toContain(':hover:hover');
	// Should report :hover was skipped
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers!.length).toBe(1);
	expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
});

test('generate_modified_ruleset handles complex selector list with mixed conflicts', () => {
	// Multiple selectors: one with :hover, one with :focus, one with neither
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

	// .btn:hover - skip :hover, add :focus → .hover\:focus\:btn:hover:focus
	// .btn:focus - add :hover, skip :focus → .hover\:focus\:btn:focus:hover
	// .btn:active - add both → .hover\:focus\:btn:active:hover:focus
	expect(result.css).toContain('.hover\\:focus\\:btn:hover:focus');
	expect(result.css).toContain('.hover\\:focus\\:btn:focus:hover');
	expect(result.css).toContain('.hover\\:focus\\:btn:active:hover:focus');
	// Should have 2 skip reports (one :hover, one :focus)
	expect(result.skipped_modifiers).not.toBeNull();
	expect(result.skipped_modifiers!.length).toBe(2);
});
