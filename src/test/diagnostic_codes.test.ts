import { test, assert, describe } from 'vitest';
import { readFileSync } from 'node:fs';

import type { DiagnosticCode, GenerationDiagnostic } from '#lib/diagnostics.ts';
import { extract_from_svelte, extract_from_ts } from '#lib/css_class_extractor.ts';
import {
	generate_classes_css,
	type CssClassDefinition,
	type CssClassDefinitionInterpreter,
	type CssClassDefinitionStatic
} from '#lib/css_class_generation.ts';
import { css_class_interpreters } from '#lib/css_class_interpreters.ts';
import { css_class_composites } from '#lib/css_class_composites.ts';
import { parse_css_literal } from '#lib/css_literal.ts';
import { resolve_css } from '#lib/css_bundled_resolution.ts';
import { parse_style_css } from '#lib/style_rule_parser.ts';
import { bake_theme, build_variable_graph } from '#lib/variable_graph.ts';
import { generate_css, type GenerateCssOptions } from '#lib/generate_css.ts';
import type { StyleVariable } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';
import { create_test_fixtures, empty_detection } from './css_bundled_resolution_fixtures.ts';

const css_properties = new Set(['color', 'content', 'display', 'width']);

// what one emitted diagnostic carries that this suite pins
interface Emitted {
	code: DiagnosticCode;
	/** The subject, or null for extraction diagnostics, which have none. */
	identifier: string | null;
}

const to_emitted = (
	diagnostics: Array<{ code: DiagnosticCode; identifier?: string }> | null
): Array<Emitted> =>
	(diagnostics ?? []).map((d) => ({ code: d.code, identifier: d.identifier ?? null }));

const classes = (
	class_name: string,
	class_definitions: Record<string, CssClassDefinition | undefined> = {},
	interpreters: Array<CssClassDefinitionInterpreter> = css_class_interpreters
): Array<Emitted> =>
	to_emitted(
		generate_classes_css({
			class_names: [class_name],
			class_definitions,
			interpreters,
			css_properties,
			explicit_classes: new Set([class_name])
		}).diagnostics
	);

const resolution = (
	css: string,
	variables: Array<StyleVariable>,
	options: Partial<Parameters<typeof resolve_css>[0]> = {}
): Array<Emitted> =>
	to_emitted(
		resolve_css({ ...create_test_fixtures(css, variables), ...empty_detection(), ...options })
			.diagnostics
	);

const bake = (theme: Parameters<typeof bake_theme>[0]): Array<Emitted> => {
	const diagnostics: Array<GenerationDiagnostic> = [];
	bake_theme(theme, default_variables, diagnostics);
	return to_emitted(diagnostics);
};

const css = (overrides: Partial<GenerateCssOptions>): Array<Emitted> =>
	to_emitted(
		generate_css({
			all_classes: new Set(),
			all_classes_with_locations: new Map(),
			explicit_classes: null,
			all_elements: new Set(),
			explicit_elements: null,
			explicit_variables: null,
			extraction_diagnostics: [],
			detected_css_variables: new Set(),
			class_definitions: {},
			interpreters: [],
			css_properties: null,
			include_base: false,
			include_theme: false,
			resources: null,
			...overrides
		}).diagnostics
	);

const declaration = (d: string): CssClassDefinitionStatic => ({ declaration: d });

/**
 * One input per code, with the diagnostics it emits. Typed as a record over
 * `DiagnosticCode`, so a code added to the union fails to compile until it
 * has a case here.
 */
const cases: Record<DiagnosticCode, () => Array<Emitted>> = {
	file_parse_failed: () => to_emitted(extract_from_svelte('{#if x}', 'a.svelte').diagnostics),
	hint_colon: () => to_emitted(extract_from_ts('// @fuz-classes: p_md\n', 'a.ts').diagnostics),
	class_unresolved: () => classes('nope'),
	class_literal_syntax: () => {
		const result = parse_css_literal('display', css_properties);
		assert(!result.ok);
		return to_emitted([result.error]);
	},
	class_property_unknown: () => classes('colr:red'),
	class_value_uncontained: () => classes('content:"ab'),
	class_calc_spacing: () => classes('width:calc(100%-20px)'),
	class_modifier_unknown: () => classes('hovr:color:red'),
	class_modifier_order: () => classes('hover:md:color:red'),
	class_modifier_conflict: () => classes('sm:md:color:red'),
	class_modifier_skipped: () => classes('before:chevron', css_class_composites, []),
	class_declaration_empty: () => classes('e', { e: declaration('') }),
	class_ruleset_empty: () => classes('r', { r: { ruleset: '  ' } }),
	class_ruleset_invalid: () => classes('r', { r: { ruleset: '.r { color: red; } }' } }),
	class_ruleset_unselected: () =>
		classes('r', { r: { ruleset: '.x { color: red; } .y { color: blue; }' } }),
	class_ruleset_single: () => classes('r', { r: { ruleset: '.r { color: red; }' } }),
	class_composes_unknown: () => classes('a', { a: { composes: ['nope'] } }),
	class_composes_cycle: () => classes('a', { a: { composes: ['b'] }, b: { composes: ['a'] } }),
	class_composes_redundant: () =>
		classes('a', {
			a: { composes: ['b', 'c'] },
			b: { composes: ['c'] },
			c: declaration('color: red;')
		}),
	class_composes_modified: () =>
		classes('a', { a: { composes: ['hover:b'] }, b: declaration('color: red;') }),
	class_composes_interpreter: () =>
		classes('a', { a: { composes: ['i'] }, i: { pattern: /^i$/, interpret: () => null } }),
	class_composes_ruleset: () =>
		classes('a', {
			a: { composes: ['r'] },
			r: { ruleset: '.r { color: red; } .r:hover { color: blue; }' }
		}),
	class_interpreter: () =>
		classes('x', {}, [
			{
				pattern: /^x$/,
				interpret: (_matched, ctx) => {
					ctx.diagnostics.push({
						code: 'class_interpreter',
						level: 'warning',
						message: 'reported by the interpreter',
						suggestion: null,
						identifier: 'x'
					});
					return { declaration: 'color: red;' };
				}
			}
		]),
	element_unstyled: () =>
		resolution('', [], { detected_elements: new Set(['blink']), warn_unmatched_elements: true }),
	element_unknown: () => resolution('', [], { explicit_elements: new Set(['blink']) }),
	variable_unknown: () => resolution('', [], { explicit_variables: new Set(['nope']) }),
	variable_misspelled: () =>
		resolution('', [{ name: 'color_primary', base: 'blue' }], {
			detected_css_variables: new Set(['color_primry'])
		}),
	variable_excluded_referenced: () =>
		resolution('a { color: var(--brand); }', [{ name: 'brand', base: 'red' }], {
			detected_elements: new Set(['a']),
			exclude_variables: ['brand']
		}),
	variable_cycle: () =>
		resolution(
			'',
			[
				{ name: 'a', base: 'var(--b)' },
				{ name: 'b', base: 'var(--a)' }
			],
			{ detected_css_variables: new Set(['a']) }
		),
	variable_value_uncontained: () =>
		to_emitted(build_variable_graph([{ name: 'x', base: 'red;' }]).diagnostics),
	base_css_variables_undefined: () =>
		css({
			all_elements: new Set(['a']),
			include_base: true,
			include_theme: true,
			resources: create_test_fixtures('a { color: var(--text_color); }', [])
		}),
	base_css_layer: () =>
		to_emitted(parse_style_css('@layer mine { a { color: red; } }').diagnostics),
	base_css_unsupported_at_rule: () => to_emitted(parse_style_css('@import "x.css";').diagnostics),
	theme_discarded: () => css({ theme: { name: 't', variables: [] } }),
	theme_lint: () => bake({ name: 't', variables: [{ name: 'nope', base: '1' }] }),
	theme_gate_failed: () => bake(marquee_theme),
	theme_gate_unchecked: () => bake({ name: 't', variables: [{ name: 'hue_j', base: 'var(--x)' }] })
};

// the subject each case's diagnostic names
const subjects: Record<DiagnosticCode, string | null> = {
	file_parse_failed: null,
	hint_colon: null,
	class_unresolved: 'nope',
	class_literal_syntax: 'display',
	class_property_unknown: 'colr:red',
	class_value_uncontained: 'content:"ab',
	class_calc_spacing: 'width:calc(100%-20px)',
	class_modifier_unknown: 'hovr:color:red',
	class_modifier_order: 'hover:md:color:red',
	class_modifier_conflict: 'sm:md:color:red',
	class_modifier_skipped: 'before:chevron',
	class_declaration_empty: 'e',
	class_ruleset_empty: 'r',
	class_ruleset_invalid: 'r',
	class_ruleset_unselected: 'r',
	class_ruleset_single: 'r',
	class_composes_unknown: 'a',
	class_composes_cycle: 'a',
	class_composes_redundant: 'a',
	class_composes_modified: 'a',
	class_composes_interpreter: 'a',
	class_composes_ruleset: 'a',
	class_interpreter: 'x',
	element_unstyled: 'blink',
	element_unknown: 'blink',
	variable_unknown: 'nope',
	variable_misspelled: 'color_primry',
	variable_excluded_referenced: 'brand',
	variable_cycle: 'a',
	variable_value_uncontained: 'x',
	base_css_variables_undefined: 'base_css',
	base_css_layer: '@layer mine',
	base_css_unsupported_at_rule: '@import "x.css"',
	theme_discarded: 't',
	theme_lint: 't',
	theme_gate_failed: 'marquee',
	theme_gate_unchecked: 't'
};

describe('diagnostic codes', () => {
	test.each(Object.keys(cases) as Array<DiagnosticCode>)('%s names its subject', (code) => {
		const emitted = cases[code]().filter((d) => d.code === code);
		assert.isAbove(emitted.length, 0, `expected a ${code} diagnostic`);
		for (const d of emitted) assert.strictEqual(d.identifier, subjects[code]);
	});

	test('the TSDoc on `DiagnosticCode` lists each member of the union once', () => {
		const source = readFileSync('./src/lib/diagnostics.ts', 'utf8');
		const union_source = /export type DiagnosticCode =([^;]+);/.exec(source)![1]!;
		const members = [...union_source.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
		const doc_start = source.lastIndexOf('/**', source.indexOf('export type DiagnosticCode'));
		const doc = source.slice(doc_start, source.indexOf('export type DiagnosticCode'));
		const documented = [...doc.matchAll(/^ \* - `([a-z_]+)` - /gm)].map((m) => m[1]);
		assert.deepEqual(documented, members);
		assert.sameMembers(members, Object.keys(cases));
	});
});
