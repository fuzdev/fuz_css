import type { StyleVariable } from './variable.ts';
import { icon_sizes } from './variable_data.ts';
import {
	NEUTRAL_CHROMA,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_MULTIPLIERS,
	PALETTE_HUES,
	PALETTE_LIGHTNESS_KNOBS,
	SHADE_LIGHTNESS_KNOBS,
	TEXT_LIGHTNESS_KNOBS,
	render_chroma_shape_css,
	render_chroma_stop_css,
	render_lightness_stop_css,
	render_neutral_stop_css,
	render_palette_stop_css,
	render_ramp_color_css
} from './ramps.ts';

/*

TODO lots of things here to address:

- either change colors with alpha transparency to opaque color values,
	or make sure there are opaque variants available for everything
	- by default we should avoid alpha to reduce base-case performance costs
	- maybe move all shadows out of the base theme?
- lots of inconsistencies, like the relationship between base and modified values
	- in some cases the base value is just a value, in other cases it's the "current" value


*/

/*

colors

The color system is derived: the hue knobs plus a handful of curve knobs
produce every palette/shade/text stop at computed-value time in pure CSS.
The fitted default knob values, the formulas, and the CSS emitters live in
`ramps.ts` (a faithful port of the previous HSL palette); tests gate the
defaults for gamut, ramp monotonicity, and contrast.

Layers, each derivable from the one above and each overridable per stop:
curve knobs → ramp stops (`--palette_lightness_50`, `--palette_chroma_50`)
→ color stops (`--palette_a_50`) → utility classes (`.palette_a_50`).

*/

// hue knobs - OKLCH hue angles; equal lightness/chroma across hues makes rotation safe
export const hue_a: StyleVariable = {
	name: 'hue_a',
	light: String(PALETTE_HUES.a),
	summary: 'blue'
};
export const hue_b: StyleVariable = {
	name: 'hue_b',
	light: String(PALETTE_HUES.b),
	summary: 'green'
};
export const hue_c: StyleVariable = {
	name: 'hue_c',
	light: String(PALETTE_HUES.c),
	summary: 'red'
};
export const hue_d: StyleVariable = {
	name: 'hue_d',
	light: String(PALETTE_HUES.d),
	summary: 'purple'
};
export const hue_e: StyleVariable = {
	name: 'hue_e',
	light: String(PALETTE_HUES.e),
	summary: 'yellow'
};
export const hue_f: StyleVariable = {
	name: 'hue_f',
	light: String(PALETTE_HUES.f),
	summary: 'brown'
};
export const hue_g: StyleVariable = {
	name: 'hue_g',
	light: String(PALETTE_HUES.g),
	summary: 'pink'
};
export const hue_h: StyleVariable = {
	name: 'hue_h',
	light: String(PALETTE_HUES.h),
	summary: 'orange'
};
export const hue_i: StyleVariable = {
	name: 'hue_i',
	light: String(PALETTE_HUES.i),
	summary: 'cyan'
};
export const hue_j: StyleVariable = {
	name: 'hue_j',
	light: String(PALETTE_HUES.j),
	summary: 'teal'
};

// per-slot chroma-character knobs - each multiplies its slot's chroma under
// the global chroma_scale, so the slot's character holds at any global
// setting; at or below 1 stays inside the gamut caps, above 1 knowingly clips
const slot_chroma_summary = "the slot's chroma multiplier under the global chroma_scale";
export const palette_a_chroma_scale: StyleVariable = {
	name: 'palette_a_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.a),
	summary: slot_chroma_summary
};
export const palette_b_chroma_scale: StyleVariable = {
	name: 'palette_b_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.b),
	summary: slot_chroma_summary
};
export const palette_c_chroma_scale: StyleVariable = {
	name: 'palette_c_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.c),
	summary: slot_chroma_summary
};
export const palette_d_chroma_scale: StyleVariable = {
	name: 'palette_d_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.d),
	summary: slot_chroma_summary
};
export const palette_e_chroma_scale: StyleVariable = {
	name: 'palette_e_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.e),
	summary: slot_chroma_summary
};
export const palette_f_chroma_scale: StyleVariable = {
	name: 'palette_f_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.f),
	summary: 'mutes the brown slot - brown is low-chroma orange, unreachable by hue alone'
};
export const palette_g_chroma_scale: StyleVariable = {
	name: 'palette_g_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.g),
	summary: slot_chroma_summary
};
export const palette_h_chroma_scale: StyleVariable = {
	name: 'palette_h_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.h),
	summary: slot_chroma_summary
};
export const palette_i_chroma_scale: StyleVariable = {
	name: 'palette_i_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.i),
	summary: slot_chroma_summary
};
export const palette_j_chroma_scale: StyleVariable = {
	name: 'palette_j_chroma_scale',
	light: String(PALETTE_CHROMA_MULTIPLIERS.j),
	summary: slot_chroma_summary
};

// global color-character knobs
export const chroma_scale: StyleVariable = {
	name: 'chroma_scale',
	light: '1',
	summary:
		'0 makes the palette grayscale (the neutral scales have their own knob), above 1 is vivid and can clip past the sRGB gamut caps'
};

/*

neutral intent knobs - the temperature of every surface, text, border, and
shadow; the neutral is an intent whose scales are shade_* and text_* rather
than a neutral_00-100 family

*/
export const hue_neutral: StyleVariable = { name: 'hue_neutral', light: 'var(--hue_f)' };
export const neutral_chroma: StyleVariable = {
	name: 'neutral_chroma',
	light: String(NEUTRAL_CHROMA.light),
	dark: String(NEUTRAL_CHROMA.dark),
	summary: 'peak chroma of the neutral scales, applied through the shared chroma shape'
};

/*

semantic color intents - meaning-first aliases over the palette letters

Intent hues retarget what a color communicates without touching the palette:
rotating --hue_accent recolors links, focus, selection, and selected states
in one move. The letters stay abstract palette slots. Intent stops derive
through the same ramps as the palette, so they respond to every curve knob;
full 13-stop scales derive per intent, mirroring the palette
scales, and tree-shake like everything else - unused stops cost nothing.

*/
export const hue_accent: StyleVariable = {
	name: 'hue_accent',
	light: 'var(--hue_a)',
	summary: 'links, focus, selection, selected states'
};
export const hue_positive: StyleVariable = {
	name: 'hue_positive',
	light: 'var(--hue_b)',
	summary: 'success affordances'
};
export const hue_negative: StyleVariable = {
	name: 'hue_negative',
	light: 'var(--hue_c)',
	summary: 'errors, destructive actions'
};
export const hue_caution: StyleVariable = {
	name: 'hue_caution',
	light: 'var(--hue_h)',
	summary: 'warnings'
};
export const hue_info: StyleVariable = {
	name: 'hue_info',
	light: 'var(--hue_i)',
	summary: 'informational callouts'
};
// intent chroma-character twins - an intent hue binding shares only the
// angle, so binding an intent to a muted palette slot needs the twin set too
const intent_chroma_summary =
	"the intent's chroma multiplier; set it when binding the intent to a muted palette slot";
export const accent_chroma_scale: StyleVariable = {
	name: 'accent_chroma_scale',
	light: '1',
	summary: intent_chroma_summary
};
export const positive_chroma_scale: StyleVariable = {
	name: 'positive_chroma_scale',
	light: '1',
	summary: intent_chroma_summary
};
export const negative_chroma_scale: StyleVariable = {
	name: 'negative_chroma_scale',
	light: '1',
	summary: intent_chroma_summary
};
export const caution_chroma_scale: StyleVariable = {
	name: 'caution_chroma_scale',
	light: '1',
	summary: intent_chroma_summary
};
export const info_chroma_scale: StyleVariable = {
	name: 'info_chroma_scale',
	light: '1',
	summary: intent_chroma_summary
};
// accent stops - the full scale derives through the shared ramps
export const accent_00: StyleVariable = {
	name: 'accent_00',
	light: render_ramp_color_css('var(--hue_accent)', '00')
};
export const accent_05: StyleVariable = {
	name: 'accent_05',
	light: render_ramp_color_css('var(--hue_accent)', '05')
};
export const accent_10: StyleVariable = {
	name: 'accent_10',
	light: render_ramp_color_css('var(--hue_accent)', '10')
};
export const accent_20: StyleVariable = {
	name: 'accent_20',
	light: render_ramp_color_css('var(--hue_accent)', '20')
};
export const accent_30: StyleVariable = {
	name: 'accent_30',
	light: render_ramp_color_css('var(--hue_accent)', '30')
};
export const accent_40: StyleVariable = {
	name: 'accent_40',
	light: render_ramp_color_css('var(--hue_accent)', '40')
};
export const accent_50: StyleVariable = {
	name: 'accent_50',
	light: render_ramp_color_css('var(--hue_accent)', '50')
};
export const accent_60: StyleVariable = {
	name: 'accent_60',
	light: render_ramp_color_css('var(--hue_accent)', '60')
};
export const accent_70: StyleVariable = {
	name: 'accent_70',
	light: render_ramp_color_css('var(--hue_accent)', '70')
};
export const accent_80: StyleVariable = {
	name: 'accent_80',
	light: render_ramp_color_css('var(--hue_accent)', '80')
};
export const accent_90: StyleVariable = {
	name: 'accent_90',
	light: render_ramp_color_css('var(--hue_accent)', '90')
};
export const accent_95: StyleVariable = {
	name: 'accent_95',
	light: render_ramp_color_css('var(--hue_accent)', '95')
};
export const accent_100: StyleVariable = {
	name: 'accent_100',
	light: render_ramp_color_css('var(--hue_accent)', '100')
};
// positive stops - the full scale derives through the shared ramps
export const positive_00: StyleVariable = {
	name: 'positive_00',
	light: render_ramp_color_css('var(--hue_positive)', '00')
};
export const positive_05: StyleVariable = {
	name: 'positive_05',
	light: render_ramp_color_css('var(--hue_positive)', '05')
};
export const positive_10: StyleVariable = {
	name: 'positive_10',
	light: render_ramp_color_css('var(--hue_positive)', '10')
};
export const positive_20: StyleVariable = {
	name: 'positive_20',
	light: render_ramp_color_css('var(--hue_positive)', '20')
};
export const positive_30: StyleVariable = {
	name: 'positive_30',
	light: render_ramp_color_css('var(--hue_positive)', '30')
};
export const positive_40: StyleVariable = {
	name: 'positive_40',
	light: render_ramp_color_css('var(--hue_positive)', '40')
};
export const positive_50: StyleVariable = {
	name: 'positive_50',
	light: render_ramp_color_css('var(--hue_positive)', '50')
};
export const positive_60: StyleVariable = {
	name: 'positive_60',
	light: render_ramp_color_css('var(--hue_positive)', '60')
};
export const positive_70: StyleVariable = {
	name: 'positive_70',
	light: render_ramp_color_css('var(--hue_positive)', '70')
};
export const positive_80: StyleVariable = {
	name: 'positive_80',
	light: render_ramp_color_css('var(--hue_positive)', '80')
};
export const positive_90: StyleVariable = {
	name: 'positive_90',
	light: render_ramp_color_css('var(--hue_positive)', '90')
};
export const positive_95: StyleVariable = {
	name: 'positive_95',
	light: render_ramp_color_css('var(--hue_positive)', '95')
};
export const positive_100: StyleVariable = {
	name: 'positive_100',
	light: render_ramp_color_css('var(--hue_positive)', '100')
};
// negative stops - the full scale derives through the shared ramps
export const negative_00: StyleVariable = {
	name: 'negative_00',
	light: render_ramp_color_css('var(--hue_negative)', '00')
};
export const negative_05: StyleVariable = {
	name: 'negative_05',
	light: render_ramp_color_css('var(--hue_negative)', '05')
};
export const negative_10: StyleVariable = {
	name: 'negative_10',
	light: render_ramp_color_css('var(--hue_negative)', '10')
};
export const negative_20: StyleVariable = {
	name: 'negative_20',
	light: render_ramp_color_css('var(--hue_negative)', '20')
};
export const negative_30: StyleVariable = {
	name: 'negative_30',
	light: render_ramp_color_css('var(--hue_negative)', '30')
};
export const negative_40: StyleVariable = {
	name: 'negative_40',
	light: render_ramp_color_css('var(--hue_negative)', '40')
};
export const negative_50: StyleVariable = {
	name: 'negative_50',
	light: render_ramp_color_css('var(--hue_negative)', '50')
};
export const negative_60: StyleVariable = {
	name: 'negative_60',
	light: render_ramp_color_css('var(--hue_negative)', '60')
};
export const negative_70: StyleVariable = {
	name: 'negative_70',
	light: render_ramp_color_css('var(--hue_negative)', '70')
};
export const negative_80: StyleVariable = {
	name: 'negative_80',
	light: render_ramp_color_css('var(--hue_negative)', '80')
};
export const negative_90: StyleVariable = {
	name: 'negative_90',
	light: render_ramp_color_css('var(--hue_negative)', '90')
};
export const negative_95: StyleVariable = {
	name: 'negative_95',
	light: render_ramp_color_css('var(--hue_negative)', '95')
};
export const negative_100: StyleVariable = {
	name: 'negative_100',
	light: render_ramp_color_css('var(--hue_negative)', '100')
};
// caution stops - the full scale derives through the shared ramps
export const caution_00: StyleVariable = {
	name: 'caution_00',
	light: render_ramp_color_css('var(--hue_caution)', '00')
};
export const caution_05: StyleVariable = {
	name: 'caution_05',
	light: render_ramp_color_css('var(--hue_caution)', '05')
};
export const caution_10: StyleVariable = {
	name: 'caution_10',
	light: render_ramp_color_css('var(--hue_caution)', '10')
};
export const caution_20: StyleVariable = {
	name: 'caution_20',
	light: render_ramp_color_css('var(--hue_caution)', '20')
};
export const caution_30: StyleVariable = {
	name: 'caution_30',
	light: render_ramp_color_css('var(--hue_caution)', '30')
};
export const caution_40: StyleVariable = {
	name: 'caution_40',
	light: render_ramp_color_css('var(--hue_caution)', '40')
};
export const caution_50: StyleVariable = {
	name: 'caution_50',
	light: render_ramp_color_css('var(--hue_caution)', '50')
};
export const caution_60: StyleVariable = {
	name: 'caution_60',
	light: render_ramp_color_css('var(--hue_caution)', '60')
};
export const caution_70: StyleVariable = {
	name: 'caution_70',
	light: render_ramp_color_css('var(--hue_caution)', '70')
};
export const caution_80: StyleVariable = {
	name: 'caution_80',
	light: render_ramp_color_css('var(--hue_caution)', '80')
};
export const caution_90: StyleVariable = {
	name: 'caution_90',
	light: render_ramp_color_css('var(--hue_caution)', '90')
};
export const caution_95: StyleVariable = {
	name: 'caution_95',
	light: render_ramp_color_css('var(--hue_caution)', '95')
};
export const caution_100: StyleVariable = {
	name: 'caution_100',
	light: render_ramp_color_css('var(--hue_caution)', '100')
};
// info stops - the full scale derives through the shared ramps
export const info_00: StyleVariable = {
	name: 'info_00',
	light: render_ramp_color_css('var(--hue_info)', '00')
};
export const info_05: StyleVariable = {
	name: 'info_05',
	light: render_ramp_color_css('var(--hue_info)', '05')
};
export const info_10: StyleVariable = {
	name: 'info_10',
	light: render_ramp_color_css('var(--hue_info)', '10')
};
export const info_20: StyleVariable = {
	name: 'info_20',
	light: render_ramp_color_css('var(--hue_info)', '20')
};
export const info_30: StyleVariable = {
	name: 'info_30',
	light: render_ramp_color_css('var(--hue_info)', '30')
};
export const info_40: StyleVariable = {
	name: 'info_40',
	light: render_ramp_color_css('var(--hue_info)', '40')
};
export const info_50: StyleVariable = {
	name: 'info_50',
	light: render_ramp_color_css('var(--hue_info)', '50')
};
export const info_60: StyleVariable = {
	name: 'info_60',
	light: render_ramp_color_css('var(--hue_info)', '60')
};
export const info_70: StyleVariable = {
	name: 'info_70',
	light: render_ramp_color_css('var(--hue_info)', '70')
};
export const info_80: StyleVariable = {
	name: 'info_80',
	light: render_ramp_color_css('var(--hue_info)', '80')
};
export const info_90: StyleVariable = {
	name: 'info_90',
	light: render_ramp_color_css('var(--hue_info)', '90')
};
export const info_95: StyleVariable = {
	name: 'info_95',
	light: render_ramp_color_css('var(--hue_info)', '95')
};
export const info_100: StyleVariable = {
	name: 'info_100',
	light: render_ramp_color_css('var(--hue_info)', '100')
};

/*

palette lightness ramp - endpoint knobs (the 00/100 stops themselves) + curve,
then the derived intermediate stops

*/
export const palette_lightness_00: StyleVariable = {
	name: 'palette_lightness_00',
	light: String(PALETTE_LIGHTNESS_KNOBS.light.lightness_00),
	dark: String(PALETTE_LIGHTNESS_KNOBS.dark.lightness_00)
};
export const palette_lightness_100: StyleVariable = {
	name: 'palette_lightness_100',
	light: String(PALETTE_LIGHTNESS_KNOBS.light.lightness_100),
	dark: String(PALETTE_LIGHTNESS_KNOBS.dark.lightness_100)
};
export const palette_lightness_curve: StyleVariable = {
	name: 'palette_lightness_curve',
	light: String(PALETTE_LIGHTNESS_KNOBS.light.curve),
	dark: String(PALETTE_LIGHTNESS_KNOBS.dark.curve)
};
export const palette_lightness_05: StyleVariable = {
	name: 'palette_lightness_05',
	light: render_lightness_stop_css('palette', '05')
};
export const palette_lightness_10: StyleVariable = {
	name: 'palette_lightness_10',
	light: render_lightness_stop_css('palette', '10')
};
export const palette_lightness_20: StyleVariable = {
	name: 'palette_lightness_20',
	light: render_lightness_stop_css('palette', '20')
};
export const palette_lightness_30: StyleVariable = {
	name: 'palette_lightness_30',
	light: render_lightness_stop_css('palette', '30')
};
export const palette_lightness_40: StyleVariable = {
	name: 'palette_lightness_40',
	light: render_lightness_stop_css('palette', '40')
};
export const palette_lightness_50: StyleVariable = {
	name: 'palette_lightness_50',
	light: render_lightness_stop_css('palette', '50')
};
export const palette_lightness_60: StyleVariable = {
	name: 'palette_lightness_60',
	light: render_lightness_stop_css('palette', '60')
};
export const palette_lightness_70: StyleVariable = {
	name: 'palette_lightness_70',
	light: render_lightness_stop_css('palette', '70')
};
export const palette_lightness_80: StyleVariable = {
	name: 'palette_lightness_80',
	light: render_lightness_stop_css('palette', '80')
};
export const palette_lightness_90: StyleVariable = {
	name: 'palette_lightness_90',
	light: render_lightness_stop_css('palette', '90')
};
export const palette_lightness_95: StyleVariable = {
	name: 'palette_lightness_95',
	light: render_lightness_stop_css('palette', '95')
};

/*

palette chroma - request knobs + the shared normalized shape, with the derived
stops clamped per stop by the worst-hue sRGB gamut caps (see ramps.ts);
chroma_scale multiplies outside the clamp at the color stops

*/
export const palette_chroma_min: StyleVariable = {
	name: 'palette_chroma_min',
	light: String(PALETTE_CHROMA_KNOBS.light.chroma_min),
	dark: String(PALETTE_CHROMA_KNOBS.dark.chroma_min)
};
export const palette_chroma_max: StyleVariable = {
	name: 'palette_chroma_max',
	light: String(PALETTE_CHROMA_KNOBS.light.chroma_max),
	dark: String(PALETTE_CHROMA_KNOBS.dark.chroma_max)
};
export const palette_chroma_curve: StyleVariable = {
	name: 'palette_chroma_curve',
	light: String(PALETTE_CHROMA_KNOBS.light.curve),
	dark: String(PALETTE_CHROMA_KNOBS.dark.curve),
	summary: 'falloff of the chroma peak; the neutral scales ride this same shape'
};

// normalized chroma shape per stop - 0 at the endpoints, 1 at the midpoint;
// shared by the palette chroma ramp and the neutral scales
export const chroma_shape_00: StyleVariable = {
	name: 'chroma_shape_00',
	light: render_chroma_shape_css('00')
};
export const chroma_shape_05: StyleVariable = {
	name: 'chroma_shape_05',
	light: render_chroma_shape_css('05')
};
export const chroma_shape_10: StyleVariable = {
	name: 'chroma_shape_10',
	light: render_chroma_shape_css('10')
};
export const chroma_shape_20: StyleVariable = {
	name: 'chroma_shape_20',
	light: render_chroma_shape_css('20')
};
export const chroma_shape_30: StyleVariable = {
	name: 'chroma_shape_30',
	light: render_chroma_shape_css('30')
};
export const chroma_shape_40: StyleVariable = {
	name: 'chroma_shape_40',
	light: render_chroma_shape_css('40')
};
export const chroma_shape_50: StyleVariable = {
	name: 'chroma_shape_50',
	light: render_chroma_shape_css('50')
};
export const chroma_shape_60: StyleVariable = {
	name: 'chroma_shape_60',
	light: render_chroma_shape_css('60')
};
export const chroma_shape_70: StyleVariable = {
	name: 'chroma_shape_70',
	light: render_chroma_shape_css('70')
};
export const chroma_shape_80: StyleVariable = {
	name: 'chroma_shape_80',
	light: render_chroma_shape_css('80')
};
export const chroma_shape_90: StyleVariable = {
	name: 'chroma_shape_90',
	light: render_chroma_shape_css('90')
};
export const chroma_shape_95: StyleVariable = {
	name: 'chroma_shape_95',
	light: render_chroma_shape_css('95')
};
export const chroma_shape_100: StyleVariable = {
	name: 'chroma_shape_100',
	light: render_chroma_shape_css('100')
};

// capped palette chroma stops (per-scheme caps)
export const palette_chroma_00: StyleVariable = {
	name: 'palette_chroma_00',
	light: render_chroma_stop_css('00', 'light'),
	dark: render_chroma_stop_css('00', 'dark')
};
export const palette_chroma_05: StyleVariable = {
	name: 'palette_chroma_05',
	light: render_chroma_stop_css('05', 'light'),
	dark: render_chroma_stop_css('05', 'dark')
};
export const palette_chroma_10: StyleVariable = {
	name: 'palette_chroma_10',
	light: render_chroma_stop_css('10', 'light'),
	dark: render_chroma_stop_css('10', 'dark')
};
export const palette_chroma_20: StyleVariable = {
	name: 'palette_chroma_20',
	light: render_chroma_stop_css('20', 'light'),
	dark: render_chroma_stop_css('20', 'dark')
};
export const palette_chroma_30: StyleVariable = {
	name: 'palette_chroma_30',
	light: render_chroma_stop_css('30', 'light'),
	dark: render_chroma_stop_css('30', 'dark')
};
export const palette_chroma_40: StyleVariable = {
	name: 'palette_chroma_40',
	light: render_chroma_stop_css('40', 'light'),
	dark: render_chroma_stop_css('40', 'dark')
};
export const palette_chroma_50: StyleVariable = {
	name: 'palette_chroma_50',
	light: render_chroma_stop_css('50', 'light'),
	dark: render_chroma_stop_css('50', 'dark')
};
export const palette_chroma_60: StyleVariable = {
	name: 'palette_chroma_60',
	light: render_chroma_stop_css('60', 'light'),
	dark: render_chroma_stop_css('60', 'dark')
};
export const palette_chroma_70: StyleVariable = {
	name: 'palette_chroma_70',
	light: render_chroma_stop_css('70', 'light'),
	dark: render_chroma_stop_css('70', 'dark')
};
export const palette_chroma_80: StyleVariable = {
	name: 'palette_chroma_80',
	light: render_chroma_stop_css('80', 'light'),
	dark: render_chroma_stop_css('80', 'dark')
};
export const palette_chroma_90: StyleVariable = {
	name: 'palette_chroma_90',
	light: render_chroma_stop_css('90', 'light'),
	dark: render_chroma_stop_css('90', 'dark')
};
export const palette_chroma_95: StyleVariable = {
	name: 'palette_chroma_95',
	light: render_chroma_stop_css('95', 'light'),
	dark: render_chroma_stop_css('95', 'dark')
};
export const palette_chroma_100: StyleVariable = {
	name: 'palette_chroma_100',
	light: render_chroma_stop_css('100', 'light'),
	dark: render_chroma_stop_css('100', 'dark')
};

// palette color stops - one definition per stop; the scheme flip lives in the knobs
export const palette_a_00: StyleVariable = {
	name: 'palette_a_00',
	light: render_palette_stop_css('a', '00')
};
export const palette_a_05: StyleVariable = {
	name: 'palette_a_05',
	light: render_palette_stop_css('a', '05')
};
export const palette_a_10: StyleVariable = {
	name: 'palette_a_10',
	light: render_palette_stop_css('a', '10')
};
export const palette_a_20: StyleVariable = {
	name: 'palette_a_20',
	light: render_palette_stop_css('a', '20')
};
export const palette_a_30: StyleVariable = {
	name: 'palette_a_30',
	light: render_palette_stop_css('a', '30')
};
export const palette_a_40: StyleVariable = {
	name: 'palette_a_40',
	light: render_palette_stop_css('a', '40')
};
export const palette_a_50: StyleVariable = {
	name: 'palette_a_50',
	light: render_palette_stop_css('a', '50')
};
export const palette_a_60: StyleVariable = {
	name: 'palette_a_60',
	light: render_palette_stop_css('a', '60')
};
export const palette_a_70: StyleVariable = {
	name: 'palette_a_70',
	light: render_palette_stop_css('a', '70')
};
export const palette_a_80: StyleVariable = {
	name: 'palette_a_80',
	light: render_palette_stop_css('a', '80')
};
export const palette_a_90: StyleVariable = {
	name: 'palette_a_90',
	light: render_palette_stop_css('a', '90')
};
export const palette_a_95: StyleVariable = {
	name: 'palette_a_95',
	light: render_palette_stop_css('a', '95')
};
export const palette_a_100: StyleVariable = {
	name: 'palette_a_100',
	light: render_palette_stop_css('a', '100')
};
export const palette_b_00: StyleVariable = {
	name: 'palette_b_00',
	light: render_palette_stop_css('b', '00')
};
export const palette_b_05: StyleVariable = {
	name: 'palette_b_05',
	light: render_palette_stop_css('b', '05')
};
export const palette_b_10: StyleVariable = {
	name: 'palette_b_10',
	light: render_palette_stop_css('b', '10')
};
export const palette_b_20: StyleVariable = {
	name: 'palette_b_20',
	light: render_palette_stop_css('b', '20')
};
export const palette_b_30: StyleVariable = {
	name: 'palette_b_30',
	light: render_palette_stop_css('b', '30')
};
export const palette_b_40: StyleVariable = {
	name: 'palette_b_40',
	light: render_palette_stop_css('b', '40')
};
export const palette_b_50: StyleVariable = {
	name: 'palette_b_50',
	light: render_palette_stop_css('b', '50')
};
export const palette_b_60: StyleVariable = {
	name: 'palette_b_60',
	light: render_palette_stop_css('b', '60')
};
export const palette_b_70: StyleVariable = {
	name: 'palette_b_70',
	light: render_palette_stop_css('b', '70')
};
export const palette_b_80: StyleVariable = {
	name: 'palette_b_80',
	light: render_palette_stop_css('b', '80')
};
export const palette_b_90: StyleVariable = {
	name: 'palette_b_90',
	light: render_palette_stop_css('b', '90')
};
export const palette_b_95: StyleVariable = {
	name: 'palette_b_95',
	light: render_palette_stop_css('b', '95')
};
export const palette_b_100: StyleVariable = {
	name: 'palette_b_100',
	light: render_palette_stop_css('b', '100')
};
export const palette_c_00: StyleVariable = {
	name: 'palette_c_00',
	light: render_palette_stop_css('c', '00')
};
export const palette_c_05: StyleVariable = {
	name: 'palette_c_05',
	light: render_palette_stop_css('c', '05')
};
export const palette_c_10: StyleVariable = {
	name: 'palette_c_10',
	light: render_palette_stop_css('c', '10')
};
export const palette_c_20: StyleVariable = {
	name: 'palette_c_20',
	light: render_palette_stop_css('c', '20')
};
export const palette_c_30: StyleVariable = {
	name: 'palette_c_30',
	light: render_palette_stop_css('c', '30')
};
export const palette_c_40: StyleVariable = {
	name: 'palette_c_40',
	light: render_palette_stop_css('c', '40')
};
export const palette_c_50: StyleVariable = {
	name: 'palette_c_50',
	light: render_palette_stop_css('c', '50')
};
export const palette_c_60: StyleVariable = {
	name: 'palette_c_60',
	light: render_palette_stop_css('c', '60')
};
export const palette_c_70: StyleVariable = {
	name: 'palette_c_70',
	light: render_palette_stop_css('c', '70')
};
export const palette_c_80: StyleVariable = {
	name: 'palette_c_80',
	light: render_palette_stop_css('c', '80')
};
export const palette_c_90: StyleVariable = {
	name: 'palette_c_90',
	light: render_palette_stop_css('c', '90')
};
export const palette_c_95: StyleVariable = {
	name: 'palette_c_95',
	light: render_palette_stop_css('c', '95')
};
export const palette_c_100: StyleVariable = {
	name: 'palette_c_100',
	light: render_palette_stop_css('c', '100')
};
export const palette_d_00: StyleVariable = {
	name: 'palette_d_00',
	light: render_palette_stop_css('d', '00')
};
export const palette_d_05: StyleVariable = {
	name: 'palette_d_05',
	light: render_palette_stop_css('d', '05')
};
export const palette_d_10: StyleVariable = {
	name: 'palette_d_10',
	light: render_palette_stop_css('d', '10')
};
export const palette_d_20: StyleVariable = {
	name: 'palette_d_20',
	light: render_palette_stop_css('d', '20')
};
export const palette_d_30: StyleVariable = {
	name: 'palette_d_30',
	light: render_palette_stop_css('d', '30')
};
export const palette_d_40: StyleVariable = {
	name: 'palette_d_40',
	light: render_palette_stop_css('d', '40')
};
export const palette_d_50: StyleVariable = {
	name: 'palette_d_50',
	light: render_palette_stop_css('d', '50')
};
export const palette_d_60: StyleVariable = {
	name: 'palette_d_60',
	light: render_palette_stop_css('d', '60')
};
export const palette_d_70: StyleVariable = {
	name: 'palette_d_70',
	light: render_palette_stop_css('d', '70')
};
export const palette_d_80: StyleVariable = {
	name: 'palette_d_80',
	light: render_palette_stop_css('d', '80')
};
export const palette_d_90: StyleVariable = {
	name: 'palette_d_90',
	light: render_palette_stop_css('d', '90')
};
export const palette_d_95: StyleVariable = {
	name: 'palette_d_95',
	light: render_palette_stop_css('d', '95')
};
export const palette_d_100: StyleVariable = {
	name: 'palette_d_100',
	light: render_palette_stop_css('d', '100')
};
export const palette_e_00: StyleVariable = {
	name: 'palette_e_00',
	light: render_palette_stop_css('e', '00')
};
export const palette_e_05: StyleVariable = {
	name: 'palette_e_05',
	light: render_palette_stop_css('e', '05')
};
export const palette_e_10: StyleVariable = {
	name: 'palette_e_10',
	light: render_palette_stop_css('e', '10')
};
export const palette_e_20: StyleVariable = {
	name: 'palette_e_20',
	light: render_palette_stop_css('e', '20')
};
export const palette_e_30: StyleVariable = {
	name: 'palette_e_30',
	light: render_palette_stop_css('e', '30')
};
export const palette_e_40: StyleVariable = {
	name: 'palette_e_40',
	light: render_palette_stop_css('e', '40')
};
export const palette_e_50: StyleVariable = {
	name: 'palette_e_50',
	light: render_palette_stop_css('e', '50')
};
export const palette_e_60: StyleVariable = {
	name: 'palette_e_60',
	light: render_palette_stop_css('e', '60')
};
export const palette_e_70: StyleVariable = {
	name: 'palette_e_70',
	light: render_palette_stop_css('e', '70')
};
export const palette_e_80: StyleVariable = {
	name: 'palette_e_80',
	light: render_palette_stop_css('e', '80')
};
export const palette_e_90: StyleVariable = {
	name: 'palette_e_90',
	light: render_palette_stop_css('e', '90')
};
export const palette_e_95: StyleVariable = {
	name: 'palette_e_95',
	light: render_palette_stop_css('e', '95')
};
export const palette_e_100: StyleVariable = {
	name: 'palette_e_100',
	light: render_palette_stop_css('e', '100')
};
export const palette_f_00: StyleVariable = {
	name: 'palette_f_00',
	light: render_palette_stop_css('f', '00')
};
export const palette_f_05: StyleVariable = {
	name: 'palette_f_05',
	light: render_palette_stop_css('f', '05')
};
export const palette_f_10: StyleVariable = {
	name: 'palette_f_10',
	light: render_palette_stop_css('f', '10')
};
export const palette_f_20: StyleVariable = {
	name: 'palette_f_20',
	light: render_palette_stop_css('f', '20')
};
export const palette_f_30: StyleVariable = {
	name: 'palette_f_30',
	light: render_palette_stop_css('f', '30')
};
export const palette_f_40: StyleVariable = {
	name: 'palette_f_40',
	light: render_palette_stop_css('f', '40')
};
export const palette_f_50: StyleVariable = {
	name: 'palette_f_50',
	light: render_palette_stop_css('f', '50')
};
export const palette_f_60: StyleVariable = {
	name: 'palette_f_60',
	light: render_palette_stop_css('f', '60')
};
export const palette_f_70: StyleVariable = {
	name: 'palette_f_70',
	light: render_palette_stop_css('f', '70')
};
export const palette_f_80: StyleVariable = {
	name: 'palette_f_80',
	light: render_palette_stop_css('f', '80')
};
export const palette_f_90: StyleVariable = {
	name: 'palette_f_90',
	light: render_palette_stop_css('f', '90')
};
export const palette_f_95: StyleVariable = {
	name: 'palette_f_95',
	light: render_palette_stop_css('f', '95')
};
export const palette_f_100: StyleVariable = {
	name: 'palette_f_100',
	light: render_palette_stop_css('f', '100')
};
export const palette_g_00: StyleVariable = {
	name: 'palette_g_00',
	light: render_palette_stop_css('g', '00')
};
export const palette_g_05: StyleVariable = {
	name: 'palette_g_05',
	light: render_palette_stop_css('g', '05')
};
export const palette_g_10: StyleVariable = {
	name: 'palette_g_10',
	light: render_palette_stop_css('g', '10')
};
export const palette_g_20: StyleVariable = {
	name: 'palette_g_20',
	light: render_palette_stop_css('g', '20')
};
export const palette_g_30: StyleVariable = {
	name: 'palette_g_30',
	light: render_palette_stop_css('g', '30')
};
export const palette_g_40: StyleVariable = {
	name: 'palette_g_40',
	light: render_palette_stop_css('g', '40')
};
export const palette_g_50: StyleVariable = {
	name: 'palette_g_50',
	light: render_palette_stop_css('g', '50')
};
export const palette_g_60: StyleVariable = {
	name: 'palette_g_60',
	light: render_palette_stop_css('g', '60')
};
export const palette_g_70: StyleVariable = {
	name: 'palette_g_70',
	light: render_palette_stop_css('g', '70')
};
export const palette_g_80: StyleVariable = {
	name: 'palette_g_80',
	light: render_palette_stop_css('g', '80')
};
export const palette_g_90: StyleVariable = {
	name: 'palette_g_90',
	light: render_palette_stop_css('g', '90')
};
export const palette_g_95: StyleVariable = {
	name: 'palette_g_95',
	light: render_palette_stop_css('g', '95')
};
export const palette_g_100: StyleVariable = {
	name: 'palette_g_100',
	light: render_palette_stop_css('g', '100')
};
export const palette_h_00: StyleVariable = {
	name: 'palette_h_00',
	light: render_palette_stop_css('h', '00')
};
export const palette_h_05: StyleVariable = {
	name: 'palette_h_05',
	light: render_palette_stop_css('h', '05')
};
export const palette_h_10: StyleVariable = {
	name: 'palette_h_10',
	light: render_palette_stop_css('h', '10')
};
export const palette_h_20: StyleVariable = {
	name: 'palette_h_20',
	light: render_palette_stop_css('h', '20')
};
export const palette_h_30: StyleVariable = {
	name: 'palette_h_30',
	light: render_palette_stop_css('h', '30')
};
export const palette_h_40: StyleVariable = {
	name: 'palette_h_40',
	light: render_palette_stop_css('h', '40')
};
export const palette_h_50: StyleVariable = {
	name: 'palette_h_50',
	light: render_palette_stop_css('h', '50')
};
export const palette_h_60: StyleVariable = {
	name: 'palette_h_60',
	light: render_palette_stop_css('h', '60')
};
export const palette_h_70: StyleVariable = {
	name: 'palette_h_70',
	light: render_palette_stop_css('h', '70')
};
export const palette_h_80: StyleVariable = {
	name: 'palette_h_80',
	light: render_palette_stop_css('h', '80')
};
export const palette_h_90: StyleVariable = {
	name: 'palette_h_90',
	light: render_palette_stop_css('h', '90')
};
export const palette_h_95: StyleVariable = {
	name: 'palette_h_95',
	light: render_palette_stop_css('h', '95')
};
export const palette_h_100: StyleVariable = {
	name: 'palette_h_100',
	light: render_palette_stop_css('h', '100')
};
export const palette_i_00: StyleVariable = {
	name: 'palette_i_00',
	light: render_palette_stop_css('i', '00')
};
export const palette_i_05: StyleVariable = {
	name: 'palette_i_05',
	light: render_palette_stop_css('i', '05')
};
export const palette_i_10: StyleVariable = {
	name: 'palette_i_10',
	light: render_palette_stop_css('i', '10')
};
export const palette_i_20: StyleVariable = {
	name: 'palette_i_20',
	light: render_palette_stop_css('i', '20')
};
export const palette_i_30: StyleVariable = {
	name: 'palette_i_30',
	light: render_palette_stop_css('i', '30')
};
export const palette_i_40: StyleVariable = {
	name: 'palette_i_40',
	light: render_palette_stop_css('i', '40')
};
export const palette_i_50: StyleVariable = {
	name: 'palette_i_50',
	light: render_palette_stop_css('i', '50')
};
export const palette_i_60: StyleVariable = {
	name: 'palette_i_60',
	light: render_palette_stop_css('i', '60')
};
export const palette_i_70: StyleVariable = {
	name: 'palette_i_70',
	light: render_palette_stop_css('i', '70')
};
export const palette_i_80: StyleVariable = {
	name: 'palette_i_80',
	light: render_palette_stop_css('i', '80')
};
export const palette_i_90: StyleVariable = {
	name: 'palette_i_90',
	light: render_palette_stop_css('i', '90')
};
export const palette_i_95: StyleVariable = {
	name: 'palette_i_95',
	light: render_palette_stop_css('i', '95')
};
export const palette_i_100: StyleVariable = {
	name: 'palette_i_100',
	light: render_palette_stop_css('i', '100')
};
export const palette_j_00: StyleVariable = {
	name: 'palette_j_00',
	light: render_palette_stop_css('j', '00')
};
export const palette_j_05: StyleVariable = {
	name: 'palette_j_05',
	light: render_palette_stop_css('j', '05')
};
export const palette_j_10: StyleVariable = {
	name: 'palette_j_10',
	light: render_palette_stop_css('j', '10')
};
export const palette_j_20: StyleVariable = {
	name: 'palette_j_20',
	light: render_palette_stop_css('j', '20')
};
export const palette_j_30: StyleVariable = {
	name: 'palette_j_30',
	light: render_palette_stop_css('j', '30')
};
export const palette_j_40: StyleVariable = {
	name: 'palette_j_40',
	light: render_palette_stop_css('j', '40')
};
export const palette_j_50: StyleVariable = {
	name: 'palette_j_50',
	light: render_palette_stop_css('j', '50')
};
export const palette_j_60: StyleVariable = {
	name: 'palette_j_60',
	light: render_palette_stop_css('j', '60')
};
export const palette_j_70: StyleVariable = {
	name: 'palette_j_70',
	light: render_palette_stop_css('j', '70')
};
export const palette_j_80: StyleVariable = {
	name: 'palette_j_80',
	light: render_palette_stop_css('j', '80')
};
export const palette_j_90: StyleVariable = {
	name: 'palette_j_90',
	light: render_palette_stop_css('j', '90')
};
export const palette_j_95: StyleVariable = {
	name: 'palette_j_95',
	light: render_palette_stop_css('j', '95')
};
export const palette_j_100: StyleVariable = {
	name: 'palette_j_100',
	light: render_palette_stop_css('j', '100')
};

/*

shade scale - the primary system for backgrounds and surfaces

Derived from the shade lightness knobs (see ramps.ts). The old alpha-derived
S-curve was flattened into the pow ramp in the OKLCH migration - uniform OKLCH
lightness steps are perceptually even, so the compositing compensation had no
reason to survive.

*/
// Untinted adaptive extremes
export const shade_min: StyleVariable = {
	name: 'shade_min',
	light: '#fff',
	dark: '#000'
};
export const shade_max: StyleVariable = {
	name: 'shade_max',
	light: '#000',
	dark: '#fff'
};
export const shade_lightness_00: StyleVariable = {
	name: 'shade_lightness_00',
	light: String(SHADE_LIGHTNESS_KNOBS.light.lightness_00),
	dark: String(SHADE_LIGHTNESS_KNOBS.dark.lightness_00)
};
export const shade_lightness_100: StyleVariable = {
	name: 'shade_lightness_100',
	light: String(SHADE_LIGHTNESS_KNOBS.light.lightness_100),
	dark: String(SHADE_LIGHTNESS_KNOBS.dark.lightness_100)
};
export const shade_lightness_curve: StyleVariable = {
	name: 'shade_lightness_curve',
	light: String(SHADE_LIGHTNESS_KNOBS.light.curve),
	dark: String(SHADE_LIGHTNESS_KNOBS.dark.curve)
};
export const shade_lightness_05: StyleVariable = {
	name: 'shade_lightness_05',
	light: render_lightness_stop_css('shade', '05')
};
export const shade_lightness_10: StyleVariable = {
	name: 'shade_lightness_10',
	light: render_lightness_stop_css('shade', '10')
};
export const shade_lightness_20: StyleVariable = {
	name: 'shade_lightness_20',
	light: render_lightness_stop_css('shade', '20')
};
export const shade_lightness_30: StyleVariable = {
	name: 'shade_lightness_30',
	light: render_lightness_stop_css('shade', '30')
};
export const shade_lightness_40: StyleVariable = {
	name: 'shade_lightness_40',
	light: render_lightness_stop_css('shade', '40')
};
export const shade_lightness_50: StyleVariable = {
	name: 'shade_lightness_50',
	light: render_lightness_stop_css('shade', '50')
};
export const shade_lightness_60: StyleVariable = {
	name: 'shade_lightness_60',
	light: render_lightness_stop_css('shade', '60')
};
export const shade_lightness_70: StyleVariable = {
	name: 'shade_lightness_70',
	light: render_lightness_stop_css('shade', '70')
};
export const shade_lightness_80: StyleVariable = {
	name: 'shade_lightness_80',
	light: render_lightness_stop_css('shade', '80')
};
export const shade_lightness_90: StyleVariable = {
	name: 'shade_lightness_90',
	light: render_lightness_stop_css('shade', '90')
};
export const shade_lightness_95: StyleVariable = {
	name: 'shade_lightness_95',
	light: render_lightness_stop_css('shade', '95')
};
// Tinted shade scale (00-100)
export const shade_00: StyleVariable = {
	name: 'shade_00',
	light: render_neutral_stop_css('shade', '00')
};
export const shade_05: StyleVariable = {
	name: 'shade_05',
	light: render_neutral_stop_css('shade', '05')
};
export const shade_10: StyleVariable = {
	name: 'shade_10',
	light: render_neutral_stop_css('shade', '10')
};
export const shade_20: StyleVariable = {
	name: 'shade_20',
	light: render_neutral_stop_css('shade', '20')
};
export const shade_30: StyleVariable = {
	name: 'shade_30',
	light: render_neutral_stop_css('shade', '30')
};
export const shade_40: StyleVariable = {
	name: 'shade_40',
	light: render_neutral_stop_css('shade', '40')
};
export const shade_50: StyleVariable = {
	name: 'shade_50',
	light: render_neutral_stop_css('shade', '50')
};
export const shade_60: StyleVariable = {
	name: 'shade_60',
	light: render_neutral_stop_css('shade', '60')
};
export const shade_70: StyleVariable = {
	name: 'shade_70',
	light: render_neutral_stop_css('shade', '70')
};
export const shade_80: StyleVariable = {
	name: 'shade_80',
	light: render_neutral_stop_css('shade', '80')
};
export const shade_90: StyleVariable = {
	name: 'shade_90',
	light: render_neutral_stop_css('shade', '90')
};
export const shade_95: StyleVariable = {
	name: 'shade_95',
	light: render_neutral_stop_css('shade', '95')
};
export const shade_100: StyleVariable = {
	name: 'shade_100',
	light: render_neutral_stop_css('shade', '100')
};

/*

darken/lighten - non-adaptive alpha overlays

Color-scheme-agnostic overlays for consistent darkening/lightening regardless of
light or dark mode. Use for backdrops, overlays, and demo backgrounds that need
consistent contrast. Unlike the adaptive shade scale, these don't flip.

Perceptual curve: 3%, 6%, 12%, 21%, 32%, 45%, 65%, 80%, 89%, 96%, 98%

*/
export const darken_00: StyleVariable = { name: 'darken_00', light: '#00000000', summary: '0%' };
export const darken_05: StyleVariable = { name: 'darken_05', light: '#00000008', summary: '3%' };
export const darken_10: StyleVariable = { name: 'darken_10', light: '#0000000f', summary: '6%' };
export const darken_20: StyleVariable = { name: 'darken_20', light: '#0000001f', summary: '12%' };
export const darken_30: StyleVariable = { name: 'darken_30', light: '#00000036', summary: '21%' };
export const darken_40: StyleVariable = { name: 'darken_40', light: '#00000052', summary: '32%' };
export const darken_50: StyleVariable = { name: 'darken_50', light: '#00000073', summary: '45%' };
export const darken_60: StyleVariable = { name: 'darken_60', light: '#000000a6', summary: '65%' };
export const darken_70: StyleVariable = { name: 'darken_70', light: '#000000cc', summary: '80%' };
export const darken_80: StyleVariable = { name: 'darken_80', light: '#000000e3', summary: '89%' };
export const darken_90: StyleVariable = { name: 'darken_90', light: '#000000f5', summary: '96%' };
export const darken_95: StyleVariable = { name: 'darken_95', light: '#000000fa', summary: '98%' };
export const darken_100: StyleVariable = {
	name: 'darken_100',
	light: '#000000ff',
	summary: '100%'
};
export const lighten_00: StyleVariable = { name: 'lighten_00', light: '#ffffff00', summary: '0%' };
export const lighten_05: StyleVariable = { name: 'lighten_05', light: '#ffffff08', summary: '3%' };
export const lighten_10: StyleVariable = { name: 'lighten_10', light: '#ffffff0f', summary: '6%' };
export const lighten_20: StyleVariable = { name: 'lighten_20', light: '#ffffff1f', summary: '12%' };
export const lighten_30: StyleVariable = { name: 'lighten_30', light: '#ffffff36', summary: '21%' };
export const lighten_40: StyleVariable = { name: 'lighten_40', light: '#ffffff52', summary: '32%' };
export const lighten_50: StyleVariable = { name: 'lighten_50', light: '#ffffff73', summary: '45%' };
export const lighten_60: StyleVariable = { name: 'lighten_60', light: '#ffffffa6', summary: '65%' };
export const lighten_70: StyleVariable = { name: 'lighten_70', light: '#ffffffcc', summary: '80%' };
export const lighten_80: StyleVariable = { name: 'lighten_80', light: '#ffffffe3', summary: '89%' };
export const lighten_90: StyleVariable = { name: 'lighten_90', light: '#fffffff5', summary: '96%' };
export const lighten_95: StyleVariable = { name: 'lighten_95', light: '#fffffffa', summary: '98%' };
export const lighten_100: StyleVariable = {
	name: 'lighten_100',
	light: '#ffffffff',
	summary: '100%'
};

/*

fg/bg - adaptive alpha overlays

Color-scheme-adaptive overlays that swap direction per color scheme:
- fg (foreground direction) = toward contrast (darkens in light mode, lightens in dark mode)
- bg (background direction) = toward surface (lightens in light mode, darkens in dark mode)

Use for subtle backgrounds that work in both color schemes without explicit conditionals.
These stack when nested (alpha accumulates), unlike the opaque shade scale.

*/
export const fg_00: StyleVariable = {
	name: 'fg_00',
	light: 'var(--darken_00)',
	dark: 'var(--lighten_00)'
};
export const fg_05: StyleVariable = {
	name: 'fg_05',
	light: 'var(--darken_05)',
	dark: 'var(--lighten_05)'
};
export const fg_10: StyleVariable = {
	name: 'fg_10',
	light: 'var(--darken_10)',
	dark: 'var(--lighten_10)'
};
export const fg_20: StyleVariable = {
	name: 'fg_20',
	light: 'var(--darken_20)',
	dark: 'var(--lighten_20)'
};
export const fg_30: StyleVariable = {
	name: 'fg_30',
	light: 'var(--darken_30)',
	dark: 'var(--lighten_30)'
};
export const fg_40: StyleVariable = {
	name: 'fg_40',
	light: 'var(--darken_40)',
	dark: 'var(--lighten_40)'
};
export const fg_50: StyleVariable = {
	name: 'fg_50',
	light: 'var(--darken_50)',
	dark: 'var(--lighten_50)'
};
export const fg_60: StyleVariable = {
	name: 'fg_60',
	light: 'var(--darken_60)',
	dark: 'var(--lighten_60)'
};
export const fg_70: StyleVariable = {
	name: 'fg_70',
	light: 'var(--darken_70)',
	dark: 'var(--lighten_70)'
};
export const fg_80: StyleVariable = {
	name: 'fg_80',
	light: 'var(--darken_80)',
	dark: 'var(--lighten_80)'
};
export const fg_90: StyleVariable = {
	name: 'fg_90',
	light: 'var(--darken_90)',
	dark: 'var(--lighten_90)'
};
export const fg_95: StyleVariable = {
	name: 'fg_95',
	light: 'var(--darken_95)',
	dark: 'var(--lighten_95)'
};
export const fg_100: StyleVariable = {
	name: 'fg_100',
	light: 'var(--darken_100)',
	dark: 'var(--lighten_100)'
};
export const bg_00: StyleVariable = {
	name: 'bg_00',
	light: 'var(--lighten_00)',
	dark: 'var(--darken_00)'
};
export const bg_05: StyleVariable = {
	name: 'bg_05',
	light: 'var(--lighten_05)',
	dark: 'var(--darken_05)'
};
export const bg_10: StyleVariable = {
	name: 'bg_10',
	light: 'var(--lighten_10)',
	dark: 'var(--darken_10)'
};
export const bg_20: StyleVariable = {
	name: 'bg_20',
	light: 'var(--lighten_20)',
	dark: 'var(--darken_20)'
};
export const bg_30: StyleVariable = {
	name: 'bg_30',
	light: 'var(--lighten_30)',
	dark: 'var(--darken_30)'
};
export const bg_40: StyleVariable = {
	name: 'bg_40',
	light: 'var(--lighten_40)',
	dark: 'var(--darken_40)'
};
export const bg_50: StyleVariable = {
	name: 'bg_50',
	light: 'var(--lighten_50)',
	dark: 'var(--darken_50)'
};
export const bg_60: StyleVariable = {
	name: 'bg_60',
	light: 'var(--lighten_60)',
	dark: 'var(--darken_60)'
};
export const bg_70: StyleVariable = {
	name: 'bg_70',
	light: 'var(--lighten_70)',
	dark: 'var(--darken_70)'
};
export const bg_80: StyleVariable = {
	name: 'bg_80',
	light: 'var(--lighten_80)',
	dark: 'var(--darken_80)'
};
export const bg_90: StyleVariable = {
	name: 'bg_90',
	light: 'var(--lighten_90)',
	dark: 'var(--darken_90)'
};
export const bg_95: StyleVariable = {
	name: 'bg_95',
	light: 'var(--lighten_95)',
	dark: 'var(--darken_95)'
};
export const bg_100: StyleVariable = {
	name: 'bg_100',
	light: 'var(--lighten_100)',
	dark: 'var(--darken_100)'
};

/*

border_color alpha - tinted alpha borders for accessibility

Theme-integrated borders with alpha transparency, tinted by the neutral hue
for cohesion (the base colors port the old hsl(tint 60% 20%/80%) exactly).
Higher alpha in dark mode compensates for lower perceived contrast.

*/
export const border_color_00: StyleVariable = {
	name: 'border_color_00',
	light: 'transparent'
};
// Perceptually-uniform alpha curve for borders (matches shadow_alpha curve)
// - Small gaps at low end, large gaps at high end
// - Dark mode boosted at low end (borders less visible against dark backgrounds)
export const border_color_05: StyleVariable = {
	name: 'border_color_05',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 4%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 8%)'
};
export const border_color_10: StyleVariable = {
	name: 'border_color_10',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 7%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 14%)'
};
export const border_color_20: StyleVariable = {
	name: 'border_color_20',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 13%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 22%)'
};
export const border_color_30: StyleVariable = {
	name: 'border_color_30',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 22%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 32%)'
};
export const border_color_40: StyleVariable = {
	name: 'border_color_40',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 34%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 44%)'
};
export const border_color_50: StyleVariable = {
	name: 'border_color_50',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 48%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 56%)'
};
export const border_color_60: StyleVariable = {
	name: 'border_color_60',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 62%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 68%)'
};
export const border_color_70: StyleVariable = {
	name: 'border_color_70',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 76%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 80%)'
};
export const border_color_80: StyleVariable = {
	name: 'border_color_80',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 88%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 90%)'
};
export const border_color_90: StyleVariable = {
	name: 'border_color_90',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 96%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 97%)'
};
export const border_color_95: StyleVariable = {
	name: 'border_color_95',
	light: 'oklch(0.345 0.064 var(--hue_neutral) / 99%)',
	dark: 'oklch(0.857 0.053 var(--hue_neutral) / 99%)'
};
export const border_color_100: StyleVariable = {
	name: 'border_color_100',
	light: 'oklch(0.345 0.064 var(--hue_neutral))',
	dark: 'oklch(0.857 0.053 var(--hue_neutral))'
};

/*

text colors - flipped scale where low numbers = subtle, high numbers = bold

Derived from the text lightness knobs (see ramps.ts).

*/
/* text colors don't use alpha because it affects performance too much */

// Untinted text extremes (parallel to shade_min/shade_max)
export const text_min: StyleVariable = {
	name: 'text_min',
	light: '#fff',
	dark: '#000'
};
export const text_max: StyleVariable = {
	name: 'text_max',
	light: '#000',
	dark: '#fff'
};

export const text_color: StyleVariable = { name: 'text_color', light: 'var(--text_80)' };
export const text_lightness_00: StyleVariable = {
	name: 'text_lightness_00',
	light: String(TEXT_LIGHTNESS_KNOBS.light.lightness_00),
	dark: String(TEXT_LIGHTNESS_KNOBS.dark.lightness_00)
};
export const text_lightness_100: StyleVariable = {
	name: 'text_lightness_100',
	light: String(TEXT_LIGHTNESS_KNOBS.light.lightness_100),
	dark: String(TEXT_LIGHTNESS_KNOBS.dark.lightness_100)
};
export const text_lightness_curve: StyleVariable = {
	name: 'text_lightness_curve',
	light: String(TEXT_LIGHTNESS_KNOBS.light.curve),
	dark: String(TEXT_LIGHTNESS_KNOBS.dark.curve)
};
export const text_lightness_05: StyleVariable = {
	name: 'text_lightness_05',
	light: render_lightness_stop_css('text', '05')
};
export const text_lightness_10: StyleVariable = {
	name: 'text_lightness_10',
	light: render_lightness_stop_css('text', '10')
};
export const text_lightness_20: StyleVariable = {
	name: 'text_lightness_20',
	light: render_lightness_stop_css('text', '20')
};
export const text_lightness_30: StyleVariable = {
	name: 'text_lightness_30',
	light: render_lightness_stop_css('text', '30')
};
export const text_lightness_40: StyleVariable = {
	name: 'text_lightness_40',
	light: render_lightness_stop_css('text', '40')
};
export const text_lightness_50: StyleVariable = {
	name: 'text_lightness_50',
	light: render_lightness_stop_css('text', '50')
};
export const text_lightness_60: StyleVariable = {
	name: 'text_lightness_60',
	light: render_lightness_stop_css('text', '60')
};
export const text_lightness_70: StyleVariable = {
	name: 'text_lightness_70',
	light: render_lightness_stop_css('text', '70')
};
export const text_lightness_80: StyleVariable = {
	name: 'text_lightness_80',
	light: render_lightness_stop_css('text', '80')
};
export const text_lightness_90: StyleVariable = {
	name: 'text_lightness_90',
	light: render_lightness_stop_css('text', '90')
};
export const text_lightness_95: StyleVariable = {
	name: 'text_lightness_95',
	light: render_lightness_stop_css('text', '95')
};
export const text_00: StyleVariable = {
	name: 'text_00',
	light: render_neutral_stop_css('text', '00')
};
export const text_05: StyleVariable = {
	name: 'text_05',
	light: render_neutral_stop_css('text', '05')
};
export const text_10: StyleVariable = {
	name: 'text_10',
	light: render_neutral_stop_css('text', '10')
};
export const text_20: StyleVariable = {
	name: 'text_20',
	light: render_neutral_stop_css('text', '20')
};
export const text_30: StyleVariable = {
	name: 'text_30',
	light: render_neutral_stop_css('text', '30')
};
export const text_40: StyleVariable = {
	name: 'text_40',
	light: render_neutral_stop_css('text', '40')
};
export const text_50: StyleVariable = {
	name: 'text_50',
	light: render_neutral_stop_css('text', '50')
};
export const text_60: StyleVariable = {
	name: 'text_60',
	light: render_neutral_stop_css('text', '60')
};
export const text_70: StyleVariable = {
	name: 'text_70',
	light: render_neutral_stop_css('text', '70')
};
export const text_80: StyleVariable = {
	name: 'text_80',
	light: render_neutral_stop_css('text', '80')
};
export const text_90: StyleVariable = {
	name: 'text_90',
	light: render_neutral_stop_css('text', '90')
};
export const text_95: StyleVariable = {
	name: 'text_95',
	light: render_neutral_stop_css('text', '95')
};
export const text_100: StyleVariable = {
	name: 'text_100',
	light: render_neutral_stop_css('text', '100')
};
export const text_disabled: StyleVariable = {
	name: 'text_disabled',
	light: 'var(--text_50)'
};

/* decoration */
// hook on the page background (`:root`) for gradient skies, vignettes, and
// textures - the minimal decoration channel themes kept hitting walls on
export const background_image: StyleVariable = {
	name: 'background_image',
	light: 'none'
};

/* fonts */
export const font_family_sans: StyleVariable = {
	name: 'font_family_sans',
	light:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'"
};
export const font_family_serif: StyleVariable = {
	name: 'font_family_serif',
	light: 'Georgia, serif'
};
export const font_family_mono: StyleVariable = {
	name: 'font_family_mono',
	light: 'ui-monospace, monospace'
};
export const font_weight: StyleVariable = {
	name: 'font_weight',
	light: '400',
	summary: 'base body font weight'
};
export const heading_font_family: StyleVariable = {
	name: 'heading_font_family',
	light: 'var(--font_family_serif)'
};
// `--heading_font_weight` is a hook consumed by `style.css` with per-tier
// fallbacks (h1 300 … h5 900), not a declared variable — setting it flattens
// the heading weight ladder deliberately (display-heavy themes); see `knobs.ts`

/* sizes like font-size */
export const font_size_xs: StyleVariable = { name: 'font_size_xs', light: '1rem' };
export const font_size_sm: StyleVariable = { name: 'font_size_sm', light: '1.3rem' };
export const font_size_md: StyleVariable = { name: 'font_size_md', light: '1.6rem' };
export const font_size_lg: StyleVariable = { name: 'font_size_lg', light: '2.04rem' };
export const font_size_xl: StyleVariable = { name: 'font_size_xl', light: '2.59rem' };
export const font_size_xl2: StyleVariable = { name: 'font_size_xl2', light: '3.29rem' };
export const font_size_xl3: StyleVariable = { name: 'font_size_xl3', light: '4.19rem' };
export const font_size_xl4: StyleVariable = { name: 'font_size_xl4', light: '5.33rem' };
export const font_size_xl5: StyleVariable = { name: 'font_size_xl5', light: '6.78rem' };
export const font_size_xl6: StyleVariable = { name: 'font_size_xl6', light: '8.62rem' };
export const font_size_xl7: StyleVariable = { name: 'font_size_xl7', light: '10.97rem' };
export const font_size_xl8: StyleVariable = { name: 'font_size_xl8', light: '13.95rem' };
export const font_size_xl9: StyleVariable = { name: 'font_size_xl9', light: '17.74rem' };

export const line_height_xs: StyleVariable = { name: 'line_height_xs', light: '1' };
export const line_height_sm: StyleVariable = { name: 'line_height_sm', light: '1.2' };
export const line_height_md: StyleVariable = { name: 'line_height_md', light: '1.5' };
export const line_height_lg: StyleVariable = { name: 'line_height_lg', light: '1.8' };
export const line_height_xl: StyleVariable = { name: 'line_height_xl', light: '2.2' };

/* links */
export const link_color: StyleVariable = {
	name: 'link_color',
	light: 'var(--accent_60)'
};
export const text_decoration: StyleVariable = { name: 'text_decoration', light: 'none' };
export const text_decoration_hover: StyleVariable = {
	name: 'text_decoration_hover',
	light: 'underline'
};
export const text_decoration_selected: StyleVariable = {
	name: 'text_decoration_selected',
	light: 'underline'
};
export const link_color_selected: StyleVariable = {
	name: 'link_color_selected',
	light: 'var(--text_color)'
};
// ports the old bespoke selection lightness in both schemes (light stop 20,
// dark stop 80) while following the accent intent and every ramp knob
export const selection_color: StyleVariable = {
	name: 'selection_color',
	light: render_ramp_color_css('var(--hue_accent)', '20', '40%'),
	dark: render_ramp_color_css('var(--hue_accent)', '80', '40%')
};

/* spacings, rounded to pixels for the default 16px case (at the default scale factor of 1) */
export const scale_factor: StyleVariable = {
	name: 'scale_factor',
	light: '1',
	summary: 'multiplies the space scale, below 1 is tighter and above 1 is more spacious'
};
export const space_xs5: StyleVariable = {
	name: 'space_xs5',
	light: 'calc(0.1rem * var(--scale_factor))'
};
export const space_xs4: StyleVariable = {
	name: 'space_xs4',
	light: 'calc(0.2rem * var(--scale_factor))'
};
export const space_xs3: StyleVariable = {
	name: 'space_xs3',
	light: 'calc(0.3rem * var(--scale_factor))'
};
export const space_xs2: StyleVariable = {
	name: 'space_xs2',
	light: 'calc(0.4rem * var(--scale_factor))'
};
export const space_xs: StyleVariable = {
	name: 'space_xs',
	light: 'calc(0.6rem * var(--scale_factor))'
};
export const space_sm: StyleVariable = {
	name: 'space_sm',
	light: 'calc(0.8rem * var(--scale_factor))'
};
export const space_md: StyleVariable = {
	name: 'space_md',
	light: 'calc(1rem * var(--scale_factor))'
};
export const space_lg: StyleVariable = {
	name: 'space_lg',
	light: 'calc(1.3rem * var(--scale_factor))'
};
export const space_xl: StyleVariable = {
	name: 'space_xl',
	light: 'calc(1.6rem * var(--scale_factor))'
};
export const space_xl2: StyleVariable = {
	name: 'space_xl2',
	light: 'calc(2.1rem * var(--scale_factor))'
};
export const space_xl3: StyleVariable = {
	name: 'space_xl3',
	light: 'calc(2.6rem * var(--scale_factor))'
};
export const space_xl4: StyleVariable = {
	name: 'space_xl4',
	light: 'calc(3.3rem * var(--scale_factor))'
};
export const space_xl5: StyleVariable = {
	name: 'space_xl5',
	light: 'calc(4.2rem * var(--scale_factor))'
};
export const space_xl6: StyleVariable = {
	name: 'space_xl6',
	light: 'calc(5.4rem * var(--scale_factor))'
};
export const space_xl7: StyleVariable = {
	name: 'space_xl7',
	light: 'calc(6.9rem * var(--scale_factor))'
};
export const space_xl8: StyleVariable = {
	name: 'space_xl8',
	light: 'calc(8.7rem * var(--scale_factor))'
};
export const space_xl9: StyleVariable = {
	name: 'space_xl9',
	light: 'calc(11.1rem * var(--scale_factor))'
};
export const space_xl10: StyleVariable = {
	name: 'space_xl10',
	light: 'calc(14.1rem * var(--scale_factor))'
};
export const space_xl11: StyleVariable = {
	name: 'space_xl11',
	light: 'calc(17.9rem * var(--scale_factor))'
};
export const space_xl12: StyleVariable = {
	name: 'space_xl12',
	light: 'calc(22.8rem * var(--scale_factor))'
};
export const space_xl13: StyleVariable = {
	name: 'space_xl13',
	light: 'calc(29rem * var(--scale_factor))'
};
export const space_xl14: StyleVariable = {
	name: 'space_xl14',
	light: 'calc(36.9rem * var(--scale_factor))'
};
export const space_xl15: StyleVariable = {
	name: 'space_xl15',
	light: 'calc(47rem * var(--scale_factor))'
};
export const distance_xs: StyleVariable = { name: 'distance_xs', light: '200px' };
export const distance_sm: StyleVariable = { name: 'distance_sm', light: '320px' };
export const distance_md: StyleVariable = { name: 'distance_md', light: '800px' };
export const distance_lg: StyleVariable = { name: 'distance_lg', light: '1200px' };
export const distance_xl: StyleVariable = { name: 'distance_xl', light: '1600px' };

/* borders and outlines */
export const border_color: StyleVariable = {
	name: 'border_color',
	light: 'var(--shade_30)'
};
export const border_style: StyleVariable = {
	name: 'border_style',
	light: 'solid'
};
export const border_width: StyleVariable = { name: 'border_width', light: 'var(--border_width_1)' };
// These use numbers instead of named size variants because
// they more directly map to how I think about border widths.
// But maye this could be expanded/rethought.
export const border_width_1: StyleVariable = { name: 'border_width_1', light: '1px' };
export const border_width_2: StyleVariable = { name: 'border_width_2', light: '2px' };
export const border_width_3: StyleVariable = { name: 'border_width_3', light: '3px' };
export const border_width_4: StyleVariable = { name: 'border_width_4', light: '4px' };
export const border_width_5: StyleVariable = { name: 'border_width_5', light: '5px' };
export const border_width_6: StyleVariable = { name: 'border_width_6', light: '6px' };
export const border_width_7: StyleVariable = { name: 'border_width_7', light: '7px' };
export const border_width_8: StyleVariable = { name: 'border_width_8', light: '8px' };
export const border_width_9: StyleVariable = { name: 'border_width_9', light: '9px' };
export const outline_width: StyleVariable = {
	name: 'outline_width',
	light: '0'
};
export const outline_width_focus: StyleVariable = {
	// TODO maybe rename _2 to `focus`
	name: 'outline_width_focus',
	light: 'var(--border_width_2)'
};
export const outline_width_active: StyleVariable = {
	// TODO maybe rename _3 to `active`
	name: 'outline_width_active',
	light: 'var(--border_width_1)'
};
export const outline_style: StyleVariable = { name: 'outline_style', light: 'solid' };
export const outline_color: StyleVariable = {
	name: 'outline_color',
	light: 'var(--accent_50)'
};

/* border radii - the tokens multiply a per-tier base by the radius scale, so
	"sharp"/"soft"/"pill" is one knob move while per-element tiers survive;
	pinning an individual token opts that tier out of the scale */
export const radius_scale: StyleVariable = {
	name: 'radius_scale',
	light: '1',
	summary: '0 is sharp, below 1 is squarer, above 1 is rounder'
};
export const border_radius_xs3: StyleVariable = {
	name: 'border_radius_xs3',
	light: 'calc(0.3rem * var(--radius_scale))'
};
export const border_radius_xs2: StyleVariable = {
	name: 'border_radius_xs2',
	light: 'calc(0.5rem * var(--radius_scale))'
};
export const border_radius_xs: StyleVariable = {
	name: 'border_radius_xs',
	light: 'calc(0.8rem * var(--radius_scale))'
};
export const border_radius_sm: StyleVariable = {
	name: 'border_radius_sm',
	light: 'calc(1.3rem * var(--radius_scale))'
};
export const border_radius_md: StyleVariable = {
	name: 'border_radius_md',
	light: 'calc(2.1rem * var(--radius_scale))'
};
export const border_radius_lg: StyleVariable = {
	name: 'border_radius_lg',
	light: 'calc(3.4rem * var(--radius_scale))'
};
export const border_radius_xl: StyleVariable = {
	name: 'border_radius_xl',
	light: 'calc(5.5rem * var(--radius_scale))'
};

/* button shadows */
export const button_shadow: StyleVariable = {
	name: 'button_shadow',
	light:
		'var(--shadow_inset_bottom_xs) color-mix(in oklab, var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha_30), transparent), var(--shadow_inset_top_xs) color-mix(in oklab, var(--shadow_color_highlight) var(--shadow_alpha_30), transparent)',
	dark: 'var(--shadow_inset_top_xs) color-mix(in oklab, var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha_30), transparent), var(--shadow_inset_bottom_xs) color-mix(in oklab, var(--shadow_color_highlight) var(--shadow_alpha_30), transparent)'
};
export const button_shadow_hover: StyleVariable = {
	name: 'button_shadow_hover',
	light:
		'var(--shadow_inset_bottom_sm) color-mix(in oklab, var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha_40), transparent), var(--shadow_inset_top_sm) color-mix(in oklab, var(--shadow_color_highlight) var(--shadow_alpha_40), transparent)',
	dark: 'var(--shadow_inset_top_sm) color-mix(in oklab, var(--shadow_color, var(--shadow_color_umbra)) var(--shadow_alpha_40), transparent), var(--shadow_inset_bottom_sm) color-mix(in oklab, var(--shadow_color_highlight) var(--shadow_alpha_40), transparent)'
};
export const button_shadow_active: StyleVariable = {
	name: 'button_shadow_active',
	light: button_shadow_hover.dark,
	dark: button_shadow_hover.light
};

/* inputs */
export const input_fill: StyleVariable = { name: 'input_fill', light: 'var(--bg_80)' };
export const input_padding_y: StyleVariable = { name: 'input_padding_y', light: '0' };
export const input_padding_x: StyleVariable = { name: 'input_padding_x', light: 'var(--space_lg)' };
export const input_width_min: StyleVariable = { name: 'input_width_min', light: '100px' };
export const input_height: StyleVariable = { name: 'input_height', light: 'var(--space_xl5)' };
export const input_height_compact: StyleVariable = {
	name: 'input_height_compact',
	light: 'var(--space_xl4)'
};

/*

shadows

*/

// TODO these shouldn't use tint, use lighten/darken instead,
// but ideally we'd have a blend mode make the colors right,
// which would require a pseduo-element,
// but that's heavier and requires the element to be positioned (I think?)

// TODO maybe:
// - make shadow and glow color-scheme-agnostic?
// - lift and depth that have both shadow and glow, color-scheme-aware

export const shadow_xs: StyleVariable = {
	name: 'shadow_xs',
	light: '0 0 3px 0px'
};
export const shadow_top_xs: StyleVariable = {
	name: 'shadow_top_xs',
	light: '0 -1px 3px 0px'
};
export const shadow_bottom_xs: StyleVariable = {
	name: 'shadow_bottom_xs',
	light: '0 1px 3px 0px'
};
export const shadow_inset_xs: StyleVariable = {
	name: 'shadow_inset_xs',
	light: 'inset 0 0 3px 0px'
};
export const shadow_inset_top_xs: StyleVariable = {
	name: 'shadow_inset_top_xs',
	light: 'inset 0 1px 3px 0px'
};
export const shadow_inset_bottom_xs: StyleVariable = {
	name: 'shadow_inset_bottom_xs',
	light: 'inset 0 -1px 3px 0px'
};
export const shadow_sm: StyleVariable = {
	name: 'shadow_sm',
	light: '0 0 4px 0px'
};
export const shadow_top_sm: StyleVariable = {
	name: 'shadow_top_sm',
	light: '0 -1.5px 4px 0px'
};
export const shadow_bottom_sm: StyleVariable = {
	name: 'shadow_bottom_sm',
	light: '0 1.5px 4px 0px'
};
export const shadow_inset_sm: StyleVariable = {
	name: 'shadow_inset_sm',
	light: 'inset 0 0 4px 0px'
};
export const shadow_inset_top_sm: StyleVariable = {
	name: 'shadow_inset_top_sm',
	light: 'inset 0 1.5px 4px 0px'
};
export const shadow_inset_bottom_sm: StyleVariable = {
	name: 'shadow_inset_bottom_sm',
	light: 'inset 0 -1.5px 4px 0px'
};
export const shadow_md: StyleVariable = {
	name: 'shadow_md',
	light: '0 0 6px 0px'
};
export const shadow_top_md: StyleVariable = {
	name: 'shadow_top_md',
	light: '0 -2.5px 6px 0px'
};
export const shadow_bottom_md: StyleVariable = {
	name: 'shadow_bottom_md',
	light: '0 2.5px 6px 0px'
};
export const shadow_inset_md: StyleVariable = {
	name: 'shadow_inset_md',
	light: 'inset 0 0 6px 0px'
};
export const shadow_inset_top_md: StyleVariable = {
	name: 'shadow_inset_top_md',
	light: 'inset 0 2.5px 6px 0px'
};
export const shadow_inset_bottom_md: StyleVariable = {
	name: 'shadow_inset_bottom_md',
	light: 'inset 0 -2.5px 6px 0px'
};
export const shadow_lg: StyleVariable = {
	name: 'shadow_lg',
	light: '0 0 10px 0px'
};
export const shadow_top_lg: StyleVariable = {
	name: 'shadow_top_lg',
	light: '0 -3.5px 10px 0px'
};
export const shadow_bottom_lg: StyleVariable = {
	name: 'shadow_bottom_lg',
	light: '0 3.5px 10px 0px'
};
export const shadow_inset_lg: StyleVariable = {
	name: 'shadow_inset_lg',
	light: 'inset 0 0 10px 0px'
};
export const shadow_inset_top_lg: StyleVariable = {
	name: 'shadow_inset_top_lg',
	light: 'inset 0 3.5px 10px 0px'
};
export const shadow_inset_bottom_lg: StyleVariable = {
	name: 'shadow_inset_bottom_lg',
	light: 'inset 0 -3.5px 10px 0px'
};
export const shadow_xl: StyleVariable = {
	name: 'shadow_xl',
	light: '0 0 20px 1px'
};
export const shadow_top_xl: StyleVariable = {
	name: 'shadow_top_xl',
	light: '0 -5px 20px 1px'
};
export const shadow_bottom_xl: StyleVariable = {
	name: 'shadow_bottom_xl',
	light: '0 5px 20px 1px'
};
export const shadow_inset_xl: StyleVariable = {
	name: 'shadow_inset_xl',
	light: 'inset 0 0 20px 1px'
};
export const shadow_inset_top_xl: StyleVariable = {
	name: 'shadow_inset_top_xl',
	light: 'inset 0 5px 20px 1px'
};
export const shadow_inset_bottom_xl: StyleVariable = {
	name: 'shadow_inset_bottom_xl',
	light: 'inset 0 -5px 20px 1px'
};
export const shadow_color_umbra: StyleVariable = {
	name: 'shadow_color_umbra',
	light: '#000',
	dark: 'oklch(0.863 0.009 var(--hue_neutral))'
};
export const shadow_color_highlight: StyleVariable = {
	name: 'shadow_color_highlight',
	light: 'oklch(0.955 0.003 var(--hue_neutral))',
	dark: '#000'
};
export const shadow_color_glow: StyleVariable = {
	name: 'shadow_color_glow',
	light: 'oklch(0.955 0.003 var(--hue_neutral))',
	dark: 'oklch(0.863 0.009 var(--hue_neutral))'
};
export const shadow_color_shroud: StyleVariable = {
	name: 'shadow_color_shroud',
	light: '#000'
};
// Perceptually-uniform alpha curve for shadows:
// - Small gaps at low end (subtle changes are perceptible)
// - Large gaps at high end (need bigger changes to notice)
// - Dark mode boosted at low end (shadows less visible against dark backgrounds)
// The stops multiply their base alphas by the shadow alpha scale, so "flat" is
// one knob move (button shadows follow too, via their alpha-stop references);
// calc() results clamp to the valid range at computed-value time.
export const shadow_alpha_scale: StyleVariable = {
	name: 'shadow_alpha_scale',
	light: '1',
	summary: '0 flattens all shadows including button shadows, above 1 deepens them'
};
export const shadow_alpha_00: StyleVariable = { name: 'shadow_alpha_00', light: '0%' };
export const shadow_alpha_05: StyleVariable = {
	name: 'shadow_alpha_05',
	light: 'calc(6% * var(--shadow_alpha_scale))',
	dark: 'calc(13% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_10: StyleVariable = {
	name: 'shadow_alpha_10',
	light: 'calc(10% * var(--shadow_alpha_scale))',
	dark: 'calc(19% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_20: StyleVariable = {
	name: 'shadow_alpha_20',
	light: 'calc(16% * var(--shadow_alpha_scale))',
	dark: 'calc(27% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_30: StyleVariable = {
	name: 'shadow_alpha_30',
	light: 'calc(25% * var(--shadow_alpha_scale))',
	dark: 'calc(37% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_40: StyleVariable = {
	name: 'shadow_alpha_40',
	light: 'calc(36% * var(--shadow_alpha_scale))',
	dark: 'calc(47% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_50: StyleVariable = {
	name: 'shadow_alpha_50',
	light: 'calc(50% * var(--shadow_alpha_scale))',
	dark: 'calc(59% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_60: StyleVariable = {
	name: 'shadow_alpha_60',
	light: 'calc(64% * var(--shadow_alpha_scale))',
	dark: 'calc(71% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_70: StyleVariable = {
	name: 'shadow_alpha_70',
	light: 'calc(77% * var(--shadow_alpha_scale))',
	dark: 'calc(83% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_80: StyleVariable = {
	name: 'shadow_alpha_80',
	light: 'calc(88% * var(--shadow_alpha_scale))',
	dark: 'calc(91% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_90: StyleVariable = {
	name: 'shadow_alpha_90',
	light: 'calc(96% * var(--shadow_alpha_scale))',
	dark: 'calc(98% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_95: StyleVariable = {
	name: 'shadow_alpha_95',
	light: 'calc(99% * var(--shadow_alpha_scale))',
	dark: 'calc(100% * var(--shadow_alpha_scale))'
};
export const shadow_alpha_100: StyleVariable = {
	name: 'shadow_alpha_100',
	light: 'calc(100% * var(--shadow_alpha_scale))'
};

/* icons */
/* these decrease by the golden ratio, rounded to the nearest pixel,
	and they're insensitive to font size (`px` not `rem`) */
export const icon_size_xs: StyleVariable = {
	name: 'icon_size_xs',
	light: icon_sizes.icon_size_xs
};
export const icon_size_sm: StyleVariable = {
	name: 'icon_size_sm',
	light: icon_sizes.icon_size_sm
};
export const icon_size_md: StyleVariable = {
	name: 'icon_size_md',
	light: icon_sizes.icon_size_md
};
export const icon_size_lg: StyleVariable = {
	name: 'icon_size_lg',
	light: icon_sizes.icon_size_lg
};
export const icon_size_xl: StyleVariable = {
	name: 'icon_size_xl',
	light: icon_sizes.icon_size_xl
};
export const icon_size_xl2: StyleVariable = {
	name: 'icon_size_xl2',
	light: icon_sizes.icon_size_xl2
};
export const icon_size_xl3: StyleVariable = {
	name: 'icon_size_xl3',
	light: icon_sizes.icon_size_xl3
};

/* durations */
// TODO maybe change the scale from xs-xl, and add an xs here around 0.04s or 0.03s (2 frames at 60fps)
// TODO docs
export const duration_1: StyleVariable = { name: 'duration_1', light: '0.08s' };
export const duration_2: StyleVariable = { name: 'duration_2', light: '0.2s' };
export const duration_3: StyleVariable = { name: 'duration_3', light: '0.5s' };
export const duration_4: StyleVariable = { name: 'duration_4', light: '1s' };
export const duration_5: StyleVariable = { name: 'duration_5', light: '1.5s' };
export const duration_6: StyleVariable = { name: 'duration_6', light: '3s' };

export const disabled_opacity: StyleVariable = {
	name: 'disabled_opacity',
	light: '60%'
};

/**
 * These are implicitly the variables for the `base` theme.
 * See also the empty `variables` array of the `base` theme in `themes.ts`.
 */
export const default_variables: Array<StyleVariable> = [
	hue_a,
	hue_b,
	hue_c,
	hue_d,
	hue_e,
	hue_f,
	hue_g,
	hue_h,
	hue_i,
	hue_j,
	palette_a_chroma_scale,
	palette_b_chroma_scale,
	palette_c_chroma_scale,
	palette_d_chroma_scale,
	palette_e_chroma_scale,
	palette_f_chroma_scale,
	palette_g_chroma_scale,
	palette_h_chroma_scale,
	palette_i_chroma_scale,
	palette_j_chroma_scale,
	chroma_scale,
	hue_neutral,
	neutral_chroma,
	hue_accent,
	hue_positive,
	hue_negative,
	hue_caution,
	hue_info,
	accent_chroma_scale,
	positive_chroma_scale,
	negative_chroma_scale,
	caution_chroma_scale,
	info_chroma_scale,
	accent_00,
	accent_05,
	accent_10,
	accent_20,
	accent_30,
	accent_40,
	accent_50,
	accent_60,
	accent_70,
	accent_80,
	accent_90,
	accent_95,
	accent_100,
	positive_00,
	positive_05,
	positive_10,
	positive_20,
	positive_30,
	positive_40,
	positive_50,
	positive_60,
	positive_70,
	positive_80,
	positive_90,
	positive_95,
	positive_100,
	negative_00,
	negative_05,
	negative_10,
	negative_20,
	negative_30,
	negative_40,
	negative_50,
	negative_60,
	negative_70,
	negative_80,
	negative_90,
	negative_95,
	negative_100,
	caution_00,
	caution_05,
	caution_10,
	caution_20,
	caution_30,
	caution_40,
	caution_50,
	caution_60,
	caution_70,
	caution_80,
	caution_90,
	caution_95,
	caution_100,
	info_00,
	info_05,
	info_10,
	info_20,
	info_30,
	info_40,
	info_50,
	info_60,
	info_70,
	info_80,
	info_90,
	info_95,
	info_100,
	palette_lightness_00,
	palette_lightness_100,
	palette_lightness_curve,
	palette_lightness_05,
	palette_lightness_10,
	palette_lightness_20,
	palette_lightness_30,
	palette_lightness_40,
	palette_lightness_50,
	palette_lightness_60,
	palette_lightness_70,
	palette_lightness_80,
	palette_lightness_90,
	palette_lightness_95,
	palette_chroma_min,
	palette_chroma_max,
	palette_chroma_curve,
	chroma_shape_00,
	chroma_shape_05,
	chroma_shape_10,
	chroma_shape_20,
	chroma_shape_30,
	chroma_shape_40,
	chroma_shape_50,
	chroma_shape_60,
	chroma_shape_70,
	chroma_shape_80,
	chroma_shape_90,
	chroma_shape_95,
	chroma_shape_100,
	palette_chroma_00,
	palette_chroma_05,
	palette_chroma_10,
	palette_chroma_20,
	palette_chroma_30,
	palette_chroma_40,
	palette_chroma_50,
	palette_chroma_60,
	palette_chroma_70,
	palette_chroma_80,
	palette_chroma_90,
	palette_chroma_95,
	palette_chroma_100,
	palette_a_00,
	palette_a_05,
	palette_a_10,
	palette_a_20,
	palette_a_30,
	palette_a_40,
	palette_a_50,
	palette_a_60,
	palette_a_70,
	palette_a_80,
	palette_a_90,
	palette_a_95,
	palette_a_100,
	palette_b_00,
	palette_b_05,
	palette_b_10,
	palette_b_20,
	palette_b_30,
	palette_b_40,
	palette_b_50,
	palette_b_60,
	palette_b_70,
	palette_b_80,
	palette_b_90,
	palette_b_95,
	palette_b_100,
	palette_c_00,
	palette_c_05,
	palette_c_10,
	palette_c_20,
	palette_c_30,
	palette_c_40,
	palette_c_50,
	palette_c_60,
	palette_c_70,
	palette_c_80,
	palette_c_90,
	palette_c_95,
	palette_c_100,
	palette_d_00,
	palette_d_05,
	palette_d_10,
	palette_d_20,
	palette_d_30,
	palette_d_40,
	palette_d_50,
	palette_d_60,
	palette_d_70,
	palette_d_80,
	palette_d_90,
	palette_d_95,
	palette_d_100,
	palette_e_00,
	palette_e_05,
	palette_e_10,
	palette_e_20,
	palette_e_30,
	palette_e_40,
	palette_e_50,
	palette_e_60,
	palette_e_70,
	palette_e_80,
	palette_e_90,
	palette_e_95,
	palette_e_100,
	palette_f_00,
	palette_f_05,
	palette_f_10,
	palette_f_20,
	palette_f_30,
	palette_f_40,
	palette_f_50,
	palette_f_60,
	palette_f_70,
	palette_f_80,
	palette_f_90,
	palette_f_95,
	palette_f_100,
	palette_g_00,
	palette_g_05,
	palette_g_10,
	palette_g_20,
	palette_g_30,
	palette_g_40,
	palette_g_50,
	palette_g_60,
	palette_g_70,
	palette_g_80,
	palette_g_90,
	palette_g_95,
	palette_g_100,
	palette_h_00,
	palette_h_05,
	palette_h_10,
	palette_h_20,
	palette_h_30,
	palette_h_40,
	palette_h_50,
	palette_h_60,
	palette_h_70,
	palette_h_80,
	palette_h_90,
	palette_h_95,
	palette_h_100,
	palette_i_00,
	palette_i_05,
	palette_i_10,
	palette_i_20,
	palette_i_30,
	palette_i_40,
	palette_i_50,
	palette_i_60,
	palette_i_70,
	palette_i_80,
	palette_i_90,
	palette_i_95,
	palette_i_100,
	palette_j_00,
	palette_j_05,
	palette_j_10,
	palette_j_20,
	palette_j_30,
	palette_j_40,
	palette_j_50,
	palette_j_60,
	palette_j_70,
	palette_j_80,
	palette_j_90,
	palette_j_95,
	palette_j_100,
	shade_min,
	shade_max,
	shade_lightness_00,
	shade_lightness_100,
	shade_lightness_curve,
	shade_lightness_05,
	shade_lightness_10,
	shade_lightness_20,
	shade_lightness_30,
	shade_lightness_40,
	shade_lightness_50,
	shade_lightness_60,
	shade_lightness_70,
	shade_lightness_80,
	shade_lightness_90,
	shade_lightness_95,
	shade_00,
	shade_05,
	shade_10,
	shade_20,
	shade_30,
	shade_40,
	shade_50,
	shade_60,
	shade_70,
	shade_80,
	shade_90,
	shade_95,
	shade_100,
	darken_00,
	darken_05,
	darken_10,
	darken_20,
	darken_30,
	darken_40,
	darken_50,
	darken_60,
	darken_70,
	darken_80,
	darken_90,
	darken_95,
	darken_100,
	lighten_00,
	lighten_05,
	lighten_10,
	lighten_20,
	lighten_30,
	lighten_40,
	lighten_50,
	lighten_60,
	lighten_70,
	lighten_80,
	lighten_90,
	lighten_95,
	lighten_100,
	fg_00,
	fg_05,
	fg_10,
	fg_20,
	fg_30,
	fg_40,
	fg_50,
	fg_60,
	fg_70,
	fg_80,
	fg_90,
	fg_95,
	fg_100,
	bg_00,
	bg_05,
	bg_10,
	bg_20,
	bg_30,
	bg_40,
	bg_50,
	bg_60,
	bg_70,
	bg_80,
	bg_90,
	bg_95,
	bg_100,
	border_color_00,
	border_color_05,
	border_color_10,
	border_color_20,
	border_color_30,
	border_color_40,
	border_color_50,
	border_color_60,
	border_color_70,
	border_color_80,
	border_color_90,
	border_color_95,
	border_color_100,
	text_min,
	text_max,
	text_color,
	text_lightness_00,
	text_lightness_100,
	text_lightness_curve,
	text_lightness_05,
	text_lightness_10,
	text_lightness_20,
	text_lightness_30,
	text_lightness_40,
	text_lightness_50,
	text_lightness_60,
	text_lightness_70,
	text_lightness_80,
	text_lightness_90,
	text_lightness_95,
	text_00,
	text_05,
	text_10,
	text_20,
	text_30,
	text_40,
	text_50,
	text_60,
	text_70,
	text_80,
	text_90,
	text_95,
	text_100,
	text_disabled,
	background_image,
	font_family_sans,
	font_family_serif,
	font_family_mono,
	font_weight,
	heading_font_family,
	font_size_xs,
	font_size_sm,
	font_size_md,
	font_size_lg,
	font_size_xl,
	font_size_xl2,
	font_size_xl3,
	font_size_xl4,
	font_size_xl5,
	font_size_xl6,
	font_size_xl7,
	font_size_xl8,
	font_size_xl9,
	line_height_xs,
	line_height_sm,
	line_height_md,
	line_height_lg,
	line_height_xl,
	link_color,
	text_decoration,
	text_decoration_hover,
	text_decoration_selected,
	link_color_selected,
	selection_color,
	scale_factor,
	space_xs5,
	space_xs4,
	space_xs3,
	space_xs2,
	space_xs,
	space_sm,
	space_md,
	space_lg,
	space_xl,
	space_xl2,
	space_xl3,
	space_xl4,
	space_xl5,
	space_xl6,
	space_xl7,
	space_xl8,
	space_xl9,
	space_xl10,
	space_xl11,
	space_xl12,
	space_xl13,
	space_xl14,
	space_xl15,
	distance_xs,
	distance_sm,
	distance_md,
	distance_lg,
	distance_xl,
	border_color,
	border_style,
	border_width,
	border_width_1,
	border_width_2,
	border_width_3,
	border_width_4,
	border_width_5,
	border_width_6,
	border_width_7,
	border_width_8,
	border_width_9,
	outline_width,
	outline_width_focus,
	outline_width_active,
	outline_style,
	outline_color,
	radius_scale,
	border_radius_xs3,
	border_radius_xs2,
	border_radius_xs,
	border_radius_sm,
	border_radius_md,
	border_radius_lg,
	border_radius_xl,
	button_shadow,
	button_shadow_hover,
	button_shadow_active,
	input_fill,
	input_padding_y,
	input_padding_x,
	input_width_min,
	input_height,
	input_height_compact,
	shadow_xs,
	shadow_top_xs,
	shadow_bottom_xs,
	shadow_inset_xs,
	shadow_inset_top_xs,
	shadow_inset_bottom_xs,
	shadow_sm,
	shadow_top_sm,
	shadow_bottom_sm,
	shadow_inset_sm,
	shadow_inset_top_sm,
	shadow_inset_bottom_sm,
	shadow_md,
	shadow_top_md,
	shadow_bottom_md,
	shadow_inset_md,
	shadow_inset_top_md,
	shadow_inset_bottom_md,
	shadow_lg,
	shadow_top_lg,
	shadow_bottom_lg,
	shadow_inset_lg,
	shadow_inset_top_lg,
	shadow_inset_bottom_lg,
	shadow_xl,
	shadow_top_xl,
	shadow_bottom_xl,
	shadow_inset_xl,
	shadow_inset_top_xl,
	shadow_inset_bottom_xl,
	shadow_color_umbra,
	shadow_color_highlight,
	shadow_color_glow,
	shadow_color_shroud,
	shadow_alpha_scale,
	shadow_alpha_00,
	shadow_alpha_05,
	shadow_alpha_10,
	shadow_alpha_20,
	shadow_alpha_30,
	shadow_alpha_40,
	shadow_alpha_50,
	shadow_alpha_60,
	shadow_alpha_70,
	shadow_alpha_80,
	shadow_alpha_90,
	shadow_alpha_95,
	shadow_alpha_100,
	icon_size_xs,
	icon_size_sm,
	icon_size_md,
	icon_size_lg,
	icon_size_xl,
	icon_size_xl2,
	icon_size_xl3,
	duration_1,
	duration_2,
	duration_3,
	duration_4,
	duration_5,
	duration_6,
	disabled_opacity
];
