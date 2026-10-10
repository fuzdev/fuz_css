import { test, assert, describe } from 'vitest';

import {
	parse_style_css,
	get_matching_rules,
	generate_base_css_by_layer,
	collect_rule_variables,
	load_style_rule_index
} from '#lib/style_rule_parser.ts';
import { default_cache_deps } from '#lib/deps_defaults.ts';

// Alias for brevity in tests
const deps = default_cache_deps;

describe('parse_style_css', () => {
	describe('basic parsing', () => {
		test('parses basic rule', () => {
			const css = `button { color: red; }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.elements.has('button'));
			assert.strictEqual(index.rules[0]!.classes.size, 0);
			assert.isFalse(index.rules[0]!.is_core);
		});

		test('parses rule with class', () => {
			const css = `button.selected { color: blue; }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.elements.has('button'));
			assert.isTrue(index.rules[0]!.classes.has('selected'));
		});

		test('parses multiple selectors', () => {
			const css = `h1, h2, h3 { font-weight: bold; }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.elements.has('h1'));
			assert.isTrue(index.rules[0]!.elements.has('h2'));
			assert.isTrue(index.rules[0]!.elements.has('h3'));
		});
	});

	describe('core rules', () => {
		test.each([
			['*, ::before, ::after { box-sizing: border-box; }', 'universal'],
			[':root { --color: blue; }', 'root'],
			['body { font-size: 16px; }', 'body'],
			['html { font-size: 16px; }', 'html'],
			[':host { display: block; }', 'host'],
			['@media (prefers-reduced-motion) { :root { --duration: 0; } }', 'conditional_core']
		] as const)('%s is core (%s)', (css, reason) => {
			const index = parse_style_css(css);
			assert.isTrue(index.rules[0]!.is_core);
			assert.strictEqual(index.rules[0]!.core_reason, reason);
		});

		test('@media not prefers-reduced-motion is not core', () => {
			const css = `@media (min-width: 768px) { button { font-size: 18px; } }`;
			const index = parse_style_css(css);

			assert.isFalse(index.rules[0]!.is_core);
			assert.isTrue(index.rules[0]!.elements.has('button'));
		});
	});

	describe('functional pseudo-classes', () => {
		test(':where selector', () => {
			const css = `:where(button:not(.unstyled)) { color: var(--text_color); }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.elements.has('button'));
			// a negated name isn't what the rule targets
			assert.isFalse(index.rules[0]!.classes.has('unstyled'));
			assert.isTrue(index.rules[0]!.variables_used.has('text_color'));
		});

		test('complex :is selector', () => {
			const css = `:where(:is(input, textarea, select):not(.unstyled)) { display: block; }`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.elements.has('input'));
			assert.isTrue(index.rules[0]!.elements.has('textarea'));
			assert.isTrue(index.rules[0]!.elements.has('select'));
			assert.isFalse(index.rules[0]!.classes.has('unstyled'));
		});

		test('nested :is in :where', () => {
			const css = `:where(:is(h1, h2, h3, h4, h5, h6, .heading):not(.unstyled)) { font-family: serif; }`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.elements.has('h1'));
			assert.isTrue(index.rules[0]!.elements.has('h6'));
			assert.isTrue(index.rules[0]!.classes.has('heading'));
			assert.isFalse(index.rules[0]!.classes.has('unstyled'));
		});

		test('a selector naming only negated names always ships', () => {
			// `:not(.unstyled)` matches every element without the class, so the
			// class can't decide whether the rule ships
			const css = `:where(:not(:has(button.disabled))) { opacity: 1; }
:where([contenteditable]:not(.unstyled):focus-visible) { outline: 1px solid; }`;
			const index = parse_style_css(css);

			for (const rule of index.rules) {
				assert.strictEqual(rule.elements.size, 0);
				assert.strictEqual(rule.classes.size, 0);
				assert.strictEqual(rule.core_reason, 'untargetable');
			}
		});

		test('a branch naming nothing makes an :is() list untargetable', () => {
			// `[contenteditable]` matches with none of the names detected
			const css = `:where(:is(input, [contenteditable]):active) { color: red; }
:where(button:is(.a, [b])) { color: red; }`;
			const [open_list, named_compound] = parse_style_css(css).rules;
			assert.strictEqual(open_list!.core_reason, 'untargetable');
			// the compound's own element still requires a name
			assert.strictEqual(named_compound!.core_reason, null);
		});

		test('triple nested functional pseudo-classes', () => {
			const css = `:where(:is(:not(.hidden):has(span.icon))) { display: flex; }`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.elements.has('span'));
			assert.isFalse(index.rules[0]!.classes.has('hidden'));
			assert.isTrue(index.rules[0]!.classes.has('icon'));
		});
	});

	describe('combinators', () => {
		test('child combinator', () => {
			const css = `ul > li { list-style: none; }`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.elements.has('ul'));
			assert.isTrue(index.rules[0]!.elements.has('li'));
		});

		test('sibling combinators', () => {
			const css = `h1 + p, h2 ~ p { margin-top: 0; }`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.elements.has('h1'));
			assert.isTrue(index.rules[0]!.elements.has('h2'));
			assert.isTrue(index.rules[0]!.elements.has('p'));
		});
	});

	describe('pseudo-elements and pseudo-classes', () => {
		test('does not extract pseudo-elements as elements', () => {
			const css = `::selection { background: blue; }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.strictEqual(index.rules[0]!.elements.size, 0);
		});

		test.each([
			["div::before { content: ''; }", 'div', 'before'],
			["span::after { content: ''; }", 'span', 'after'],
			['a:hover { color: red; }', 'a', 'hover']
		] as const)('%s extracts element but not pseudo', (css, element, pseudo) => {
			const index = parse_style_css(css);
			assert.isTrue(index.rules[0]!.elements.has(element));
			assert.isFalse(index.rules[0]!.elements.has(pseudo));
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
			["input[placeholder='a, b, c'] { color: gray; }", 'input']
		])('%s extracts element', (css, element) => {
			const index = parse_style_css(css);
			assert.isTrue(index.rules[0]!.elements.has(element));
		});

		test('attribute selector with class does not extract class from attribute', () => {
			const css = `[class~="unstyled"] { all: unset; }`;
			const index = parse_style_css(css);

			assert.isFalse(index.rules[0]!.classes.has('unstyled'));
			assert.strictEqual(index.rules[0]!.elements.size, 0);
		});

		test('class selector alongside attribute selector', () => {
			const css = `input.error[type='text'] { border: 2px solid red; }`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.elements.has('input'));
			assert.isTrue(index.rules[0]!.classes.has('error'));
		});

		test.each([
			['[aria-label="Close dialog"] { color: red; }', 'dialog'],
			["[data-x='a b'] { color: red; }", 'b'],
			['[title="x > span"] { color: red; }', 'span']
		])('%s reads no element from the attribute value', (css, element) => {
			const rule = parse_style_css(css).rules[0]!;
			assert.isFalse(rule.elements.has(element));
			assert.strictEqual(rule.core_reason, 'untargetable');
		});

		test('an attribute value never reads as a class', () => {
			const rule = parse_style_css('a[href$=".pdf"]::after { content: "pdf"; }').rules[0]!;
			assert.isFalse(rule.classes.has('pdf'));
			assert.deepEqual([...rule.elements], ['a']);
			assert.isFalse(rule.is_core);
		});

		test('a substring matcher is not the universal selector', () => {
			const rule = parse_style_css('a[href*="example"] { color: red; }').rules[0]!;
			assert.isFalse(rule.is_core);
			assert.deepEqual([...rule.elements], ['a']);
		});

		test('data attribute selectors', () => {
			const css = `[data-theme='dark'] { background: black; }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules[0]!.elements.size, 0);
			assert.strictEqual(index.rules[0]!.classes.size, 0);
		});
	});

	describe('at-rules', () => {
		test('@supports rule', () => {
			const css = `@supports (display: grid) { .grid { display: grid; } }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.classes.has('grid'));
			assert.isFalse(index.rules[0]!.is_core);
		});

		test('@container rule', () => {
			const css = `@container (min-width: 400px) { .card { padding: var(--space_lg); } }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.classes.has('card'));
			assert.isTrue(index.rules[0]!.variables_used.has('space_lg'));
		});

		test('a shipped @layer block is unwrapped', () => {
			const css = `@layer fuz.base { button { color: blue; } }`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.elements.has('button'));
			assert.strictEqual(index.rules[0]!.css, 'button { color: blue; }');
			assert.strictEqual(index.diagnostics.length, 0);
		});

		test('@keyframes rule', () => {
			const css = `@keyframes fade-in {
				from { opacity: 0; }
				to { opacity: 1; }
			}`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.strictEqual(index.rules[0]!.elements.size, 0);
			assert.strictEqual(index.rules[0]!.classes.size, 0);
			// detection can't tell whether it's used, so it always ships
			assert.isTrue(index.rules[0]!.is_core);
			assert.strictEqual(index.rules[0]!.core_reason, 'at_rule');
		});

		test('@keyframes with variables', () => {
			const css = `@keyframes pulse {
				0% { transform: scale(var(--scale_min)); }
				100% { transform: scale(var(--scale_max)); }
			}`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.variables_used.has('scale_min'));
			assert.isTrue(index.rules[0]!.variables_used.has('scale_max'));
		});

		test('@supports containing nested rules', () => {
			const css = `@supports (display: flex) {
				.flex { display: flex; }
			}`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.classes.has('flex'));
		});
	});

	describe('@font-face', () => {
		test('is core rule', () => {
			const css = `@font-face {
				font-family: 'CustomFont';
				src: url('/fonts/custom.woff2') format('woff2');
			}`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 1);
			assert.isTrue(index.rules[0]!.is_core);
			assert.strictEqual(index.rules[0]!.core_reason, 'at_rule');
		});

		test('does not target elements or classes', () => {
			const css = `@font-face {
				font-family: 'CustomFont';
				src: url('/fonts/custom.woff2') format('woff2');
			}`;
			const index = parse_style_css(css);

			assert.strictEqual(index.rules[0]!.elements.size, 0);
			assert.strictEqual(index.rules[0]!.classes.size, 0);
		});

		test('extracts variables', () => {
			const css = `@font-face {
				font-family: var(--font_family_name);
				src: url(var(--font_path));
				font-display: var(--font_display);
			}`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.variables_used.has('font_family_name'));
			assert.isTrue(index.rules[0]!.variables_used.has('font_path'));
			assert.isTrue(index.rules[0]!.variables_used.has('font_display'));
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
			const index = parse_style_css(css);

			assert.strictEqual(index.rules.length, 2);
			assert.isTrue(index.rules[0]!.is_core);
			assert.strictEqual(index.rules[0]!.core_reason, 'at_rule');
			assert.isTrue(index.rules[1]!.is_core);
			assert.strictEqual(index.rules[1]!.core_reason, 'at_rule');
		});
	});

	describe('variable extraction', () => {
		test.each([
			[
				'border shorthand',
				'button { border: var(--border_width) solid var(--border_color); }',
				['border_width', 'border_color']
			],
			[
				'margin shorthand',
				'div { margin: var(--space_sm) var(--space_md); }',
				['space_sm', 'space_md']
			],
			[
				'padding shorthand',
				'section { padding: var(--space_xs) var(--space_sm) var(--space_md) var(--space_lg); }',
				['space_xs', 'space_sm', 'space_md', 'space_lg']
			],
			[
				'box-shadow shorthand',
				'div { box-shadow: var(--shadow_x) var(--shadow_y) var(--shadow_blur) var(--shadow_color); }',
				['shadow_x', 'shadow_y', 'shadow_blur', 'shadow_color']
			],
			[
				'font shorthand',
				'p { font: var(--font_weight) var(--font_size)/var(--line_height) var(--font_family); }',
				['font_weight', 'font_size', 'line_height', 'font_family']
			],
			[
				'background shorthand',
				'header { background: var(--bg_color) url(image.png) var(--bg_position) / var(--bg_size); }',
				['bg_color', 'bg_position', 'bg_size']
			],
			[
				'transition shorthand',
				'a { transition: color var(--duration) var(--easing); }',
				['duration', 'easing']
			],
			[
				'nested calc',
				'div { width: calc(var(--base_width) + var(--extra_width) * 2); }',
				['base_width', 'extra_width']
			]
		])('extracts from %s', (_name, css, expected_vars) => {
			const index = parse_style_css(css);
			for (const v of expected_vars) {
				assert.isTrue(index.rules[0]!.variables_used.has(v), `Expected "${v}" in variables`);
			}
		});

		test('extracts multiple variables in one rule', () => {
			const css = `button {
				color: var(--text_color);
				background: var(--bg_color);
				border: var(--border_width) solid var(--border_color);
			}`;
			const index = parse_style_css(css);

			assert.isTrue(index.rules[0]!.variables_used.has('text_color'));
			assert.isTrue(index.rules[0]!.variables_used.has('bg_color'));
			assert.isTrue(index.rules[0]!.variables_used.has('border_width'));
			assert.isTrue(index.rules[0]!.variables_used.has('border_color'));
		});
	});

	describe('variable sets', () => {
		const sets = (css: string): Record<string, Array<string>> => {
			const rule = parse_style_css(css).rules[0]!;
			return {
				used: [...rule.variables_used].sort(),
				required: [...rule.variables_required].sort(),
				defined: [...rule.variables_defined].sort()
			};
		};

		test('required leaves out fallbacks and what the rule declares itself', () => {
			assert.deepEqual(
				sets(
					`button {
						--border_color: red;
						border-color: var(--border_color);
						margin: var(--gap, 4px);
						padding: var(--pad);
						color: var(--a, var(--b));
					}`
				),
				{ used: ['a', 'b', 'border_color', 'gap', 'pad'], required: ['b', 'pad'], defined: [] }
			);
		});

		test('used reads the raw text, required skips comments', () => {
			assert.deepEqual(
				sets('button { /* was: color: var(--old_color); --old: 1; */ color: var(--text_color); }'),
				{ used: ['old_color', 'text_color'], required: ['text_color'], defined: [] }
			);
		});

		test('a comment opener inside an unquoted url() hides nothing', () => {
			assert.deepEqual(sets('p { background: url(//x/*.png); margin: var(--space_xl7); }'), {
				used: ['space_xl7'],
				required: ['space_xl7'],
				defined: []
			});
		});

		test('comment markers inside a string are not a comment', () => {
			assert.deepEqual(sets(`a::after { content: "/*"; color: var(--kept); margin: "*/"; }`), {
				used: ['kept'],
				required: ['kept'],
				defined: []
			});
		});

		test('a group requires only what nothing nested in it declares, and defines nothing', () => {
			assert.deepEqual(
				sets(
					'@media print { :root { --ink: black; } @supports (x: y) { p { color: var(--ink); fill: var(--deep); } } }'
				),
				{ used: ['deep', 'ink'], required: ['deep'], defined: [] }
			);
		});

		test("a declaration right after a nested rule is still the rule's own", () => {
			assert.deepEqual(sets('p{a{top:0}--space_md:1px;margin:var(--space_md)}'), {
				used: ['space_md'],
				required: [],
				defined: []
			});
		});

		test.each([
			':root',
			':host',
			'html',
			'body',
			'*',
			'*, ::before, ::after',
			':root, .card',
			' :ROOT /* base */ '
		])('a rule defines for the document when a selector is exactly a document one: %s', (sel) => {
			assert.deepEqual(sets(`${sel} { --ink: black; color: var(--ink); }`).defined, ['ink']);
		});

		test.each([
			':root.dark',
			'html .card',
			'body.special',
			'.a > * + *',
			'[class*="x"]',
			':root:has(dialog[open])',
			'.card'
		])('a rule that only mentions a document selector defines nothing: %s', (sel) => {
			assert.deepEqual(sets(`${sel} { --ink: black; }`).defined, []);
		});

		test('a dashed ident in an at-rule prelude is not a declaration', () => {
			assert.deepEqual(
				sets('@property --prop { syntax: "<length>"; inherits: false; initial-value: 0px; }'),
				{ used: [], required: [], defined: [] }
			);
		});
	});

	describe('indexing', () => {
		test('indexes rules by element and class', () => {
			const css = `
				button { color: red; }
				input { color: blue; }
				button.selected { background: green; }
			`;
			const index = parse_style_css(css);

			assert.deepEqual(index.by_element.get('button'), [0, 2]);
			assert.deepEqual(index.by_element.get('input'), [1]);
			assert.deepEqual(index.by_class.get('selected'), [2]);
		});
	});
});

describe('get_matching_rules', () => {
	test('includes core rules', () => {
		const css = `
			*, ::before { box-sizing: border-box; }
			button { color: red; }
		`;
		const index = parse_style_css(css);

		const included = get_matching_rules(index, new Set(), new Set());
		assert.isTrue(included.has(0));
		assert.isFalse(included.has(1));
	});

	test('matches elements', () => {
		const css = `
			button { color: red; }
			input { color: blue; }
		`;
		const index = parse_style_css(css);

		const included = get_matching_rules(index, new Set(['button']), new Set());
		assert.isTrue(included.has(0));
		assert.isFalse(included.has(1));
	});

	test('matches classes', () => {
		const css = `
			.foo { color: red; }
			.bar { color: blue; }
		`;
		const index = parse_style_css(css);

		const included = get_matching_rules(index, new Set(), new Set(['foo']));
		assert.isTrue(included.has(0));
		assert.isFalse(included.has(1));
	});

	test('includes @font-face when no elements detected', () => {
		const css = `
			@font-face {
				font-family: 'CustomFont';
				src: url('/fonts/custom.woff2');
			}
			button { color: red; }
		`;
		const index = parse_style_css(css);

		const included = get_matching_rules(index, new Set(), new Set());

		assert.isTrue(included.has(0));
		assert.isFalse(included.has(1));
	});
});

describe('generate_base_css_by_layer', () => {
	test('preserves order', () => {
		const css = `
a { color: red; }
b { color: blue; }
c { color: green; }
`;
		const index = parse_style_css(css);

		const result = generate_base_css_by_layer(index, new Set([2, 0]))['fuz.base'];

		assert.isBelow(result.indexOf('red'), result.indexOf('green'));
		assert.notInclude(result, 'blue');
	});

	test('partitions rules by destination layer', () => {
		const css = `
@layer fuz.preferences {
	@media (prefers-contrast: more) { :root { --x: 1; } }
}
@layer fuz.base {
	button { color: red; }
}
`;
		const index = parse_style_css(css);
		const all = new Set(index.rules.map((_, i) => i));

		const result = generate_base_css_by_layer(index, all);

		assert.include(result['fuz.preferences'], 'prefers-contrast');
		assert.notInclude(result['fuz.preferences'], 'button');
		assert.include(result['fuz.base'], 'button');
		assert.notInclude(result['fuz.base'], 'prefers-contrast');
	});
});

describe('collect_rule_variables', () => {
	test('collects from included rules', () => {
		const css = `
			a { color: var(--palette_a); }
			b { color: var(--palette_b); background: var(--shade_00); }
		`;
		const index = parse_style_css(css);

		const vars = collect_rule_variables(index, new Set([1]));
		assert.isFalse(vars.has('palette_a'));
		assert.isTrue(vars.has('palette_b'));
		assert.isTrue(vars.has('shade_00'));
	});

	test('returns empty set for empty included_rules', () => {
		const css = `a { color: var(--palette_a); }`;
		const index = parse_style_css(css);
		const vars = collect_rule_variables(index, new Set());
		assert.strictEqual(vars.size, 0);
	});
});

describe('load_style_rule_index', () => {
	test('loads actual style.css', async () => {
		const index = await load_style_rule_index(deps);

		assert.isAbove(index.rules.length, 50);

		const core_rules = index.rules.filter((r) => r.is_core);
		assert.isAbove(core_rules.length, 0);

		assert.isTrue(index.by_element.has('button'));
		assert.isTrue(index.by_element.has('input'));
		assert.isTrue(index.by_element.has('a'));

		assert.isTrue(index.by_class.has('unstyled'));
	});
});

describe('untargetable rules', () => {
	test('a rule with no element or class hooks is core', () => {
		// ::selection and [hidden] can never be matched by detection
		const index = parse_style_css(
			'::selection { background: var(--a); }\n[hidden] { display: none; }'
		);
		assert.strictEqual(index.rules.length, 2);
		for (const rule of index.rules) {
			assert.isTrue(rule.is_core);
			assert.strictEqual(rule.core_reason, 'untargetable');
		}
	});

	test('@keyframes carry their variables and always ship', () => {
		const index = parse_style_css(
			'@keyframes spin { from { opacity: var(--o); } to { opacity: 1; } }'
		);
		assert.strictEqual(index.rules.length, 1);
		const rule = index.rules[0]!;
		assert.isTrue(rule.is_core);
		assert.strictEqual(rule.core_reason, 'at_rule');
		assert.isTrue(rule.variables_used.has('o'));
	});

	test('a conditional group with only untargetable rules is core', () => {
		const index = parse_style_css('@media print { ::selection { background: none; } }');
		assert.strictEqual(index.rules.length, 1);
		assert.isTrue(index.rules[0]!.is_core);
		assert.strictEqual(index.rules[0]!.core_reason, 'untargetable');
	});

	test('a conditional group holding one untargetable rule always ships', () => {
		// the button rule alone would tree-shake, but ::selection can never be
		// matched by detection, so the group can't be left to it
		const index = parse_style_css(
			'@media print { button { color: black; } ::selection { background: none; } }'
		);
		assert.strictEqual(index.rules.length, 1);
		assert.isTrue(index.rules[0]!.is_core);
		assert.strictEqual(index.rules[0]!.core_reason, 'untargetable');
		assert.isTrue(index.rules[0]!.elements.has('button'));
	});

	test.each([
		['a hookless selector beside a targetable one', 'button, [role="button"] { color: red; }'],
		['an escaped class name', '.md\\:flex { display: flex; }'],
		['a non-ASCII class name', '.caf\u00e9 { color: red; }'],
		['a non-ASCII element-like name', 'button, x-\u00e9l\u00e9ment { color: red; }'],
		['a hookless selector after a class', '.btn, ::part(label) { color: red; }']
	])('a rule with %s always ships', (_name, css) => {
		const index = parse_style_css(css);
		assert.strictEqual(index.rules.length, 1);
		assert.isTrue(index.rules[0]!.is_core);
		assert.strictEqual(index.rules[0]!.core_reason, 'untargetable');
		assert.strictEqual(get_matching_rules(index, new Set(), new Set()).size, 1);
	});

	test.each([
		['a list of targetable selectors', 'button, a.link, .btn { color: red; }'],
		['a hookless alternative behind an element', 'button:is(.a, [x]) { color: red; }']
	])('a rule with %s still tree-shakes', (_name, css) => {
		const index = parse_style_css(css);
		assert.isFalse(index.rules[0]!.is_core);
		assert.strictEqual(get_matching_rules(index, new Set(), new Set()).size, 0);
	});

	test('a conditional group holding a rule with an unmatchable selector always ships', () => {
		for (const inner of [
			'button, [role="button"] { color: red; }',
			'.md\\:flex { display: flex; }'
		]) {
			const index = parse_style_css(`@media print { a { color: black; } ${inner} }`);
			assert.isTrue(index.rules[0]!.is_core);
			assert.strictEqual(index.rules[0]!.core_reason, 'untargetable');
		}
	});

	test('a leading byte order mark is not part of the first selector', () => {
		const index = parse_style_css('\uFEFFbutton { color: red; }');
		assert.strictEqual(index.rules.length, 1);
		assert.isFalse(index.rules[0]!.is_core);
		assert.deepEqual([...index.rules[0]!.elements], ['button']);
		assert.strictEqual(index.rules[0]!.css, 'button { color: red; }');
	});

	test('the shipped layer order statement parses to no rules and no diagnostics', () => {
		const index = parse_style_css('@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;');
		assert.strictEqual(index.rules.length, 0);
		assert.strictEqual(index.diagnostics.length, 0);
	});
});
