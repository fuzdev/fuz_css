/**
 * Tests for create_style_rule_index function.
 *
 * Tests parsing custom CSS into a StyleRuleIndex for tree-shaking.
 *
 * @module
 */

import {test, expect, describe} from 'vitest';

import {
	create_style_rule_index,
	get_matching_rules,
	generate_base_css,
} from '../lib/style_rule_parser.js';

describe('create_style_rule_index', () => {
	describe('basic parsing', () => {
		test('parses simple rules', async () => {
			const css = `
				button { color: blue; }
				input { border: 1px solid; }
			`;

			const index = await create_style_rule_index(css);

			expect(index.rules.length).toBe(2);
			expect(index.by_element.has('button')).toBe(true);
			expect(index.by_element.has('input')).toBe(true);
		});

		test('indexes by element name', async () => {
			const css = `
				button { color: red; }
				button:hover { color: blue; }
			`;

			const index = await create_style_rule_index(css);

			const button_rules = index.by_element.get('button');
			expect(button_rules?.length).toBe(2);
		});

		test('indexes by class name', async () => {
			const css = `
				.active { color: green; }
				button.primary { color: blue; }
			`;

			const index = await create_style_rule_index(css);

			expect(index.by_class.has('active')).toBe(true);
			expect(index.by_class.has('primary')).toBe(true);
		});
	});

	describe('core rules', () => {
		test('marks * rules as core', async () => {
			const css = `* { box-sizing: border-box; }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.is_core).toBe(true);
			expect(index.rules[0]?.core_reason).toBe('universal');
		});

		test('marks :root rules as core', async () => {
			const css = `:root { font-size: 16px; }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.is_core).toBe(true);
			expect(index.rules[0]?.core_reason).toBe('root');
		});

		test('marks body rules as core', async () => {
			const css = `body { margin: 0; }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.is_core).toBe(true);
			expect(index.rules[0]?.core_reason).toBe('body');
		});
	});

	describe('variable extraction', () => {
		test('extracts CSS variables from rules', async () => {
			const css = `button { color: var(--btn_color); background: var(--btn_bg); }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('btn_color')).toBe(true);
			expect(index.rules[0]?.variables_used.has('btn_bg')).toBe(true);
		});
	});

	describe('tree-shaking integration', () => {
		test('get_matching_rules filters by elements', async () => {
			const css = `
				button { color: blue; }
				input { border: 1px solid; }
				a { text-decoration: none; }
			`;

			const index = await create_style_rule_index(css);
			const matched = get_matching_rules(index, new Set(['button']), new Set());

			expect(matched.size).toBe(1);
		});

		test('generate_base_css outputs only matched rules', async () => {
			const css = `
				button { color: blue; }
				input { border: 1px solid; }
			`;

			const index = await create_style_rule_index(css);
			const matched = get_matching_rules(index, new Set(['button']), new Set());
			const output = generate_base_css(index, matched);

			expect(output).toContain('button { color: blue; }');
			expect(output).not.toContain('input');
		});
	});

	describe('metadata', () => {
		test('generates content hash', async () => {
			const css1 = 'button { color: red; }';
			const css2 = 'button { color: blue; }';

			const index1 = await create_style_rule_index(css1);
			const index2 = await create_style_rule_index(css2);

			// Different content should produce different hashes
			expect(index1.content_hash).not.toBe(index2.content_hash);
		});

		test('includes version number', async () => {
			const index = await create_style_rule_index('button { color: red; }');
			expect(typeof index.version).toBe('number');
		});
	});

	describe('edge cases', () => {
		test('handles empty CSS', async () => {
			const index = await create_style_rule_index('');
			expect(index.rules.length).toBe(0);
		});

		test('handles CSS with comments', async () => {
			const css = `
				/* This is a comment */
				button { color: blue; }
			`;

			const index = await create_style_rule_index(css);
			expect(index.rules.length).toBe(1);
		});

		test('handles @media rules', async () => {
			const css = `
				button { font-size: 14px; }
				@media (min-width: 768px) { button { font-size: 16px; } }
			`;

			const index = await create_style_rule_index(css);

			// Both rules should be indexed under button
			expect(index.by_element.get('button')?.length).toBe(2);
		});
	});
});
