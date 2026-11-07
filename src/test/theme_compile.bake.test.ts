import { describe, test, assert } from 'vitest';

import { compile_theme } from '#lib/theme_compile.ts';
import { bake_theme } from '#lib/variable_graph.ts';
import { default_variables } from '#lib/variables.ts';
import type { StyleVariable } from '#lib/variable.ts';
import type { GenerationDiagnostic } from '#lib/diagnostics.ts';
import { shipped_themes } from './theme_test_helpers.ts';
import {
	retuned_variables,
	to_theme_bake_digest,
	to_theme_bake_entry
} from './fixtures/theme_bake_fixture.gen.json.ts';
import fixture_text from './fixtures/theme_bake_fixture.json?raw';

interface ThemeBakeFixtureEntry {
	name: string;
	compiled: string;
	baked_defaults: { resolved: string; diagnostics: Array<GenerationDiagnostic> };
	baked_retuned: { resolved: string; diagnostics: Array<GenerationDiagnostic> };
}

const fixture: Array<ThemeBakeFixtureEntry> = JSON.parse(fixture_text);
const fixture_by_name = new Map(fixture.map((e) => [e.name, e]));

const variable_sets: Array<[label: string, variables: Array<StyleVariable>]> = [
	['the defaults', default_variables],
	['a retuned set', retuned_variables]
];

describe('the pinned compile and bake', () => {
	test('the fixture covers every shipped theme', () => {
		assert.deepEqual([...fixture_by_name.keys()].sort(), shipped_themes.map((t) => t.name).sort());
	});

	test('compiling a shipped theme alone gives the pinned result', () => {
		for (const theme of shipped_themes) {
			const pinned = fixture_by_name.get(theme.name)!;
			assert.strictEqual(to_theme_bake_digest(compile_theme(theme)), pinned.compiled, theme.name);
		}
	});

	test('baking a shipped theme gives the pinned result and diagnostics', () => {
		for (const theme of shipped_themes) {
			const pinned = fixture_by_name.get(theme.name)!;
			assert.deepEqual(
				to_theme_bake_entry(theme, default_variables),
				pinned.baked_defaults,
				theme.name
			);
			assert.deepEqual(
				to_theme_bake_entry(theme, retuned_variables),
				pinned.baked_retuned,
				theme.name
			);
		}
	});
});

describe('compile_theme with variables', () => {
	test('derives what the bake renders with', () => {
		for (const theme of shipped_themes) {
			for (const [label, variables] of variable_sets) {
				const compiled = compile_theme(theme, { variables });
				const baked = bake_theme(theme, variables);
				assert.deepEqual(compiled.scheme_mirror, baked.scheme_mirror, `${theme.name}, ${label}`);
				assert.deepEqual(compiled.caps, baked.caps ?? [], `${theme.name}, ${label}`);
			}
		}
	});

	test('over the defaults, compiles as with none', () => {
		for (const theme of shipped_themes) {
			assert.deepEqual(
				compile_theme(theme, { variables: default_variables }),
				compile_theme(theme),
				theme.name
			);
		}
	});

	test('folds a retuned knob into the gates, and returns the theme unfolded', () => {
		const theme = shipped_themes.find((t) => t.name === 'base')!;
		const plain = compile_theme(theme);
		const retuned = compile_theme(theme, { variables: retuned_variables });
		assert.strictEqual(retuned.theme, theme);
		assert.isTrue(plain.report.passed);
		// the retuned chroma_scale lifts chroma past the gamut caps
		assert.isFalse(retuned.report.passed);
	});
});
