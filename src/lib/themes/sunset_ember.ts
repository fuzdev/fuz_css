import type {Theme} from '../theme.ts';

/**
 * A natural probe theme: complementary ember-orange/indigo dusk. Warm vivid
 * chroma pushed past the conservative caps on purpose — this theme exists
 * partly to stress the weak-hue gamut clipping — with hue-shifted ramps so
 * light ends glow gold and dark ends sink toward crimson dusk. Dual-scheme.
 *
 * Declared subversions: none.
 *
 * The signature move it can't make yet: a gradient sky. `body` background
 * and fill gradients need decoration hooks or the theme CSS block, so the
 * knob-only version leans on hue-shift and chroma instead (probe evidence).
 */
export const sunset_ember_theme: Theme = {
	name: 'sunset ember',
	variables: [
		{name: 'hue_a', light: '55'}, // ember orange (palette lead + accent)
		{name: 'hue_b', light: '140'}, // positive keeps green
		{name: 'hue_c', light: '25'}, // negative red
		{name: 'hue_d', light: '285'}, // twilight indigo
		{name: 'hue_e', light: '90'}, // gold
		{name: 'hue_f', light: '55'}, // warm brown
		{name: 'hue_g', light: '20'}, // rose
		{name: 'hue_h', light: '40'}, // deep ember
		{name: 'hue_i', light: '265'}, // dusk blue
		{name: 'hue_j', light: '285'}, // indigo
		// warm haze over every surface
		{name: 'hue_neutral', light: '55'},
		{name: 'neutral_chroma', light: '0.028', dark: '0.035'},
		// vivid — deliberately past the caps; the browser clips, lightness holds
		{name: 'chroma_scale', light: '1.3', dark: '1.2'},
		// light ends gold, dark ends toward crimson/indigo
		{name: 'hue_shift', light: '16'},
	],
};
