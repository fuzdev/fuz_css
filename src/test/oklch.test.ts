import { describe, test, assert } from 'vitest';

import {
	linear_component_to_srgb,
	oklab_to_oklch,
	oklab_to_srgb,
	oklch_in_srgb_gamut,
	oklch_max_srgb_chroma,
	oklch_to_oklab,
	oklch_to_srgb,
	srgb_component_to_linear,
	srgb_to_oklab,
	srgb_to_oklch,
	type Oklab,
	type Oklch,
	type RgbUnit
} from '$lib/oklch.ts';

describe('srgb_to_oklch', () => {
	// reference values from the css-color-4 sample code / Ottosson's reference implementation
	test('converts white', () => {
		const [l, c] = srgb_to_oklch([1, 1, 1]);
		assert.closeTo(l, 1, 1e-4);
		assert.closeTo(c, 0, 1e-4);
	});

	test('converts black', () => {
		const [l, c] = srgb_to_oklch([0, 0, 0]);
		assert.closeTo(l, 0, 1e-4);
		assert.closeTo(c, 0, 1e-4);
	});

	test('converts the sRGB primaries', () => {
		const red = srgb_to_oklch([1, 0, 0]);
		assert.closeTo(red[0], 0.628, 1e-3);
		assert.closeTo(red[1], 0.2577, 1e-3);
		assert.closeTo(red[2], 29.23, 0.1);

		const green = srgb_to_oklch([0, 1, 0]);
		assert.closeTo(green[0], 0.8664, 1e-3);
		assert.closeTo(green[1], 0.2948, 1e-3);
		assert.closeTo(green[2], 142.5, 0.1);

		const blue = srgb_to_oklch([0, 0, 1]);
		assert.closeTo(blue[0], 0.452, 1e-3);
		assert.closeTo(blue[1], 0.3132, 1e-3);
		assert.closeTo(blue[2], 264.05, 0.1);
	});
});

describe('oklch_to_srgb', () => {
	test('round-trips in-gamut colors', () => {
		// the published matrices are rounded, so round-trips are good to ~1e-4, not machine epsilon
		const samples: Array<RgbUnit> = [
			[0.5, 0.25, 0.75],
			[0.1, 0.9, 0.3],
			[0.95, 0.95, 0.02],
			[0.33, 0.33, 0.33]
		];
		for (const rgb of samples) {
			const back = oklch_to_srgb(srgb_to_oklch(rgb));
			for (const i of [0, 1, 2] as const) {
				assert.closeTo(back[i], rgb[i], 5e-4, `component ${i} of ${JSON.stringify(rgb)}`);
			}
		}
	});
});

describe('oklch_in_srgb_gamut', () => {
	test('accepts a muted mid-tone and rejects an impossible chroma', () => {
		assert(oklch_in_srgb_gamut([0.5, 0.1, 240]));
		assert(!oklch_in_srgb_gamut([0.5, 0.4, 240]));
	});

	test('accepts the extremes', () => {
		assert(oklch_in_srgb_gamut([1, 0, 0]));
		assert(oklch_in_srgb_gamut([0, 0, 0]));
	});
});

describe('oklch_max_srgb_chroma', () => {
	test('matches the red primary and stays conservative at the blue hook', () => {
		// red's chroma ray is connected, so the safe max equals the primary's own chroma
		const red = srgb_to_oklch([1, 0, 0]);
		assert.closeTo(oklch_max_srgb_chroma(red[0], red[2]), red[1], 1e-3);
		// blue's ray exits and re-enters the gamut (non-convexity), so the safe
		// max sits inside the primary's chroma; the boundary must be real
		const blue = srgb_to_oklch([0, 0, 1]);
		const safe = oklch_max_srgb_chroma(blue[0], blue[2]);
		assert(safe < blue[1], `safe ${safe} should be below the primary's ${blue[1]}`);
		assert(oklch_in_srgb_gamut([blue[0], safe, blue[2]]));
		assert(!oklch_in_srgb_gamut([blue[0], safe + 0.002, blue[2]]));
	});

	test('returns 0 outside the lightness range', () => {
		assert(oklch_max_srgb_chroma(0, 100) === 0);
		assert(oklch_max_srgb_chroma(1, 100) === 0);
	});

	test('yellow carries far less chroma than blue at mid lightness', () => {
		// the gamut reality behind the uniform-conservative cap decision
		const yellow = oklch_max_srgb_chroma(0.55, 100);
		const blue = oklch_max_srgb_chroma(0.55, 264);
		assert(yellow < blue * 0.6, `yellow ${yellow} vs blue ${blue}`);
	});
});

describe('sRGB transfer function', () => {
	test('the linear and gamma branches meet at the knee', () => {
		// both formulas agree at the 0.04045 / 0.0031308 crossover
		assert.closeTo(srgb_component_to_linear(0.04045), 0.0031308, 1e-6);
		assert.closeTo(linear_component_to_srgb(0.0031308), 0.04045, 1e-6);
	});

	test('mid gray linearizes to about 21%', () => {
		assert.closeTo(srgb_component_to_linear(0.5), 0.214, 1e-4);
	});

	test('round-trips across the range', () => {
		for (const c of [0, 0.001, 0.04, 0.2, 0.5, 0.8, 1]) {
			assert.closeTo(linear_component_to_srgb(srgb_component_to_linear(c)), c, 1e-9, `${c}`);
		}
	});
});

describe('srgb_to_oklab / oklab_to_srgb', () => {
	test('white and black are achromatic at the lightness extremes', () => {
		const [wl, wa, wb] = srgb_to_oklab([1, 1, 1]);
		assert.closeTo(wl, 1, 1e-4);
		assert.closeTo(wa, 0, 1e-4);
		assert.closeTo(wb, 0, 1e-4);
		const [kl, ka, kb] = srgb_to_oklab([0, 0, 0]);
		assert.closeTo(kl, 0, 1e-9);
		assert.closeTo(ka, 0, 1e-9);
		assert.closeTo(kb, 0, 1e-9);
	});

	test('round-trips in-gamut colors', () => {
		const colors: Array<RgbUnit> = [
			[0.2, 0.4, 0.6],
			[0.9, 0.1, 0.3],
			[0.5, 0.5, 0.5]
		];
		for (const rgb of colors) {
			const back = oklab_to_srgb(srgb_to_oklab(rgb));
			for (let i = 0; i < 3; i++) assert.closeTo(back[i]!, rgb[i]!, 1e-6, `${rgb} [${i}]`);
		}
	});
});

describe('oklab_to_oklch / oklch_to_oklab', () => {
	test('normalizes hue to [0, 360) and zeroes the hue of achromatic colors', () => {
		const [, , hue_negative_b] = oklab_to_oklch([0.5, 0, -0.1]);
		assert.closeTo(hue_negative_b, 270, 1e-9);
		const [, , hue_positive_a] = oklab_to_oklch([0.5, 0.1, 0]);
		assert.closeTo(hue_positive_a, 0, 1e-9);
		const [, chroma, hue] = oklab_to_oklch([0.5, 0, 0]);
		assert.strictEqual(chroma, 0);
		assert.strictEqual(hue, 0);
	});

	test('round-trips', () => {
		const lch: Oklch = [0.62, 0.15, 250];
		const back = oklab_to_oklch(oklch_to_oklab(lch));
		for (let i = 0; i < 3; i++) assert.closeTo(back[i]!, lch[i]!, 1e-9, `[${i}]`);
		const lab: Oklab = [0.7, -0.05, 0.12];
		const back_lab = oklch_to_oklab(oklab_to_oklch(lab));
		for (let i = 0; i < 3; i++) assert.closeTo(back_lab[i]!, lab[i]!, 1e-9, `lab [${i}]`);
	});
});
