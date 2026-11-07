/**
 * Helpers the pinned compile and bake share: the fixture's generator
 * (`fixtures/theme_bake_fixture.gen.json.ts`) and its test
 * (`theme_compile.bake.test.ts`).
 *
 * @module
 */

import { createHash } from 'node:crypto';

import type { StyleVariable, Theme } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
import { bake_theme } from '#lib/variable_graph.ts';
import type { GenerationDiagnostic } from '#lib/diagnostics.ts';

/**
 * A retuned configured variable set: two knob-tier values the bake folds
 * beneath a theme (`chroma_scale`, `palette_chroma_max`) and a
 * scheme-adaptive non-knob one only the stance mirror carries
 * (`shadow_alpha_30`).
 */
const retuned_overrides: Array<StyleVariable> = [
	{ name: 'chroma_scale', base: '1.3' },
	{ name: 'palette_chroma_max', base: '0.13', dark: '0.14' },
	{
		name: 'shadow_alpha_30',
		base: 'calc(30% * var(--shadow_alpha_scale))',
		dark: 'calc(45% * var(--shadow_alpha_scale))'
	}
];

export const retuned_variables: Array<StyleVariable> = default_variables.map(
	(v) => retuned_overrides.find((o) => o.name === v.name) ?? v
);

/**
 * A SHA-256 of `value` serialized with its `undefined` properties kept, so a
 * result's shape is pinned along with its values.
 */
export const to_theme_bake_digest = (value: unknown): string =>
	createHash('sha256')
		.update(JSON.stringify(value, (_k, v: unknown) => (v === undefined ? '<undefined>' : v)))
		.digest('hex');

/**
 * Bakes `theme` over `variables`, keeping the diagnostics whole and the
 * resolved theme as a digest (the mirrors and caps run to megabytes).
 */
export const to_theme_bake_entry = (
	theme: Theme,
	variables: Array<StyleVariable>
): { resolved: string; diagnostics: Array<GenerationDiagnostic> } => {
	const diagnostics: Array<GenerationDiagnostic> = [];
	const resolved = bake_theme(theme, variables, diagnostics);
	return { resolved: to_theme_bake_digest(resolved), diagnostics };
};
