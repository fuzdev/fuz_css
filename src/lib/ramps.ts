/**
 * The derived color system's ramp model and fitted default knob values.
 *
 * This is the numeric single source of truth for the OKLCH palette: the same
 * constants and formulas that `variables.ts` renders as pure-CSS
 * `calc()`/`pow()`/`oklch()` defaults, evaluated here in TypeScript so
 * design-time tests can gate the defaults (gamut, ramp monotonicity, contrast
 * - see `src/test/ramps.test.ts`) and derivation scripts can reason about the
 * palette without a browser.
 *
 * The knob values were fitted against the pre-OKLCH HSL palette to minimize
 * the perceptual delta of the port. Model shapes:
 *
 * - lightness: `L(t) = L00 + (L100 - L00) * pow(t, curve)` with `t = stop/100`
 *   - the endpoint knobs literally are stops 00/100, so the dark scheme flips
 *   direction purely through knob values, and pinning an endpoint stop and
 *   turning a knob are the same act
 * - chroma: `C(t) = min + (max - min) * pow(4t(1-t), curve)`, a symmetric
 *   mid-peaked curve, clamped per stop by the worst-hue gamut caps below
 * - the neutral scale rides the same chroma shape scaled by a single knob
 *
 * @module
 */

import {
	numeric_scale_variants,
	palette_variants,
	intent_variants,
	type PaletteVariant,
	type ColorSchemeVariant,
	type NumericScaleVariant
} from './variable_data.ts';
import { oklch_max_srgb_chroma, type Oklch } from './oklch.ts';

/** The 13 intensity stops in ramp order (00 → 100). */
export const RAMP_STOPS: ReadonlyArray<NumericScaleVariant> = numeric_scale_variants;

/**
 * Converts a stop variant to its ramp position `t` in [0, 1].
 */
export const ramp_stop_t = (stop: NumericScaleVariant): number => Number(stop) / 100;

/**
 * Knobs for a pow-curve lightness ramp. The endpoints are the ramp's own
 * 00/100 stops, so light and dark schemes differ only in values, never in
 * formula - no direction flag needed.
 */
export interface LightnessRampKnobs {
	/** OKLCH lightness at stop 00, in [0, 1]. */
	lightness_00: number;
	/** OKLCH lightness at stop 100, in [0, 1]. */
	lightness_100: number;
	/** Exponent bending the ramp between the endpoints; 1 is linear. */
	curve: number;
}

/**
 * Knobs for the symmetric mid-peaked chroma curve,
 * `C(t) = min + (max - min) * pow(4t(1-t), curve)`.
 * The curve expresses the *request*; rendered stops are clamped by
 * `PALETTE_CHROMA_CAPS` per stop, and `--chroma_scale` multiplies above the
 * clamp (so vivid themes can knowingly push past the caps and gamut-clip).
 */
export interface ChromaRampKnobs {
	/** Chroma requested at the ramp endpoints (stops 00/100), before capping. */
	chroma_min: number;
	/** Chroma requested at the ramp midpoint (stop 50), before capping. */
	chroma_max: number;
	/** Falloff exponent of the peak; higher concentrates chroma at the middle. */
	curve: number;
}

/** OKLCH hue angles for the 10 palette hues, fitted from the HSL palette. */
export const PALETTE_HUES: Record<PaletteVariant, number> = {
	a: 250, // blue
	b: 144, // green
	c: 29, // red - the OKLCH hue of #ff0000 (29.23) rounded
	d: 296, // purple
	e: 98, // yellow
	f: 60, // brown
	g: 358, // pink
	h: 41, // orange
	i: 210, // cyan
	j: 180 // teal
};

/**
 * Per-slot chroma multipliers (`--palette_X_chroma_scale`), the palette's
 * chroma-character knobs. Each multiplies its slot's chroma under the global
 * `--chroma_scale` (multiplicative, so the slot's character is preserved at
 * any global setting); values at or below 1 stay inside the worst-hue gamut
 * caps by construction, above 1 knowingly clips like the global knob. The
 * brown slot ships muted because brown is low-chroma dark orange - no hue
 * angle renders it at full palette chroma.
 */
export const PALETTE_CHROMA_MULTIPLIERS: Record<PaletteVariant, number> = {
	a: 1,
	b: 1,
	c: 1,
	d: 1,
	e: 1,
	f: 0.55, // brown - low-chroma orange by definition
	g: 1,
	h: 1,
	i: 1,
	j: 1
};

/** Fitted lightness knobs for the palette (`palette_X_NN`) ramps. */
export const PALETTE_LIGHTNESS_KNOBS: Record<ColorSchemeVariant, LightnessRampKnobs> = {
	light: { lightness_00: 0.985, lightness_100: 0.116, curve: 1.15 },
	dark: { lightness_00: 0.147, lightness_100: 0.971, curve: 0.76 }
};

/** Fitted lightness knobs for the shade (surface) ramps. */
export const SHADE_LIGHTNESS_KNOBS: Record<ColorSchemeVariant, LightnessRampKnobs> = {
	light: { lightness_00: 0.97, lightness_100: 0.171, curve: 1.09 },
	dark: { lightness_00: 0.171, lightness_100: 0.97, curve: 0.92 }
};

/** Fitted lightness knobs for the text ramps. */
export const TEXT_LIGHTNESS_KNOBS: Record<ColorSchemeVariant, LightnessRampKnobs> = {
	light: { lightness_00: 0.97, lightness_100: 0.146, curve: 1.19 },
	dark: { lightness_00: 0.146, lightness_100: 0.97, curve: 0.87 }
};

/**
 * Fitted chroma-curve knobs for the palette ramps.
 *
 * Fitted so the requested curve hugs the effective post-clamp chroma instead
 * of sitting above the caps through the mid-range - turning the knobs down
 * responds immediately. Turning `chroma_max` up remains cap-clamped by
 * design; `--chroma_scale` is the push-past-the-gamut knob. The residual vs
 * the HSL palette this fit ports is small (mean ΔEOK ≈ 0.005 light / 0.003
 * dark) except light stop 30 (−0.028 C): the symmetric mid-peaked model
 * can't reach the light cap envelope's peak there - recovering it would
 * take an asymmetric shape (a peak-position knob).
 */
export const PALETTE_CHROMA_KNOBS: Record<ColorSchemeVariant, ChromaRampKnobs> = {
	light: { chroma_min: 0.0132, chroma_max: 0.106, curve: 1.3 },
	dark: { chroma_min: 0.0214, chroma_max: 0.1088, curve: 1.27 }
};

/**
 * Default OKLCH hue angle of the neutral intent. In CSS the knob chains to the
 * palette (`--hue_neutral: var(--hue_f)`); this constant mirrors that default
 * numerically.
 */
export const NEUTRAL_HUE = PALETTE_HUES.f;

/**
 * Peak chroma of the neutral (shade/text) scales. The neutral rides the
 * palette's chroma shape scaled to this peak, which preserves the old
 * behavior of constant HSL saturation: strong tint at mid lightness, nearly
 * untinted near white and black.
 */
export const NEUTRAL_CHROMA: Record<ColorSchemeVariant, number> = {
	light: 0.024,
	dark: 0.025
};

/**
 * OKLCH lightness of the border color family (`--border_color_lightness`),
 * fitted from the HSL palette. Sits mid-ramp so borders read against both
 * the page background and fills.
 */
export const BORDER_COLOR_LIGHTNESS: Record<ColorSchemeVariant, number> = {
	light: 0.345,
	dark: 0.857
};

/**
 * The border family's chroma as a multiple of `--neutral_chroma` - borders
 * carry a stronger tint than surfaces so they read at low alpha. In CSS this
 * is `--border_color_chroma: calc(var(--neutral_chroma) * <multiple>)`.
 */
export const BORDER_CHROMA_MULTIPLIER: Record<ColorSchemeVariant, number> = {
	light: 2.6667,
	dark: 2.12
};

/**
 * Alpha (in %) of each border color stop. A perceptually-uniform curve -
 * small gaps at the low end, large at the high end - boosted at the low end
 * in dark mode where borders are less visible against dark backgrounds.
 * Stop 00 renders `transparent` and stop 100 opaque.
 */
export const BORDER_COLOR_ALPHAS: Record<ColorSchemeVariant, Record<NumericScaleVariant, number>> = {
	light: {
		'00': 0,
		'05': 4,
		'10': 7,
		'20': 13,
		'30': 22,
		'40': 34,
		'50': 48,
		'60': 62,
		'70': 76,
		'80': 88,
		'90': 96,
		'95': 99,
		'100': 100
	},
	dark: {
		'00': 0,
		'05': 8,
		'10': 14,
		'20': 22,
		'30': 32,
		'40': 44,
		'50': 56,
		'60': 68,
		'70': 80,
		'80': 90,
		'90': 97,
		'95': 99,
		'100': 100
	}
};

/**
 * Computes the default OKLCH color of the border family (without alpha).
 */
export const border_color_oklch = (scheme: ColorSchemeVariant): Oklch => [
	BORDER_COLOR_LIGHTNESS[scheme],
	NEUTRAL_CHROMA[scheme] * BORDER_CHROMA_MULTIPLIER[scheme],
	NEUTRAL_HUE
];

/**
 * Worst-hue safe chroma caps per stop: the largest chroma at that stop's
 * default lightness that stays inside sRGB for every one of the 10 default
 * hues (see `oklch_max_srgb_chroma` for the non-convexity caveat). Computed
 * at design time from `PALETTE_HUES` + `PALETTE_LIGHTNESS_KNOBS`, floored to
 * stay conservative; a drift test recomputes them from the color math.
 */
export const PALETTE_CHROMA_CAPS: Record<
	ColorSchemeVariant,
	Record<NumericScaleVariant, number>
> = {
	light: {
		'00': 0.0072,
		'05': 0.021,
		'10': 0.0382,
		'20': 0.078,
		'30': 0.1235,
		'40': 0.1179,
		'50': 0.1026,
		'60': 0.0868,
		'70': 0.0706,
		'80': 0.054,
		'90': 0.0372,
		'95': 0.0286,
		'100': 0.02
	},
	dark: {
		'00': 0.0254,
		'05': 0.04,
		'10': 0.0501,
		'20': 0.0673,
		'30': 0.0824,
		'40': 0.0964,
		'50': 0.1095,
		'60': 0.122,
		'70': 0.1189,
		'80': 0.0812,
		'90': 0.0465,
		'95': 0.03,
		'100': 0.0142
	}
};

/**
 * Evaluates a lightness ramp at a stop.
 */
export const ramp_lightness = (knobs: LightnessRampKnobs, stop: NumericScaleVariant): number => {
	const t = ramp_stop_t(stop);
	return knobs.lightness_00 + (knobs.lightness_100 - knobs.lightness_00) * t ** knobs.curve;
};

/**
 * Evaluates the normalized chroma shape `pow(4t(1-t), curve)` at a stop -
 * 0 at the endpoints, 1 at the midpoint.
 */
export const ramp_chroma_shape = (stop: NumericScaleVariant, curve: number): number => {
	const t = ramp_stop_t(stop);
	return (4 * t * (1 - t)) ** curve;
};

/**
 * Evaluates the palette chroma at a stop: the knob curve clamped by that
 * stop's worst-hue cap. `chroma_scale` multiplies above the clamp.
 *
 * @param knobs - chroma-curve knobs; defaults to the fitted `PALETTE_CHROMA_KNOBS`
 * @param cap - the per-stop gamut clamp; defaults to the baked `PALETTE_CHROMA_CAPS`
 */
export const ramp_chroma = (
	scheme: ColorSchemeVariant,
	stop: NumericScaleVariant,
	chroma_scale = 1,
	knobs: ChromaRampKnobs = PALETTE_CHROMA_KNOBS[scheme],
	cap: number = PALETTE_CHROMA_CAPS[scheme][stop]
): number => {
	const requested =
		knobs.chroma_min + (knobs.chroma_max - knobs.chroma_min) * ramp_chroma_shape(stop, knobs.curve);
	return Math.min(requested, cap) * chroma_scale;
};

/**
 * Computes the default OKLCH color of a palette stop (`--palette_X_NN`).
 */
export const palette_stop_oklch = (
	letter: PaletteVariant,
	stop: NumericScaleVariant,
	scheme: ColorSchemeVariant
): Oklch => [
	ramp_lightness(PALETTE_LIGHTNESS_KNOBS[scheme], stop),
	ramp_chroma(scheme, stop) * PALETTE_CHROMA_MULTIPLIERS[letter],
	PALETTE_HUES[letter]
];

/**
 * Computes the default OKLCH color of a shade stop (`--shade_NN`).
 */
export const shade_stop_oklch = (stop: NumericScaleVariant, scheme: ColorSchemeVariant): Oklch => [
	ramp_lightness(SHADE_LIGHTNESS_KNOBS[scheme], stop),
	NEUTRAL_CHROMA[scheme] * ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS[scheme].curve),
	NEUTRAL_HUE
];

/**
 * Computes the default OKLCH color of a text stop (`--text_NN`).
 */
export const text_stop_oklch = (stop: NumericScaleVariant, scheme: ColorSchemeVariant): Oklch => [
	ramp_lightness(TEXT_LIGHTNESS_KNOBS[scheme], stop),
	NEUTRAL_CHROMA[scheme] * ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS[scheme].curve),
	NEUTRAL_HUE
];

/**
 * Recomputes the worst-hue safe chroma caps per stop for an arbitrary hue set
 * and lightness ramp - the generalization of the baked `PALETTE_CHROMA_CAPS`.
 * For each stop the lightness comes from `ramp_lightness` and the cap is the
 * minimum `oklch_max_srgb_chroma` across the hues, floored to 4 decimals to
 * stay conservative (the browser clips anything past it). A theme's compile
 * step feeds its own hues and lightness knobs to detect where the baked
 * worst-hue envelope no longer fits.
 *
 * @param hues - OKLCH hue angles the ramp must stay in gamut for
 * @param lightness_knobs - the palette lightness ramp knobs for this scheme
 */
export const compute_palette_chroma_caps = (
	hues: ReadonlyArray<number>,
	lightness_knobs: LightnessRampKnobs
): Record<NumericScaleVariant, number> => {
	const caps = {} as Record<NumericScaleVariant, number>;
	for (const stop of numeric_scale_variants) {
		const lightness = ramp_lightness(lightness_knobs, stop);
		let cap = Infinity;
		for (const hue of hues) {
			cap = Math.min(cap, oklch_max_srgb_chroma(lightness, hue));
		}
		caps[stop] = Math.floor(cap * 1e4) / 1e4;
	}
	return caps;
};

/*

CSS emitters - the string twins of the numeric evaluators above. These render
the pure-CSS `calc()`/`pow()`/`min()`/`oklch()` default values that
`variables.ts` ships, pulling every literal (stop positions, shape constants,
caps) from the same source the tests evaluate.

*/

/** The lightness ramp families and their CSS variable name prefixes. */
export type RampFamily = 'palette' | 'shade' | 'text';

const format_ramp_number = (n: number): string => String(Math.round(n * 1e6) / 1e6);

/**
 * Renders the derived default of an intermediate lightness ramp stop, e.g.
 * `--palette_lightness_30: calc(var(--palette_lightness_00) + (var(--palette_lightness_100) - var(--palette_lightness_00)) * pow(0.3, var(--palette_lightness_curve)))`.
 * Stops 00/100 are the endpoint knobs themselves and have no derived form.
 */
export const render_lightness_stop_css = (
	family: RampFamily,
	stop: NumericScaleVariant
): string => {
	const p = `--${family}_lightness`;
	const t = format_ramp_number(ramp_stop_t(stop));
	return `calc(var(${p}_00) + (var(${p}_100) - var(${p}_00)) * pow(${t}, var(${p}_curve)))`;
};

/**
 * Renders the normalized chroma shape of a stop, shared by the palette chroma
 * ramp and the neutral scales: `pow(4t(1-t), --palette_chroma_curve)`.
 * Exactly 0 at the endpoints and 1 at the midpoint.
 */
export const render_chroma_shape_css = (stop: NumericScaleVariant): string => {
	const t = ramp_stop_t(stop);
	const base = Math.round(4 * t * (1 - t) * 1e6) / 1e6;
	if (base === 0) return '0';
	if (base === 1) return '1';
	return `calc(pow(${format_ramp_number(base)}, var(--palette_chroma_curve)))`;
};

/**
 * Renders the capped default of a palette chroma ramp stop: the knob curve
 * clamped by that stop's worst-hue gamut cap. Per-scheme because the caps
 * differ; `--chroma_scale` multiplies outside this clamp, at the color stops.
 *
 * @param cap - the clamp value; defaults to the baked `PALETTE_CHROMA_CAPS`,
 * overridden by the theme compile step with a recomputed worst-hue cap
 */
export const render_chroma_stop_css = (
	stop: NumericScaleVariant,
	scheme: ColorSchemeVariant,
	cap: number = PALETTE_CHROMA_CAPS[scheme][stop]
): string => {
	const cap_str = format_ramp_number(cap);
	return `min(calc(var(--palette_chroma_min) + (var(--palette_chroma_max) - var(--palette_chroma_min)) * var(--chroma_shape_${
		stop
	})), ${cap_str})`;
};

/**
 * Renders the derived default of a palette color stop, e.g. `--palette_a_50`.
 * One definition serves both schemes - the scheme flip lives in the knobs.
 */
export const render_palette_stop_css = (
	letter: PaletteVariant,
	stop: NumericScaleVariant
): string => render_ramp_color_css(`var(--hue_${letter})`, stop);

// the character twin of a hue slot: palette letters and intents carry a
// chroma multiplier that composes with the global `--chroma_scale`; other
// hue references (e.g. the neutral, whose character is `--neutral_chroma`)
// have none
const slot_chroma_scale_reference = (hue_reference: string): string | null => {
	const m = /^var\(--hue_([a-z]+)\)$/u.exec(hue_reference);
	if (!m) return null;
	const slot = m[1]!;
	if ((palette_variants as ReadonlyArray<string>).includes(slot)) {
		return `var(--palette_${slot}_chroma_scale, 1)`;
	}
	if ((intent_variants as ReadonlyArray<string>).includes(slot)) {
		return `var(--${slot}_chroma_scale, 1)`;
	}
	return null;
};

/**
 * Renders a color derived from the palette ramps at a stop for an arbitrary
 * hue reference - the shared template behind palette stops and intent stops
 * (`--accent_50` renders with `var(--hue_accent)`). A palette-letter or
 * intent hue reference also picks up its slot's chroma multiplier
 * (`--palette_X_chroma_scale`/`--<intent>_chroma_scale`), so the hue slot and
 * its chroma character stay paired in the emitted CSS.
 *
 * @param hue_reference - a CSS expression for the hue, e.g. `var(--hue_accent)`
 * @param alpha - optional CSS alpha (e.g. `40%`) appended inside the `oklch()`
 */
export const render_ramp_color_css = (
	hue_reference: string,
	stop: NumericScaleVariant,
	alpha?: string
): string => {
	const slot_scale = slot_chroma_scale_reference(hue_reference);
	return `oklch(var(--palette_lightness_${stop}) calc(var(--palette_chroma_${
		stop
	}) * var(--chroma_scale)${slot_scale ? ` * ${slot_scale}` : ''}) ${
		hue_reference
	}${alpha ? ` / ${alpha}` : ''})`;
};

/**
 * Renders the derived default of a neutral (shade/text) stop. The neutral
 * rides the palette's chroma shape scaled by the `--neutral_chroma` peak.
 */
export const render_neutral_stop_css = (
	family: Exclude<RampFamily, 'palette'>,
	stop: NumericScaleVariant
): string =>
	`oklch(var(--${family}_lightness_${stop}) calc(var(--neutral_chroma) * var(--chroma_shape_${
		stop
	})) var(--hue_neutral))`;

/**
 * Renders the derived default of a border color stop (`--border_color_NN`):
 * the border family's color at the stop's alpha from `BORDER_COLOR_ALPHAS`.
 * The color part is scheme-agnostic - the flip lives in the referenced knobs
 * - so stops whose alpha matches across schemes render identically and
 * `variables.ts` declares them single-slot.
 */
export const render_border_color_stop_css = (
	stop: NumericScaleVariant,
	scheme: ColorSchemeVariant
): string => {
	const alpha = BORDER_COLOR_ALPHAS[scheme][stop];
	if (alpha === 0) return 'transparent';
	const color = 'oklch(var(--border_color_lightness) var(--border_color_chroma) var(--hue_neutral)';
	return alpha === 100 ? `${color})` : `${color} / ${alpha}%)`;
};
