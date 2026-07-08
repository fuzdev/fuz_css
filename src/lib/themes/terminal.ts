import type {Theme} from '../theme.ts';
import {dark_only_variables} from './dark_only.ts';

/**
 * Creates a monochrome terminal theme at any OKLCH hue — green phosphor at
 * 145, amber at 70, cool blue at 250. Every palette slot and the neutral
 * collapse onto the one hue (a palette-tier move, which is why terminal
 * themes live outside the semantic-only registry); expressiveness comes from
 * the ramps doing the work. Dark-only, mono type, sharp corners, flat depth.
 *
 * Declared subversions: negative/caution/info all render in the terminal hue
 * — status legibility is traded for the monochrome premise.
 */
export const create_terminal_theme = (hue: number, name = `terminal ${hue}`): Theme => {
	const hue_value = String(hue);
	return {
		name,
		variables: [
			// monochrome hue collapse
			{name: 'hue_a', light: hue_value},
			{name: 'hue_b', light: hue_value},
			{name: 'hue_c', light: hue_value},
			{name: 'hue_d', light: hue_value},
			{name: 'hue_e', light: hue_value},
			{name: 'hue_f', light: hue_value},
			{name: 'hue_g', light: hue_value},
			{name: 'hue_h', light: hue_value},
			{name: 'hue_i', light: hue_value},
			{name: 'hue_j', light: hue_value},
			{name: 'hue_neutral', light: hue_value},
			// tinted surfaces and text
			{name: 'neutral_chroma', light: '0.05'},
			...dark_only_variables,
			// mono type everywhere
			{name: 'font_family_sans', light: 'var(--font_family_mono)'},
			// sharp: one knob zeroes every radius tier
			{name: 'radius_scale', light: '0'},
			// flat: one knob zeroes the whole alpha ramp, button shadows included
			{name: 'shadow_alpha_scale', light: '0'},
		],
	};
};

/**
 * The classic green phosphor terminal.
 */
export const terminal_green_theme: Theme = create_terminal_theme(145, 'terminal green');
