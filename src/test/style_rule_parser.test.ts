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
		test.each([
			['*, ::before, ::after { box-sizing: border-box; }', 'universal'],
			[':root { --color: blue; }', 'root'],
			['body { font-size: 16px; }', 'body'],
			['@media (prefers-reduced-motion) { :root { --duration: 0; } }', 'media_query'],
		] as const)('%s is core (%s)', (css, reason) => {
			const index = parse_style_css(css, 'test-hash');
			expect(index.rules[0]!.is_core).toBe(true);
			expect(index.rules[0]!.core_reason).toBe(reason);
		});

		test('@media not prefers-reduced-motion is not core', () => {
			const css = `@media (min-width: 768px) { button { font-size: 18px; } }`;
			const index = parse_style_css(css, 'test-hash');

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

		test.each([
			["div::before { content: ''; }", 'div', 'before'],
			["span::after { content: ''; }", 'span', 'after'],
			['a:hover { color: red; }', 'a', 'hover'],
		] as const)('%s extracts element but not pseudo', (css, element, pseudo) => {
			const index = parse_style_css(css, 'test-hash');
			expect(index.rules[0]!.elements.has(element)).toBe(true);
			expect(index.rules[0]!.elements.has(pseudo)).toBe(false);
		});
	});

	describe('attribute selectors', () => {
		test.each([
			["input[type='checkbox'] { width: 20px; }", 'input'],
			['a[href^="https://"] { color: green; }', 'a'],
			['input[required] { border-color: red; }', 'input'],
			["input[type='text'][required] { background: pink; }", 'input'],
			[":where(input[type='number'], input[type='text']) { font-family: monospace; }", 'input'],
			['input:not([disabled]) { cursor: pointer; }', 'input'],
			["input[placeholder='a, b, c'] { color: gray; }", 'input'],
		])('%s extracts element', (css, element) => {
			const index = parse_style_css(css, 'test-hash');
			expect(index.rules[0]!.elements.has(element)).toBe(true);
		});

		test('attribute selector with class does not extract class from attribute', () => {
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

		test('data attribute selectors', () => {
			const css = `[data-theme='dark'] { background: black; }`;
			const index = parse_style_css(css, 'test-hash');

			expect(index.rules[0]!.elements.size).toBe(0);
			expect(index.rules[0]!.classes.size).toBe(0);
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
		test.each([
			[
				'border shorthand',
				'button { border: var(--border_width) solid var(--border_color); }',
				['border_width', 'border_color'],
			],
			[
				'margin shorthand',
				'div { margin: var(--space_sm) var(--space_md); }',
				['space_sm', 'space_md'],
			],
			[
				'padding shorthand',
				'section { padding: var(--space_xs) var(--space_sm) var(--space_md) var(--space_lg); }',
				['space_xs', 'space_sm', 'space_md', 'space_lg'],
			],
			[
				'box-shadow shorthand',
				'div { box-shadow: var(--shadow_x) var(--shadow_y) var(--shadow_blur) var(--shadow_color); }',
				['shadow_x', 'shadow_y', 'shadow_blur', 'shadow_color'],
			],
			[
				'font shorthand',
				'p { font: var(--font_weight) var(--font_size)/var(--line_height) var(--font_family); }',
				['font_weight', 'font_size', 'line_height', 'font_family'],
			],
			[
				'background shorthand',
				'header { background: var(--bg_color) url(image.png) var(--bg_position) / var(--bg_size); }',
				['bg_color', 'bg_position', 'bg_size'],
			],
			[
				'transition shorthand',
				'a { transition: color var(--duration) var(--easing); }',
				['duration', 'easing'],
			],
			[
				'nested calc',
				'div { width: calc(var(--base_width) + var(--extra_width) * 2); }',
				['base_width', 'extra_width'],
			],
		])('extracts from %s', (_name, css, expected_vars) => {
			const index = parse_style_css(css, 'test-hash');
			for (const v of expected_vars) {
				expect(index.rules[0]!.variables_used.has(v), `Expected "${v}" in variables`).toBe(true);
			}
		});

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
