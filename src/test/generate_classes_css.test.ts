import {test, describe, expect} from 'vitest';

import {
	generate_classes_css,
	type CssClassDefinitionInterpreter,
} from '$lib/css_class_generation.js';
import {css_class_composites} from '$lib/css_class_composites.js';
import {
	expect_css_contains,
	expect_css_not_contains,
	expect_css_order,
	expect_diagnostic,
	expect_no_diagnostic,
} from './test_helpers.js';

/**
 * Common class definitions used across multiple tests.
 */
const COMMON_DEFS = {
	p_lg: {declaration: 'padding: var(--space_lg);'},
	m_md: {declaration: 'margin: var(--space_md);'},
	rounded: {declaration: 'border-radius: var(--border_radius_md);'},
	shadow_md: {declaration: 'box-shadow: var(--shadow_md);'},
};

describe('generate_classes_css', () => {
	describe('escaping', () => {
		test('escapes class names with special characters', () => {
			const result = generate_classes_css({
				class_names: ['display:flex', 'opacity:80%'],
				class_definitions: {
					'display:flex': {declaration: 'display: flex;'},
					'opacity:80%': {declaration: 'opacity: 80%;'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '.display\\:flex { display: flex; }');
			expect_css_contains(result.css, '.opacity\\:80\\% { opacity: 80%; }');
			expect_css_not_contains(result.css, '.display:flex {', '.opacity:80% {');
		});

		test('escapes complex CSS-literal class names', () => {
			const result = generate_classes_css({
				class_names: ['hover:opacity:80%', 'nth-child(2n):color:red'],
				class_definitions: {
					'hover:opacity:80%': {declaration: 'opacity: 80%;'},
					'nth-child(2n):color:red': {declaration: 'color: red;'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.hover\\:opacity\\:80\\%',
				'.nth-child\\(2n\\)\\:color\\:red',
			);
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

			expect_css_contains(result.css, '.test-value', 'test-prop: value;');
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

			expect_css_contains(result.css, '@media (min-width: 800px)', 'display: flex;');
		});

		test('collects interpreter diagnostics', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^warn-(.+)$/,
				interpret: (matched, ctx) => {
					ctx.diagnostics.push({
						level: 'warning',
						message: 'test warning',
						identifier: matched[0],
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
			const result = generate_classes_css({
				class_names: ['test-class'],
				class_definitions: {
					'test-class': {declaration: 'color: red;', comment: 'Single line comment'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '/* Single line comment */');
		});

		test('renders multi-line comment as block', () => {
			const result = generate_classes_css({
				class_names: ['test-class'],
				class_definitions: {
					'test-class': {declaration: 'color: red;', comment: 'Line 1\nLine 2'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '/*\nLine 1\nLine 2\n*/');
		});

		test('renders comment on composes-based composite', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					...COMMON_DEFS,
					card: {composes: ['p_lg'], comment: 'Card component'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '/* Card component */', '.card {');
		});
	});

	describe('ruleset handling', () => {
		test('warns when single-selector ruleset could be declaration', () => {
			const result = generate_classes_css({
				class_names: ['simple'],
				class_definitions: {
					simple: {ruleset: '.simple { color: red; }'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '.simple { color: red; }');
			expect_diagnostic(result.diagnostics, 'warning', 'could be converted to declaration format');
		});

		test('does not warn for multi-selector ruleset', () => {
			const result = generate_classes_css({
				class_names: ['multi'],
				class_definitions: {
					multi: {
						ruleset: `.multi { color: red; }
.multi:hover { color: blue; }`,
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '.multi { color: red; }');
			expect_no_diagnostic(result.diagnostics, 'warning', 'could be converted');
		});

		test('warns when ruleset selectors do not contain expected class', () => {
			const result = generate_classes_css({
				class_names: ['clickable'],
				class_definitions: {
					clickable: {ruleset: `.foobar { cursor: pointer; }`},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, '.foobar { cursor: pointer; }');
			expect_diagnostic(result.diagnostics, 'warning', 'no selectors containing ".clickable"');
		});

		test('does not warn when ruleset contains expected class', () => {
			const result = generate_classes_css({
				class_names: ['clickable'],
				class_definitions: {
					clickable: {
						ruleset: `.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }`,
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_no_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});

		test('warns for partial class name match', () => {
			const result = generate_classes_css({
				class_names: ['clickable'],
				class_definitions: {
					clickable: {ruleset: `.clickable_extended { cursor: pointer; }`},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});

		test('warns for completely unrelated selectors', () => {
			const result = generate_classes_css({
				class_names: ['myclass'],
				class_definitions: {
					myclass: {
						ruleset: `
						.other { color: red; }
						.another:hover { color: blue; }
					`,
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});

		test('matches class followed by attribute selector', () => {
			const result = generate_classes_css({
				class_names: ['btn'],
				class_definitions: {
					btn: {ruleset: `.btn[disabled] { opacity: 0.5; }`},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_no_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});

		test('skips single-selector warning for ruleset with comment before at-rule', () => {
			const result = generate_classes_css({
				class_names: ['responsive'],
				class_definitions: {
					responsive: {
						ruleset: `/* responsive wrapper */ @media (width >= 48rem) { .responsive { display: flex; } }`,
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_no_diagnostic(result.diagnostics, 'warning', 'could be converted');
		});

		test('skips single-selector warning for nested at-rules', () => {
			const result = generate_classes_css({
				class_names: ['fancy'],
				class_definitions: {
					fancy: {
						ruleset: `@supports (display: grid) { @media (width >= 48rem) { .fancy { display: grid; } } }`,
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_no_diagnostic(result.diagnostics, 'warning', 'could be converted');
		});

		test('warns for empty ruleset', () => {
			const result = generate_classes_css({
				class_names: ['empty'],
				class_definitions: {
					empty: {ruleset: ''},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toBe('');
			expect_diagnostic(result.diagnostics, 'warning', 'is empty');
		});

		test('warns for whitespace-only ruleset', () => {
			const result = generate_classes_css({
				class_names: ['whitespace'],
				class_definitions: {
					whitespace: {ruleset: '   \n\t   '},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toBe('');
			expect_diagnostic(result.diagnostics, 'warning', 'is empty');
		});

		test('handles comment-only ruleset', () => {
			const result = generate_classes_css({
				class_names: ['commented'],
				class_definitions: {
					commented: {ruleset: '/* this ruleset is empty */'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});

		test('warns for static ruleset with special chars in class name', () => {
			const result = generate_classes_css({
				class_names: ['my:custom'],
				class_definitions: {
					'my:custom': {ruleset: `.other { color: red; }`},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});

		test('no warning for static ruleset with special chars when selector matches', () => {
			const result = generate_classes_css({
				class_names: ['my:custom'],
				class_definitions: {
					'my:custom': {ruleset: `.my\\:custom { color: red; }`},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_no_diagnostic(result.diagnostics, 'warning', 'no selectors containing');
		});
	});

	describe('sorting', () => {
		test('maintains definition order for known classes', () => {
			const class_definitions = {
				aaa: {declaration: 'a: a;'},
				zzz: {declaration: 'z: z;'},
				mmm: {declaration: 'm: m;'},
			};

			const result = generate_classes_css({
				class_names: ['mmm', 'aaa', 'zzz'],
				class_definitions,
				interpreters: [],
				css_properties: null,
			});

			expect_css_order(result.css, '.aaa', '.zzz', '.mmm');
		});

		test('sorts unknown classes alphabetically at end', () => {
			const result = generate_classes_css({
				class_names: ['unknown-b', 'known', 'unknown-a'],
				class_definitions: {
					known: {declaration: 'k: k;'},
				},
				interpreters: [],
				css_properties: null,
			});

			// known should be present, unknown classes without interpreter produce no output
			expect_css_contains(result.css, '.known');
			expect_css_not_contains(result.css, '.unknown-a', '.unknown-b');
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

			expect_css_order(result.css, '.int-aaa', '.int-bbb', '.int-ccc');
		});

		test('literal shorthand sorts before token longhand', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^.+:.+$/,
				interpret: (matched) => {
					const [prop, val] = matched[0].split(':');
					return `${prop}: ${val};`;
				},
			};

			const result = generate_classes_css({
				class_names: ['border_top_right_radius_sm', 'border-radius:0'],
				class_definitions: {
					border_radius_sm: {declaration: 'border-radius: var(--border_radius_sm);'},
					border_top_right_radius_sm: {
						declaration: 'border-top-right-radius: var(--border_radius_sm);',
					},
				},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect_css_order(result.css, 'border-radius\\:0', 'border_top_right_radius_sm');
		});

		test('literal longhand sorts after token shorthand', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^.+:.+$/,
				interpret: (matched) => {
					const [prop, val] = matched[0].split(':');
					return `${prop}: ${val};`;
				},
			};

			const result = generate_classes_css({
				class_names: ['border-top-right-radius:5px', 'border_radius_sm'],
				class_definitions: {
					border_radius_sm: {declaration: 'border-radius: var(--border_radius_sm);'},
					border_top_right_radius_sm: {
						declaration: 'border-top-right-radius: var(--border_radius_sm);',
					},
				},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect_css_order(result.css, 'border_radius_sm', 'border-top-right-radius\\:5px');
		});

		test('both literal shorthand and longhand sort correctly', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^.+:.+$/,
				interpret: (matched) => {
					const [prop, val] = matched[0].split(':');
					return `${prop}: ${val};`;
				},
			};

			const result = generate_classes_css({
				class_names: ['border-top-right-radius:5px', 'border-radius:0'],
				class_definitions: {
					border_radius_sm: {declaration: 'border-radius: var(--border_radius_sm);'},
					border_top_right_radius_sm: {
						declaration: 'border-top-right-radius: var(--border_radius_sm);',
					},
				},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect_css_order(result.css, 'border-radius\\:0', 'border-top-right-radius\\:5px');
		});

		test('modified literal shorthand sorts before token longhand', () => {
			const interpreter: CssClassDefinitionInterpreter = {
				pattern: /^.+:.+$/,
				interpret: (matched) => {
					const parts = matched[0].split(':');
					const prop = parts.at(-2);
					const val = parts.at(-1);
					return `${prop}: ${val};`;
				},
			};

			const result = generate_classes_css({
				class_names: ['border_top_right_radius_sm', 'hover:border-radius:0'],
				class_definitions: {
					border_radius_sm: {declaration: 'border-radius: var(--border_radius_sm);'},
					border_top_right_radius_sm: {
						declaration: 'border-top-right-radius: var(--border_radius_sm);',
					},
				},
				interpreters: [interpreter],
				css_properties: null,
			});

			expect_css_order(result.css, 'hover\\:border-radius\\:0', 'border_top_right_radius_sm');
		});
	});

	describe('composes property', () => {
		test('composes-only composite', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					...COMMON_DEFS,
					card: {composes: ['p_lg', 'rounded']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.card {',
				'padding: var(--space_lg);',
				'border-radius: var(--border_radius_md);',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('composes + declaration composite', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					...COMMON_DEFS,
					card: {composes: ['p_lg', 'rounded'], declaration: '--card-bg: var(--shade_10);'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.card {',
				'padding: var(--space_lg);',
				'border-radius: var(--border_radius_md);',
				'--card-bg: var(--shade_10);',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('nested composes composition', () => {
			const result = generate_classes_css({
				class_names: ['panel'],
				class_definitions: {
					...COMMON_DEFS,
					panel_base: {composes: ['p_lg', 'rounded']},
					panel: {composes: ['panel_base', 'shadow_md']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.panel {',
				'padding: var(--space_lg);',
				'border-radius: var(--border_radius_md);',
				'box-shadow: var(--shadow_md);',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('unknown class in composes array produces error', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					...COMMON_DEFS,
					card: {composes: ['p_lg', 'unknown_class']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_not_contains(result.css, '.card');
			expect_diagnostic(
				result.diagnostics,
				'error',
				'Unknown class "unknown_class" in composes array',
			);
		});

		test('circular reference in composes produces error', () => {
			const result = generate_classes_css({
				class_names: ['a'],
				class_definitions: {
					a: {composes: ['b']},
					b: {composes: ['a']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_not_contains(result.css, '.a');
			expect_diagnostic(result.diagnostics, 'error', 'Circular reference');
		});

		test('ruleset class in composes array produces error', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					clickable: {
						ruleset: `.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }`,
					},
					card: {composes: ['clickable']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_not_contains(result.css, '.card');
			expect_diagnostic(result.diagnostics, 'error', 'Cannot reference ruleset class');
		});

		test('self-referencing class produces error', () => {
			const result = generate_classes_css({
				class_names: ['self_ref'],
				class_definitions: {
					self_ref: {composes: ['self_ref']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_not_contains(result.css, '.self_ref');
			expect_diagnostic(result.diagnostics, 'error', 'Circular reference');
		});

		test('empty composes array produces no CSS output', () => {
			const result = generate_classes_css({
				class_names: ['empty_card'],
				class_definitions: {
					empty_card: {composes: []},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.css).toBe('');
			expect(result.diagnostics).toHaveLength(0);
		});

		test('diamond dependency pattern deduplicates silently', () => {
			const result = generate_classes_css({
				class_names: ['diamond'],
				class_definitions: {
					base: {declaration: 'color: red;'},
					branch_a: {composes: ['base'], declaration: 'font-size: 1rem;'},
					branch_b: {composes: ['base'], declaration: 'font-weight: bold;'},
					diamond: {composes: ['branch_a', 'branch_b']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.diamond {',
				'color: red;',
				'font-size: 1rem;',
				'font-weight: bold;',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('longer cycle (a → b → c → a) produces error', () => {
			const result = generate_classes_css({
				class_names: ['a'],
				class_definitions: {
					a: {composes: ['b']},
					b: {composes: ['c']},
					c: {composes: ['a']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect_css_not_contains(result.css, '.a');
			expect_diagnostic(result.diagnostics, 'error', 'Circular reference');
			expect(result.diagnostics[0]!.message).toContain('a → b → c → a');
		});
	});

	describe('class_locations', () => {
		test('diagnostics include locations when provided', () => {
			const loc = {file: 'test.svelte', line: 10, column: 5};
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					card: {composes: ['unknown']},
				},
				interpreters: [],
				css_properties: null,
				class_locations: new Map([['card', [loc]]]),
			});

			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.locations).toEqual([loc]);
		});

		test('diagnostics have null locations when not provided', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					card: {composes: ['unknown']},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.diagnostics).toHaveLength(1);
			expect(result.diagnostics[0]!.locations).toBeNull();
		});
	});

	describe('variables_used tracking', () => {
		test('tracks variables from declaration classes', () => {
			const result = generate_classes_css({
				class_names: ['p_lg'],
				class_definitions: {
					p_lg: {declaration: 'padding: var(--space_lg);'},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.variables_used.has('space_lg')).toBe(true);
		});

		test('tracks variables from composed classes', () => {
			const result = generate_classes_css({
				class_names: ['card'],
				class_definitions: {
					base: {declaration: 'color: var(--color_a_5);'},
					extended: {composes: ['base'], declaration: 'margin: var(--space_md);'},
					card: {composes: ['extended']},
				},
				interpreters: [],
				css_properties: null,
			});

			// Should track variables from entire composition chain
			expect(result.variables_used.has('color_a_5')).toBe(true);
			expect(result.variables_used.has('space_md')).toBe(true);
		});

		test('tracks variables from ruleset classes', () => {
			const result = generate_classes_css({
				class_names: ['themed'],
				class_definitions: {
					themed: {
						ruleset: `.themed { background: var(--bg_1); color: var(--text_color_1); }`,
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.variables_used.has('bg_1')).toBe(true);
			expect(result.variables_used.has('text_color_1')).toBe(true);
		});

		test('tracks multiple variables from single declaration', () => {
			const result = generate_classes_css({
				class_names: ['multi'],
				class_definitions: {
					multi: {
						declaration: 'padding: var(--space_sm) var(--space_md); margin: var(--space_lg);',
					},
				},
				interpreters: [],
				css_properties: null,
			});

			expect(result.variables_used.has('space_sm')).toBe(true);
			expect(result.variables_used.has('space_md')).toBe(true);
			expect(result.variables_used.has('space_lg')).toBe(true);
		});

		test('deduplicates variables across classes', () => {
			const result = generate_classes_css({
				class_names: ['a', 'b'],
				class_definitions: {
					a: {declaration: 'padding: var(--space_md);'},
					b: {declaration: 'margin: var(--space_md);'},
				},
				interpreters: [],
				css_properties: null,
			});

			// Set naturally deduplicates
			expect(result.variables_used.size).toBe(1);
			expect(result.variables_used.has('space_md')).toBe(true);
		});
	});

	describe('compact composite', () => {
		test('generates compact class with density overrides', () => {
			const result = generate_classes_css({
				class_names: ['compact'],
				class_definitions: css_class_composites,
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.compact {',
				'--font_size: var(--font_size_sm);',
				'--input_height: var(--space_xl3);',
				'--input_height_sm: var(--space_xl2);',
				'--input_padding_x: var(--space_sm);',
				'--min_height: var(--space_xl3);',
				'--border_radius: var(--border_radius_xs2);',
				'--icon_size: var(--icon_size_sm);',
				'--menu_item_padding: var(--space_xs4) var(--space_xs3);',
				'--flow_margin: var(--space_md);',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('compact tracks used variables', () => {
			const result = generate_classes_css({
				class_names: ['compact'],
				class_definitions: css_class_composites,
				interpreters: [],
				css_properties: null,
			});

			expect(result.variables_used.has('font_size_sm')).toBe(true);
			expect(result.variables_used.has('space_xl3')).toBe(true);
			expect(result.variables_used.has('space_xl2')).toBe(true);
			expect(result.variables_used.has('space_sm')).toBe(true);
			expect(result.variables_used.has('border_radius_xs2')).toBe(true);
			expect(result.variables_used.has('icon_size_sm')).toBe(true);
			expect(result.variables_used.has('space_xs4')).toBe(true);
			expect(result.variables_used.has('space_xs3')).toBe(true);
			expect(result.variables_used.has('space_md')).toBe(true);
		});
	});

	describe('flow margin composites', () => {
		test('mb_flow generates flow-aware margin-bottom', () => {
			const result = generate_classes_css({
				class_names: ['mb_flow'],
				class_definitions: css_class_composites,
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.mb_flow {',
				'margin-bottom: var(--flow_margin, var(--space_lg));',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('mt_flow generates flow-aware margin-top', () => {
			const result = generate_classes_css({
				class_names: ['mt_flow'],
				class_definitions: css_class_composites,
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(
				result.css,
				'.mt_flow {',
				'margin-top: var(--flow_margin, var(--space_lg));',
			);
			expect(result.diagnostics).toHaveLength(0);
		});

		test('mb_flow tracks space_lg variable', () => {
			const result = generate_classes_css({
				class_names: ['mb_flow'],
				class_definitions: css_class_composites,
				interpreters: [],
				css_properties: null,
			});

			expect(result.variables_used.has('space_lg')).toBe(true);
		});
	});

	describe('composite fallback patterns', () => {
		test.each(['chip', 'pane', 'panel'])(
			'%s uses var(--border_radius, var(--border_radius_xs))',
			(name) => {
				const result = generate_classes_css({
					class_names: [name],
					class_definitions: css_class_composites,
					interpreters: [],
					css_properties: null,
				});

				expect_css_contains(result.css, 'var(--border_radius, var(--border_radius_xs))');
			},
		);

		test('chip uses var(--font_size, inherit)', () => {
			const result = generate_classes_css({
				class_names: ['chip'],
				class_definitions: css_class_composites,
				interpreters: [],
				css_properties: null,
			});

			expect_css_contains(result.css, 'font-size: var(--font_size, inherit)');
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

			expect_css_contains(result.css, 'from-static: true;');
			expect_css_not_contains(result.css, 'from-interpreter');
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

			expect_css_contains(result.css, 'first: true;');
			expect_css_not_contains(result.css, 'second');
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

			expect_css_contains(result.css, 'second: true;');
		});
	});
});
