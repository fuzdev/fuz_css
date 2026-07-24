/**
 * OKLCH/OKLab ↔ sRGB conversions and gamut math.
 *
 * The shipped CSS never needs this module — fuz_css output stays pure
 * `oklch()`/`calc()`. It exists for design time and tests: derivation scripts
 * fit curve knobs against real colors, and tests assert that every default
 * stop is inside the sRGB gamut and meets the contrast gates (see `wcag.ts`).
 * Display tooling (like the docs site's color swatches) may also import the
 * conversions.
 *
 * Matrices and constants follow css-color-4 and Björn Ottosson's reference
 * implementation.
 *
 * @module
 */

/** A color in OKLCH: lightness in [0, 1], chroma ≥ 0 (unbounded), hue in degrees. */
export type Oklch = [lightness: number, chroma: number, hue: number];

/** A color in OKLab: lightness in [0, 1], `a`/`b` roughly in [-0.4, 0.4]. */
export type Oklab = [lightness: number, a: number, b: number];

/**
 * An RGB color with components in the unit interval [0, 1].
 * Values are gamma-encoded sRGB unless a function documents linear-light.
 * Out-of-gamut results are not clamped, so components may fall outside [0, 1].
 */
export type RgbUnit = [r: number, g: number, b: number];

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Converts a gamma-encoded sRGB component in [0, 1] to linear-light.
 */
export const srgb_component_to_linear = (c: number): number =>
	c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/**
 * Converts a linear-light sRGB component to gamma-encoded in [0, 1].
 */
export const linear_component_to_srgb = (c: number): number =>
	c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;

/**
 * Converts gamma-encoded sRGB to OKLab.
 */
export const srgb_to_oklab = ([r, g, b]: RgbUnit): Oklab => {
	const rl = srgb_component_to_linear(r);
	const gl = srgb_component_to_linear(g);
	const bl = srgb_component_to_linear(b);

	const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
	const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
	const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

	const l_ = Math.cbrt(l);
	const m_ = Math.cbrt(m);
	const s_ = Math.cbrt(s);

	return [
		0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
		1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
		0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
	];
};

/**
 * Converts OKLab to gamma-encoded sRGB.
 *
 * @returns components that may fall outside [0, 1] when the color is out of gamut
 */
export const oklab_to_srgb = ([lightness, a, b]: Oklab): RgbUnit => {
	const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;

	const rl = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

	return [linear_component_to_srgb(rl), linear_component_to_srgb(gl), linear_component_to_srgb(bl)];
};

/**
 * Converts OKLab to OKLCH. Hue is normalized to [0, 360); an achromatic color gets hue 0.
 */
export const oklab_to_oklch = ([lightness, a, b]: Oklab): Oklch => {
	const chroma = Math.hypot(a, b);
	const hue = chroma < 1e-9 ? 0 : (Math.atan2(b, a) * RAD_TO_DEG + 360) % 360;
	return [lightness, chroma, hue];
};

/**
 * Converts OKLCH to OKLab.
 */
export const oklch_to_oklab = ([lightness, chroma, hue]: Oklch): Oklab => [
	lightness,
	chroma * Math.cos(hue * DEG_TO_RAD),
	chroma * Math.sin(hue * DEG_TO_RAD)
];

/**
 * Converts gamma-encoded sRGB to OKLCH.
 */
export const srgb_to_oklch = (rgb: RgbUnit): Oklch => oklab_to_oklch(srgb_to_oklab(rgb));

/**
 * Converts OKLCH to gamma-encoded sRGB.
 *
 * @returns components that may fall outside [0, 1] when the color is out of gamut
 */
export const oklch_to_srgb = (lch: Oklch): RgbUnit => oklab_to_srgb(oklch_to_oklab(lch));

/**
 * Checks whether an OKLCH color converts to sRGB with all components inside [0, 1].
 *
 * @param epsilon - tolerance for float noise at the gamut boundary
 */
export const oklch_in_srgb_gamut = (lch: Oklch, epsilon = 1e-6): boolean => {
	const [r, g, b] = oklch_to_srgb(lch);
	const min = -epsilon;
	const max = 1 + epsilon;
	return r >= min && r <= max && g >= min && g <= max && b >= min && b <= max;
};

/**
 * Finds the largest chroma at a given OKLCH lightness and hue such that every
 * chroma below it is also inside the sRGB gamut. Returns 0 when the lightness
 * itself is out of range.
 *
 * This is deliberately the *safe* maximum for ramps, not the outermost gamut
 * intersection: the sRGB gamut is non-convex in OKLab (most visibly near the
 * blue primary), so the constant-(L, H) chroma ray can exit and re-enter the
 * gamut. A ramp needs the whole `[0, C]` segment representable, so the scan
 * stops at the first exit.
 *
 * @param precision - terminate when the refinement interval is smaller than this
 */
export const oklch_max_srgb_chroma = (lightness: number, hue: number, precision = 1e-5): number => {
	if (lightness <= 0 || lightness >= 1) return 0;
	// coarse outward scan to the first gamut exit, robust to non-convexity
	const step = 0.002;
	let low = 0;
	let high = 0.5; // beyond any sRGB chroma
	for (let c = step; c <= 0.5; c += step) {
		if (oklch_in_srgb_gamut([lightness, c, hue])) {
			low = c;
		} else {
			high = c;
			break;
		}
	}
	// binary refinement inside the crossing interval
	while (high - low > precision) {
		const mid = (low + high) / 2;
		if (oklch_in_srgb_gamut([lightness, mid, hue])) {
			low = mid;
		} else {
			high = mid;
		}
	}
	return low;
};

/**
 * Computes ΔEOK between two OKLCH colors — the Euclidean distance in OKLab.
 * Just-noticeable differences sit around 0.02; css-color-4's gamut mapping
 * uses 0.02 as its "local MINDE" threshold.
 */
export const oklch_delta_e = (a: Oklch, b: Oklch): number => {
	const [l1, a1, b1] = oklch_to_oklab(a);
	const [l2, a2, b2] = oklch_to_oklab(b);
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};
