/**
 * Tests for how the base stylesheet parser treats at-rules: which tree-shake,
 * which always ship, which are errors (and still ship), and that the
 * variables of whatever ships are tracked at any nesting depth.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import {
	parse_style_css,
	create_style_rule_index,
	get_matching_rules,
	generate_base_css_by_layer,
	collect_rule_variables,
	type RuleLayer
} from '#lib/style_rule_parser.ts';

const VARIABLE = 'zz_var';

/**
 * What the contract promises for a construct at the top level:
 * - `tree_shaken` - ships only when the `button` it targets is detected
 * - `ships` - ships as written whatever is detected
 * - `skipped` - left out, silently
 */
type Outcome = 'tree_shaken' | 'ships' | 'skipped';

type ErrorIdentifier = 'base_css_layer' | 'base_css_unsupported_at_rule';

interface Kind {
	name: string;
	css: string;
	/** Whether `css` references `VARIABLE`. */
	has_variable: boolean;
	outcome: Outcome;
	/** The error the construct raises wherever it sits - it ships regardless. */
	error?: ErrorIdentifier;
}

const kinds: Array<Kind> = [
	{
		name: 'style rule',
		css: `button { color: var(--${VARIABLE}); }`,
		has_variable: true,
		outcome: 'tree_shaken'
	},
	{
		name: 'style rule with a nested @media',
		css: `button { @media (min-width: 1px) { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'tree_shaken'
	},
	{
		name: '@media',
		css: `@media (min-width: 1px) { button { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'tree_shaken'
	},
	{
		name: '@supports',
		css: `@supports (display: grid) { button { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'tree_shaken'
	},
	{
		name: '@container',
		css: `@container (min-width: 1px) { button { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'tree_shaken'
	},
	{
		name: '@scope',
		css: `@scope (.card) { button { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@starting-style',
		css: `@starting-style { button { opacity: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@keyframes',
		css: `@keyframes kf { from { opacity: var(--${VARIABLE}); } to { opacity: 1; } }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@-webkit-keyframes',
		css: `@-webkit-keyframes kf { from { opacity: var(--${VARIABLE}); } to { opacity: 1; } }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@font-face',
		css: `@font-face { font-family: "ff"; src: url(x.woff2); font-weight: var(--${VARIABLE}); }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@property',
		css: `@property --prop { syntax: '<length>'; inherits: false; initial-value: 0px; }`,
		has_variable: false,
		outcome: 'ships'
	},
	{
		name: '@counter-style',
		css: `@counter-style cs { system: cyclic; symbols: "x"; suffix: " "; }`,
		has_variable: false,
		outcome: 'ships'
	},
	{
		name: '@page',
		css: `@page { margin: var(--${VARIABLE}); }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@view-transition',
		css: `@view-transition { navigation: auto; }`,
		has_variable: false,
		outcome: 'ships'
	},
	{
		name: '@position-try',
		css: `@position-try --pt { top: var(--${VARIABLE}); }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@font-feature-values',
		css: `@font-feature-values Font One { @styleset { nice-style: 12; } }`,
		has_variable: false,
		outcome: 'ships'
	},
	{
		name: '@font-palette-values',
		css: `@font-palette-values --fp { font-family: Bixa; }`,
		has_variable: false,
		outcome: 'ships'
	},
	{
		name: '@function',
		css: `@function --fn(--a) { result: var(--${VARIABLE}); }`,
		has_variable: true,
		outcome: 'ships'
	},
	{
		name: '@custom-media',
		css: `@custom-media --cm (min-width: 1px);`,
		has_variable: false,
		outcome: 'ships'
	},
	{
		name: '@layer block',
		css: `@layer mine { button { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'ships',
		error: 'base_css_layer'
	},
	{
		name: 'anonymous @layer block',
		css: `@layer { button { color: var(--${VARIABLE}); } }`,
		has_variable: true,
		outcome: 'ships',
		error: 'base_css_layer'
	},
	{
		name: '@layer statement',
		css: `@layer mine_a, mine_b;`,
		has_variable: false,
		outcome: 'ships',
		error: 'base_css_layer'
	},
	{
		name: '@import',
		css: `@import url("x.css");`,
		has_variable: false,
		outcome: 'ships',
		error: 'base_css_unsupported_at_rule'
	},
	{
		name: '@namespace',
		css: `@namespace svg url(http://www.w3.org/2000/svg);`,
		has_variable: false,
		outcome: 'ships',
		error: 'base_css_unsupported_at_rule'
	},
	{
		name: '@charset',
		css: `@charset "utf-8";`,
		has_variable: false,
		outcome: 'skipped'
	}
];

interface Context {
	name: string;
	wrap: (css: string) => string;
	/** What is emitted for a construct that ships: itself, inside whatever isn't unwrapped. */
	emitted: (css: string) => string;
	layer: RuleLayer;
	/** The outcome for a construct inside this context, given its top-level outcome. */
	outcome: (top: Outcome) => Outcome;
	/** The error the context itself raises, ahead of the construct's own. */
	error?: ErrorIdentifier;
}

const same = (top: Outcome): Outcome => top;
// inside a conditional group the group is the unit: it tree-shakes by what it
// holds and always ships when it holds something that does - which a
// `@charset` there is, since only a top-level one is skipped
const in_group = (top: Outcome): Outcome => (top === 'skipped' ? 'ships' : top);
const in_media = (css: string): string => `@media (min-width: 2px) { ${css} }`;
const in_media_supports = (css: string): string =>
	`@media (min-width: 2px) { @supports (display: grid) { ${css} } }`;
const in_container = (css: string): string => `@container (min-width: 2px) { ${css} }`;
const in_custom_layer = (css: string): string => `@layer mine { ${css} }`;

const contexts: Array<Context> = [
	{
		name: 'at the top level',
		wrap: (css) => css,
		emitted: (css) => css,
		layer: 'fuz.base',
		outcome: same
	},
	{
		name: 'in @layer fuz.base',
		wrap: (css) => `@layer fuz.base { ${css} }`,
		emitted: (css) => css,
		layer: 'fuz.base',
		outcome: same
	},
	{
		name: 'in @layer fuz.preferences',
		wrap: (css) => `@layer fuz.preferences { ${css} }`,
		emitted: (css) => css,
		layer: 'fuz.preferences',
		outcome: same
	},
	{ name: 'in @media', wrap: in_media, emitted: in_media, layer: 'fuz.base', outcome: in_group },
	{
		name: 'in @media > @supports',
		wrap: in_media_supports,
		emitted: in_media_supports,
		layer: 'fuz.base',
		outcome: in_group
	},
	{
		name: 'in @layer fuz.base > @container',
		wrap: (css) => `@layer fuz.base { ${in_container(css)} }`,
		emitted: in_container,
		layer: 'fuz.base',
		outcome: in_group
	},
	{
		// an error, and like every other at-rule it ships as written
		name: 'in a custom @layer',
		wrap: in_custom_layer,
		emitted: in_custom_layer,
		layer: 'fuz.base',
		outcome: () => 'ships',
		error: 'base_css_layer'
	}
];

const cases = contexts.flatMap((context) =>
	kinds.map((kind) => {
		const errors = [context.error, kind.error].filter((e) => e !== undefined);
		const outcome = context.outcome(kind.outcome);
		return {
			label: `${kind.name} ${context.name}`,
			expected: errors.length > 0 ? `${outcome} with ${errors.join(' + ')}` : outcome,
			kind,
			context,
			outcome,
			errors
		};
	})
);

const DETECTED_BUTTON = new Set(['button']);
const NOTHING: Set<string> = new Set();

describe('at-rule contract', () => {
	test.each(cases)('$label: $expected', ({ kind, context, outcome, errors }) => {
		const index = parse_style_css(context.wrap(kind.css));

		// errors are reported, outermost first, and never remove CSS
		assert.deepEqual(
			index.diagnostics.map((d) => [d.level, d.identifier]),
			errors.map((identifier) => ['error', identifier])
		);

		if (outcome === 'skipped') {
			assert.deepEqual(index.rules, []);
			return;
		}

		assert.strictEqual(index.rules.length, 1);
		assert.strictEqual(index.rules[0]!.layer, context.layer);

		// emitted exactly as written, minus an unwrapped layer block
		const with_button = get_matching_rules(index, DETECTED_BUTTON, NOTHING);
		assert.strictEqual(
			generate_base_css_by_layer(index, with_button)[context.layer],
			context.emitted(kind.css)
		);

		// tree-shaking: left out when nothing it targets is detected
		const with_nothing = get_matching_rules(index, NOTHING, NOTHING);
		assert.strictEqual(with_nothing.size, outcome === 'ships' ? 1 : 0);

		// every variable of what ships is tracked, however deep the reference sits
		assert.strictEqual(collect_rule_variables(index, with_button).has(VARIABLE), kind.has_variable);
	});
});

describe('layer rules', () => {
	const layer_errors = (css: string): Array<string> =>
		parse_style_css(css).diagnostics
			.filter((d) => d.identifier === 'base_css_layer')
			.map((d) => d.message);

	test('a consumer layer order and its blocks are errors that ship as written, in order', () => {
		const statement = '@layer reset, components;';
		const components = '@layer components { button { color: red; } }';
		const reset = '@layer reset { button { color: blue; } }';
		const index = parse_style_css([statement, components, reset].join('\n'));

		assert.strictEqual(index.diagnostics.length, 3);
		for (const d of index.diagnostics) {
			assert.strictEqual(d.level, 'error');
			assert.strictEqual(d.identifier, 'base_css_layer');
		}
		assert.include(index.diagnostics[0]!.message, '`@layer reset, components` at line 1, but');
		assert.include(index.diagnostics[1]!.message, '`@layer components` at line 2, but');
		assert.include(index.diagnostics[2]!.message, '`@layer reset` at line 3, but');

		// nothing detected, and all three still ship: inside fuz.base they are
		// sublayers whose declared order holds
		const included = get_matching_rules(index, NOTHING, NOTHING);
		assert.strictEqual(
			generate_base_css_by_layer(index, included)['fuz.base'],
			[statement, components, reset].join('\n\n')
		);
	});

	test.each([
		['fuz.theme block', '@layer fuz.theme { :root { --brand: red; } }'],
		['fuz.utilities block', '@layer fuz.utilities { .mine { color: red; } }'],
		['a fuz sublayer', '@layer fuz.base.mine { button { color: red; } }'],
		['a reordered fuz statement', '@layer fuz.utilities, fuz.base;'],
		['a partial fuz statement', '@layer fuz.base, fuz.preferences;'],
		['an uppercase at-keyword', '@LAYER mine { button { color: red; } }'],
		['a layer nested in a style rule', 'button { @layer mine { color: red; } }']
	])('%s is an error and ships as written', (_name, css) => {
		const index = parse_style_css(css);
		assert.strictEqual(layer_errors(css).length, 1);
		assert.deepEqual(
			index.rules.map((r) => r.css),
			[css]
		);
	});

	test.each([
		[
			'a shipped name nested in a shipped block',
			'@layer fuz.base { @layer fuz.preferences { a {} } }',
			'@layer fuz.preferences { a {} }'
		],
		[
			'the order statement nested in a shipped block',
			'@layer fuz.base { @layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities; }',
			'@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;'
		]
	])('%s is an error and ships as written', (_name, css, emitted) => {
		const index = parse_style_css(css);
		assert.strictEqual(layer_errors(css).length, 1);
		assert.deepEqual(
			index.rules.map((r) => [r.layer, r.css]),
			[['fuz.base', emitted]]
		);
	});

	test('the shipped wrappers and order statement are recognized, whitespace aside', () => {
		const index = parse_style_css(
			`@layer fuz.base,fuz.preferences,  fuz.theme, fuz.utilities;
			@layer  fuz.preferences  { @media (prefers-contrast: more) { :root { --x: 1; } } }
			@layer fuz.base{ button { color: red; } }`
		);

		assert.deepEqual(index.diagnostics, []);
		assert.deepEqual(
			index.rules.map((r) => r.layer),
			['fuz.preferences', 'fuz.base']
		);
	});

	test.each([
		[
			'in a conditional group',
			'a { color: red; }\n@media print {\n\t@layer mine { a { color: red; } }\n}',
			'`@layer mine` at line 3, inside `@media print`,'
		],
		[
			'in a style rule',
			'button,\n.btn {\n\tcolor: red;\n\t@layer mine { color: blue; }\n}',
			'`@layer mine` at line 4, inside `button, .btn`,'
		],
		[
			'two levels down',
			'@media print { @supports (display: grid) { @layer { a { color: red; } } } }',
			'`@layer` at line 1, inside `@media print`,'
		]
	])('a nested layer names itself, its line, and the rule it sits in: %s', (_name, css, where) => {
		const messages = layer_errors(css);
		assert.strictEqual(messages.length, 1);
		assert.include(messages[0]!, where);
		assert.include(messages[0]!, 'it ships as written');
	});

	test.each([
		['at the top level', '@layer mine { a { color: red; } }', 'fuz.base'],
		['in @layer fuz.base', '@layer fuz.base { @layer mine { a { color: red; } } }', 'fuz.base'],
		[
			'in @layer fuz.preferences',
			'@layer fuz.preferences { @layer mine { :root { --x: 1; } } }',
			'fuz.preferences'
		],
		[
			'in a style rule in @layer fuz.preferences',
			'@layer fuz.preferences { :root { @layer mine { --x: 1; } } }',
			'fuz.preferences'
		]
	])('a layer error names the layer it becomes a sublayer of: %s', (_name, css, layer) => {
		const index = parse_style_css(css);
		assert.strictEqual(index.rules[0]!.layer, layer);
		const messages = layer_errors(css);
		assert.strictEqual(messages.length, 1);
		assert.isTrue(messages[0]!.endsWith(`as a sublayer of ${layer}`), messages[0]);
	});

	test('an unsupported at-rule names itself and its line the same way', () => {
		const index = parse_style_css(
			'a { color: red; }\n\n@import "x.css";\n@media print { @namespace svg url(x); }'
		);
		assert.deepEqual(
			index.diagnostics.map((d) => d.identifier),
			['base_css_unsupported_at_rule', 'base_css_unsupported_at_rule']
		);
		assert.include(index.diagnostics[0]!.message, '`@import "x.css"` at line 3, which');
		assert.include(
			index.diagnostics[1]!.message,
			'`@namespace svg url(x)` at line 4, inside `@media print`,'
		);
	});

	test('an error leaves every rule in place, in source order', () => {
		const index = parse_style_css(
			'button { color: red; }\n@layer mine { a { color: blue; } }\n@import "x.css";\ninput { color: green; }'
		);

		assert.deepEqual(
			index.rules.map((r) => r.css),
			[
				'button { color: red; }',
				'@layer mine { a { color: blue; } }',
				'@import "x.css";',
				'input { color: green; }'
			]
		);
		assert.deepEqual(
			index.diagnostics.map((d) => d.identifier),
			['base_css_layer', 'base_css_unsupported_at_rule']
		);
	});
});

describe('@charset', () => {
	test('a top-level @charset is skipped without a diagnostic', () => {
		const index = parse_style_css('@charset "utf-8";\n.caf\u00e9 { color: red; }');
		assert.deepEqual(index.diagnostics, []);
		assert.deepEqual(
			index.rules.map((r) => r.css),
			['.caf\u00e9 { color: red; }']
		);
	});
});

describe('conditional groups', () => {
	test('at-keywords match case-insensitively', () => {
		const index = parse_style_css('@MEDIA print { button { color: black; } }');
		assert.strictEqual(index.rules.length, 1);
		assert.isFalse(index.rules[0]!.is_core);
		assert.isTrue(index.rules[0]!.elements.has('button'));
	});

	test('a nested group contributes what it targets to the top-level unit', () => {
		const index = parse_style_css(
			'@media print { a { color: black; } @supports (display: grid) { .grid { display: grid; } } }'
		);
		const rule = index.rules[0]!;
		assert.isFalse(rule.is_core);
		assert.deepEqual([...rule.elements], ['a']);
		assert.deepEqual([...rule.classes], ['grid']);
		assert.strictEqual(get_matching_rules(index, NOTHING, new Set(['grid'])).size, 1);
		assert.strictEqual(get_matching_rules(index, NOTHING, NOTHING).size, 0);
	});

	test('a core rule two groups deep makes the unit core', () => {
		const index = parse_style_css(
			'@media print { @supports (display: grid) { :root { --x: 1; } } }'
		);
		assert.isTrue(index.rules[0]!.is_core);
		assert.strictEqual(index.rules[0]!.core_reason, 'conditional_core');
	});

	test('an always-shipped at-rule inside makes the unit core', () => {
		const index = parse_style_css(
			`@media (prefers-reduced-motion: no-preference) {
				button { animation: spin 1s; }
				@keyframes spin { to { rotate: var(--turn); } }
			}`
		);
		const rule = index.rules[0]!;
		assert.isTrue(rule.is_core);
		assert.strictEqual(rule.core_reason, 'conditional_core');
		assert.isTrue(rule.variables_used.has('turn'));
	});
});

describe('create_style_rule_index parse errors', () => {
	test('a syntax error is reported as a base_css problem with its cause', () => {
		let error: unknown;
		try {
			create_style_rule_index('button { color: red; }\ninput { color: blue;');
		} catch (err) {
			error = err;
		}
		assert(error instanceof Error);
		assert.match(error.message, /^base_css is not valid CSS: .+ \(line 2, column \d+\)$/);
		assert(error.cause instanceof Error);
		assert.include(error.message, error.cause.message.split('\n', 1)[0]!);
	});

	test('valid CSS parses like parse_style_css', () => {
		const css = 'button { color: red; }';
		assert.deepEqual(create_style_rule_index(css), parse_style_css(css));
	});
});
