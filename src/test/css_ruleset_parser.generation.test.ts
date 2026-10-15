import { test, assert, describe } from 'vitest';

import { modify_ruleset } from '#lib/css_ruleset_parser.ts';
import { assert_css_contains, assert_css_not_contains } from './test_helpers.ts';

// renders `modify_ruleset`'s rules as CSS, taking the states as one string
// (`:hover:focus`) for brevity
const modify = (
	ruleset: string,
	original_class: string,
	new_class_escaped: string,
	state_css: string,
	pseudo_element_css: string
): { css: string; skipped_modifiers: ReturnType<typeof modify_ruleset>['skipped_modifiers'] } => {
	const states = state_css.match(/:[a-z-]+/g) ?? [];
	const result = modify_ruleset(
		ruleset,
		original_class,
		new_class_escaped,
		states,
		pseudo_element_css
	);
	return {
		css: result.rules.map((r) => `${r.selector} { ${r.declarations} }\n`).join(''),
		skipped_modifiers: result.skipped_modifiers
	};
};

/**
 * Tests for `modify_ruleset`, which rewrites a ruleset's selectors for a
 * modified class (`hover:`, `before:`, ...), skipping modifiers a selector
 * already carries. Media and color-scheme wrappers are the generator's, tested
 * with `generate_classes_css`.
 */
describe('modify_ruleset', () => {
	test('handles simple ruleset with hover', () => {
		const result = modify('.chip { font-weight: 500; }', 'chip', 'hover\\:chip', ':hover', '');

		assert_css_contains(result.css, '.hover\\:chip:hover', 'font-weight: 500;');
	});

	test('handles multi-rule ruleset', () => {
		const ruleset = `
			.selectable { cursor: pointer; }
			.selectable:hover { background: blue; }
		`;
		const result = modify(ruleset, 'selectable', 'md\\:selectable', '', '');

		assert_css_contains(result.css, '.md\\:selectable', '.md\\:selectable:hover');
	});

	test('applies state to multi-rule ruleset', () => {
		const ruleset = `
			.selectable { cursor: pointer; }
			.selectable:hover { background: blue; }
			.selectable.selected { border: solid; }
		`;
		const result = modify(ruleset, 'selectable', 'focus\\:selectable', ':focus', '');

		assert_css_contains(
			result.css,
			'.focus\\:selectable:focus',
			'.focus\\:selectable:hover:focus',
			'.focus\\:selectable.selected:focus'
		);
	});

	test('handles descendant selectors', () => {
		const ruleset = `
			.menuitem { display: flex; }
			.menuitem .content { flex: 1; }
			.menuitem .icon { width: 24px; }
		`;
		const result = modify(ruleset, 'menuitem', 'hover\\:menuitem', ':hover', '');

		assert_css_contains(
			result.css,
			'.hover\\:menuitem:hover',
			'.hover\\:menuitem:hover .content',
			'.hover\\:menuitem:hover .icon'
		);
	});

	test('handles pseudo-element composite', () => {
		const ruleset = `
			.chevron { position: relative; }
			.chevron::before { content: ''; }
		`;
		const result = modify(ruleset, 'chevron', 'hover\\:chevron', ':hover', '');

		assert_css_contains(result.css, '.hover\\:chevron:hover', '.hover\\:chevron:hover::before');
	});

	test('handles element.class selector', () => {
		const ruleset = `
			.chip { padding: 4px; }
			a.chip { font-weight: 600; }
		`;
		const result = modify(ruleset, 'chip', 'hover\\:chip', ':hover', '');

		assert_css_contains(result.css, '.hover\\:chip:hover', 'a.hover\\:chip:hover');
	});

	describe('CSS2 single-colon pseudo-elements', () => {
		test('detects CSS2 :before as pseudo-element conflict', () => {
			const ruleset = `
				.chevron { position: relative; }
				.chevron:before { content: ''; }
			`;
			const result = modify(ruleset, 'chevron', 'before\\:chevron', '', '::before');

			assert_css_not_contains(result.css, ':before::before');
			assert_css_contains(result.css, '.before\\:chevron::before', '.before\\:chevron:before');
			assert.isNotNull(result.skipped_modifiers);
			assert.isTrue(result.skipped_modifiers.some((s) => s.reason === 'pseudo_element_conflict'));
		});

		test('detects CSS2 :after as pseudo-element conflict', () => {
			const ruleset = '.icon:after { content: "→"; }';
			const result = modify(ruleset, 'icon', 'after\\:icon', '', '::after');

			assert_css_not_contains(result.css, ':after::after');
			assert.isNotNull(result.skipped_modifiers);
		});

		test('detects CSS2 :first-letter as pseudo-element conflict', () => {
			const ruleset = '.text:first-letter { font-size: 2em; }';
			const result = modify(ruleset, 'text', 'first-letter\\:text', '', '::first-letter');

			assert_css_not_contains(result.css, ':first-letter::first-letter');
			assert.isNotNull(result.skipped_modifiers);
		});
	});

	describe('pseudo-element conflicts', () => {
		test('skips rules with pseudo-element when adding pseudo-element modifier', () => {
			const ruleset = `
				.chevron { position: relative; }
				.chevron::before { content: ''; border: 4px solid; }
			`;
			const result = modify(ruleset, 'chevron', 'before\\:chevron', '', '::before');

			assert_css_contains(
				result.css,
				'.before\\:chevron::before',
				'position: relative',
				'border: 4px solid'
			);
			assert_css_not_contains(result.css, '::before::before');
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 1);
			assert.strictEqual(result.skipped_modifiers[0]!.reason, 'pseudo_element_conflict');
		});

		test('skips ::after rules when adding ::before modifier', () => {
			const ruleset = `
				.icon { display: inline; }
				.icon::after { content: '→'; }
			`;
			const result = modify(ruleset, 'icon', 'before\\:icon', '', '::before');

			assert_css_contains(
				result.css,
				'.before\\:icon::before',
				'display: inline',
				'.before\\:icon::after',
				"content: '→'"
			);
			assert_css_not_contains(result.css, '::after::before', '::before::after');
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 1);
		});

		test('keeps all rules when adding state modifier (no pseudo-element conflict)', () => {
			const ruleset = `
				.chevron { position: relative; }
				.chevron::before { content: ''; }
			`;
			const result = modify(ruleset, 'chevron', 'hover\\:chevron', ':hover', '');

			assert_css_contains(
				result.css,
				'.hover\\:chevron:hover',
				'.hover\\:chevron:hover::before',
				'position: relative',
				"content: ''"
			);
			assert.isNull(result.skipped_modifiers);
		});
	});

	describe('per-selector conflict detection', () => {
		test('handles selector list with partial state conflict', () => {
			const result = modify(
				'.plain:hover, .plain:active { background: blue; }',
				'plain',
				'hover\\:plain',
				':hover',
				''
			);

			assert_css_contains(result.css, '.hover\\:plain:hover', '.hover\\:plain:active:hover');
			assert_css_not_contains(result.css, ':hover:hover');
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 1);
			assert.strictEqual(result.skipped_modifiers[0]!.selector, '.plain:hover');
		});

		test('applies non-conflicting states with multiple states', () => {
			const result = modify(
				'.selectable:hover { background: blue; }',
				'selectable',
				'hover\\:focus\\:selectable',
				':hover:focus',
				''
			);

			assert_css_contains(result.css, '.hover\\:focus\\:selectable:hover:focus');
			assert_css_not_contains(result.css, ':hover:hover');
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 1);
			assert.strictEqual(result.skipped_modifiers[0]!.conflicting_modifier, ':hover');
		});

		test('handles complex selector list with mixed conflicts', () => {
			const result = modify(
				'.btn:hover, .btn:focus, .btn:active { outline: none; }',
				'btn',
				'hover\\:focus\\:btn',
				':hover:focus',
				''
			);

			assert_css_contains(
				result.css,
				'.hover\\:focus\\:btn:hover:focus',
				'.hover\\:focus\\:btn:focus:hover',
				'.hover\\:focus\\:btn:active:hover:focus'
			);
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 2);
		});
	});

	describe('state parsing edge cases', () => {
		test('handles empty state_css', () => {
			const result = modify('.box { display: flex; }', 'box', 'md\\:box', '', '');

			assert_css_contains(result.css, '.md\\:box');
			assert.isNull(result.skipped_modifiers);
		});

		test('handles hyphenated pseudo-class names', () => {
			const result = modify(
				'.box { display: flex; }',
				'box',
				'focus-visible\\:box',
				':focus-visible',
				''
			);

			assert_css_contains(result.css, '.focus-visible\\:box:focus-visible');
		});

		test('handles three states combined', () => {
			const result = modify(
				'.box { display: flex; }',
				'box',
				'hover\\:focus\\:active\\:box',
				':hover:focus:active',
				''
			);

			assert_css_contains(result.css, '.hover\\:focus\\:active\\:box:hover:focus:active');
		});

		test('handles empty ruleset', () => {
			const result = modify('', 'box', 'hover\\:box', ':hover', '');

			assert.strictEqual(result.css, '');
			assert.isNull(result.skipped_modifiers);
		});

		test('handles whitespace-only ruleset', () => {
			const result = modify('   \n\t   ', 'box', 'hover\\:box', ':hover', '');

			assert.strictEqual(result.css, '');
			assert.isNull(result.skipped_modifiers);
		});
	});
});
