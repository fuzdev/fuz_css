import type { Gen } from '@fuzdev/gro';
import { readdirSync } from 'node:fs';

import type { Theme } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';
import { compile_theme } from '#lib/theme_compile.ts';
import {
	retuned_variables,
	to_theme_bake_digest,
	to_theme_bake_entry
} from '../theme_bake_helpers.ts';

// twin of `is_theme` and `shipped_themes` in `theme_test_helpers.ts`, which
// discover the themes with `import.meta.glob` - gro gen runs outside Vite,
// so this reads the directory instead
const is_theme = (value: unknown): value is Theme =>
	value !== null &&
	typeof value === 'object' &&
	'name' in value &&
	'variables' in value &&
	Array.isArray((value as Theme).variables);

// every theme a `themes/` module exports, read from the directory so a new
// module can't be left off a list
const load_shipped_themes = async (): Promise<Array<Theme>> => {
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
