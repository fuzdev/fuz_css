/**
 * The derived color system's ramp model and fitted default knob values.
 *
 * This is the numeric single source of truth for the OKLCH palette: the same
 * constants and formulas that `variables.ts` renders as pure-CSS
 * `calc()`/`pow()`/`oklch()` defaults, evaluated here in TypeScript so
 * design-time tests can gate the defaults (gamut, ramp monotonicity, contrast
 * — see `src/test/ramps.test.ts`) and derivation scripts can reason about the
 * palette without a browser.
 *
 * The knob values were fitted against the pre-OKLCH HSL palette to minimize
 * the perceptual delta of the port. Model shapes:
 *
 * - lightness: `L(t) = L00 + (L100 - L00) * pow(t, curve)` with `t = stop/100`
 *   — the endpoint knobs literally are stops 00/100, so the dark scheme flips
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
 * formula — no direction flag needed.
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
	c: 24, // red
	d: 296, // purple
	e: 98, // yellow
	f: 60, // brown
	g: 358, // pink
	h: 41, // orange
	i: 204, // cyan
	j: 163 // teal
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
 * Re-fitted ("honest chroma" retune) so the requested curve hugs the
 * effective post-clamp chroma instead of sitting above the caps through the
 * mid-range — turning the knobs down now responds immediately. Turning
 * `chroma_max` up remains cap-clamped by design; `--chroma_scale` is the
 * push-past-the-gamut knob. Residual vs the original port is small (mean
 * ΔEOK ≈ 0.005 light / 0.003 dark) except light stop 30 (−0.028 C): the
 * symmetric mid-peaked model can't reach the light cap envelope's peak at
 * stop 30 — recovering it would take an asymmetric shape (peak-position
 * knob).
 */
export const PALETTE_CHROMA_KNOBS: Record<ColorSchemeVariant, ChromaRampKnobs> = {
	light: { chroma_min: 0.0132, chroma_max: 0.106, curve: 1.3 },
	dark: { chroma_min: 0.0214, chroma_max: 0.1088, curve: 1.27 }
};

/**
 * Default OKLCH hue angle of the neutral intent. In CSS the knob chains to the
 * palette (`--hue_neutral: var(--hue_f)`), porting the old `tint_hue`
 * behavior; this constant mirrors that default numerically.
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
		'40': 0.1162,
		'50': 0.1011,
		'60': 0.0856,
		'70': 0.0696,
		'80': 0.0533,
		'90': 0.0366,
		'95': 0.0282,
		'100': 0.0197
	},
	dark: {
		'00': 0.025,
		'05': 0.0394,
		'10': 0.0494,
		'20': 0.0664,
		'30': 0.0813,
		'40': 0.095,
		'50': 0.108,
		'60': 0.1203,
		'70': 0.1189,
		'80': 0.0812,
		'90': 0.0465,
		'95': 0.03,
		'100': 0.0141
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
 * Evaluates the normalized chroma shape `pow(4t(1-t), curve)` at a stop —
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
 * Evaluates a stop's hue-shift offset in degrees — the numeric twin of
 * `render_hue_shift_offset_css`. `hue_shift` is the total rotation across a
 * ramp, anchored at stop 50; the scheme flip is baked in so positive values
 * always rotate hue upward toward the dark end.
 */
export const ramp_hue_shift_offset = (
	stop: NumericScaleVariant,
	scheme: ColorSchemeVariant,
	hue_shift: number
): number => {
	const centered = ramp_stop_t(stop) - 0.5;
	return (scheme === 'light' ? centered : -centered) * hue_shift;
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
	ramp_chroma(scheme, stop),
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
 * and lightness ramp — the generalization of the baked `PALETTE_CHROMA_CAPS`.
 * For each stop the lightness comes from `ramp_lightness`, each hue is offset
 * by that stop's `ramp_hue_shift_offset`, and the cap is the minimum
 * `oklch_max_srgb_chroma` across the hues, floored to 4 decimals to stay
 * conservative (the browser clips anything past it). A theme's compile step
 * feeds its own hues, lightness knobs, and hue shift to detect where the baked
 * worst-hue envelope no longer fits.
 *
 * @param hues - OKLCH hue angles the ramp must stay in gamut for
 * @param lightness_knobs - the palette lightness ramp knobs for this scheme
 * @param hue_shift - total ramp hue rotation in degrees; defaults to 0
 */
export const compute_palette_chroma_caps = (
	hues: ReadonlyArray<number>,
	lightness_knobs: LightnessRampKnobs,
	scheme: ColorSchemeVariant,
	hue_shift = 0
): Record<NumericScaleVariant, number> => {
	const caps = {} as Record<NumericScaleVariant, number>;
	for (const stop of numeric_scale_variants) {
		const lightness = ramp_lightness(lightness_knobs, stop);
		let cap = Infinity;
		for (const hue of hues) {
			const effective_hue = hue + ramp_hue_shift_offset(stop, scheme, hue_shift);
			cap = Math.min(cap, oklch_max_srgb_chroma(lightness, effective_hue));
		}
		caps[stop] = Math.floor(cap * 1e4) / 1e4;
	}
	return caps;
};

/*

CSS emitters — the string twins of the numeric evaluators above. These render
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
 * Renders a stop's hue-shift offset. `--hue_shift` is the total rotation in
 * degrees across a ramp, anchored at stop 50; the scheme sign flip is baked
 * into these per-scheme slots so positive values always rotate hue upward
 * toward the dark end.
 */
export const render_hue_shift_offset_css = (
	stop: NumericScaleVariant,
	scheme: ColorSchemeVariant
): string => {
	const centered = ramp_stop_t(stop) - 0.5;
	const factor = Math.round((scheme === 'light' ? centered : -centered) * 1e6) / 1e6;
	if (factor === 0) return '0';
	return `calc(var(--hue_shift) * ${format_ramp_number(factor)})`;
};

/**
 * Renders the derived default of a palette color stop, e.g. `--palette_a_50`.
 * One definition serves both schemes — the scheme flip lives in the knobs.
 */
export const render_palette_stop_css = (
	letter: PaletteVariant,
	stop: NumericScaleVariant
): string => render_ramp_color_css(`var(--hue_${letter})`, stop);

/**
 * Renders a color derived from the palette ramps at a stop for an arbitrary
 * hue reference — the shared template behind palette stops and intent stops
 * (`--accent_50` renders with `var(--hue_accent)`).
 *
 * @param hue_reference - a CSS expression for the hue, e.g. `var(--hue_accent)`
 * @param alpha - optional CSS alpha (e.g. `40%`) appended inside the `oklch()`
 */
export const render_ramp_color_css = (
	hue_reference: string,
	stop: NumericScaleVariant,
	alpha?: string
): string =>
	`oklch(var(--palette_lightness_${stop}) calc(var(--palette_chroma_${
		stop
	}) * var(--chroma_scale)) calc(${hue_reference} + var(--hue_shift_${stop}))${
		alpha ? ` / ${alpha}` : ''
	})`;

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
	})) calc(var(--hue_neutral) + var(--hue_shift_${stop})))`;
