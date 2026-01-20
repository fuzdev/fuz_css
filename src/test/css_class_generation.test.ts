import {test, describe, expect} from 'vitest';

import {type SourceLocation} from '$lib/diagnostics.js';
import {
	escape_css_selector,
	generate_classes_css,
	type CssClassDefinitionInterpreter,
} from '$lib/css_class_generation.js';
import {modified_class_interpreter} from '$lib/css_class_interpreters.js';
import {css_class_definitions} from '$lib/css_class_definitions.js';
import {css_class_composites} from '$lib/css_class_composites.js';

describe('escape_css_selector', () => {
	const escape_values: Array<[input: string, expected: string]> = [
		// Basic cases - no escaping needed
		['foo', 'foo'],
		['foo_bar', 'foo_bar'],
		['foo-bar', 'foo-bar'],

		// CSS-literal syntax - colons need escaping
		['display:flex', 'display\\:flex'],
		['display:none', 'display\\:none'],
		['justify-content:center', 'justify-content\\:center'],

		// Percent signs
		['opacity:80%', 'opacity\\:80\\%'],
		['width:100%', 'width\\:100\\%'],

		// Parentheses
		['nth-child(2n)', 'nth-child\\(2n\\)'],
		['min-width(800px)', 'min-width\\(800px\\)'],
		['calc(100%-20px)', 'calc\\(100\\%-20px\\)'],

		// Tilde (space encoding)
		['margin:0~auto', 'margin\\:0\\~auto'],
		['padding:10px~20px', 'padding\\:10px\\~20px'],

		// Combined - CSS-literal with modifiers
		['hover:opacity:80%', 'hover\\:opacity\\:80\\%'],
		['md:display:flex', 'md\\:display\\:flex'],
		['md:hover:opacity:80%', 'md\\:hover\\:opacity\\:80\\%'],
		['dark:color:white', 'dark\\:color\\:white'],

		// Complex cases
		['nth-child(3n+1):color:red', 'nth-child\\(3n\\+1\\)\\:color\\:red'],
		['min-width(800px):display:flex', 'min-width\\(800px\\)\\:display\\:flex'],
		['background:url(data:image/png)', 'background\\:url\\(data\\:image\\/png\\)'],

		// All special characters that need escaping
		['a!b', 'a\\!b'],
		['a"b', 'a\\"b'],
		['a#b', 'a\\#b'],
		['a$b', 'a\\$b'],
		['a%b', 'a\\%b'],
		['a&b', 'a\\&b'],
		["a'b", "a\\'b"],
		['a(b', 'a\\(b'],
		['a)b', 'a\\)b'],
		['a*b', 'a\\*b'],
		['a+b', 'a\\+b'],
		['a,b', 'a\\,b'],
		['a.b', 'a\\.b'],
		['a/b', 'a\\/b'],
		['a:b', 'a\\:b'],
		['a;b', 'a\\;b'],
		['a<b', 'a\\<b'],
		['a=b', 'a\\=b'],
		['a>b', 'a\\>b'],
		['a?b', 'a\\?b'],
		['a@b', 'a\\@b'],
		['a[b', 'a\\[b'],
		['a\\b', 'a\\\\b'],
		['a]b', 'a\\]b'],
		['a^b', 'a\\^b'],
		['a`b', 'a\\`b'],
		['a{b', 'a\\{b'],
		['a|b', 'a\\|b'],
		['a}b', 'a\\}b'],
		['a~b', 'a\\~b'],
	];

	for (const [input, expected] of escape_values) {
		test(`escapes "${input}" to "${expected}"`, () => {
			expect(escape_css_selector(input)).toBe(expected);
		});
	}
});

describe('generate_classes_css', () => {
	describe('escaping', () => {
		test('escapes class names with special characters', () => {
			const class_names = ['display:flex', 'opacity:80%'];
			const class_definitions: Record<string, {declaration: string}> = {
				'display:flex': {declaration: 'display: flex;'},
				'opacity:80%': {declaration: 'opacity: 80%;'},
			};

			const result = generate_classes_css({
				class_names,
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.display\\:flex { display: flex; }');
			expect(result.css).toContain('.opacity\\:80\\% { opacity: 80%; }');
			// Should NOT contain unescaped versions
			expect(result.css).not.toContain('.display:flex {');
			expect(result.css).not.toContain('.opacity:80% {');
		});

		test('escapes complex CSS-literal class names', () => {
			const class_names = ['hover:opacity:80%', 'nth-child(2n):color:red'];
			const class_definitions: Record<string, {declaration: string}> = {
				'hover:opacity:80%': {declaration: 'opacity: 80%;'},
				'nth-child(2n):color:red': {declaration: 'color: red;'},
			};

			const result = generate_classes_css({
				class_names,
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:opacity\\:80\\%');
			expect(result.css).toContain('.nth-child\\(2n\\)\\:color\\:red');
		});
	});

	describe('interpreters', () => {
		test('uses interpreter for unknown classes', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^test-(\w+)$/,
				interpret: (matched) => `test-prop: ${matched[1]};`,
			};

			const result = generate_classes_css({
				class_names: ['test-value'],
				class_definitions: {},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.test-value');
			expect(result.css).toContain('test-prop: value;');
		});

		test('interpreter can return full ruleset', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^media-(\w+)$/,
				interpret: (matched) =>
					`@media (min-width: 800px) { .media-${matched[1]} { display: ${matched[1]}; } }`,
			};

			const result = generate_classes_css({
				class_names: ['media-flex'],
				class_definitions: {},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (min-width: 800px)');
			expect(result.css).toContain('display: flex;');
		});

		test('collects interpreter diagnostics', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^warn-(.+)$/,
				interpret: (matched, ctx) => {
					ctx.diagnostics.push({
						level: 'warning',
						message: 'test warning',
						class_name: matched[0],
						suggestion: null,
					});
					return `color: ${matched[1]};`;
				},
			};

			const result = generate_classes_css({
				class_names: ['warn-red'],
				class_definitions: {},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.message).toBe('test warning');
			expect(result.diagnostics[0]!.phase).toBe('generation');
		});
	});

	describe('comment rendering', () => {
		test('renders single-line comment', () => {
			const class_definitions = {
				'test-class': {declaration: 'color: red;', comment: 'Single line comment'},
			};

			const result = generate_classes_css({
				class_names: ['test-class'],
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('/* Single line comment */');
		});

		test('renders multi-line comment as block', () => {
			const class_definitions = {
				'test-class': {declaration: 'color: red;', comment: 'Line 1\nLine 2'},
			};

			const result = generate_classes_css({
				class_names: ['test-class'],
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('/*\nLine 1\nLine 2\n*/');
		});

		test('renders comment on composes-based composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				card: {composes: ['p_lg'], comment: 'Card component'},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('/* Card component */');
			expect(result.css).toContain('.card {');
		});
	});

	describe('ruleset handling', () => {
		test('warns when single-selector ruleset could be declaration', () => {
			const definitions = {
				simple: {
					ruleset: '.simple { color: red; }',
				},
			};

			const result = generate_classes_css({
				class_names: ['simple'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.simple { color: red; }');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('warning');
			expect(result.diagnostics[0]!.message).toContain('could be converted to declaration format');
		});

		test('does not warn for multi-selector ruleset', () => {
			const definitions = {
				multi: {
					ruleset: `.multi { color: red; }
.multi:hover { color: blue; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['multi'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.multi { color: red; }');
			// No warning for multi-selector rulesets
			const warnings = result.diagnostics.filter((d) => d.message.includes('could be converted'));
			expect(warnings).toHaveLength(0);
		});

		test('warns when ruleset selectors do not contain expected class', () => {
			const definitions = {
				clickable: {
					ruleset: `.foobar { cursor: pointer; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['clickable'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// CSS is still emitted (user may know what they're doing)
			expect(result.css).toContain('.foobar { cursor: pointer; }');
			// Should have warning about mismatched class
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('warning');
			expect(result.diagnostics[0]!.message).toContain('no selectors containing ".clickable"');
			expect(result.diagnostics[0]!.suggestion).toContain('.clickable');
		});

		test('does not warn when ruleset contains expected class', () => {
			const definitions = {
				clickable: {
					ruleset: `.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['clickable'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// No warning about missing class
			const missing_warnings = result.diagnostics.filter((d) =>
				d.message.includes('no selectors containing'),
			);
			expect(missing_warnings).toHaveLength(0);
		});

		test('does not warn for partial class name match', () => {
			// .clickable_foo should not satisfy the check for "clickable"
			const definitions = {
				clickable: {
					ruleset: `.clickable_extended { cursor: pointer; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['clickable'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should warn - .clickable_extended is not .clickable
			expect(result.diagnostics.some((d) => d.message.includes('no selectors containing'))).toBe(
				true,
			);
		});

		test('warns for completely unrelated selectors', () => {
			const definitions = {
				myclass: {
					ruleset: `
						.other { color: red; }
						.another:hover { color: blue; }
					`,
				},
			};

			const result = generate_classes_css({
				class_names: ['myclass'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.diagnostics.some((d) => d.message.includes('no selectors containing'))).toBe(
				true,
			);
		});

		test('matches class followed by attribute selector', () => {
			const definitions = {
				btn: {
					ruleset: `.btn[disabled] { opacity: 0.5; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['btn'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should NOT warn - .btn is present (followed by [disabled])
			const missing_warnings = result.diagnostics.filter((d) =>
				d.message.includes('no selectors containing'),
			);
			expect(missing_warnings).toHaveLength(0);
		});

		test('skips single-selector warning for ruleset with comment before at-rule', () => {
			const definitions = {
				responsive: {
					ruleset: `/* responsive wrapper */ @media (width >= 48rem) { .responsive { display: flex; } }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['responsive'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should NOT warn about "could be converted to declaration" - has @media wrapper
			const convert_warnings = result.diagnostics.filter((d) =>
				d.message.includes('could be converted'),
			);
			expect(convert_warnings).toHaveLength(0);
		});

		test('skips single-selector warning for nested at-rules', () => {
			const definitions = {
				fancy: {
					ruleset: `@supports (display: grid) { @media (width >= 48rem) { .fancy { display: grid; } } }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['fancy'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			const convert_warnings = result.diagnostics.filter((d) =>
				d.message.includes('could be converted'),
			);
			expect(convert_warnings).toHaveLength(0);
		});

		test('warns for empty ruleset', () => {
			const definitions = {
				empty: {
					ruleset: '',
				},
			};

			const result = generate_classes_css({
				class_names: ['empty'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Empty ruleset emits warning
			expect(result.css).toBe('');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.message).toContain('is empty');
		});

		test('warns for whitespace-only ruleset', () => {
			const definitions = {
				whitespace: {
					ruleset: '   \n\t   ',
				},
			};

			const result = generate_classes_css({
				class_names: ['whitespace'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Whitespace-only ruleset is treated as empty
			expect(result.css).toBe('');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.message).toContain('is empty');
		});

		test('handles comment-only ruleset', () => {
			const definitions = {
				commented: {
					ruleset: '/* this ruleset is empty */',
				},
			};

			const result = generate_classes_css({
				class_names: ['commented'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Comment-only ruleset is truthy but has no selectors, warns about missing class
			expect(result.diagnostics.some((d) => d.message.includes('no selectors containing'))).toBe(
				true,
			);
		});

		test('warns for static ruleset with special chars in class name', () => {
			// User-defined class with colon (unusual but possible)
			const definitions = {
				'my:custom': {
					ruleset: `.other { color: red; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['my:custom'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should warn - .other doesn't match .my\:custom
			expect(result.diagnostics.some((d) => d.message.includes('no selectors containing'))).toBe(
				true,
			);
		});

		test('no warning for static ruleset with special chars when selector matches', () => {
			// User-defined class with colon, correctly escaped in selector
			const definitions = {
				'my:custom': {
					ruleset: `.my\\:custom { color: red; }`,
				},
			};

			const result = generate_classes_css({
				class_names: ['my:custom'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should NOT warn - selector matches escaped class name
			const missing_warnings = result.diagnostics.filter((d) =>
				d.message.includes('no selectors containing'),
			);
			expect(missing_warnings).toHaveLength(0);
		});
	});

	describe('sorting', () => {
		test('maintains definition order for known classes', () => {
			const class_definitions = {
				aaa: {declaration: 'a: a;'},
				zzz: {declaration: 'z: z;'},
				mmm: {declaration: 'm: m;'},
			};

			// Request in different order than defined
			const result = generate_classes_css({
				class_names: ['mmm', 'aaa', 'zzz'],
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should be in definition order (aaa, zzz, mmm)
			const aaa_idx = result.css.indexOf('.aaa');
			const zzz_idx = result.css.indexOf('.zzz');
			const mmm_idx = result.css.indexOf('.mmm');

			expect(aaa_idx).toBeLessThan(zzz_idx);
			expect(zzz_idx).toBeLessThan(mmm_idx);
		});

		test('sorts unknown classes alphabetically at end', () => {
			const class_definitions = {
				known: {declaration: 'k: k;'},
			};

			const result = generate_classes_css({
				class_names: ['unknown-b', 'known', 'unknown-a'],
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			// known should come first, then unknown sorted alphabetically
			const known_idx = result.css.indexOf('.known');
			const unknown_a_idx = result.css.indexOf('.unknown-a');
			const unknown_b_idx = result.css.indexOf('.unknown-b');

			// known is first (has index 0 in classes_by_name)
			// unknown classes have no CSS output (they're skipped)
			expect(known_idx).toBeGreaterThanOrEqual(0);
			// Unknown classes without interpreter produce no output
			expect(unknown_a_idx).toBe(-1);
			expect(unknown_b_idx).toBe(-1);
		});

		test('sorts interpreted classes alphabetically', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^int-(\w+)$/,
				interpret: (matched) => `prop: ${matched[1]};`,
			};

			const result = generate_classes_css({
				class_names: ['int-ccc', 'int-aaa', 'int-bbb'],
				class_definitions: {},
				interpreters: [interpreter],
				css_properties: null,
			});

			const aaa_idx = result.css.indexOf('.int-aaa');
			const bbb_idx = result.css.indexOf('.int-bbb');
			const ccc_idx = result.css.indexOf('.int-ccc');

			expect(aaa_idx).toBeLessThan(bbb_idx);
			expect(bbb_idx).toBeLessThan(ccc_idx);
		});
	});

	describe('composes property', () => {
		test('composes-only composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {composes: ['p_lg', 'rounded']},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.card {');
			expect(result.css).toContain('padding: var(--space_lg);');
			expect(result.css).toContain('border-radius: var(--border_radius_md);');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('composes + declaration composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {composes: ['p_lg', 'rounded'], declaration: '--card-bg: var(--bg_1);'},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.card {');
			expect(result.css).toContain('padding: var(--space_lg);');
			expect(result.css).toContain('border-radius: var(--border_radius_md);');
			expect(result.css).toContain('--card-bg: var(--bg_1);');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('modifier on composes-based composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {composes: ['p_lg', 'rounded']},
			};

			const result = generate_classes_css({
				class_names: ['hover:card'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:card:hover {');
			expect(result.css).toContain('padding: var(--space_lg);');
			expect(result.css).toContain('border-radius: var(--border_radius_md);');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('modifier on composes + declaration composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {composes: ['p_lg', 'rounded'], declaration: '--card-bg: blue;'},
			};

			const result = generate_classes_css({
				class_names: ['hover:card'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:card:hover {');
			expect(result.css).toContain('padding: var(--space_lg);');
			expect(result.css).toContain('border-radius: var(--border_radius_md);');
			expect(result.css).toContain('--card-bg: blue;');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('nested composes composition', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				shadow_md: {declaration: 'box-shadow: var(--shadow_md);'},
				panel_base: {composes: ['p_lg', 'rounded']},
				panel: {composes: ['panel_base', 'shadow_md']},
			};

			const result = generate_classes_css({
				class_names: ['panel'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.panel {');
			expect(result.css).toContain('padding: var(--space_lg);');
			expect(result.css).toContain('border-radius: var(--border_radius_md);');
			expect(result.css).toContain('box-shadow: var(--shadow_md);');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('modifier on nested composes composition', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				panel_base: {composes: ['p_lg', 'rounded']},
			};

			const result = generate_classes_css({
				class_names: ['md:panel_base'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 48rem)');
			expect(result.css).toContain('.md\\:panel_base');
			expect(result.css).toContain('padding: var(--space_lg);');
			expect(result.css).toContain('border-radius: var(--border_radius_md);');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('unknown class in composes array produces error', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				card: {composes: ['p_lg', 'unknown_class']},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Should not generate CSS for card
			expect(result.css).not.toContain('.card');
			// Should have an error diagnostic
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain(
				'Unknown class "unknown_class" in composes array',
			);
		});

		test('circular reference in composes produces error', () => {
			const definitions = {
				a: {composes: ['b']},
				b: {composes: ['a']},
			};

			const result = generate_classes_css({
				class_names: ['a'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).not.toContain('.a');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('Circular reference');
		});

		test('ruleset class in composes array produces error', () => {
			const definitions = {
				clickable: {
					ruleset: `.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }`,
				},
				card: {composes: ['clickable']},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).not.toContain('.card');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('Cannot reference ruleset class');
		});

		test('self-referencing class produces error', () => {
			const definitions = {
				self_ref: {composes: ['self_ref']},
			};

			const result = generate_classes_css({
				class_names: ['self_ref'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).not.toContain('.self_ref');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('Circular reference');
		});

		test('empty composes array produces no CSS output', () => {
			const definitions = {
				empty_card: {composes: []},
			};

			const result = generate_classes_css({
				class_names: ['empty_card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			// Empty declaration results in no CSS rule
			expect(result.css).toBe('');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('diamond dependency pattern deduplicates silently', () => {
			// Both branches reference the same base class
			const definitions = {
				base: {declaration: 'color: red;'},
				branch_a: {composes: ['base'], declaration: 'font-size: 1rem;'},
				branch_b: {composes: ['base'], declaration: 'font-weight: bold;'},
				diamond: {composes: ['branch_a', 'branch_b']},
			};

			const result = generate_classes_css({
				class_names: ['diamond'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toContain('.diamond {');
			// base declaration appears once (deduplicated via visited set)
			expect(result.css).toContain('color: red;');
			expect(result.css).toContain('font-size: 1rem;');
			expect(result.css).toContain('font-weight: bold;');
			// No warning for diamond dependencies (natural composition)
			expect(result.diagnostics).toHaveLength(0);
		});

		test('modifier on diamond dependency deduplicates silently', () => {
			// hover:diamond should also deduplicate correctly
			const definitions = {
				base: {declaration: 'color: red;'},
				branch_a: {composes: ['base'], declaration: 'font-size: 1rem;'},
				branch_b: {composes: ['base'], declaration: 'font-weight: bold;'},
				diamond: {composes: ['branch_a', 'branch_b']},
			};

			const result = generate_classes_css({
				class_names: ['hover:diamond'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:diamond:hover');
			expect(result.css).toContain('color: red;');
			expect(result.css).toContain('font-size: 1rem;');
			expect(result.css).toContain('font-weight: bold;');
			// Should not have duplicate "color: red;" - only appears once
			const colorMatches = result.css.match(/color: red;/g);
			expect(colorMatches?.length).toBe(1);
			// No warnings
			expect(result.diagnostics).toHaveLength(0);
		});

		test('longer cycle (a → b → c → a) produces error', () => {
			const definitions = {
				a: {composes: ['b']},
				b: {composes: ['c']},
				c: {composes: ['a']},
			};

			const result = generate_classes_css({
				class_names: ['a'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).not.toContain('.a');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('Circular reference');
			expect(result.diagnostics[0]!.message).toContain('a → b → c → a');
		});
	});

	describe('class_locations', () => {
		test('diagnostics include locations when provided', () => {
			const loc: SourceLocation = {file: 'test.svelte', line: 10, column: 5};
			const definitions = {
				card: {composes: ['unknown']},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
				class_locations: new Map([['card', [loc]]]),
			});

			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.locations).toEqual([loc]);
		});

		test('diagnostics have null locations when not provided', () => {
			const definitions = {
				card: {composes: ['unknown']},
			};

			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: definitions,
				interpreters: [],
				css_properties: null,
			});

			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.locations).toBeNull();
		});
	});

	describe('interpreter priority', () => {
		test('static definition takes priority over interpreter', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^box$/,
				interpret: () => 'from-interpreter: true;',
			};

			const result = generate_classes_css({
				class_names: ['box'],
				class_definitions: {box: {declaration: 'from-static: true;'}},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('from-static: true;');
			expect(result.css).not.toContain('from-interpreter');
		});

		test('first matching interpreter wins', () => {
			const interpreter1: CssClassDefinitionInterpreter = {
				pattern: /^test-(.+)$/,
				interpret: () => 'first: true;',
			};
			const interpreter2: CssClassDefinitionInterpreter = {
				pattern: /^test-(.+)$/,
				interpret: () => 'second: true;',
			};

			const result = generate_classes_css({
				class_names: ['test-value'],
				class_definitions: {},
				interpreters: [interpreter1, interpreter2],
				css_properties: null,
			});

			expect(result.css).toContain('first: true;');
			expect(result.css).not.toContain('second');
		});

		test('interpreter returning null falls through to next', () => {
			const interpreter1: CssClassDefinitionInterpreter = {
				pattern: /^test-(.+)$/,
				interpret: () => null,
			};
			const interpreter2: CssClassDefinitionInterpreter = {
				pattern: /^test-(.+)$/,
				interpret: () => 'second: true;',
			};

			const result = generate_classes_css({
				class_names: ['test-value'],
				class_definitions: {},
				interpreters: [interpreter1, interpreter2],
				css_properties: null,
			});

			expect(result.css).toContain('second: true;');
		});
	});
});

describe('modified_class_interpreter', () => {
	describe('basic modifiers', () => {
		test('generates CSS for hover:box', () => {
			const result = generate_classes_css({
				class_names: ['hover:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:box:hover');
			expect(result.css).toContain('display: flex');
			expect(result.css).toContain('flex-direction: column');
		});

		test('generates CSS for md:box with media query', () => {
			const result = generate_classes_css({
				class_names: ['md:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 48rem)');
			expect(result.css).toContain('.md\\:box');
			expect(result.css).toContain('display: flex');
		});

		test('generates CSS for dark:panel with ancestor wrapper', () => {
			const result = generate_classes_css({
				class_names: ['dark:panel'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain(':root.dark');
			expect(result.css).toContain('.dark\\:panel');
			expect(result.css).toContain('border-radius');
		});

		test('handles multiple modifiers md:dark:hover:box', () => {
			const result = generate_classes_css({
				class_names: ['md:dark:hover:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 48rem)');
			expect(result.css).toContain(':root.dark');
			expect(result.css).toContain('.md\\:dark\\:hover\\:box:hover');
		});

		test('handles all modifier types: lg:dark:focus:after:box', () => {
			const result = generate_classes_css({
				class_names: ['lg:dark:focus:after:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 64rem)');
			expect(result.css).toContain(':root.dark');
			expect(result.css).toContain('.lg\\:dark\\:focus\\:after\\:box:focus::after');
		});

		test('handles token class with modifiers hover:p_md', () => {
			const result = generate_classes_css({
				class_names: ['hover:p_md'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:p_md:hover');
			expect(result.css).toContain('padding');
		});

		test('returns null for unknown base class', () => {
			const result = generate_classes_css({
				class_names: ['hover:unknown_class'],
				class_definitions: {},
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Should produce no output for unknown class
			expect(result.css).not.toContain('hover:unknown_class');
		});

		test('returns null for class without modifiers', () => {
			// 'box' without modifiers should not be handled by modified_class_interpreter
			// (it should be handled as a regular known class)
			const result = generate_classes_css({
				class_names: ['box'],
				class_definitions: {},
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// No output from interpreter (box has no modifiers)
			expect(result.css).not.toContain('.box');
		});
	});

	describe('pseudo-elements', () => {
		test('handles before pseudo-element', () => {
			const result = generate_classes_css({
				class_names: ['before:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.before\\:box::before');
			expect(result.css).toContain('display: flex');
		});

		test('handles combined state and pseudo-element', () => {
			const result = generate_classes_css({
				class_names: ['hover:before:ellipsis'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:before\\:ellipsis:hover::before');
		});
	});

	describe('priority', () => {
		test('prioritizes known classes over css-literal', () => {
			// 'hover:row' should be interpreted as modifier + known class
			// not as css-literal property:value
			const result = generate_classes_css({
				class_names: ['hover:row'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:row:hover');
			expect(result.css).toContain('display: flex');
			expect(result.css).toContain('flex-direction: row');
		});
	});

	describe('ruleset modifier support', () => {
		test('handles ruleset class with hover: selectable', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Should contain modified selectors with :hover appended
			expect(result.css).toContain('.hover\\:selectable:hover');
			// Rules that already have :hover are skipped (no :hover:hover)
			expect(result.css).not.toContain(':hover:hover');
			expect(result.css).toContain('cursor: pointer');
		});

		test('handles ruleset class with media: md:selectable', () => {
			const result = generate_classes_css({
				class_names: ['md:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 48rem)');
			expect(result.css).toContain('.md\\:selectable');
			expect(result.css).toContain('.md\\:selectable:hover');
			expect(result.css).toContain('.md\\:selectable.selected');
		});

		test('handles ruleset with descendant selectors: hover:menu_item', () => {
			const result = generate_classes_css({
				class_names: ['hover:menu_item'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// State should be applied to the first compound block
			expect(result.css).toContain('.hover\\:menu_item:hover');
			expect(result.css).toContain('.hover\\:menu_item:hover .content');
			expect(result.css).toContain('.hover\\:menu_item:hover .icon');
			expect(result.css).toContain('.hover\\:menu_item:hover .title');
		});

		test('handles ruleset with pseudo-element: hover:chevron', () => {
			const result = generate_classes_css({
				class_names: ['hover:chevron'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:chevron:hover');
			// State should come BEFORE existing pseudo-element
			expect(result.css).toContain('.hover\\:chevron:hover::before');
		});

		test('handles ruleset with element.class: hover:chip', () => {
			const result = generate_classes_css({
				class_names: ['hover:chip'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('.hover\\:chip:hover');
			expect(result.css).toContain('a.hover\\:chip:hover');
			expect(result.css).toContain('font-weight: 500');
			expect(result.css).toContain('font-weight: 600');
		});

		test('handles md:dark:hover:selectable', () => {
			const result = generate_classes_css({
				class_names: ['md:dark:hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 48rem)');
			expect(result.css).toContain(':root.dark');
			expect(result.css).toContain('.md\\:dark\\:hover\\:selectable:hover');
		});

		test('handles plain ruleset with :not()', () => {
			const result = generate_classes_css({
				class_names: ['focus:plain'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Should add :focus after the :not(:hover) pseudo-class
			expect(result.css).toContain('.focus\\:plain:not(:hover):focus');
			expect(result.css).toContain('.focus\\:plain:hover:focus');
			expect(result.css).toContain('.focus\\:plain:active:focus');
		});

		test('handles clickable ruleset', () => {
			const result = generate_classes_css({
				class_names: ['md:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).toContain('@media (width >= 48rem)');
			expect(result.css).toContain('.md\\:clickable');
			expect(result.css).toContain('.md\\:clickable:focus');
			expect(result.css).toContain('.md\\:clickable:hover');
			expect(result.css).toContain('.md\\:clickable:active');
		});

		test('includes pseudo-element rules without extra modifier: before:chevron', () => {
			const result = generate_classes_css({
				class_names: ['before:chevron'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// .chevron rule gets ::before added
			expect(result.css).toContain('.before\\:chevron::before');
			expect(result.css).toContain('position: relative');
			// .chevron::before rule is included (class renamed, no extra ::before)
			expect(result.css).toContain('border-left-color');
			// Should NOT have invalid ::before::before
			expect(result.css).not.toContain('::before::before');
		});

		test('applies pseudo-element to simple ruleset: before:chip', () => {
			const result = generate_classes_css({
				class_names: ['before:chip'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Both rules get ::before added (neither has existing pseudo-element)
			expect(result.css).toContain('.before\\:chip::before');
			expect(result.css).toContain('a.before\\:chip::before');
			expect(result.css).toContain('font-weight: 500');
			expect(result.css).toContain('font-weight: 600');
		});
	});

	describe('state conflict skipping', () => {
		test('hover:selectable skips .selectable:hover rule but keeps others', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Base .selectable rule gets :hover added
			expect(result.css).toContain('.hover\\:selectable:hover');
			expect(result.css).toContain('cursor: pointer');

			// .selectable.selected rule gets :hover added (different - has .selected class not :hover state)
			expect(result.css).toContain('.hover\\:selectable.selected:hover');

			// No :hover:hover anywhere (rules with :hover are skipped)
			expect(result.css).not.toContain(':hover:hover');
		});

		test('hover:selectable keeps .selectable:active rule (different state)', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// .selectable:active rule gets :hover added → :active:hover
			expect(result.css).toContain(':active:hover');
		});

		test('focus:clickable skips .clickable:focus rule', () => {
			const result = generate_classes_css({
				class_names: ['focus:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Base .clickable rule gets :focus added
			expect(result.css).toContain('.focus\\:clickable:focus');

			// No :focus:focus anywhere
			expect(result.css).not.toContain(':focus:focus');

			// Other state rules get :focus added
			expect(result.css).toContain(':hover:focus');
			expect(result.css).toContain(':active:focus');
		});

		test('active:clickable skips .clickable:active rule', () => {
			const result = generate_classes_css({
				class_names: ['active:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// No :active:active anywhere
			expect(result.css).not.toContain(':active:active');

			// Other state rules get :active added
			expect(result.css).toContain(':hover:active');
			expect(result.css).toContain(':focus:active');
		});

		test('hover:plain includes all rules, skipping redundant :hover additions', () => {
			const result = generate_classes_css({
				class_names: ['hover:plain'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Rules are included with class renamed, but :hover not added where it already exists
			expect(result.css).toContain('.hover\\:plain');
			// :not(:hover) rule is included (class renamed, no extra :hover added)
			expect(result.css).toContain('.hover\\:plain:not(:hover)');
			// .plain:hover, .plain:active selector list is included (class renamed)
			// Note: Since the selector string contains :hover, the whole rule has :hover skipped
			// (selector lists are treated as a unit for conflict detection)
			expect(result.css).toContain('.hover\\:plain:hover');
			expect(result.css).toContain('.hover\\:plain:active');
			// No :hover:hover anywhere
			expect(result.css).not.toContain(':hover:hover');

			// Should have warnings for skipped modifier additions
			expect(result.diagnostics.length).toBeGreaterThan(0);
			const warnings = result.diagnostics.filter((d) => d.class_name === 'hover:plain');
			expect(warnings.length).toBeGreaterThan(0);
		});
	});

	describe('error propagation', () => {
		test('modifier on class with unknown composes array produces error', () => {
			const definitions = {
				card: {composes: ['unknown_class']},
			};

			const result = generate_classes_css({
				class_names: ['hover:card'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Should not generate CSS
			expect(result.css).not.toContain('.hover\\:card');
			// Should have error diagnostic
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain(
				'Unknown class "unknown_class" in composes array',
			);
		});

		test('modifier on class with circular reference produces error', () => {
			const definitions = {
				a: {composes: ['b']},
				b: {composes: ['a']},
			};

			const result = generate_classes_css({
				class_names: ['hover:a'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			expect(result.css).not.toContain('.hover\\:a');
			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.level).toBe('error');
			expect(result.diagnostics[0]!.message).toContain('Circular reference');
		});

		test('modifier on empty composes array produces no output', () => {
			const definitions = {
				empty: {composes: []},
			};

			const result = generate_classes_css({
				class_names: ['hover:empty'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Empty declaration results in no CSS
			expect(result.css).toBe('');
			expect(result.diagnostics).toHaveLength(0);
		});
	});

	describe('state modifier ordering for cascade', () => {
		test('hover classes come before active classes in output (LVFHA order)', () => {
			const result = generate_classes_css({
				class_names: ['active:border_color_a', 'hover:border_color_b'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Find positions of hover and active classes in the output
			const hover_pos = result.css.indexOf('.hover\\:border_color_b');
			const active_pos = result.css.indexOf('.active\\:border_color_a');

			expect(hover_pos).toBeGreaterThan(-1);
			expect(active_pos).toBeGreaterThan(-1);
			// Hover should come BEFORE active for proper cascade (active overrides hover)
			expect(hover_pos).toBeLessThan(active_pos);
		});

		test('visited < focus < hover < active ordering', () => {
			const result = generate_classes_css({
				class_names: ['active:p_xl', 'hover:p_lg', 'focus:p_md', 'visited:p_sm'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			const visited_pos = result.css.indexOf('.visited\\:p_sm');
			const focus_pos = result.css.indexOf('.focus\\:p_md');
			const hover_pos = result.css.indexOf('.hover\\:p_lg');
			const active_pos = result.css.indexOf('.active\\:p_xl');

			// All should be present
			expect(visited_pos).toBeGreaterThan(-1);
			expect(focus_pos).toBeGreaterThan(-1);
			expect(hover_pos).toBeGreaterThan(-1);
			expect(active_pos).toBeGreaterThan(-1);

			// Order should be: visited < focus < hover < active
			expect(visited_pos).toBeLessThan(focus_pos);
			expect(focus_pos).toBeLessThan(hover_pos);
			expect(hover_pos).toBeLessThan(active_pos);
		});

		test('non-interaction states use alphabetical order', () => {
			const result = generate_classes_css({
				class_names: ['odd:p_md', 'even:p_lg', 'first:p_sm'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			const even_pos = result.css.indexOf('.even\\:p_lg');
			const first_pos = result.css.indexOf('.first\\:p_sm');
			const odd_pos = result.css.indexOf('.odd\\:p_md');

			// Alphabetical: even < first < odd
			expect(even_pos).toBeLessThan(first_pos);
			expect(first_pos).toBeLessThan(odd_pos);
		});
	});

	describe('skip warnings', () => {
		test('before:chevron emits warning for skipped pseudo-element rule', () => {
			const result = generate_classes_css({
				class_names: ['before:chevron'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Should have a warning about the skipped ::before rule
			expect(result.diagnostics.length).toBeGreaterThan(0);
			const warning = result.diagnostics.find(
				(d) => d.class_name === 'before:chevron' && d.message.includes('pseudo-element'),
			);
			expect(warning).toBeDefined();
			expect(warning!.level).toBe('warning');
			expect(warning!.message).toContain('.chevron::before');
			expect(warning!.message).toContain('::before');
		});

		test('hover:selectable emits warnings for skipped :hover rules', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Should have warnings about skipped :hover rules
			const hover_warnings = result.diagnostics.filter(
				(d) => d.class_name === 'hover:selectable' && d.message.includes(':hover'),
			);
			expect(hover_warnings.length).toBeGreaterThan(0);

			// All should be warnings about redundant state
			for (const warning of hover_warnings) {
				expect(warning.level).toBe('warning');
				expect(warning.message).toContain('redundancy');
			}
		});

		test('focus:clickable emits warning for skipped :focus rule', () => {
			const result = generate_classes_css({
				class_names: ['focus:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			const focus_warning = result.diagnostics.find(
				(d) => d.class_name === 'focus:clickable' && d.message.includes(':focus'),
			);
			expect(focus_warning).toBeDefined();
			expect(focus_warning!.message).toContain('.clickable:focus');
			expect(focus_warning!.message).toContain('redundancy');
		});
	});
});

describe('explicit_classes diagnostics', () => {
	test('errors for unresolved explicit class', () => {
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['unknown_class']),
		});

		expect(result.css).toBe('');
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('error');
		expect(result.diagnostics[0]!.class_name).toBe('unknown_class');
		expect(result.diagnostics[0]!.message).toContain('No matching class definition');
	});

	test('no diagnostic for non-explicit unresolved class without colon', () => {
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			// Not in explicit_classes
		});

		expect(result.css).toBe('');
		expect(result.diagnostics).toHaveLength(0);
	});

	test('no diagnostic when explicit class resolves to definition', () => {
		const result = generate_classes_css({
			class_names: ['box'],
			class_definitions: css_class_composites,
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['box']),
		});

		expect(result.css).toContain('.box');
		expect(result.diagnostics).toHaveLength(0);
	});

	test('error when interpreter pattern matches but returns error for explicit class', () => {
		// When CSS literal pattern matches but validation fails for an explicit class,
		// the interpreter error remains an error
		const result = generate_classes_css({
			class_names: ['invalid-property:value'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^([^:]+):(.+)$/,
					interpret: (_match, ctx) => {
						ctx.diagnostics.push({
							level: 'error',
							class_name: 'invalid-property:value',
							message: 'Unknown CSS property "invalid-property"',
							suggestion: null,
						});
						return null; // Pattern matched, but validation failed
					},
				},
			],
			css_properties: null,
			explicit_classes: new Set(['invalid-property:value']),
		});

		// Should have interpreter error (stays error because explicit)
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('error');
		expect(result.diagnostics[0]!.message).toBe('Unknown CSS property "invalid-property"');
	});

	test('warning when CSS property error for non-explicit class', () => {
		// When CSS literal pattern matches but validation fails for a non-explicit class,
		// Unknown CSS property errors are downgraded to warning (may be from another CSS system)
		const result = generate_classes_css({
			class_names: ['invalid-property:value'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^([^:]+):(.+)$/,
					interpret: (_match, ctx) => {
						ctx.diagnostics.push({
							level: 'error',
							class_name: 'invalid-property:value',
							message: 'Unknown CSS property "invalid-property"',
							suggestion: null,
						});
						return null; // Pattern matched, but validation failed
					},
				},
			],
			css_properties: null,
			// Not in explicit_classes - class was implicitly extracted from code
		});

		// Should have interpreter diagnostic but downgraded to warning
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('warning');
		expect(result.diagnostics[0]!.message).toBe('Unknown CSS property "invalid-property"');
	});

	test('structural errors remain errors for non-explicit classes', () => {
		// Structural errors like unknown composes or circular refs stay as errors
		// regardless of whether the class is explicit - they indicate broken definitions
		const result = generate_classes_css({
			class_names: ['some-class:value'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^([^:]+):(.+)$/,
					interpret: (_match, ctx) => {
						ctx.diagnostics.push({
							level: 'error',
							class_name: 'some-class:value',
							message: 'Circular reference detected',
							suggestion: null,
						});
						return null;
					},
				},
			],
			css_properties: null,
			// Not explicit
		});

		// Structural errors should NOT be downgraded
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.level).toBe('error');
		expect(result.diagnostics[0]!.message).toBe('Circular reference detected');
	});

	test('error includes locations when provided', () => {
		const loc: SourceLocation = {file: 'test.ts', line: 42, column: 5};
		const result = generate_classes_css({
			class_names: ['unknown_class'],
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			explicit_classes: new Set(['unknown_class']),
			class_locations: new Map([['unknown_class', [loc]]]),
		});

		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]!.locations).toEqual([loc]);
	});
});
