import type { Gen } from '@fuzdev/gro';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';

import type { StyleVariable, Theme } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
import { bake_theme } from '#lib/variable_graph.ts';
import { compile_theme } from '#lib/theme_compile.ts';
import type { GenerationDiagnostic } from '#lib/diagnostics.ts';

/**
 * A retuned configured variable set: two knob-tier values the bake folds
 * beneath a theme (`chroma_scale`, `palette_chroma_max`) and a
 * scheme-adaptive non-knob one only the stance mirror carries
 * (`palette_lightness_00`).
 */
const retuned_overrides: Array<StyleVariable> = [
	{ name: 'chroma_scale', base: '1.3' },
	{ name: 'palette_chroma_max', base: '0.13', dark: '0.14' },
	{ name: 'palette_lightness_00', base: '0.96', dark: '0.2' }
];

export const retuned_variables: Array<StyleVariable> = default_variables.map(
	(v) => retuned_overrides.find((o) => o.name === v.name) ?? v
);

const is_theme = (value: unknown): value is Theme =>
	value !== null &&
	typeof value === 'object' &&
	'name' in value &&
	'variables' in value &&
	Array.isArray((value as Theme).variables);

// every theme a `themes/` module exports, read from the directory so a new
// module can't be left off a list
export const load_shipped_themes = async (): Promise<Array<Theme>> => {
	const themes: Array<Theme> = [];
	const dir = new URL('../../lib/themes/', import.meta.url);
	for (const file of readdirSync(dir).sort()) {
		if (!file.endsWith('.ts')) continue;
		const mod: Record<string, unknown> = await import(new URL(file, dir).href);
		for (const value of Object.values(mod)) if (is_theme(value)) themes.push(value);
	}
	return themes;
};

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

/**
 * The bake and the compile of every shipped theme, pinned so a refactor of
 * either can't move what they derive: each theme compiled alone (as a
 * digest), and baked over `default_variables` and over a retuned set (the
 * resolved theme as a digest, the diagnostics whole).
 */
export const gen: Gen = {
	inputs: 'all',
	generate: async () => {
		const themes = await load_shipped_themes();
		const out = themes.map((theme) => ({
			name: theme.name,
			compiled: to_theme_bake_digest(compile_theme(theme)),
			baked_defaults: to_theme_bake_entry(theme, default_variables),
			baked_retuned: to_theme_bake_entry(theme, retuned_variables)
		}));
		return JSON.stringify(out, null, '\t') + '\n';
	}
};
