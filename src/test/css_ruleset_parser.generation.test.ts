import {test, assert, describe} from 'vitest';

import {generate_modified_ruleset} from '$lib/css_ruleset_parser.js';
import {assert_css_contains, assert_css_not_contains} from './test_helpers.js';

/**
 * Tests for generate_modified_ruleset which creates CSS with modified selectors
 * for handling modifiers like hover:, md:, dark:, before:, etc.
 */
describe('generate_modified_ruleset', () => {
	test('handles simple ruleset with hover', () => {
		const result = generate_modified_ruleset(
			'.chip { font-weight: 500; }',
			'chip',
			'hover\\:chip',
			':hover',
			'',
			null,
			null,
		);

		assert_css_contains(result.css, '.hover\\:chip:hover', 'font-weight: 500;');
	});

	test('handles media wrapper', () => {
		const result = generate_modified_ruleset(
			'.chip { font-weight: 500; }',
			'chip',
			'md\\:chip',
			'',
			'',
			'@media (width >= 48rem)',
			null,
		);

		assert_css_contains(result.css, '@media (width >= 48rem) {', '.md\\:chip', '}');
	});

	test('handles ancestor wrapper', () => {
		const result = generate_modified_ruleset(
			'.chip { font-weight: 500; }',
			'chip',
			'dark\\:chip',
			'',
			'',
			null,
			':root.dark',
		);

		assert_css_contains(result.css, ':root.dark {', '.dark\\:chip');
	});

	test('handles both media and ancestor', () => {
		const result = generate_modified_ruleset(
			'.chip { font-weight: 500; }',
			'chip',
			'md\\:dark\\:chip',
			'',
			'',
			'@media (width >= 48rem)',
			':root.dark',
		);

		assert_css_contains(
			result.css,
			'@media (width >= 48rem) {',
			':root.dark {',
			'.md\\:dark\\:chip',
		);
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

		assert_css_contains(
			result.css,
			'.md\\:selectable',
			'.md\\:selectable:hover',
			'@media (width >= 48rem) {',
		);
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

		assert_css_contains(
			result.css,
			'.focus\\:selectable:focus',
			'.focus\\:selectable:hover:focus',
			'.focus\\:selectable.selected:focus',
		);
	});

	test('handles descendant selectors', () => {
		const ruleset = `
			.menuitem { display: flex; }
			.menuitem .content { flex: 1; }
			.menuitem .icon { width: 24px; }
		`;
		const result = generate_modified_ruleset(
			ruleset,
			'menuitem',
			'hover\\:menuitem',
			':hover',
			'',
			null,
			null,
		);

		assert_css_contains(
			result.css,
			'.hover\\:menuitem:hover',
			'.hover\\:menuitem:hover .content',
			'.hover\\:menuitem:hover .icon',
		);
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

		assert_css_contains(result.css, '.hover\\:chevron:hover', '.hover\\:chevron:hover::before');
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

		assert_css_contains(result.css, '.hover\\:chip:hover', 'a.hover\\:chip:hover');
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

			assert_css_not_contains(result.css, ':before::before');
			assert_css_contains(result.css, '.before\\:chevron::before', '.before\\:chevron:before');
			assert.isNotNull(result.skipped_modifiers);
			assert.isTrue(result.skipped_modifiers.some((s) => s.reason === 'pseudo_element_conflict'));
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

			assert_css_not_contains(result.css, ':after::after');
			assert.isNotNull(result.skipped_modifiers);
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
			const result = generate_modified_ruleset(
				ruleset,
				'chevron',
				'before\\:chevron',
				'',
				'::before',
				null,
				null,
			);

			assert_css_contains(
				result.css,
				'.before\\:chevron::before',
				'position: relative',
				'border: 4px solid',
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
			const result = generate_modified_ruleset(
				ruleset,
				'icon',
				'before\\:icon',
				'',
				'::before',
				null,
				null,
			);

			assert_css_contains(
				result.css,
				'.before\\:icon::before',
				'display: inline',
				'.before\\:icon::after',
				"content: '→'",
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
			const result = generate_modified_ruleset(
				ruleset,
				'chevron',
				'hover\\:chevron',
				':hover',
				'',
				null,
				null,
			);

			assert_css_contains(
				result.css,
				'.hover\\:chevron:hover',
				'.hover\\:chevron:hover::before',
				'position: relative',
				"content: ''",
			);
			assert.isNull(result.skipped_modifiers);
		});
	});

	describe('per-selector conflict detection', () => {
		test('handles selector list with partial state conflict', () => {
			const result = generate_modified_ruleset(
				'.plain:hover, .plain:active { background: blue; }',
				'plain',
				'hover\\:plain',
				':hover',
				'',
				null,
				null,
			);

			assert_css_contains(result.css, '.hover\\:plain:hover', '.hover\\:plain:active:hover');
			assert_css_not_contains(result.css, ':hover:hover');
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 1);
			assert.strictEqual(result.skipped_modifiers[0]!.selector, '.plain:hover');
		});

		test('applies non-conflicting states with multiple states', () => {
			const result = generate_modified_ruleset(
				'.selectable:hover { background: blue; }',
				'selectable',
				'hover\\:focus\\:selectable',
				':hover:focus',
				'',
				null,
				null,
			);

			assert_css_contains(result.css, '.hover\\:focus\\:selectable:hover:focus');
			assert_css_not_contains(result.css, ':hover:hover');
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 1);
			assert.strictEqual(result.skipped_modifiers[0]!.conflicting_modifier, ':hover');
		});

		test('handles complex selector list with mixed conflicts', () => {
			const result = generate_modified_ruleset(
				'.btn:hover, .btn:focus, .btn:active { outline: none; }',
				'btn',
				'hover\\:focus\\:btn',
				':hover:focus',
				'',
				null,
				null,
			);

			assert_css_contains(
				result.css,
				'.hover\\:focus\\:btn:hover:focus',
				'.hover\\:focus\\:btn:focus:hover',
				'.hover\\:focus\\:btn:active:hover:focus',
			);
			assert.isNotNull(result.skipped_modifiers);
			assert.strictEqual(result.skipped_modifiers.length, 2);
		});
	});

	describe('state parsing edge cases', () => {
		test('handles empty state_css', () => {
			const result = generate_modified_ruleset(
				'.box { display: flex; }',
				'box',
				'md\\:box',
				'',
				'',
				null,
				null,
			);

			assert_css_contains(result.css, '.md\\:box');
			assert.isNull(result.skipped_modifiers);
		});

		test('handles hyphenated pseudo-class names', () => {
			const result = generate_modified_ruleset(
				'.box { display: flex; }',
				'box',
				'focus-visible\\:box',
				':focus-visible',
				'',
				null,
				null,
			);

			assert_css_contains(result.css, '.focus-visible\\:box:focus-visible');
		});

		test('handles three states combined', () => {
			const result = generate_modified_ruleset(
				'.box { display: flex; }',
				'box',
				'hover\\:focus\\:active\\:box',
				':hover:focus:active',
				'',
				null,
				null,
			);

			assert_css_contains(result.css, '.hover\\:focus\\:active\\:box:hover:focus:active');
		});

		test('handles empty ruleset', () => {
			const result = generate_modified_ruleset('', 'box', 'hover\\:box', ':hover', '', null, null);

			assert.strictEqual(result.css, '');
			assert.isNull(result.skipped_modifiers);
		});

		test('handles whitespace-only ruleset', () => {
			const result = generate_modified_ruleset(
				'   \n\t   ',
				'box',
				'hover\\:box',
				':hover',
				'',
				null,
				null,
			);

			assert.strictEqual(result.css, '');
			assert.isNull(result.skipped_modifiers);
		});
	});
});
