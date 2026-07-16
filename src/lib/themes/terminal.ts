import type {Theme} from '../theme.ts';

/**
 * A practical terminal theme: the dark, monospace, sharp-cornered, flat-depth
 * terminal chrome with a green-phosphor cast in the surfaces and accent, but
 * the palette slots keep their own hues so status colors still read — negative
 * stays red, caution amber, info cyan. The usable twist on the pure
 * single-phosphor collapse of `create_terminal_theme`. Dark-only via the
 * `scheme` stance.
 */
export const terminal_theme: Theme = {
	name: 'terminal',
	scheme: 'dark',
	variables: [
		// green-phosphor surfaces and text — the terminal cast, kept low-chroma so
		// the palette colors read over it
		{name: 'hue_neutral', light: 'var(--hue_b)'},
		{name: 'neutral_chroma', light: '0.05'},
		// links, focus, selection glow phosphor green
		{name: 'hue_accent', light: 'var(--hue_b)'},
		// a whisper of phosphor bloom across every ramp
		{name: 'hue_shift', light: '12'},
		// mono type everywhere
		{name: 'font_family_sans', light: 'var(--font_family_mono)'},
		// sharp: one knob zeroes every radius tier
		{name: 'radius_scale', light: '0'},
		// flat: one knob zeroes the whole alpha ramp, button shadows included
		{name: 'shadow_alpha_scale', light: '0'},
	],
};

/**
 * Creates a pure single-phosphor terminal at any OKLCH hue — green at 145,
 * amber at 70, cool blue at 250. Every palette slot and the neutral collapse
 * onto the one hue (a palette-tier move, which is why terminal themes live
 * outside the semantic-only registry); expressiveness comes from the ramps
 * doing the work — a hue slant blooms the bright end warm and the dim end cool,
 * phosphor-style, so the monochrome reads lit rather than flat. The strict
 * monochrome counterpart to `terminal_theme`. Dark-only via the `scheme`
 * stance, mono type, sharp corners, no shadows.
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
	const {name = `terminal ${hue}`, hue_shift = 45} = options;
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
