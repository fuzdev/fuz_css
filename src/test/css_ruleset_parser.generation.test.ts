import {test, expect, describe} from 'vitest';

import {generate_modified_ruleset} from '$lib/css_ruleset_parser.js';
import {expect_css_contains, expect_css_not_contains} from './test_helpers.js';

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

		expect_css_contains(result.css, '.hover\\:chip:hover', 'font-weight: 500;');
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

		expect_css_contains(result.css, '@media (width >= 48rem) {', '.md\\:chip', '}');
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

		expect_css_contains(result.css, ':root.dark {', '.dark\\:chip');
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

		expect_css_contains(
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

		expect_css_contains(
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

		expect_css_contains(
			result.css,
			'.focus\\:selectable:focus',
			'.focus\\:selectable:hover:focus',
			'.focus\\:selectable.selected:focus',
		);
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

		expect_css_contains(
			result.css,
			'.hover\\:menu_item:hover',
			'.hover\\:menu_item:hover .content',
			'.hover\\:menu_item:hover .icon',
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

		expect_css_contains(result.css, '.hover\\:chevron:hover', '.hover\\:chevron:hover::before');
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

		expect_css_contains(result.css, '.hover\\:chip:hover', 'a.hover\\:chip:hover');
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

			expect_css_not_contains(result.css, ':before::before');
			expect_css_contains(result.css, '.before\\:chevron::before', '.before\\:chevron:before');
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

			expect_css_not_contains(result.css, ':after::after');
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

			expect_css_not_contains(result.css, ':first-letter::first-letter');
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

			expect_css_contains(
				result.css,
				'.before\\:chevron::before',
				'position: relative',
				'border: 4px solid',
			);
			expect_css_not_contains(result.css, '::before::before');
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

			expect_css_contains(
				result.css,
				'.before\\:icon::before',
				'display: inline',
				'.before\\:icon::after',
				"content: '→'",
			);
			expect_css_not_contains(result.css, '::after::before', '::before::after');
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

			expect_css_contains(
				result.css,
				'.hover\\:chevron:hover',
				'.hover\\:chevron:hover::before',
				'position: relative',
				"content: ''",
			);
			expect(result.skipped_modifiers).toBeNull();
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

			expect_css_contains(result.css, '.hover\\:plain:hover', '.hover\\:plain:active:hover');
			expect_css_not_contains(result.css, ':hover:hover');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(1);
			expect(result.skipped_modifiers![0]!.selector).toBe('.plain:hover');
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

			expect_css_contains(result.css, '.hover\\:focus\\:selectable:hover:focus');
			expect_css_not_contains(result.css, ':hover:hover');
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(1);
			expect(result.skipped_modifiers![0]!.conflicting_modifier).toBe(':hover');
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

			expect_css_contains(
				result.css,
				'.hover\\:focus\\:btn:hover:focus',
				'.hover\\:focus\\:btn:focus:hover',
				'.hover\\:focus\\:btn:active:hover:focus',
			);
			expect(result.skipped_modifiers).not.toBeNull();
			expect(result.skipped_modifiers!.length).toBe(2);
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

			expect_css_contains(result.css, '.md\\:box');
			expect(result.skipped_modifiers).toBeNull();
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

			expect_css_contains(result.css, '.focus-visible\\:box:focus-visible');
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

			expect_css_contains(result.css, '.hover\\:focus\\:active\\:box:hover:focus:active');
		});

		test('handles empty ruleset', () => {
			const result = generate_modified_ruleset('', 'box', 'hover\\:box', ':hover', '', null, null);

			expect(result.css).toBe('');
			expect(result.skipped_modifiers).toBeNull();
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

			expect(result.css).toBe('');
			expect(result.skipped_modifiers).toBeNull();
		});
	});
});
