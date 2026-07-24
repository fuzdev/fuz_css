import type { Theme } from '../theme.ts';

/**
 * A fantasy exemplar theme built entirely from semantic bindings and levers —
 * the palette letters keep their default hues. Ectoplasm-green surfaces come
 * from binding the neutral to green, the violet accent from binding the accent
 * intent to purple, and the lit-from-below character from hue-shifted
 * ramps (highlights warm, shadows cool) with glow-colored depth. Dark-only
 * via the `scheme` stance, vivid past the gamut caps on purpose.
 *
 * Declared subversions: none — negative stays red.
 *
 * This theme carries the decoration brief (ornamental borders, glow textures,
 * vignette backgrounds); those need the theme CSS block or decoration hooks,
 * so this knob-only version ships at ~90% volume. The walls it hit are
 * recorded as probe evidence.
 */
export const necromancer_theme: Theme = {
	name: 'necromancer',
	scheme: 'dark',
	variables: [
		// ectoplasm-green surfaces and text: the neutral binds to the green slot
		{ name: 'hue_neutral', light: 'var(--hue_b)' },
		{ name: 'neutral_chroma', light: '0.04' },
		// violet accent: links/focus/selection glow purple over the green world
		{ name: 'hue_accent', light: 'var(--hue_d)' },
		// painterly ramps: shadows cool toward teal, highlights warm toward yellow-green
		{ name: 'hue_shift', light: '14' },
		// vivid, knowingly clipping the weak hues
		{ name: 'chroma_scale', light: '1.15' },
		// modestly compact - crypt density
		{ name: 'scale_factor', light: '0.9' },
		// glow depth: shadows are accent-lit halos instead of neutral light
		{ name: 'shadow_color_umbra', light: 'oklch(0.72 0.15 var(--hue_accent))' },
		{ name: 'shadow_color_glow', light: 'oklch(0.75 0.16 var(--hue_accent))' },
		{ name: 'shadow_color_highlight', light: '#000' },
		// sharp-ish with a floor: the tier ladder compresses onto ~0.2rem, which a
		// uniform radius_scale can't express, so the tokens pin (sanctioned escape)
		{ name: 'border_radius_xs3', light: '0.2rem' },
		{ name: 'border_radius_xs2', light: '0.2rem' },
		{ name: 'border_radius_xs', light: '0.2rem' },
		{ name: 'border_radius_sm', light: '0.3rem' },
		{ name: 'border_radius_md', light: '0.4rem' },
		{ name: 'border_radius_lg', light: '0.6rem' },
		{ name: 'border_radius_xl', light: '0.8rem' }
	]
};
