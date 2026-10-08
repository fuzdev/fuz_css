import { test, assert, describe } from 'vitest';

import {
	css_comment_is_contained,
	css_custom_property_name_is_contained,
	css_value_is_contained
} from '$lib/css_containment.ts';
import { default_variables } from '$lib/variables.ts';
import { render_theme_style } from '$lib/theme.ts';
import { parse_theme, type Theme } from '$lib/variable.ts';
import { validate_theme } from '$lib/theme_validate.ts';

const theme_modules: Record<string, Record<string, unknown>> = import.meta.glob(
	'../lib/themes/*.ts',
	{ eager: true }
);

describe('css_value_is_contained', () => {
	const contained = [
		'1',
		'var(--hue_a)',
		'calc(var(--neutral_chroma) * 2.6667)',
		"-apple-system, 'Segoe UI', sans-serif",
		'0 0 4px 1px',
		'linear-gradient(to bottom, oklch(0.2 0.05 30), oklch(0.1 0.02 280))',
		// a semicolon inside brackets belongs to the block
		'url(data:image/png;base64,AAAA)',
		'url( a.png )',
		'URL(a.png)',
		// a function whose name ends in url reads its quotes as strings
		`myurl("a)}b")`,
		// inside a string, anything but the style closer is inert
		`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><path d='M0 0'/></svg>")`,
		`"a; } b { /* ! */"`,
		String.raw`'it\'s'`,
		''
	];
	for (const value of contained) {
		test(`contained: ${value}`, () => {
			assert.isTrue(css_value_is_contained(value));
		});
	}

	const escaping: Array<[reason: string, value: string]> = [
		['a top-level semicolon', '1; --other: 2'],
		['a closing brace', '1 } body { display: none'],
		['an opening brace', 'a { b'],
		['important', 'red !important'],
		['a comment opener', '1 /* swallow'],
		['an unclosed string', '"unclosed'],
		['a newline in a string', '"line\nbreak"'],
		['an unclosed bracket', 'calc(1 + 2'],
		['a stray closing bracket', '1) ; x'],
		['mismatched brackets', 'calc(1]'],
		['a trailing escape', 'red\\'],
		['an escape outside a string', String.raw`\75 rl(a)`],
		// a quote in an unquoted url is no string: the malformed url ends at the
		// first `)` and the brace after it closes the rule
		['a quote in an unquoted url', 'url(a"x)}body{background:red}")'],
		['an apostrophe in an unquoted url', "url(a'x)}body{background:red}')"],
		['an escaped url name', String.raw`U\72 L(a'x)}body{background:red}')`],
		['a non-breaking space before a quote in a url', 'url(\u00A0"x)}body{color:red}")'],
		['whitespace inside an unquoted url', 'url(a b)'],
		['an unclosed url', 'url(a'],
		// a hash or at-keyword named url opens a plain bracket, not a url token
		['a hash named url with an unclosed bracket', '#url([)'],
		['an at-keyword named url holding a brace', '@url({)'],
		['the style closer', '1</style><script>alert(1)</script>'],
		['the style closer in a string', '"</STYLE >"']
	];
	for (const [reason, value] of escaping) {
		test(`not contained - ${reason}`, () => {
			assert.isFalse(css_value_is_contained(value));
		});
	}

	test('every default variable value is contained', () => {
		for (const v of default_variables) {
			for (const value of [v.light, v.dark]) {
				if (value !== undefined)
					assert.isTrue(css_value_is_contained(value), `${v.name}: ${value}`);
			}
			if (v.summary !== undefined) assert.isTrue(css_comment_is_contained(v.summary), v.name);
		}
	});

	test('every shipped theme parses, so its values are contained', () => {
		const themes = Object.values(theme_modules).flatMap((m) => Object.values(m));
		assert.isAbove(themes.length, 0);
		for (const theme of themes) {
			assert.isNotNull(parse_theme(theme), (theme as Theme).name);
		}
	});
});

describe('css_comment_is_contained', () => {
	test('plain text is contained', () => {
		assert.isTrue(css_comment_is_contained('the body font / stack'));
	});
	test('a comment closer or the style closer is not', () => {
		assert.isFalse(css_comment_is_contained('done */ body { display: none }'));
		assert.isFalse(css_comment_is_contained('</style>'));
	});
});

describe('css_custom_property_name_is_contained', () => {
	test('identifier characters are contained', () => {
		assert.isTrue(css_custom_property_name_is_contained('palette_a_50'));
		assert.isTrue(css_custom_property_name_is_contained('Mixed-Case_1'));
	});
	test('anything that could end the name is not', () => {
		for (const name of ['', 'a: 1; --b', 'a b', 'a}', 'a/**/']) {
			assert.isFalse(css_custom_property_name_is_contained(name), name);
		}
	});
});

describe('non-strings', () => {
	// each would coerce to text on its way into a stylesheet, some of it
	// contained by the look of it: `['a']` reads as `a`, `null` as `null`
	const non_strings: Array<unknown> = [undefined, null, true, 0, 1, [], ['a'], [['a']], {}];
	test('are never contained, and never throw', () => {
		for (const value of non_strings) {
			const label = JSON.stringify(value) ?? 'undefined';
			assert.isFalse(css_value_is_contained(value), label);
			assert.isFalse(css_comment_is_contained(value), label);
			assert.isFalse(css_custom_property_name_is_contained(value), label);
		}
	});
	test('an array holding a comment closer is not a contained comment', () => {
		assert.isFalse(css_comment_is_contained(['*/ body { display: none } /*']));
	});
});

describe('the theme boundary', () => {
	const hostile = {
		name: 'hostile',
		variables: [
			{ name: 'chroma_scale', light: '1; } </style><script>alert(1)</script>' },
			{ name: 'neutral_chroma', light: '0.02', summary: 'x */ body { display: none } /*' },
			{ name: 'radius_scale', light: '0.5' }
		]
	};

	test('the schema rejects an escaping value and an escaping summary', () => {
		assert.isNull(parse_theme(hostile));
		const issues = validate_theme(hostile);
		assert.isTrue(issues.some((i) => i.level === 'error' && i.variable === 'chroma_scale'));
		assert.isTrue(issues.some((i) => i.level === 'error' && i.variable === 'neutral_chroma'));
	});

	test('the renderer drops what escapes and keeps the rest, even unparsed', () => {
		const css = render_theme_style(hostile, { comments: true });
		assert.notInclude(css, 'script');
		assert.notInclude(css, 'display: none');
		assert.notInclude(css, '--chroma_scale');
		assert.include(css, '--neutral_chroma: 0.02;');
		assert.include(css, '--radius_scale: 0.5;');
	});

	test('the renderer drops a variable whose name escapes', () => {
		const css = render_theme_style({
			name: 't',
			variables: [{ name: 'a: 1; } body { color: red } :root { --b', light: '2' }]
		});
		assert.strictEqual(css, '');
	});
});
