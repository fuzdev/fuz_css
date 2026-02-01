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

		test('extracts multiple variables from single property', async () => {
			const css = `div { box-shadow: var(--shadow_x) var(--shadow_y) var(--shadow_blur) var(--shadow_color); }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.size).toBe(4);
			expect(index.rules[0]?.variables_used.has('shadow_x')).toBe(true);
			expect(index.rules[0]?.variables_used.has('shadow_y')).toBe(true);
			expect(index.rules[0]?.variables_used.has('shadow_blur')).toBe(true);
			expect(index.rules[0]?.variables_used.has('shadow_color')).toBe(true);
		});

		test('extracts variables from pseudo-class rules', async () => {
			const css = `
				button:hover { background: var(--hover_bg); }
				button:focus { outline-color: var(--focus_color); }
			`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('hover_bg')).toBe(true);
			expect(index.rules[1]?.variables_used.has('focus_color')).toBe(true);
		});

		test('extracts variables from @media rules', async () => {
			const css = `
				@media (min-width: 768px) {
					button { padding: var(--p_lg); margin: var(--m_lg); }
				}
			`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('p_lg')).toBe(true);
			expect(index.rules[0]?.variables_used.has('m_lg')).toBe(true);
		});

		test('extracts variables with fallbacks', async () => {
			const css = `button { color: var(--primary, blue); background: var(--bg, white); }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('primary')).toBe(true);
			expect(index.rules[0]?.variables_used.has('bg')).toBe(true);
		});

		test('extracts nested variable fallbacks', async () => {
			const css = `div { color: var(--a, var(--b, var(--c))); }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('a')).toBe(true);
			expect(index.rules[0]?.variables_used.has('b')).toBe(true);
			expect(index.rules[0]?.variables_used.has('c')).toBe(true);
		});

		test('extracts variables in calc()', async () => {
			const css = `div { width: calc(100% - var(--sidebar_width) - var(--gap)); }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('sidebar_width')).toBe(true);
			expect(index.rules[0]?.variables_used.has('gap')).toBe(true);
		});

		test('deduplicates repeated variables', async () => {
			const css = `
				div {
					border: var(--border_width) solid var(--border_color);
					outline: var(--border_width) solid var(--border_color);
				}
			`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.size).toBe(2);
			expect(index.rules[0]?.variables_used.has('border_width')).toBe(true);
			expect(index.rules[0]?.variables_used.has('border_color')).toBe(true);
		});

		test('returns empty set for rule without variables', async () => {
			const css = `button { color: red; background: blue; }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.size).toBe(0);
		});

		test('extracts variables from multiple rules', async () => {
			const css = `
				button { color: var(--btn_text); }
				input { border-color: var(--input_border); }
				a { color: var(--link_color); }
			`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('btn_text')).toBe(true);
			expect(index.rules[1]?.variables_used.has('input_border')).toBe(true);
			expect(index.rules[2]?.variables_used.has('link_color')).toBe(true);
		});

		test('handles hyphens and underscores in variable names', async () => {
			const css = `div { color: var(--my-color); background: var(--my_bg_color); }`;

			const index = await create_style_rule_index(css);

			expect(index.rules[0]?.variables_used.has('my-color')).toBe(true);
			expect(index.rules[0]?.variables_used.has('my_bg_color')).toBe(true);
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
