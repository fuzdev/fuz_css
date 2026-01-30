import {test, expect, describe} from 'vitest';

import {
	parse_style_css,
	get_matching_rules,
	generate_base_css,
	collect_rule_variables,
	load_style_rule_index,
	STYLE_RULE_PARSER_VERSION,
} from '../lib/style_rule_parser.js';
import {default_fs_operations} from '../lib/operations_defaults.js';

// Alias for brevity in tests
const ops = default_fs_operations;

describe('parse_style_css', () => {
	describe('basic parsing', () => {
		test('parses basic rule', () => {
			const css = `button { color: red; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.has('button')).toBe(true);
			expect(index.rules[0]!.classes.size).toBe(0);
			expect(index.rules[0]!.is_core).toBe(false);
		});

		test('parses rule with class', () => {
			const css = `button.selected { color: blue; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.has('button')).toBe(true);
			expect(index.rules[0]!.classes.has('selected')).toBe(true);
		});

		test('parses multiple selectors', () => {
			const css = `h1, h2, h3 { font-weight: bold; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.has('h1')).toBe(true);
			expect(index.rules[0]!.elements.has('h2')).toBe(true);
			expect(index.rules[0]!.elements.has('h3')).toBe(true);
		});

		test('stores version and hash', () => {
			const css = `button { color: red; }`;
			const index = parse_style_css(css, 'my-hash');

			expect(index.version).toBe(STYLE_RULE_PARSER_VERSION);
			expect(index.content_hash).toBe('my-hash');
		});
	});

	describe('core rules', () => {
		test('universal selector is core', () => {
			const css = `*, ::before, ::after { box-sizing: border-box; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe('universal');
		});

		test(':root is core', () => {
			const css = `:root { --color: blue; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe('root');
		});

		test('body is core', () => {
			const css = `body { font-size: 16px; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe('body');
		});

		test('@media prefers-reduced-motion is core', () => {
			const css = `@media (prefers-reduced-motion) { :root { --duration: 0; } }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe('media_query');
		});

		test('@media not prefers-reduced-motion is not core', () => {
			const css = `@media (min-width: 768px) { button { font-size: 18px; } }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.is_core).toBe(false);
			expect(index.rules[0]!.elements.has('button')).toBe(true);
		});
	});

	describe('functional pseudo-classes', () => {
		test(':where selector', () => {
			const css = `:where(button:not(.unstyled)) { color: var(--text_color); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.has('button')).toBe(true);
			expect(index.rules[0]!.classes.has('unstyled')).toBe(true);
			expect(index.rules[0]!.variables_used.has('text_color')).toBe(true);
		});

		test('complex :is selector', () => {
			const css = `:where(:is(input, textarea, select):not(.unstyled)) { display: block; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
			expect(index.rules[0]!.elements.has('textarea')).toBe(true);
			expect(index.rules[0]!.elements.has('select')).toBe(true);
			expect(index.rules[0]!.classes.has('unstyled')).toBe(true);
		});

		test('nested :is in :where', () => {
			const css = `:where(:is(h1, h2, h3, h4, h5, h6, .heading):not(.unstyled)) { font-family: serif; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('h1')).toBe(true);
			expect(index.rules[0]!.elements.has('h6')).toBe(true);
			expect(index.rules[0]!.classes.has('heading')).toBe(true);
			expect(index.rules[0]!.classes.has('unstyled')).toBe(true);
		});

		test('deeply nested :where(:not(:has(...)))', () => {
			const css = `:where(:not(:has(button.disabled))) { opacity: 1; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('button')).toBe(true);
			expect(index.rules[0]!.classes.has('disabled')).toBe(true);
		});

		test('triple nested functional pseudo-classes', () => {
			const css = `:where(:is(:not(.hidden):has(span.icon))) { display: flex; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('span')).toBe(true);
			expect(index.rules[0]!.classes.has('hidden')).toBe(true);
			expect(index.rules[0]!.classes.has('icon')).toBe(true);
		});
	});

	describe('combinators', () => {
		test('child combinator', () => {
			const css = `ul > li { list-style: none; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('ul')).toBe(true);
			expect(index.rules[0]!.elements.has('li')).toBe(true);
		});

		test('sibling combinators', () => {
			const css = `h1 + p, h2 ~ p { margin-top: 0; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('h1')).toBe(true);
			expect(index.rules[0]!.elements.has('h2')).toBe(true);
			expect(index.rules[0]!.elements.has('p')).toBe(true);
		});
	});

	describe('pseudo-elements and pseudo-classes', () => {
		test('does not extract pseudo-elements as elements', () => {
			const css = `::selection { background: blue; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.size).toBe(0);
		});

		test('does not extract ::before as element', () => {
			const css = `div::before { content: ''; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('div')).toBe(true);
			expect(index.rules[0]!.elements.has('before')).toBe(false);
			expect(index.rules[0]!.elements.has(':before')).toBe(false);
		});

		test('does not extract ::after as element', () => {
			const css = `span::after { content: ''; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('span')).toBe(true);
			expect(index.rules[0]!.elements.has('after')).toBe(false);
		});

		test('does not extract :hover as element', () => {
			const css = `a:hover { color: red; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('a')).toBe(true);
			expect(index.rules[0]!.elements.has('hover')).toBe(false);
		});
	});

	describe('attribute selectors', () => {
		test('extracts element from attribute selector', () => {
			const css = `input[type='checkbox'] { width: 20px; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
		});

		test('attribute selector with quotes', () => {
			const css = `a[href^="https://"] { color: green; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('a')).toBe(true);
		});

		test('attribute selector without value', () => {
			const css = `input[required] { border-color: red; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
		});

		test('attribute selector with class does not extract class from attribute', () => {
			// [class~="foo"] targets elements with class "foo", but it's a style rule
			// about existing classes, not a class the rule "uses" via .classname
			const css = `[class~="unstyled"] { all: unset; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.classes.has('unstyled')).toBe(false);
			expect(index.rules[0]!.elements.size).toBe(0);
		});

		test('class selector alongside attribute selector', () => {
			const css = `input.error[type='text'] { border: 2px solid red; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
			expect(index.rules[0]!.classes.has('error')).toBe(true);
		});

		test('multiple attribute selectors', () => {
			const css = `input[type='text'][required] { background: pink; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
		});

		test('attribute selector in :where()', () => {
			const css = `:where(input[type='number'], input[type='text']) { font-family: monospace; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
		});

		test('attribute selector inside :not()', () => {
			const css = `input:not([disabled]) { cursor: pointer; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.has('input')).toBe(true);
		});

		test('data attribute selectors', () => {
			const css = `[data-theme='dark'] { background: black; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.size).toBe(0);
			expect(index.rules[0]!.classes.size).toBe(0);
		});

		test('comma in attribute selector value is handled', () => {
			const css = `input[placeholder='a, b, c'] { color: gray; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.has('input')).toBe(true);
		});
	});

	describe('at-rules', () => {
		test('@supports rule', () => {
			const css = `@supports (display: grid) { .grid { display: grid; } }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.classes.has('grid')).toBe(true);
			expect(index.rules[0]!.is_core).toBe(false);
		});

		test('@container rule', () => {
			const css = `@container (min-width: 400px) { .card { padding: var(--space_lg); } }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.classes.has('card')).toBe(true);
			expect(index.rules[0]!.variables_used.has('space_lg')).toBe(true);
		});

		test('@layer rule', () => {
			const css = `@layer base { button { color: blue; } }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.has('button')).toBe(true);
		});

		test('@keyframes rule', () => {
			const css = `@keyframes fade-in {
				from { opacity: 0; }
				to { opacity: 1; }
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.elements.size).toBe(0);
			expect(index.rules[0]!.classes.size).toBe(0);
			expect(index.rules[0]!.is_core).toBe(false);
		});

		test('@keyframes with variables', () => {
			const css = `@keyframes pulse {
				0% { transform: scale(var(--scale_min)); }
				100% { transform: scale(var(--scale_max)); }
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('scale_min')).toBe(true);
			expect(index.rules[0]!.variables_used.has('scale_max')).toBe(true);
		});

		test('@supports containing nested rules', () => {
			const css = `@supports (display: flex) {
				.flex { display: flex; }
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.classes.has('flex')).toBe(true);
		});
	});

	describe('@font-face', () => {
		test('is core rule', () => {
			const css = `@font-face {
				font-family: 'CustomFont';
				src: url('/fonts/custom.woff2') format('woff2');
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(1);
			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe('font_face');
		});

		test('does not target elements or classes', () => {
			const css = `@font-face {
				font-family: 'CustomFont';
				src: url('/fonts/custom.woff2') format('woff2');
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.size).toBe(0);
			expect(index.rules[0]!.classes.size).toBe(0);
		});

		test('extracts variables', () => {
			const css = `@font-face {
				font-family: var(--font_family_name);
				src: url(var(--font_path));
				font-display: var(--font_display);
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('font_family_name')).toBe(true);
			expect(index.rules[0]!.variables_used.has('font_path')).toBe(true);
			expect(index.rules[0]!.variables_used.has('font_display')).toBe(true);
		});

		test('multiple @font-face rules', () => {
			const css = `
				@font-face {
					font-family: 'Font1';
					src: url('/fonts/font1.woff2');
				}
				@font-face {
					font-family: 'Font2';
					src: url('/fonts/font2.woff2');
					font-weight: bold;
				}
			`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules.length).toBe(2);
			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe('font_face');
			expect(index.rules[1]!.is_core).toBe(true);
			expect(index.rules[1]!.core_reason).toBe('font_face');
		});
	});

	describe('variable extraction', () => {
		test('extracts multiple variables in one rule', () => {
			const css = `button {
				color: var(--text_color);
				background: var(--bg_color);
				border: var(--border_width) solid var(--border_color);
			}`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('text_color')).toBe(true);
			expect(index.rules[0]!.variables_used.has('bg_color')).toBe(true);
			expect(index.rules[0]!.variables_used.has('border_width')).toBe(true);
			expect(index.rules[0]!.variables_used.has('border_color')).toBe(true);
		});

		test('extracts from border shorthand', () => {
			const css = `button { border: var(--border_width) solid var(--border_color); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('border_width')).toBe(true);
			expect(index.rules[0]!.variables_used.has('border_color')).toBe(true);
		});

		test('extracts from margin shorthand', () => {
			const css = `div { margin: var(--space_sm) var(--space_md); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('space_sm')).toBe(true);
			expect(index.rules[0]!.variables_used.has('space_md')).toBe(true);
		});

		test('extracts from padding shorthand', () => {
			const css = `section { padding: var(--space_xs) var(--space_sm) var(--space_md) var(--space_lg); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('space_xs')).toBe(true);
			expect(index.rules[0]!.variables_used.has('space_sm')).toBe(true);
			expect(index.rules[0]!.variables_used.has('space_md')).toBe(true);
			expect(index.rules[0]!.variables_used.has('space_lg')).toBe(true);
		});

		test('extracts from box-shadow shorthand', () => {
			const css = `div { box-shadow: var(--shadow_x) var(--shadow_y) var(--shadow_blur) var(--shadow_color); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('shadow_x')).toBe(true);
			expect(index.rules[0]!.variables_used.has('shadow_y')).toBe(true);
			expect(index.rules[0]!.variables_used.has('shadow_blur')).toBe(true);
			expect(index.rules[0]!.variables_used.has('shadow_color')).toBe(true);
		});

		test('extracts from font shorthand', () => {
			const css = `p { font: var(--font_weight) var(--font_size)/var(--line_height) var(--font_family); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('font_weight')).toBe(true);
			expect(index.rules[0]!.variables_used.has('font_size')).toBe(true);
			expect(index.rules[0]!.variables_used.has('line_height')).toBe(true);
			expect(index.rules[0]!.variables_used.has('font_family')).toBe(true);
		});

		test('extracts from background shorthand', () => {
			const css = `header { background: var(--bg_color) url(image.png) var(--bg_position) / var(--bg_size); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('bg_color')).toBe(true);
			expect(index.rules[0]!.variables_used.has('bg_position')).toBe(true);
			expect(index.rules[0]!.variables_used.has('bg_size')).toBe(true);
		});

		test('extracts from transition shorthand', () => {
			const css = `a { transition: color var(--duration) var(--easing); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('duration')).toBe(true);
			expect(index.rules[0]!.variables_used.has('easing')).toBe(true);
		});

		test('extracts nested calc variables', () => {
			const css = `div { width: calc(var(--base_width) + var(--extra_width) * 2); }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.variables_used.has('base_width')).toBe(true);
			expect(index.rules[0]!.variables_used.has('extra_width')).toBe(true);
		});
	});

	describe('indexing', () => {
		test('indexes rules by element and class', () => {
			const css = `
				button { color: red; }
				input { color: blue; }
				button.selected { background: green; }
			`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.by_element.get('button')).toEqual([0, 2]);
			expect(index.by_element.get('input')).toEqual([1]);
			expect(index.by_class.get('selected')).toEqual([2]);
		});
	});
});

describe('get_matching_rules', () => {
	test('includes core rules', () => {
		const css = `
			*, ::before { box-sizing: border-box; }
			button { color: red; }
		`;
		const index = parse_style_css(css, 'test-hash');

		const included = get_matching_rules(index, new Set(), new Set());
		expect(included.has(0)).toBe(true);
		expect(included.has(1)).toBe(false);
	});

	test('matches elements', () => {
		const css = `
			button { color: red; }
			input { color: blue; }
		`;
		const index = parse_style_css(css, 'test-hash');

		const included = get_matching_rules(index, new Set(['button']), new Set());
		expect(included.has(0)).toBe(true);
		expect(included.has(1)).toBe(false);
	});

	test('matches classes', () => {
		const css = `
			.foo { color: red; }
			.bar { color: blue; }
		`;
		const index = parse_style_css(css, 'test-hash');

		const included = get_matching_rules(index, new Set(), new Set(['foo']));
		expect(included.has(0)).toBe(true);
		expect(included.has(1)).toBe(false);
	});

	test('includes @font-face when no elements detected', () => {
		const css = `
			@font-face {
				font-family: 'CustomFont';
				src: url('/fonts/custom.woff2');
			}
			button { color: red; }
		`;
		const index = parse_style_css(css, 'test-hash');

		const included = get_matching_rules(index, new Set(), new Set());

		expect(included.has(0)).toBe(true);
		expect(included.has(1)).toBe(false);
	});
});

describe('generate_base_css', () => {
	test('preserves order', () => {
		const css = `
a { color: red; }
b { color: blue; }
c { color: green; }
`;
		const index = parse_style_css(css, 'test-hash');

		const result = generate_base_css(index, new Set([2, 0]));

		expect(result.indexOf('red')).toBeLessThan(result.indexOf('green'));
	});
});

describe('collect_rule_variables', () => {
	test('collects from included rules', () => {
		const css = `
			a { color: var(--color_a); }
			b { color: var(--color_b); background: var(--bg); }
		`;
		const index = parse_style_css(css, 'test-hash');

		const vars = collect_rule_variables(index, new Set([1]));
		expect(vars.has('color_a')).toBe(false);
		expect(vars.has('color_b')).toBe(true);
		expect(vars.has('bg')).toBe(true);
	});
});

describe('load_style_rule_index', () => {
	test('loads actual style.css', async () => {
		const index = await load_style_rule_index(ops);

		expect(index.rules.length).toBeGreaterThan(50);

		const core_rules = index.rules.filter((r) => r.is_core);
		expect(core_rules.length).toBeGreaterThan(0);

		expect(index.by_element.has('button')).toBe(true);
		expect(index.by_element.has('input')).toBe(true);
		expect(index.by_element.has('a')).toBe(true);

		expect(index.by_class.has('unstyled')).toBe(true);
	});
});
