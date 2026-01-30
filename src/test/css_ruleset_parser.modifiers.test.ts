import {test, expect, describe} from 'vitest';

import {modify_single_selector, modify_selector_group} from '$lib/css_ruleset_parser.js';

/**
 * Tests for selector modification: modify_single_selector and modify_selector_group.
 */
describe('modify_single_selector', () => {
	// Table-driven test cases: [selector, className, newClassName, state, pseudo, expected, description]
	const cases: Array<
		[string, string, string, string, string, string, string]
	> = [
		// Basic state modifications
		['.menu_item', 'menu_item', 'hover\\:menu_item', ':hover', '', '.hover\\:menu_item:hover', 'simple selector'],
		['.menu_item .content', 'menu_item', 'hover\\:menu_item', ':hover', '', '.hover\\:menu_item:hover .content', 'descendant'],
		['.menu_item.selected', 'menu_item', 'hover\\:menu_item', ':hover', '', '.hover\\:menu_item.selected:hover', 'compound'],
		['.selectable:active', 'selectable', 'hover\\:selectable', ':hover', '', '.hover\\:selectable:active:hover', 'existing pseudo-class'],
		['.chevron::before', 'chevron', 'hover\\:chevron', ':hover', '', '.hover\\:chevron:hover::before', 'before pseudo-element'],

		// Pseudo-element only
		['.box', 'box', 'before\\:box', '', '::before', '.before\\:box::before', 'add pseudo-element'],

		// Element.class
		['a.chip', 'chip', 'hover\\:chip', ':hover', '', 'a.hover\\:chip:hover', 'element.class'],

		// Combinators
		['.parent > .child', 'parent', 'hover\\:parent', ':hover', '', '.hover\\:parent:hover > .child', 'child combinator'],
		['.foo + .bar', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:hover + .bar', 'adjacent sibling'],
		['.foo ~ .bar', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:hover ~ .bar', 'general sibling'],

		// No match cases
		['.other', 'menu_item', 'hover\\:menu_item', ':hover', '', '.other', 'no match'],
		['.boxed', 'box', 'hover\\:box', ':hover', '', '.boxed', 'prefix no match'],
		['.checkbox', 'box', 'hover\\:box', ':hover', '', '.checkbox', 'suffix no match'],

		// Complex functional pseudo-classes
		['.foo:not(:is(.a, .b))', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:not(:is(.a, .b)):hover', 'nested functional'],
		['.foo:where(.a, .b)', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:where(.a, .b):hover', ':where()'],
		['.parent:has(.child)', 'parent', 'hover\\:parent', ':hover', '', '.hover\\:parent:has(.child):hover', ':has()'],

		// With ID selectors
		['.foo#bar', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo#bar:hover', 'ID after class'],
		['.foo#bar:focus', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo#bar:focus:hover', 'ID + pseudo'],

		// Attribute selectors
		['.btn[disabled]', 'btn', 'hover\\:btn', ':hover', '', '.hover\\:btn[disabled]:hover', 'attribute'],

		// Class in descendant
		['.container .box', 'box', 'hover\\:box', ':hover', '', '.container .hover\\:box:hover', 'class in descendant'],

		// Both state and pseudo-element
		['.box', 'box', 'hover\\:before\\:box', ':hover', '::before', '.hover\\:before\\:box:hover::before', 'state + pseudo'],

		// Empty state/pseudo (just rename)
		['.box', 'box', 'md\\:box', '', '', '.md\\:box', 'rename only'],

		// Class with numbers/underscores
		['.p_md', 'p_md', 'hover\\:p_md', ':hover', '', '.hover\\:p_md:hover', 'numbers'],
		['.color_a_50', 'color_a_50', 'hover\\:color_a_50', ':hover', '', '.hover\\:color_a_50:hover', 'underscores and numbers'],

		// Multiple occurrences
		['.foo.foo', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo.foo:hover', 'duplicate class'],

		// ::part() and ::slotted() pseudo-elements
		['.component::part(button)', 'component', 'hover\\:component', ':hover', '', '.hover\\:component:hover::part(button)', '::part()'],
		['.host::slotted(.item)', 'host', 'focus\\:host', ':focus', '', '.focus\\:host:focus::slotted(.item)', '::slotted()'],

		// CSS2 single-colon pseudo-elements
		['.foo:before', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:hover:before', 'CSS2 :before'],
		['.foo:after', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:hover:after', 'CSS2 :after'],
		['.foo:first-letter', 'foo', 'hover\\:foo', ':hover', '', '.hover\\:foo:hover:first-letter', 'CSS2 :first-letter'],
	];

	test.each(cases)(
		'modifies "%s" (%s)',
		(selector, className, newClassName, state, pseudo, expected, _desc) => {
			expect(modify_single_selector(selector, className, newClassName, state, pseudo)).toBe(expected);
		},
	);
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
