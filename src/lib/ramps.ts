/**
 * The derived color system's ramp model and fitted default knob values.
 *
 * This is the numeric single source of truth for the OKLCH palette: the same
 * constants and formulas that `variables.ts` renders as pure-CSS
 * `calc()`/`pow()`/`oklch()` defaults, evaluated here in TypeScript so
 * design-time tests and the theme gates (`theme_check.ts`) can reason about
 * the palette without a browser.
 *
 * The knob values were fitted against the pre-OKLCH HSL palette to minimize
 * the perceptual delta of the port. Model shapes:
 *
 * - lightness: `L(t) = L00 + (L100 - L00) * pow(t, curve)` with `t = stop/100`
 *   - the endpoint knobs literally are stops 00/100, so the dark scheme flips
 *   direction purely through knob values
 * - chroma: `C(t) = min + (max - min) * pow(4t(1-t), curve)`, a symmetric
 *   mid-peaked curve, clamped per stop by the worst-hue gamut caps below
 * - the neutral scale rides the same chroma shape scaled by a single knob
 *
 * @module
 */

import { clamp_oklch, oklch_max_srgb_chroma, type Oklch } from '@fuzdev/fuz_util/oklch.ts';

import {
	numeric_scale_variants,
	palette_variants,
	type IntentVariant,
	type PaletteVariant,
	type ColorScheme,
	type NumericScaleVariant
} from './variable_data.ts';

// a stop variant's ramp position t in [0, 1]
const ramp_stop_t = (stop: NumericScaleVariant): number => Number(stop) / 100;

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

/** OKLCH hue angles for the palette slots. */
export const PALETTE_HUES: Readonly<Record<PaletteVariant, number>> = {
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
export const PALETTE_CHROMA_MULTIPLIERS: Readonly<Record<PaletteVariant, number>> = {
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
export const PALETTE_LIGHTNESS_KNOBS: Readonly<Record<ColorScheme, Readonly<LightnessRampKnobs>>> =
	{
		light: { lightness_00: 0.985, lightness_100: 0.116, curve: 1.15 },
		dark: { lightness_00: 0.147, lightness_100: 0.971, curve: 0.76 }
	};

/**
 * Lightness knobs for the shade (surface) ramps. The endpoints are fitted;
 * the curves sit above the fit, holding the near-ground stops - the
 * surfaces raised off the page - close to the ground in both schemes.
 */
export const SHADE_LIGHTNESS_KNOBS: Readonly<Record<ColorScheme, Readonly<LightnessRampKnobs>>> = {
	light: { lightness_00: 0.97, lightness_100: 0.171, curve: 1.25 },
	dark: { lightness_00: 0.171, lightness_100: 0.97, curve: 1.2 }
};

/** Fitted lightness knobs for the text ramps. */
export const TEXT_LIGHTNESS_KNOBS: Readonly<Record<ColorScheme, Readonly<LightnessRampKnobs>>> = {
	light: { lightness_00: 0.97, lightness_100: 0.146, curve: 1.19 },
	dark: { lightness_00: 0.146, lightness_100: 0.97, curve: 0.87 }
};

/** The lightness ramp knobs by family, for lookups keyed on a `RampFamily`. */
export const LIGHTNESS_KNOBS: Readonly<
	Record<RampFamily, Readonly<Record<ColorScheme, Readonly<LightnessRampKnobs>>>>
> = {
	palette: PALETTE_LIGHTNESS_KNOBS,
	shade: SHADE_LIGHTNESS_KNOBS,
	text: TEXT_LIGHTNESS_KNOBS
};

/**
 * Fitted chroma-curve knobs for the palette ramps. `curve` renders as the
 * single `--chroma_curve`, which the neutral scales share; `chroma_min` and
 * `chroma_max` are the palette's own.
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
export const PALETTE_CHROMA_KNOBS: Readonly<Record<ColorScheme, Readonly<ChromaRampKnobs>>> = {
	light: { chroma_min: 0.0132, chroma_max: 0.106, curve: 1.3 },
	dark: { chroma_min: 0.0214, chroma_max: 0.1088, curve: 1.27 }
};

/**
 * Default OKLCH hue angle of the neutral intent. In CSS the knob chains to the
 * palette (`--hue_neutral: var(--hue_f)`); this constant mirrors that default
 * numerically.
 */
const NEUTRAL_HUE = PALETTE_HUES.f;

/**
 * Peak chroma of the neutral (shade/text) scales. The neutral rides the
 * palette's chroma shape scaled to this peak: strong tint at mid lightness,
 * nearly untinted near white and black.
 */
export const NEUTRAL_CHROMA: Readonly<Record<ColorScheme, number>> = {
	light: 0.024,
	dark: 0.025
};

/**
 * The ground's own chroma (`--shade_chroma_00`), added to the near-ground
 * stops of the shade ramp by `neutral_ground_chroma_weight`. The chroma shape is 0 at the
 * endpoints, so without it the page ground is untinted whatever
 * `neutral_chroma` says; a theme whose identity is a tinted page (paper, a
 * lit night) sets it. 0 keeps the default ground neutral. The knob is the
 * tint requested: the stops render `shade_ground_chroma`, the request held
 * to sRGB at the ground's lightness, so a tint past what the ground can carry
 * clamps rather than clipping.
 */
export const SHADE_CHROMA_00 = 0;

/**
 * How far up the shade ramp the ground's chroma reaches, as a ramp position
 * (0 is the ground, 1 the far end): the tint is whole at `shade_00` and gone
 * by this stop. The near-ground stops are the surfaces raised off the page -
 * sidebars, fills, wells - and the shared chroma shape is near 0 there too, so
 * without the reach they read gray beside a tinted ground.
 */
export const SHADE_GROUND_CHROMA_REACH = 0.5;

/**
 * The share of `--shade_chroma_00` a neutral stop carries: 1 at the ground
 * (`shade_00`), easing quadratically to 0 at `SHADE_GROUND_CHROMA_REACH`, and
 * 0 for every text stop. Rounded to four places, so the emitted CSS
 * multiplier and the numeric twins use the same number. Shared by the
 * emitter, both numeric twins, and `check_theme`.
 *
 * @param family - the neutral ramp
 * @param stop - the stop on it
 * @returns the weight, from 0 to 1
 */
export const neutral_ground_chroma_weight = (
	family: Exclude<RampFamily, 'palette'>,
	stop: NumericScaleVariant
): number => {
	if (family !== 'shade') return 0;
	const remaining = 1 - ramp_stop_t(stop) / SHADE_GROUND_CHROMA_REACH;
	if (remaining <= 0) return 0;
	return Math.round(remaining * remaining * 10_000) / 10_000;
};

/**
 * Worst-hue sRGB chroma slopes toward the two lightness ends, bounding the
 * ground tint (`shade_ground_chroma`). Each term holds where it binds: every
 * hue holds at least `light_end * (1 - L)` chroma for L above about 0.730,
 * and at least `dark_end * L` for L up to about 0.75, and the two cross near
 * L 0.731 - so the tent `min(light_end * (1 - L), dark_end * L)` is in gamut
 * at every lightness and hue. Fitted against `oklch_max_srgb_chroma` over
 * every hue: the light-end envelope is about 0.4627 of the distance to white
 * near L 1 and the dark end is 0.170 of the distance to black, each rounded
 * down for a margin. The crossover sits about 0.001 above where the light
 * term starts to hold, so raising `dark_end` moves it into the region the
 * light term doesn't cover - a `dark_end` past the dark envelope fails the
 * gamut property test in the dark band first.
 */
export const SHADE_GROUND_CHROMA_SLOPES: Readonly<{ light_end: number; dark_end: number }> = {
	light_end: 0.46,
	dark_end: 0.169
};

/**
 * The ground tint a ground can carry: the requested `--shade_chroma_00`,
 * held to sRGB at the ground's lightness by `SHADE_GROUND_CHROMA_SLOPES`,
 * worst hue. The numeric twin of `render_shade_ground_chroma_css`, which the
 * near-ground shade stops read in place of the knob.
 *
 * @param chroma_00 - the requested ground tint (`shade_chroma_00`)
 * @param lightness_00 - the effective ground's lightness (`_shade_lightness_00`)
 * @returns the tint, at most `chroma_00` - negative, like the CSS, for a
 * negative request or a ground lightness outside 0..1, which the color
 * clamp then handles as the browser does
 */
export const shade_ground_chroma = (chroma_00: number, lightness_00: number): number =>
	Math.min(
		chroma_00,
		SHADE_GROUND_CHROMA_SLOPES.light_end * (1 - lightness_00),
		SHADE_GROUND_CHROMA_SLOPES.dark_end * lightness_00
	);

/**
 * The default of the `--contrast` knob: the theme's own ramps, unmoved.
 */
export const CONTRAST = 0;

/**
 * The value the high-contrast modifier gives the `--contrast` knob, and the
 * value the `prefers-contrast: more` mapping gives the preference input
 * (`--_contrast_preference`), so the modifier and the OS preference render
 * the same derivation. Tuned against the floors the shipped themes hold under
 * it: body text at 12:1 and the control border at 3:1 against the ground.
 */
export const HIGH_CONTRAST = 0.5;

/**
 * How far full contrast bends each neutral lightness curve: the effective
 * curve is `curve * (1 - CONTRAST_CURVE_BEND[family] * c)`. The text bend
 * pulls the text stops toward the contrast end. The shade bend is the
 * smaller one, so the near-ground surfaces keep close to the stretched
 * ground rather than moving toward the text on them - which would lower
 * body text on `shade_10` as contrast rises. The control border strengthens
 * on its own instead (`BORDER_CONTRAST_STOPS`).
 */
export const CONTRAST_CURVE_BEND: Readonly<Record<Exclude<RampFamily, 'palette'>, number>> = {
	shade: 0.33,
	text: 0.66
};

/**
 * The ground lightness full contrast reaches, per scheme: the effective
 * ground (`--_shade_lightness_00`) moves the fraction `c` of the way from the
 * theme's own `--shade_lightness_00` to this end. The dark end stops short of
 * black, since the bottom of the lightness range carries almost no luminance.
 * The end is clamped to the ground (`contrast_ground_end`), so the stretch only
 * moves toward the scheme's extreme: a ground already past the end doesn't
 * move, though the shade and text curves still bend.
 */
export const CONTRAST_GROUND_END: Readonly<Record<ColorScheme, number>> = {
	light: 1,
	dark: 0.1
};

/**
 * The ground end a scheme stretches toward, clamped to the ground: the larger
 * of `CONTRAST_GROUND_END.light` and the ground in light, the smaller of
 * `CONTRAST_GROUND_END.dark` and the ground in dark, so a ground already past
 * the end stays put. The numeric twin of `render_contrast_ground_end_css`.
 *
 * @param scheme - the scheme whose end applies - a stanced theme's stance
 * @param lightness_00 - the ground's lightness (`shade_lightness_00`)
 */
export const contrast_ground_end = (scheme: ColorScheme, lightness_00: number): number =>
	scheme === 'light'
		? Math.max(CONTRAST_GROUND_END.light, lightness_00)
		: Math.min(CONTRAST_GROUND_END.dark, lightness_00);

/**
 * The effective contrast: the larger of the theme's `--contrast` and the OS
 * preference input, so a theme can author a baseline the OS raises but never
 * lowers. The numeric twin of `render_contrast_css`.
 *
 * @param contrast - the `--contrast` knob
 * @param preference - the `--_contrast_preference` input, 0 unless the OS asks
 */
export const effective_contrast = (contrast: number, preference: number): number =>
	Math.max(contrast, preference);

/**
 * The lightness knobs a ramp renders at an effective contrast `c`: the shade
 * ground moves the fraction `c` of the way to its end (`contrast_ground_end`,
 * which never lies behind the ground), and the
 * shade and text curves bend by their `CONTRAST_CURVE_BEND`; the palette is
 * untouched, as are the text endpoints and the shade's far end. At `c = 0`
 * every knob comes back exactly as given. The numeric twin of the
 * `--_shade_lightness_00`, `--_shade_lightness_curve`, and
 * `--_text_lightness_curve` intermediates.
 *
 * @param family - the ramp family
 * @param knobs - the family's knobs as the theme sets them
 * @param contrast - the effective contrast (`effective_contrast`)
 * @param scheme - the scheme, which picks the ground end
 * @returns the knobs the ramp's stops render through
 */
export const contrast_lightness_knobs = (
	family: RampFamily,
	knobs: LightnessRampKnobs,
	contrast: number,
	scheme: ColorScheme
): LightnessRampKnobs => {
	if (family === 'palette') return knobs;
	const curve = contrast_lightness_curve(family, knobs.curve, contrast);
	if (family === 'text') return { ...knobs, curve };
	return {
		lightness_00: contrast_ground_lightness(
			knobs.lightness_00,
			contrast_ground_end(scheme, knobs.lightness_00),
			contrast
		),
		lightness_100: knobs.lightness_100,
		curve
	};
};

/**
 * The effective ground lightness: `lightness_00` moved the fraction
 * `contrast` of the way to `end`. The numeric twin of
 * `render_contrast_ground_lightness_css`.
 */
export const contrast_ground_lightness = (
	lightness_00: number,
	end: number,
	contrast: number
): number => lightness_00 + (end - lightness_00) * contrast;

/**
 * The effective shade or text curve: `curve` bent by the family's
 * `CONTRAST_CURVE_BEND` at `contrast`. The numeric twin of
 * `render_contrast_curve_css`.
 *
 * @param family - the neutral ramp, which picks the bend
 * @param curve - the ramp's curve knob
 * @param contrast - the effective contrast (`effective_contrast`)
 */
export const contrast_lightness_curve = (
	family: Exclude<RampFamily, 'palette'>,
	curve: number,
	contrast: number
): number => curve * (1 - CONTRAST_CURVE_BEND[family] * contrast);

export type ShadowTint = 'bright' | 'dim';

/**
 * Fitted neutral-hued tints for the shadow color endpoints: `bright` is the
 * light-scheme highlight and glow, `dim` the dark-scheme umbra and glow. Each
 * renders on `--hue_neutral`, so a retinted neutral recolors shadows with
 * the surfaces.
 */
export const SHADOW_TINTS: Readonly<
	Record<ShadowTint, Readonly<{ lightness: number; chroma: number }>>
> = {
	bright: { lightness: 0.955, chroma: 0.003 },
	dim: { lightness: 0.863, chroma: 0.009 }
};

/** Renders a `SHADOW_TINTS` entry as `oklch()` on the neutral hue. */
export const render_shadow_tint_css = (tint: ShadowTint): string => {
	const { lightness, chroma } = SHADOW_TINTS[tint];
	return `oklch(${lightness} ${chroma} var(--hue_neutral))`;
};

/**
 * OKLCH lightness of the border color family (`--border_color_lightness`),
 * fitted from the HSL palette. Sits mid-ramp so borders read against both
 * the page background and fills.
 */
export const BORDER_COLOR_LIGHTNESS: Readonly<Record<ColorScheme, number>> = {
	light: 0.345,
	dark: 0.857
};

/**
 * The border family's chroma as a multiple of `--neutral_chroma` - borders
 * carry a stronger tint than surfaces so they read at low alpha. In CSS this
 * is `--border_color_chroma: calc(var(--neutral_chroma) * <multiple>)`.
 */
export const BORDER_CHROMA_MULTIPLIER: Readonly<Record<ColorScheme, number>> = {
	light: 2.6667,
	dark: 2.12
};

/**
 * Alpha (in %) of each border color stop. A perceptually-uniform curve -
 * small gaps at the low end, large at the high end - boosted at the low end
 * in dark mode where borders are less visible against dark backgrounds.
 * Stop 00 renders `transparent` and stop 100 opaque.
 */
export const BORDER_COLOR_ALPHAS: Readonly<
	Record<ColorScheme, Readonly<Record<NumericScaleVariant, number>>>
> = {
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
 * The shade stops the default control border (`--border_color`) mixes
 * between: `rest` at no contrast, moving toward `reach` as the effective
 * contrast rises (`BORDER_CONTRAST_GAIN`). The shade bend stays small so the
 * surfaces hold near the ground under contrast, which leaves the border to
 * strengthen on its own - toward WCAG 1.4.11's 3:1 against the ground at
 * `HIGH_CONTRAST`, while borders at no contrast stay deliberately softer.
 */
export const BORDER_CONTRAST_STOPS: Readonly<{
	rest: NumericScaleVariant;
	reach: NumericScaleVariant;
}> = { rest: '30', reach: '50' };

/**
 * How fast the default control border moves from its `rest` stop toward its
 * `reach` stop: the share of `reach` in the mix is
 * `min(1, BORDER_CONTRAST_GAIN * c)` at effective contrast `c`, so the
 * border sits wholly at `reach` from `1 / BORDER_CONTRAST_GAIN` up. Tuned so
 * every shipped theme's default border clears 3:1 against the ground at
 * `HIGH_CONTRAST` with a little margin, three quarters of the way to `reach`.
 */
export const BORDER_CONTRAST_GAIN = 1.5;

/**
 * The share of the `reach` stop in the default control border at an
 * effective contrast, from 0 to 1. The numeric twin of the percentage in
 * `render_border_color_css`.
 *
 * @param contrast - the effective contrast (`effective_contrast`)
 */
export const border_contrast_share = (contrast: number): number =>
	Math.min(1, Math.max(0, BORDER_CONTRAST_GAIN * contrast));

/**
 * Renders the default of the control border role (`--border_color`): the
 * `rest` shade stop mixed in oklab toward the `reach` stop by
 * `border_contrast_share` of the effective contrast - exactly the `rest`
 * stop at no contrast.
 */
export const render_border_color_css = (): string =>
	`color-mix(in oklab, var(--shade_${BORDER_CONTRAST_STOPS.rest}), var(--shade_${BORDER_CONTRAST_STOPS.reach}) clamp(0%, calc(var(--${CONTRAST_NAME}) * ${BORDER_CONTRAST_GAIN * 100}%), 100%))`;

/**
 * Computes the default OKLCH color of the border family (without alpha).
 */
export const border_color_oklch = (scheme: ColorScheme): Oklch => [
	BORDER_COLOR_LIGHTNESS[scheme],
	NEUTRAL_CHROMA[scheme] * BORDER_CHROMA_MULTIPLIER[scheme],
	NEUTRAL_HUE
];

/**
 * Worst-hue safe chroma caps per stop: the largest chroma at that stop's
 * default lightness that stays inside sRGB for every default hue (see `oklch_max_srgb_chroma` for the non-convexity caveat). Computed
 * at design time from `PALETTE_HUES` + `PALETTE_LIGHTNESS_KNOBS`, floored to
 * stay conservative; a drift test recomputes them from the color math.
 */
export const PALETTE_CHROMA_CAPS: Readonly<
	Record<ColorScheme, Readonly<Record<NumericScaleVariant, number>>>
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
 * 0 at the endpoints, 1 at the midpoint. The endpoint/midpoint guards mirror
 * `render_chroma_shape_css`'s exact-literal short-circuits, keeping the twins
 * total for any curve (JS would otherwise yield `0 ** 0 === 1`).
 */
export const ramp_chroma_shape = (stop: NumericScaleVariant, curve: number): number => {
	const t = ramp_stop_t(stop);
	const base = 4 * t * (1 - t);
	if (base === 0) return 0;
	if (base === 1) return 1;
	return base ** curve;
};

/**
 * Evaluates the palette chroma at a stop: the knob curve clamped by that
 * stop's worst-hue cap. The `--chroma_scale` multipliers apply above the
 * clamp, in `ramp_color_oklch`. Defaults for a scheme come from
 * `PALETTE_CHROMA_KNOBS[scheme]` and `PALETTE_CHROMA_CAPS[scheme][stop]`.
 */
export const ramp_chroma = (
	stop: NumericScaleVariant,
	knobs: ChromaRampKnobs,
	cap: number
): number =>
	ramp_chroma_at_shape(
		ramp_chroma_shape(stop, knobs.curve),
		knobs.chroma_min,
		knobs.chroma_max,
		cap
	);

/**
 * The palette chroma for a resolved chroma shape: the knob range at that
 * shape, clamped by the stop's cap - the arithmetic `ramp_chroma` and
 * `ThemeResolver` share, the resolver supplying the shape from a theme's
 * resolved `--chroma_curve`.
 */
export const ramp_chroma_at_shape = (
	shape: number,
	chroma_min: number,
	chroma_max: number,
	cap: number
): number => Math.min(chroma_min + (chroma_max - chroma_min) * shape, cap);

/**
 * Combines resolved palette-ramp inputs into a color stop's OKLCH - the one
 * formula behind `--palette_X_NN`/`--<intent>_NN` (`chroma * chroma_scale *
 * slot multiplier` at the ramp lightness), shared by the default twins below
 * and `check_theme`'s theme-resolved gates so the two can't drift. Clamped
 * as the browser clamps the `oklch()` it renders.
 */
export const ramp_color_oklch = (
	lightness: number,
	chroma: number,
	hue: number,
	chroma_scale = 1,
	slot_chroma_scale = 1
): Oklch => clamp_oklch([lightness, chroma * chroma_scale * slot_chroma_scale, hue]);

/**
 * Combines resolved neutral-scale inputs into a shade/text stop's OKLCH: the
 * peak `neutral_chroma` scaled by the shared chroma shape, plus the stop's
 * share of the ground's own chroma (`ground_chroma`, already weighted by
 * `neutral_ground_chroma_weight`; 0 past its reach and on text). The neutral twin
 * of `ramp_color_oklch`, shared with `check_theme` for the same reason.
 */
export const neutral_color_oklch = (
	lightness: number,
	neutral_chroma: number,
	chroma_shape: number,
	hue: number,
	ground_chroma = 0
): Oklch => clamp_oklch([lightness, neutral_chroma * chroma_shape + ground_chroma, hue]);

/**
 * Computes the default OKLCH color of a palette stop (`--palette_X_NN`).
 */
export const palette_stop_oklch = (
	letter: PaletteVariant,
	stop: NumericScaleVariant,
	scheme: ColorScheme
): Oklch =>
	ramp_color_oklch(
		ramp_lightness(PALETTE_LIGHTNESS_KNOBS[scheme], stop),
		ramp_chroma(stop, PALETTE_CHROMA_KNOBS[scheme], PALETTE_CHROMA_CAPS[scheme][stop]),
		PALETTE_HUES[letter],
		1,
		PALETTE_CHROMA_MULTIPLIERS[letter]
	);

/**
 * Computes the default OKLCH color of a shade stop (`--shade_NN`).
 */
export const shade_stop_oklch = (stop: NumericScaleVariant, scheme: ColorScheme): Oklch => {
	const knobs = contrast_lightness_knobs('shade', SHADE_LIGHTNESS_KNOBS[scheme], CONTRAST, scheme);
	return neutral_color_oklch(
		ramp_lightness(knobs, stop),
		NEUTRAL_CHROMA[scheme],
		ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS[scheme].curve),
		NEUTRAL_HUE,
		shade_ground_chroma(SHADE_CHROMA_00, knobs.lightness_00) *
			neutral_ground_chroma_weight('shade', stop)
	);
};

/**
 * Computes the default OKLCH color of a text stop (`--text_NN`).
 */
export const text_stop_oklch = (stop: NumericScaleVariant, scheme: ColorScheme): Oklch =>
	neutral_color_oklch(
		ramp_lightness(
			contrast_lightness_knobs('text', TEXT_LIGHTNESS_KNOBS[scheme], CONTRAST, scheme),
			stop
		),
		NEUTRAL_CHROMA[scheme],
		ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS[scheme].curve),
		NEUTRAL_HUE
	);

/**
 * Computes the worst-hue safe chroma cap at one lightness: the minimum
 * `oklch_max_srgb_chroma` across the hues, floored to 4 decimals to stay
 * conservative (the browser clips anything past it). The generalization of
 * the baked `PALETTE_CHROMA_CAPS` to an arbitrary hue set and lightness - a
 * theme's compile step calls it with each stop's own resolved lightness to
 * detect where the baked worst-hue envelope no longer fits.
 *
 * @param hues - OKLCH hue angles the stop must stay in gamut for
 * @param lightness - the stop's OKLCH lightness
 */
export const compute_worst_hue_chroma_cap = (
	hues: ReadonlyArray<number>,
	lightness: number
): number => {
	let cap = Infinity;
	for (const hue of hues) {
		cap = Math.min(cap, oklch_max_srgb_chroma(lightness, hue));
	}
	return Math.floor(cap * 1e4) / 1e4;
};

/*

CSS emitters - the string twins of the numeric evaluators above. These render
the pure-CSS `calc()`/`pow()`/`min()`/`oklch()` default values that
`variables.ts` ships, pulling every literal (stop positions, shape constants,
caps) from the same source the tests evaluate.

*/

/** The lightness ramp families and their CSS variable name prefixes. */
export type RampFamily = 'palette' | 'shade' | 'text';

/*

Ramp intermediates - the derived variables between the knobs and the color
stops: the lightness stops between a ramp's endpoints, the normalized chroma
shape, the capped palette chroma, and the clamped ground tint. They're
plumbing, spelled with a leading underscore (`--_palette_lightness_30`) to mark them private: the
`Theme` schema rejects the spelling, so a theme steers the ramps through
their knobs and color stops, never by pinning an intermediate. The names
here are the one place the spelling is built.

The contrast intermediates sit between the neutral lightness knobs and their
stops: `--_contrast` (the effective contrast) moves the shade ground
(`--_shade_lightness_00`) toward `--_contrast_ground_end` and bends the shade
and text curves (`--_shade_lightness_curve`, `--_text_lightness_curve`), and
the neutral stops read those in place of the knobs. `--_contrast_preference`
is the one private input among them, set only by the `prefers-contrast`
mapping in `style.css`.

*/

/**
 * The variable a lightness ramp stop renders through: the endpoint knob
 * itself at 00/100 (`palette_lightness_00`), else the private derived
 * intermediate (`_palette_lightness_30`). The shade ground is the exception:
 * its 00 stop is the contrast-adjusted intermediate `_shade_lightness_00`,
 * since the effective contrast moves it off the knob.
 */
export const to_lightness_stop_name = (family: RampFamily, stop: NumericScaleVariant): string =>
	(stop === '00' && family !== 'shade') || stop === '100'
		? `${family}_lightness_${stop}`
		: `_${family}_lightness_${stop}`;

/**
 * The variable a lightness ramp's curve renders through: the palette's knob
 * (`palette_lightness_curve`), or for the neutral ramps the contrast-bent
 * intermediate (`_shade_lightness_curve`, `_text_lightness_curve`).
 */
export const to_lightness_curve_name = (family: RampFamily): string =>
	family === 'palette' ? 'palette_lightness_curve' : `_${family}_lightness_curve`;

/** The private variable holding the effective contrast (`effective_contrast`). */
export const CONTRAST_NAME = '_contrast';

/**
 * The private input the `prefers-contrast: more` mapping sets in
 * `fuz.preferences`, declared 0 in the defaults. The one private variable
 * that is an input rather than derived: the private spelling keeps a theme
 * from setting it (the `Theme` schema rejects it and the renderer drops it),
 * so a theme's `--contrast` can't silence the OS preference.
 */
export const CONTRAST_PREFERENCE_NAME = '_contrast_preference';

/**
 * The private two-slot variable holding the ground's contrast end, clamped to
 * the ground (`contrast_ground_end`).
 */
export const CONTRAST_GROUND_END_NAME = '_contrast_ground_end';

/** The private variable holding a stop's normalized chroma shape (`_chroma_shape_50`). */
export const to_chroma_shape_name = (stop: NumericScaleVariant): string => `_chroma_shape_${stop}`;

/** The private variable holding a stop's capped palette chroma (`_palette_chroma_50`). */
export const to_palette_chroma_name = (stop: NumericScaleVariant): string =>
	`_palette_chroma_${stop}`;

/** The private variable holding the ground tint the ground can carry (`shade_ground_chroma`). */
export const SHADE_GROUND_CHROMA_NAME = '_shade_ground_chroma';

/**
 * A CSS `<number>` as a pattern source, stricter than what `Number()`
 * accepts - no hex, binary, `Infinity`, or empty string.
 *
 * @internal Shared by `variable.ts` and the theme modules - not stable API.
 */
export const CSS_NUMBER_PATTERN = String.raw`[+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?`;

const format_ramp_number = (n: number): string => String(Math.round(n * 1e6) / 1e6);

/**
 * Renders the derived default of an intermediate lightness ramp stop, e.g.
 * `--_palette_lightness_30: calc(var(--palette_lightness_00) + (var(--palette_lightness_100) - var(--palette_lightness_00)) * pow(0.3, var(--palette_lightness_curve)))`.
 * Stops 00/100 have no derived form here. The neutral ramps read their
 * contrast intermediates (`to_lightness_stop_name`, `to_lightness_curve_name`)
 * in place of the shade ground and the curves.
 */
export const render_lightness_stop_css = (
	family: RampFamily,
	stop: NumericScaleVariant
): string => {
	const l00 = `var(--${to_lightness_stop_name(family, '00')})`;
	const l100 = `var(--${to_lightness_stop_name(family, '100')})`;
	const curve = `var(--${to_lightness_curve_name(family)})`;
	const t = format_ramp_number(ramp_stop_t(stop));
	return `calc(${l00} + (${l100} - ${l00}) * pow(${t}, ${curve}))`;
};

/**
 * Renders the default of the effective contrast (`--_contrast`): the larger
 * of the `--contrast` knob and the OS preference input. The CSS twin of
 * `effective_contrast`.
 */
export const render_contrast_css = (): string =>
	`max(var(--contrast), var(--${CONTRAST_PREFERENCE_NAME}))`;

/**
 * Renders a scheme's slot of the ground end (`--_contrast_ground_end`):
 * `CONTRAST_GROUND_END` clamped to the ground, `max()` in light and `min()` in
 * dark. The CSS twin of `contrast_ground_end`.
 */
export const render_contrast_ground_end_css = (scheme: ColorScheme): string =>
	`${scheme === 'light' ? 'max' : 'min'}(${CONTRAST_GROUND_END[scheme]}, var(--shade_lightness_00))`;

/**
 * Renders the default of the effective ground lightness
 * (`--_shade_lightness_00`): the knob moved the effective contrast's fraction
 * of the way to the ground end. The CSS twin of `contrast_ground_lightness`.
 */
export const render_contrast_ground_lightness_css = (): string =>
	`calc(var(--shade_lightness_00) + (var(--${CONTRAST_GROUND_END_NAME}) - var(--shade_lightness_00)) * var(--${CONTRAST_NAME}))`;

/**
 * Renders the default of a neutral ramp's effective curve
 * (`--_shade_lightness_curve`, `--_text_lightness_curve`): the knob bent by
 * the family's `CONTRAST_CURVE_BEND` at the effective contrast. The CSS twin
 * of `contrast_lightness_curve`.
 */
export const render_contrast_curve_css = (family: Exclude<RampFamily, 'palette'>): string =>
	`calc(var(--${family}_lightness_curve) * (1 - ${CONTRAST_CURVE_BEND[family]} * var(--${CONTRAST_NAME})))`;

/**
 * Renders the normalized chroma shape of a stop, shared by the palette chroma
 * ramp and the neutral scales: `pow(4t(1-t), --chroma_curve)`.
 * Exactly 0 at the endpoints and 1 at the midpoint.
 */
export const render_chroma_shape_css = (stop: NumericScaleVariant): string => {
	const t = ramp_stop_t(stop);
	// exact 0/1 at the endpoints and midpoint; format_ramp_number rounds the rest
	const base = 4 * t * (1 - t);
	if (base === 0) return '0';
	if (base === 1) return '1';
	return `calc(pow(${format_ramp_number(base)}, var(--chroma_curve)))`;
};

/**
 * Renders the capped default of a palette chroma ramp stop: the knob curve
 * clamped by a worst-hue gamut cap - the baked per-scheme
 * `PALETTE_CHROMA_CAPS` for the defaults, or one the theme compile step
 * recomputed. `--chroma_scale` multiplies outside this clamp, at the color
 * stops.
 */
export const render_chroma_stop_css = (stop: NumericScaleVariant, cap: number): string => {
	const cap_str = format_ramp_number(cap);
	return `min(calc(var(--palette_chroma_min) + (var(--palette_chroma_max) - var(--palette_chroma_min)) * var(--${to_chroma_shape_name(
		stop
	)})), ${cap_str})`;
};

// optional CSS whitespace - `\s` with the `u` flag also takes U+00A0 and the
// other Unicode spaces, which CSS doesn't treat as whitespace
const CSS_WS = '[ \\t\\n\\r\\f]*';

/**
 * Matches the capped form `render_chroma_stop_css` emits, capturing the stop
 * and the cap - how the resolver reads a compiled cap back, and how the
 * `Theme` schema admits the one intermediate a theme can carry (see
 * `StyleVariable`). It admits CSS whitespace only, around the value and
 * inside it, so a match needs no `trim()` (which, like `\s`, takes U+00A0).
 *
 * @internal Shared by `variable.ts` and `theme_resolver.ts` - not stable API.
 */
export const CHROMA_STOP_CSS_MATCHER = new RegExp(
	String.raw`^${CSS_WS}min\(${CSS_WS}calc\(${CSS_WS}var\(--palette_chroma_min\)${CSS_WS}\+${CSS_WS}\(${CSS_WS}var\(--palette_chroma_max\)${CSS_WS}-${CSS_WS}var\(--palette_chroma_min\)${CSS_WS}\)${CSS_WS}\*${CSS_WS}var\(--_chroma_shape_(${numeric_scale_variants.join('|')})\)${CSS_WS}\)${CSS_WS},${CSS_WS}(${CSS_NUMBER_PATTERN})${CSS_WS}\)${CSS_WS}$`,
	'u'
);

/**
 * Renders a color derived from the palette ramps at a stop for a hue slot -
 * the shared template behind palette stops and intent stops (`--accent_50`
 * renders with `var(--hue_accent)`). Both slot references are built from the
 * slot name, so the hue (`--hue_<slot>`) and its chroma-character multiplier
 * (`--palette_X_chroma_scale`/`--<intent>_chroma_scale`) stay paired in the
 * emitted CSS by construction.
 *
 * @param slot - a palette letter or intent name
 * @param alpha - optional CSS alpha (e.g. `40%`) appended inside the `oklch()`
 */
export const render_ramp_color_css = (
	slot: PaletteVariant | IntentVariant,
	stop: NumericScaleVariant,
	alpha?: string
): string => {
	const slot_scale = (palette_variants as ReadonlyArray<string>).includes(slot)
		? `var(--palette_${slot}_chroma_scale, 1)`
		: `var(--${slot}_chroma_scale, 1)`;
	return `oklch(var(--${to_lightness_stop_name('palette', stop)}) calc(var(--${to_palette_chroma_name(
		stop
	)}) * var(--chroma_scale, 1) * ${slot_scale}) var(--hue_${slot})${alpha ? ` / ${alpha}` : ''})`;
};

/**
 * Renders the derived default of a neutral (shade/text) stop. The neutral
 * rides the palette's chroma shape scaled by the `--neutral_chroma` peak;
 * the near-ground shade stops add their share of the ground's own tint,
 * `--_shade_ground_chroma` (see `neutral_ground_chroma_weight` and
 * `shade_ground_chroma`), since the shape is near 0 there.
 */
export const render_neutral_stop_css = (
	family: Exclude<RampFamily, 'palette'>,
	stop: NumericScaleVariant
): string =>
	`oklch(var(--${to_lightness_stop_name(family, stop)}) calc(var(--neutral_chroma) * var(--${to_chroma_shape_name(
		stop
	)})${render_ground_chroma_term(neutral_ground_chroma_weight(family, stop))}) var(--hue_neutral))`;

// the stop's share of the ground chroma as a `calc()` term, empty past its reach
const render_ground_chroma_term = (weight: number): string => {
	if (weight === 0) return '';
	if (weight === 1) return ` + var(--${SHADE_GROUND_CHROMA_NAME})`;
	return ` + var(--${SHADE_GROUND_CHROMA_NAME}) * ${weight}`;
};

/**
 * Renders the default of the private ground tint (`--_shade_ground_chroma`):
 * `--shade_chroma_00` held to sRGB at the effective ground's lightness
 * (`--_shade_lightness_00`). The CSS twin of
 * `shade_ground_chroma`.
 */
export const render_shade_ground_chroma_css = (): string => {
	const ground = `var(--${to_lightness_stop_name('shade', '00')})`;
	return `min(var(--shade_chroma_00), ${SHADE_GROUND_CHROMA_SLOPES.light_end} * (1 - ${ground}), ${SHADE_GROUND_CHROMA_SLOPES.dark_end} * ${ground})`;
};

/**
 * Renders the derived default of a border color stop (`--border_color_NN`):
 * the border family's color at the stop's alpha from `BORDER_COLOR_ALPHAS`.
 * The color part is scheme-agnostic - the flip lives in the referenced knobs
 * - so stops whose alpha matches across schemes render identically and
 * `variables.ts` declares them single-slot.
 */
export const render_border_color_stop_css = (
	stop: NumericScaleVariant,
	scheme: ColorScheme
): string => {
	const alpha = BORDER_COLOR_ALPHAS[scheme][stop];
	if (alpha === 0) return 'transparent';
	const color = 'oklch(var(--border_color_lightness) var(--border_color_chroma) var(--hue_neutral)';
	return alpha === 100 ? `${color})` : `${color} / ${alpha}%)`;
};
