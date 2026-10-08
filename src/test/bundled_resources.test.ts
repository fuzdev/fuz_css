/**
 * Tests for building the bundled CSS resources from generator options: how
 * each `base_css` form resolves, how a stylesheet that can't be parsed is
 * reported, and that the default path is unaffected by which form reaches it.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import {
	create_bundled_resources,
	type CreateBundledResourcesOptions
} from '$lib/bundled_resources.ts';
import { generate_css, type GenerateCssResult } from '$lib/generate_css.ts';
import { merge_class_definitions } from '$lib/css_class_definitions.ts';
import { css_class_interpreters } from '$lib/css_class_interpreters.ts';
import { default_cache_deps } from '$lib/deps_defaults.ts';
import { load_default_style_css } from '$lib/style_rule_parser.ts';
import type { BaseCssOption, VariablesOption } from '$lib/css_plugin_options.ts';
import { default_variables } from '$lib/variables.ts';

const class_definitions = merge_class_definitions(undefined, true);

const create_resources = (
	options: Partial<CreateBundledResourcesOptions> = {}
): ReturnType<typeof create_bundled_resources> =>
	create_bundled_resources({
		base_css: undefined,
		variables: undefined,
		deps: default_cache_deps,
		...options
	});

interface GenerateOptions {
	base_css?: BaseCssOption;
	variables?: VariablesOption;
	elements?: Array<string>;
	classes?: Array<string>;
	additional_elements?: 'all';
	exclude_variables?: Array<string>;
}

/** Runs the generators' shared path: options → resources → `generate_css`. */
const generate = async (options: GenerateOptions = {}): Promise<GenerateCssResult> => {
	const {
		base_css,
		variables,
		elements = [],
		classes = [],
		additional_elements,
		exclude_variables
	} = options;
	const include_base = base_css !== null;
	const include_theme = variables !== null;
	const all_classes = new Set(classes);
	return generate_css({
		all_classes,
		all_classes_with_locations: new Map(classes.map((c) => [c, null])),
		explicit_classes: null,
		all_elements: new Set(elements),
		explicit_elements: null,
		explicit_variables: null,
		extraction_diagnostics: [],
		detected_css_variables: new Set(),
		class_definitions,
		interpreters: css_class_interpreters,
		css_properties: null,
		include_base,
		include_theme,
		resources:
			include_base || include_theme ? await create_resources({ base_css, variables }) : null,
		additional_elements,
		exclude_variables
	});
};

const identifiers = (result: GenerateCssResult): Array<string> =>
	result.diagnostics.map((d) => ('identifier' in d ? d.identifier : d.message));

const USAGES: Array<GenerateOptions> = [
	{},
	{ elements: ['button', 'a', 'input', 'h1', 'p'], classes: ['p_md', 'selected', 'md:gap_lg'] },
	{ additional_elements: 'all' }
];

describe('create_bundled_resources', () => {
	describe('the default stylesheet', () => {
		test('has no rule that ships only because a selector is unmatchable', async () => {
			// every untargetable rule names no element or class at all, so the
			// per-selector and escape checks change nothing for the defaults
			const { style_rule_index } = await create_resources();
			const untargetable = style_rule_index.rules.filter((r) => r.core_reason === 'untargetable');
			assert.isAbove(untargetable.length, 0);
			for (const rule of untargetable) {
				assert.strictEqual(rule.elements.size + rule.classes.size, 0, rule.css.slice(0, 80));
			}
		});

		test('parses with no diagnostics', async () => {
			const { style_rule_index } = await create_resources();
			assert.deepEqual(style_rule_index.diagnostics, []);
			assert.isAbove(style_rule_index.rules.length, 0);
		});

		test('ships every top-level rule it contains, as written and in order', async () => {
			const { style_rule_index } = await create_resources();
			const css = await load_default_style_css(default_cache_deps);

			// each indexed rule is a verbatim slice of the source, in source order
			let offset = 0;
			for (const rule of style_rule_index.rules) {
				const at = css.indexOf(rule.css, offset);
				assert.notStrictEqual(at, -1, `rule not found in order: ${rule.css.slice(0, 60)}`);
				offset = at + rule.css.length;
			}
			// and between them is nothing but the shipped layer wrappers, the
			// order statement, comments, and whitespace
			let remainder = css;
			for (const rule of style_rule_index.rules) {
				remainder = remainder.replace(rule.css, '');
			}
			remainder = remainder
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace('@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;', '')
				.replace(/@layer fuz\.(base|preferences) \{/g, '')
				.replace(/[\s}]/g, '');
			assert.strictEqual(remainder, '');
		});

		test.each(USAGES)('generates the same CSS through every base_css form: %j', async (usage) => {
			const default_css = await load_default_style_css(default_cache_deps);

			const from_default = await generate(usage);
			const from_callback = await generate({ ...usage, base_css: (css) => css });
			const from_string = await generate({ ...usage, base_css: default_css });

			assert.deepEqual(from_default.diagnostics, []);
			assert.isAbove(from_default.css.length, 0);
			assert.strictEqual(from_callback.css, from_default.css);
			assert.strictEqual(from_string.css, from_default.css);
			assert.deepEqual(from_callback.diagnostics, []);
			assert.deepEqual(from_string.diagnostics, []);
		});
	});

	describe('base_css forms', () => {
		test('a string replaces the default stylesheet', async () => {
			const { style_rule_index } = await create_resources({ base_css: 'button { color: red; }' });
			assert.deepEqual(
				style_rule_index.rules.map((r) => r.css),
				['button { color: red; }']
			);
		});

		test('a callback receives the default stylesheet and its additions land in fuz.base', async () => {
			let received = '';
			const result = await generate({
				base_css: (css) => {
					received = css;
					return css + '\n\n.appended { color: red; }';
				},
				classes: ['appended']
			});

			assert.strictEqual(received, await load_default_style_css(default_cache_deps));
			assert.deepEqual(result.diagnostics, []);
			// the last rule inside the base layer block, not unlayered after it
			const appended = '.appended { color: red; }';
			const base_start = result.css.indexOf('/* Base Styles */\n\n@layer fuz.base {');
			const base_end = result.css.indexOf(`${appended}\n}\n\n/* User-Preference Mappings */`);
			assert.notStrictEqual(base_start, -1);
			assert.isAbove(base_end, base_start);
		});

		test('null still builds the index from the default stylesheet', async () => {
			const { style_rule_index } = await create_resources({ base_css: null });
			assert.isTrue(style_rule_index.by_element.has('button'));
		});
	});

	describe('unparseable base_css', () => {
		const assert_rejects = async (base_css: BaseCssOption): Promise<Error> => {
			let error: unknown;
			try {
				await create_resources({ base_css });
			} catch (err) {
				error = err;
			}
			assert(error instanceof Error, 'expected create_bundled_resources to reject');
			return error;
		};

		test.each([
			['an unclosed block', 'button { color: red;'],
			['a line comment', '// reset\nbutton { color: red; }']
		])('a string with %s names base_css and keeps the cause', async (_name, base_css) => {
			const error = await assert_rejects(base_css);
			assert.match(error.message, /^base_css is not valid CSS: .+ \(line \d+, column \d+\)$/);
			assert(error.cause instanceof Error);
		});

		test('a callback returning invalid CSS is reported the same way', async () => {
			const error = await assert_rejects((css) => css + '\nbutton {');
			assert.match(error.message, /^base_css is not valid CSS: /);
		});

		test.each([
			['undefined', undefined, 'undefined'],
			['null', null, 'null'],
			['a number', 1, 'number'],
			['an object', { css: '' }, 'object']
		])('a callback returning %s names the callback', async (_name, value, type) => {
			const error = await assert_rejects((() => value) as unknown as BaseCssOption);
			assert.strictEqual(
				error.message,
				`The base_css callback must return a CSS string, got ${type}`
			);
		});

		test('an empty or comment-only stylesheet is valid', async () => {
			for (const base_css of ['', '/* nothing yet */']) {
				const { style_rule_index } = await create_resources({ base_css });
				assert.deepEqual(style_rule_index.rules, []);
				assert.deepEqual(style_rule_index.diagnostics, []);
			}
		});
	});

	describe('diagnostics through the generators path', () => {
		test('layer and unsupported at-rule errors reach generate_css', async () => {
			const result = await generate({
				base_css: '@layer reset, components;\n@import "x.css";\nbutton { color: red; }',
				variables: [],
				elements: ['button']
			});

			assert.deepEqual(identifiers(result), ['base_css_layer', 'base_css_unsupported_at_rule']);
			// reported, and shipped as written inside the base layer
			assert.include(
				result.css,
				'@layer fuz.base {\n@layer reset, components;\n\n@import "x.css";\n\nbutton { color: red; }\n}'
			);
		});

		test.each([
			['variables: null', null, 'theme output is disabled (variables: null): --'],
			['variables: []', [], 'the configured variables do not define: --'],
			[
				'variables filtered of a default',
				(d) => d.filter((v) => v.name !== 'font_family'),
				'the configured variables do not define: --font_family'
			]
		] as Array<
			[string, VariablesOption, string]
		>)('the default base styles with %s raise undefined_theme_variables once', async (_name, variables, expected) => {
			const result = await generate({ variables, elements: ['button'] });
			assert.deepEqual(identifiers(result), ['undefined_theme_variables']);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, expected);
		});

		test('excluding the default set pairs base styles with a separately imported theme', async () => {
			const result = await generate({
				variables: null,
				exclude_variables: default_variables.map((v) => v.name),
				additional_elements: 'all',
				classes: ['p_md']
			});
			assert.deepEqual(result.diagnostics, []);
			assert.include(result.css, '/* Base Styles */');
			assert.notInclude(result.css, '/* Theme Variables */');
		});

		test.each([
			['utility-only mode', { base_css: null, variables: null }],
			['base styles off with the default variables', { base_css: null }],
			['base styles off with no variables', { base_css: null, variables: [] }],
			[
				'a variable-free base with variables: null',
				{ base_css: 'a { color: red; }', variables: null }
			]
		] as Array<[string, GenerateOptions]>)('%s is silent', async (_name, options) => {
			const result = await generate({ ...options, elements: ['button', 'a'], classes: ['p_md'] });
			assert.deepEqual(
				result.diagnostics.filter((d) => d.level === 'error'),
				[]
			);
		});
	});
});

describe('the default bundle pulls each knob chain a base rule reads', () => {
	const declared = (css: string, name: string): boolean => css.includes(`--${name}:`);

	test('a button brings the control radius through its tier to the radius knobs', async () => {
		const { css } = await generate({ elements: ['button'] });
		for (const name of [
			'control_radius',
			'border_radius_sm',
			'border_radius_min',
			'radius_scale'
		]) {
			assert.isTrue(declared(css, name), name);
		}
	});

	test('body text brings the md size and the size scale', async () => {
		const { css } = await generate({ elements: ['body'] });
		for (const name of ['font_size_md', 'font_size_scale']) {
			assert.isTrue(declared(css, name), name);
		}
	});

	test('the page ground brings its own chroma', async () => {
		const { css } = await generate({ elements: [] });
		for (const name of ['shade_00', 'shade_chroma_00']) {
			assert.isTrue(declared(css, name), name);
		}
	});
});
