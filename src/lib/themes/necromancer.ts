import type {Theme} from '../theme.ts';
import {dark_only_variables} from './dark_only.ts';

/**
 * A fantasy probe theme: violet/green duotone on inky surfaces — grave-violet
 * palette with an ectoplasm-green accent, glow-lit depth, and hue-shifted
 * ramps (highlights drift warm toward magenta, shadows cool toward
 * blue-violet). Dark-only, vivid past the gamut caps on purpose.
 *
 * Declared subversions: none — negative stays blood red.
 *
 * This theme carries the decoration brief (ornamental borders, glow textures,
 * vignette backgrounds); those need the theme CSS block or decoration hooks,
 * so this knob-only version ships at ~90% volume. The walls it hit are
 * recorded as probe evidence.
 */
export const necromancer_theme: Theme = {
	name: 'necromancer',
	variables: [
		// violet/green duotone: violet carries the palette, green haunts it
		{name: 'hue_a', light: '305'}, // grave violet (palette lead)
		{name: 'hue_b', light: '150'}, // ectoplasm green (positive keeps green-ish)
		{name: 'hue_c', light: '24'}, // blood red — negative keeps the convention
		{name: 'hue_d', light: '305'},
		{name: 'hue_e', light: '150'},
		{name: 'hue_f', light: '305'},
		{name: 'hue_g', light: '330'}, // sickly magenta flourish
		{name: 'hue_h', light: '150'},
		{name: 'hue_i', light: '150'},
		{name: 'hue_j', light: '150'},
		// violet-tinted darks
		{name: 'hue_neutral', light: '305'},
		{name: 'neutral_chroma', light: '0.035', dark: '0.04'},
		// the accent role retarget: links/focus/selection glow green over violet
		{name: 'hue_accent', light: '150'},
		// painterly ramps: shadows cool toward blue-violet, highlights warm toward magenta
		{name: 'hue_shift', light: '-14'},
		// vivid, knowingly clipping the weak hues
		{name: 'chroma_scale', light: '1.15'},
		...dark_only_variables,
		// glow depth: shadows are green-lit halos instead of neutral light
		{name: 'shadow_color_umbra', light: 'oklch(0.72 0.15 150)'},
		{name: 'shadow_color_glow', light: 'oklch(0.75 0.16 150)'},
		{name: 'shadow_color_highlight', light: '#000'},
		// sharp: no radius-scale knob exists yet, so the tokens pin (probe evidence)
		{name: 'border_radius_xs3', light: '0.2rem'},
		{name: 'border_radius_xs2', light: '0.2rem'},
		{name: 'border_radius_xs', light: '0.2rem'},
		{name: 'border_radius_sm', light: '0.3rem'},
		{name: 'border_radius_md', light: '0.4rem'},
		{name: 'border_radius_lg', light: '0.6rem'},
		{name: 'border_radius_xl', light: '0.8rem'},
	],
};
