import { describe, test, assert } from 'vitest';

import {
	PALETTE_CHROMA_CAPS,
	PALETTE_CHROMA_MULTIPLIERS,
	PALETTE_HUES,
	PALETTE_LIGHTNESS_KNOBS,
	compute_palette_chroma_caps,
	shade_stop_oklch
} from '$lib/ramps.ts';
import {
	color_scheme_variants,
	numeric_scale_variants,
	palette_variants
} from '$lib/variable_data.ts';

// The gamut, monotonicity, and contrast gates for the default palette live in
// `theme_check.test.ts`: `check_theme(base_theme)` resolves exactly these
// defaults through the numeric twins, so asserting its report covers them
// without a hand-rolled copy here. This file keeps the constants-only checks
// that `check_theme` can't express.

describe('chroma multipliers', () => {
	test('defaults are in (0, 1]', () => {
		for (const letter of palette_variants) {
			const multiplier = PALETTE_CHROMA_MULTIPLIERS[letter];
			assert.isAbove(multiplier, 0, `${letter} multiplier must be positive`);
			assert.isAtMost(multiplier, 1, `${letter} multiplier above 1 clips past the gamut caps`);
		}
		// the brown slot ships muted - brown is low-chroma orange
		assert.isBelow(PALETTE_CHROMA_MULTIPLIERS.f, 1);
	});
});

describe('chroma caps', () => {
	test('baked caps match the worst-hue gamut math (drift check)', () => {
		// if the default hues or lightness knobs change without recomputing the
		// caps, this fails - the caps are design-time constants, not free values
		for (const scheme of color_scheme_variants) {
			const caps = compute_palette_chroma_caps(
				Object.values(PALETTE_HUES),
				PALETTE_LIGHTNESS_KNOBS[scheme]
			);
			for (const stop of numeric_scale_variants) {
				const baked = PALETTE_CHROMA_CAPS[scheme][stop];
				const computed = caps[stop];
				assert(
					baked <= computed + 1e-6,
					`cap too generous at ${stop} ${scheme}: baked ${baked} > recomputed ${computed}`
				);
				assert(
					baked >= computed - 0.001,
					`cap stale/over-conservative at ${stop} ${scheme}: baked ${baked} < recomputed ${
						computed
					}`
				);
			}
		}
	});
});

describe('neutral', () => {
	test('the shade scale keeps its chroma subtle', () => {
		for (const scheme of color_scheme_variants) {
			for (const stop of numeric_scale_variants) {
				const [, chroma] = shade_stop_oklch(stop, scheme);
				assert(chroma <= 0.03, `shade_${stop} ${scheme} chroma ${chroma} too strong`);
			}
		}
	});
});
