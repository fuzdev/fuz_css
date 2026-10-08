/**
 * The shipped themes, discovered by glob rather than listed by hand, so a new
 * module under `themes/` can't silently skip validation, the gates, or the
 * contrast composition matrix by being left off a list.
 *
 * @module
 */

import type { Theme } from '$lib/variable.ts';
import { contrast_modifiers } from '$lib/themes.ts';
import { palette_variants } from '$lib/variable_data.ts';

const theme_modules = import.meta.glob('../lib/themes/*.ts', { eager: true });

const is_theme = (value: unknown): value is Theme =>
	value !== null &&
	typeof value === 'object' &&
	'name' in value &&
	'variables' in value &&
	Array.isArray((value as Theme).variables);

/** Every theme exported from a `themes/` module: registry, exemplar, and modifier alike. */
export const shipped_themes: Array<Theme> = Object.values(theme_modules).flatMap((mod) =>
	Object.values(mod as Record<string, unknown>).filter(is_theme)
);

const modifier_names = new Set(contrast_modifiers.map((t) => t.name));

/** The shipped themes a contrast modifier composes over: everything but the modifiers. */
export const shipped_base_themes: Array<Theme> = shipped_themes.filter(
	(t) => !modifier_names.has(t.name)
);

/**
 * Creates a pure single-hue monochrome theme: every palette slot and the
 * neutral collapse onto one OKLCH hue, dark-only. The palette-tier stress
 * fixture for the resolution/gate/compile paths (rotated hues, dark-only
 * stance, recomputed worst-hue caps).
 */
export const create_monochrome_theme = (hue: number): Theme => {
	const hue_value = String(hue);
	return {
		name: `monochrome ${hue}`,
		scheme: 'dark',
		variables: [
			...palette_variants.map((letter) => ({ name: `hue_${letter}`, light: hue_value })),
			{ name: 'hue_neutral', light: hue_value },
			{ name: 'neutral_chroma', light: '0.05' }
		]
	};
};
