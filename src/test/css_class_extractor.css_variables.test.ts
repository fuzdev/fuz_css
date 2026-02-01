import {test, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {
	assert_css_variables,
	assert_no_css_variables,
	svelte_script,
} from './css_class_extractor_test_helpers.js';

/**
 * Tests for CSS variable extraction from style attributes, directives, and blocks.
 *
 * The extractor should detect `var(--name)` references in:
 * - `style="..."` attributes (static text)
 * - `style:property="..."` directives (static text)
 * - `<style>...</style>` blocks
 *
 * These CSS variables are tracked for tree-shaking theme output.
 */

describe('CSS variable extraction from styles', () => {
	describe('style attribute', () => {
		const style_attr_cases = [
			{
				name: 'extracts single variable from style attribute',
				source: `<div style="color: var(--text_color)"></div>`,
				expected: ['text_color'],
			},
			{
				name: 'extracts multiple variables from style attribute',
				source: `<div style="color: var(--text); background: var(--bg)"></div>`,
				expected: ['text', 'bg'],
			},
			{
				name: 'extracts variable with fallback',
				source: `<div style="color: var(--primary, blue)"></div>`,
				expected: ['primary'],
			},
			{
				name: 'extracts nested variable fallbacks',
				source: `<div style="color: var(--a, var(--b, var(--c)))"></div>`,
				expected: ['a', 'b', 'c'],
			},
			{
				name: 'extracts variable in calc()',
				source: `<div style="width: calc(100% - var(--sidebar_width))"></div>`,
				expected: ['sidebar_width'],
			},
			{
				name: 'extracts variables from multiple properties',
				source: `<div style="padding: var(--p); margin: var(--m); border: 1px solid var(--border_color)"></div>`,
				expected: ['p', 'm', 'border_color'],
			},
			{
				name: 'handles underscores and hyphens in variable names',
				source: `<div style="color: var(--my-color); background: var(--my_bg_color)"></div>`,
				expected: ['my-color', 'my_bg_color'],
			},
			{
				name: 'deduplicates repeated variables',
				source: `<div style="color: var(--theme); background: var(--theme)"></div>`,
				expected: ['theme'],
			},
		];

		test.each(style_attr_cases)('$name', ({source, expected}) => {
			const result = extract_from_svelte(source);
			assert_css_variables(result, expected);
		});

		test('no variables in style attribute without var()', () => {
			const source = `<div style="color: red; background: blue"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('extracts variables from multiple elements', () => {
			const source = `
<div style="color: var(--a)"></div>
<span style="color: var(--b)"></span>
<p style="color: var(--c)"></p>
`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['a', 'b', 'c']);
		});
	});

	describe('style: directive', () => {
		const style_directive_cases = [
			{
				name: 'extracts variable from style:property directive',
				source: `<div style:color="var(--text_color)"></div>`,
				expected: ['text_color'],
			},
			{
				name: 'extracts variable from style:background directive',
				source: `<div style:background="var(--bg_color)"></div>`,
				expected: ['bg_color'],
			},
			{
				name: 'extracts multiple variables from multiple directives',
				source: `<div style:color="var(--fg)" style:background="var(--bg)"></div>`,
				expected: ['fg', 'bg'],
			},
			{
				name: 'extracts variable with fallback in directive',
				source: `<div style:color="var(--primary, red)"></div>`,
				expected: ['primary'],
			},
		];

		test.each(style_directive_cases)('$name', ({source, expected}) => {
			const result = extract_from_svelte(source);
			assert_css_variables(result, expected);
		});

		test('no variables from directive without var()', () => {
			const source = `<div style:color="red"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('combines variables from attribute and directive', () => {
			const source = `<div style="padding: var(--p)" style:color="var(--c)"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['p', 'c']);
		});
	});

	describe('<style> block', () => {
		const style_block_cases = [
			{
				name: 'extracts variable from style block',
				source: `<div></div><style>div { color: var(--text); }</style>`,
				expected: ['text'],
			},
			{
				name: 'extracts multiple variables from style block',
				source: `<div></div><style>div { color: var(--fg); background: var(--bg); }</style>`,
				expected: ['fg', 'bg'],
			},
			{
				name: 'extracts from multiple rules in style block',
				source: `<div></div><style>
div { color: var(--a); }
button { background: var(--b); }
.card { border-color: var(--c); }
</style>`,
				expected: ['a', 'b', 'c'],
			},
			{
				name: 'extracts from pseudo-classes in style block',
				source: `<div></div><style>button:hover { background: var(--hover_bg); }</style>`,
				expected: ['hover_bg'],
			},
			{
				name: 'extracts from media queries in style block',
				source: `<div></div><style>@media (min-width: 768px) { div { padding: var(--p_lg); } }</style>`,
				expected: ['p_lg'],
			},
			{
				name: 'extracts from keyframes in style block',
				source: `<div></div><style>@keyframes fade { from { opacity: var(--start); } to { opacity: var(--end); } }</style>`,
				expected: ['start', 'end'],
			},
			{
				name: 'handles calc() in style block',
				source: `<div></div><style>div { width: calc(100vw - var(--sidebar)); }</style>`,
				expected: ['sidebar'],
			},
		];

		test.each(style_block_cases)('$name', ({source, expected}) => {
			const result = extract_from_svelte(source);
			assert_css_variables(result, expected);
		});

		test('no variables from style block without var()', () => {
			const source = `<div></div><style>div { color: red; }</style>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('deduplicates variables used multiple times in style block', () => {
			const source = `<div></div><style>
div { color: var(--theme); }
button { color: var(--theme); }
</style>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['theme']);
		});
	});

	describe('combined sources', () => {
		test('collects variables from attribute, directive, and block', () => {
			const source = `
<div style="color: var(--attr_var)" style:background="var(--directive_var)"></div>
<style>button { border: var(--block_var); }</style>
`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['attr_var', 'directive_var', 'block_var']);
		});

		test('collects variables from script, template, and style', () => {
			const source = svelte_script(
				"const buttonClass = 'btn';",
				`<div class={buttonClass} style="padding: var(--p)"></div>
<style>.btn { color: var(--btn_color); }</style>`,
			);
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['p', 'btn_color']);
		});

		test('deduplicates across all sources', () => {
			const source = `
<div style="color: var(--shared)" style:background="var(--shared)"></div>
<style>div { border-color: var(--shared); }</style>
`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['shared']);
		});
	});

	describe('dynamic CSS variables in templates', () => {
		test('filters incomplete variable from style directive with expression', () => {
			const source = `<div style:border-width="var(--border_width_{width})"></div>`;
			const result = extract_from_svelte(source);
			// Should NOT include 'border_width_' (incomplete)
			assert_no_css_variables(result);
		});

		test('extracts complete variable before expression', () => {
			const source = `<div style:color="var(--color_a_5) var(--width_{n})"></div>`;
			const result = extract_from_svelte(source);
			// Should include 'color_a_5' (complete) but not 'width_' (incomplete)
			assert_css_variables(result, ['color_a_5']);
		});

		test('extracts variable ending with underscore when no expression follows', () => {
			// Edge case: variable actually named with trailing underscore (unusual but valid)
			const source = `<div style="color: var(--my_var_)"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['my_var_']);
		});

		test('filters multiple incomplete variables', () => {
			const source = `<div style:background="var(--color_{a}) var(--shade_{b})"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('handles nested expressions correctly', () => {
			const source = `<div style:color="var(--{theme}_color)"></div>`;
			const result = extract_from_svelte(source);
			// First text is just 'var(--' which has no complete variable
			assert_no_css_variables(result);
		});

		test('style attribute with dynamic variable', () => {
			const source = `<div style="border: var(--border_{type}) solid"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('extracts complete variable from style attribute before expression', () => {
			const source = `<div style="color: var(--text_color); width: var(--size_{n})"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['text_color']);
		});

		test('handles variable ending with number not filtered', () => {
			// Variables ending with a number (not underscore) should be extracted
			const source = `<div style:color="var(--color_a_5)"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['color_a_5']);
		});

		test('filters closely-hugging expression with no separator', () => {
			// var(--b{foo}) - no space/separator before expression = likely mistake
			const source = `<div style="color: var(--b{foo})"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('extracts variable when space before expression', () => {
			// var(--b {foo}) - space before expression = intentional variable name
			const source = `<div style="width: var(--b {n}px)"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['b']);
		});

		test('filters variable with hyphen separator before expression', () => {
			// var(--color-{shade}) - hyphen separator = dynamic construction
			const source = `<div style="color: var(--color-{shade})"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('filters incomplete variable inside calc()', () => {
			const source = `<div style="width: calc(var(--size_{n}) * 2)"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('filters variable with multiple expressions', () => {
			// var(--a_{x}_{y}) - multiple dynamic parts
			const source = `<div style="color: var(--color_{a}_{b})"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('extracts variable when tab before expression', () => {
			// Tab counts as whitespace = intentional separation
			const source = `<div style="width: var(--size\t{n}px)"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['size']);
		});

		test('extracts complete variable with dynamic fallback', () => {
			// Complete var with dynamic fallback - extract the complete one
			const source = `<div style="color: var(--theme_color, {fallback})"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['theme_color']);
		});
	});

	describe('edge cases', () => {
		test('handles empty style attribute', () => {
			const source = `<div style=""></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('handles empty style block', () => {
			const source = `<div></div><style></style>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('handles whitespace in var() call', () => {
			const source = `<div style="color: var( --spaced )"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['spaced']);
		});

		test('handles newlines in style attribute', () => {
			const source = `<div style="
				color: var(--a);
				background: var(--b);
			"></div>`;
			const result = extract_from_svelte(source);
			assert_css_variables(result, ['a', 'b']);
		});

		test('ignores malformed var() without name', () => {
			const source = `<div style="color: var(--)"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});

		test('ignores var() without -- prefix', () => {
			const source = `<div style="color: var(notavar)"></div>`;
			const result = extract_from_svelte(source);
			assert_no_css_variables(result);
		});
	});
});
