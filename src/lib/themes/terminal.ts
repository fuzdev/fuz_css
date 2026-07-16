import type {Theme} from '../theme.ts';

/**
 * Creates a monochrome terminal theme at any OKLCH hue — green phosphor at
 * 145, amber at 70, cool blue at 250. Every palette slot and the neutral
 * collapse onto the one hue (a palette-tier move, which is why terminal
 * themes live outside the semantic-only registry); expressiveness comes from
 * the ramps doing the work — a slight hue slant blooms the bright end warm and
 * the dim end cool, phosphor-style, so the monochrome reads lit rather than
 * flat. Dark-only via the `scheme` stance, mono type, sharp corners, no shadows.
 *
 * Declared subversions: negative/caution/info all render in the terminal hue
 * — status legibility is traded for the monochrome premise.
 *
 * @param hue - the OKLCH hue every slot collapses onto
 * @param options - `name` labels the theme; `hue_shift` tunes the phosphor
 * bloom, whose ideal warm/cool slant differs by hue, `0` for a dead-flat
 * monochrome.
 */
export const create_terminal_theme = (
	hue: number,
	options: {name?: string; hue_shift?: number} = {},
): Theme => {
	const {name = `terminal ${hue}`, hue_shift = 15} = options;
	const hue_value = String(hue);
	return {
		name,
		scheme: 'dark',
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
			// phosphor bloom: the ramps warm the bright end and cool the dim end so
			// the monochrome isn't a flat fill, staying unmistakably one hue
			{name: 'hue_shift', light: String(hue_shift)},
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
export const terminal_green_theme: Theme = create_terminal_theme(145, {name: 'terminal green'});
