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
			// sharp: no radius-scale knob exists yet, so the tokens pin (probe evidence)
			{name: 'border_radius_xs3', light: '0'},
			{name: 'border_radius_xs2', light: '0'},
			{name: 'border_radius_xs', light: '0'},
			{name: 'border_radius_sm', light: '0'},
			{name: 'border_radius_md', light: '0'},
			{name: 'border_radius_lg', light: '0'},
			{name: 'border_radius_xl', light: '0'},
			// flat: no shadow-alpha scale knob exists yet, so the ramp zeroes (probe evidence)
			{name: 'shadow_alpha_05', light: '0%'},
			{name: 'shadow_alpha_10', light: '0%'},
			{name: 'shadow_alpha_20', light: '0%'},
			{name: 'shadow_alpha_30', light: '0%'},
			{name: 'shadow_alpha_40', light: '0%'},
			{name: 'shadow_alpha_50', light: '0%'},
			{name: 'shadow_alpha_60', light: '0%'},
			{name: 'shadow_alpha_70', light: '0%'},
			{name: 'shadow_alpha_80', light: '0%'},
			{name: 'shadow_alpha_90', light: '0%'},
			{name: 'shadow_alpha_95', light: '0%'},
			{name: 'shadow_alpha_100', light: '0%'},
			{name: 'button_shadow', light: 'none'},
			{name: 'button_shadow_hover', light: 'none'},
			{name: 'button_shadow_active', light: 'none'},
		],
	};
};

/**
 * The classic green phosphor terminal.
 */
export const terminal_green_theme: Theme = create_terminal_theme(145, 'terminal green');
