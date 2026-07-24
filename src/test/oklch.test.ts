import { describe, test, assert } from 'vitest';

import {
	oklch_delta_e,
	oklch_in_srgb_gamut,
	oklch_max_srgb_chroma,
	oklch_to_srgb,
	srgb_to_oklch,
	type Oklch,
	type RgbUnit
} from '$lib/oklch.ts';
import { srgb_relative_luminance, wcag_contrast_ratio } from '$lib/wcag.ts';

const assert_close = (actual: number, expected: number, tolerance: number, message?: string) => {
	assert(
		Math.abs(actual - expected) <= tolerance,
		message ?? `expected ${actual} to be within ${tolerance} of ${expected}`
	);
};

describe('srgb_to_oklch', () => {
	// reference values from the css-color-4 sample code / Ottosson's reference implementation
	test('converts white', () => {
		const [l, c] = srgb_to_oklch([1, 1, 1]);
		assert_close(l, 1, 1e-4);
		assert_close(c, 0, 1e-4);
	});

	test('converts black', () => {
		const [l, c] = srgb_to_oklch([0, 0, 0]);
		assert_close(l, 0, 1e-4);
		assert_close(c, 0, 1e-4);
	});

	test('converts the sRGB primaries', () => {
		const red = srgb_to_oklch([1, 0, 0]);
		assert_close(red[0], 0.628, 1e-3);
		assert_close(red[1], 0.2577, 1e-3);
		assert_close(red[2], 29.23, 0.1);

		const green = srgb_to_oklch([0, 1, 0]);
		assert_close(green[0], 0.8664, 1e-3);
		assert_close(green[1], 0.2948, 1e-3);
		assert_close(green[2], 142.5, 0.1);

		const blue = srgb_to_oklch([0, 0, 1]);
		assert_close(blue[0], 0.452, 1e-3);
		assert_close(blue[1], 0.3132, 1e-3);
		assert_close(blue[2], 264.05, 0.1);
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
				assert_close(back[i], rgb[i], 5e-4, `component ${i} of ${JSON.stringify(rgb)}`);
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
		assert_close(oklch_max_srgb_chroma(red[0], red[2]), red[1], 1e-3);
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

describe('oklch_delta_e', () => {
	test('is 0 for identical colors and symmetric otherwise', () => {
		const a: Oklch = [0.6, 0.15, 210];
		const b: Oklch = [0.62, 0.13, 215];
		assert(oklch_delta_e(a, a) === 0);
		assert_close(oklch_delta_e(a, b), oklch_delta_e(b, a), 1e-12);
		assert(oklch_delta_e(a, b) > 0);
	});

	test('ignores hue for achromatic colors', () => {
		assert_close(oklch_delta_e([0.5, 0, 0], [0.5, 0, 180]), 0, 1e-12);
	});
});

describe('wcag', () => {
	test('luminance of white and black', () => {
		assert_close(srgb_relative_luminance([1, 1, 1]), 1, 1e-6);
		assert_close(srgb_relative_luminance([0, 0, 0]), 0, 1e-6);
	});

	test('contrast ratio extremes and a known mid pair', () => {
		assert_close(wcag_contrast_ratio([1, 1, 1], [0, 0, 0]), 21, 1e-6);
		assert_close(wcag_contrast_ratio([0, 0, 0], [1, 1, 1]), 21, 1e-6);
		// #767676 on white is the canonical ~4.54:1 AA boundary gray
		const gray: RgbUnit = [0x76 / 255, 0x76 / 255, 0x76 / 255];
		assert_close(wcag_contrast_ratio(gray, [1, 1, 1]), 4.54, 0.01);
	});
});
