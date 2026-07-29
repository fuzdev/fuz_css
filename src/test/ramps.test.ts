import { describe, test, assert } from 'vitest';

import {
	NEUTRAL_HUE,
	PALETTE_CHROMA_CAPS,
	PALETTE_CHROMA_MULTIPLIERS,
	PALETTE_HUES,
	PALETTE_LIGHTNESS_KNOBS,
	RAMP_STOPS,
	SHADE_LIGHTNESS_KNOBS,
	TEXT_LIGHTNESS_KNOBS,
	compute_palette_chroma_caps,
	palette_stop_oklch,
	ramp_chroma,
	ramp_lightness,
	shade_stop_oklch,
	text_stop_oklch
} from '$lib/ramps.ts';
import { color_scheme_variants, palette_variants } from '$lib/variable_data.ts';
import { oklch_in_srgb_gamut, oklch_to_srgb, type RgbUnit } from '$lib/oklch.ts';
import { wcag_contrast_ratio } from '$lib/wcag.ts';
import {
	GATE_BODY_TEXT,
	GATE_FILL_TEXT,
	GATE_LINK,
	GATE_SELECTED_TEXT,
	GATE_SUBTLE_TEXT,
	GATE_UI
} from '$lib/theme_check.ts';

// Contrast gates for the default palette. OKLCH lightness is monotonic with
// luminance, so these hold for every hue at a given stop pair — but WCAG
// ratios are computed from real luminance here, not approximated from ΔL.
// Thresholds are anchored to WCAG levels the old palette met (or, for the
// per-hue UI gates, failed and the derived palette now meets); promoted to
// `theme_check.ts` so `check_theme` gates arbitrary themes against them.

const clamp_rgb = (rgb: RgbUnit): RgbUnit => [
	Math.min(1, Math.max(0, rgb[0])),
	Math.min(1, Math.max(0, rgb[1])),
	Math.min(1, Math.max(0, rgb[2]))
];

describe('gamut', () => {
	test('every default palette stop is inside sRGB', () => {
		for (const scheme of color_scheme_variants) {
			for (const letter of palette_variants) {
				for (const stop of RAMP_STOPS) {
					const lch = palette_stop_oklch(letter, stop, scheme);
					assert(
						oklch_in_srgb_gamut(lch, 1e-4),
						`palette_${letter}_${stop} ${scheme} out of gamut: ${lch.join(' ')}`
					);
				}
			}
		}
	});

	test('every default shade and text stop is inside sRGB', () => {
		for (const scheme of color_scheme_variants) {
			for (const stop of RAMP_STOPS) {
				assert(
					oklch_in_srgb_gamut(shade_stop_oklch(stop, scheme), 1e-4),
					`shade_${stop} ${scheme}`
				);
				assert(oklch_in_srgb_gamut(text_stop_oklch(stop, scheme), 1e-4), `text_${stop} ${scheme}`);
			}
		}
	});
});

describe('monotonicity', () => {
	test('lightness ramps are strictly monotonic', () => {
		const families = [
			['palette', PALETTE_LIGHTNESS_KNOBS],
			['shade', SHADE_LIGHTNESS_KNOBS],
			['text', TEXT_LIGHTNESS_KNOBS]
		] as const;
		for (const [name, knobs_by_scheme] of families) {
			for (const scheme of color_scheme_variants) {
				const knobs = knobs_by_scheme[scheme];
				const direction = Math.sign(knobs.lightness_100 - knobs.lightness_00);
				let prev = ramp_lightness(knobs, '00');
				for (const stop of RAMP_STOPS.slice(1)) {
					const l = ramp_lightness(knobs, stop);
					assert(
						Math.sign(l - prev) === direction,
						`${name} ${scheme} not monotonic at stop ${stop}: ${prev} → ${l}`
					);
					prev = l;
				}
			}
		}
	});
});

describe('chroma multipliers', () => {
	test('defaults are in (0, 1] and palette_stop_oklch applies them', () => {
		for (const letter of palette_variants) {
			const multiplier = PALETTE_CHROMA_MULTIPLIERS[letter];
			assert.isAbove(multiplier, 0, `${letter} multiplier must be positive`);
			assert.isAtMost(multiplier, 1, `${letter} multiplier above 1 clips past the gamut caps`);
		}
		// the brown slot ships muted - brown is low-chroma orange
		assert.isBelow(PALETTE_CHROMA_MULTIPLIERS.f, 1);
		for (const scheme of color_scheme_variants) {
			const [, chroma] = palette_stop_oklch('f', '50', scheme);
			assert.approximately(chroma, ramp_chroma(scheme, '50') * PALETTE_CHROMA_MULTIPLIERS.f, 1e-12);
		}
	});
});

describe('chroma caps', () => {
	test('baked caps match the worst-hue gamut math (drift check)', () => {
		// if the default hues or lightness knobs change without recomputing the
		// caps, this fails — the caps are design-time constants, not free values
		for (const scheme of color_scheme_variants) {
			const caps = compute_palette_chroma_caps(
				Object.values(PALETTE_HUES),
				PALETTE_LIGHTNESS_KNOBS[scheme]
			);
			for (const stop of RAMP_STOPS) {
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

describe('contrast gates', () => {
	test('body text: text_80 on shade_00/05/10 meets AAA', () => {
		for (const scheme of color_scheme_variants) {
			const text = oklch_to_srgb(text_stop_oklch('80', scheme));
			for (const stop of ['00', '05', '10'] as const) {
				const surface = oklch_to_srgb(shade_stop_oklch(stop, scheme));
				const ratio = wcag_contrast_ratio(text, surface);
				assert(
					ratio >= GATE_BODY_TEXT,
					`text_80 on shade_${stop} ${scheme}: ${ratio.toFixed(2)} < ${GATE_BODY_TEXT}`
				);
			}
		}
	});

	test('subtle text: text_50 on shade_00 stays legible', () => {
		for (const scheme of color_scheme_variants) {
			const ratio = wcag_contrast_ratio(
				oklch_to_srgb(text_stop_oklch('50', scheme)),
				oklch_to_srgb(shade_stop_oklch('00', scheme))
			);
			assert(
				ratio >= GATE_SUBTLE_TEXT,
				`text_50 on shade_00 ${scheme}: ${ratio.toFixed(2)} < ${GATE_SUBTLE_TEXT}`
			);
		}
	});

	test('selected inverse text: text_00 on shade_50 clears the large-text floor', () => {
		for (const scheme of color_scheme_variants) {
			const ratio = wcag_contrast_ratio(
				oklch_to_srgb(text_stop_oklch('00', scheme)),
				oklch_to_srgb(shade_stop_oklch('50', scheme))
			);
			assert(
				ratio >= GATE_SELECTED_TEXT,
				`text_00 on shade_50 ${scheme}: ${ratio.toFixed(2)} < ${GATE_SELECTED_TEXT}`
			);
		}
	});

	test('links: palette_a_60 on shade_00 meets AA', () => {
		for (const scheme of color_scheme_variants) {
			const ratio = wcag_contrast_ratio(
				oklch_to_srgb(palette_stop_oklch('a', '60', scheme)),
				oklch_to_srgb(shade_stop_oklch('00', scheme))
			);
			assert(ratio >= GATE_LINK, `link on shade_00 ${scheme}: ${ratio.toFixed(2)} < ${GATE_LINK}`);
		}
	});

	test('UI affordances: every hue at stop 50 clears 3:1 against the page', () => {
		for (const scheme of color_scheme_variants) {
			const surface = oklch_to_srgb(shade_stop_oklch('00', scheme));
			const text_max: RgbUnit = scheme === 'light' ? [0, 0, 0] : [1, 1, 1];
			const text_00 = oklch_to_srgb(text_stop_oklch('00', scheme));
			for (const letter of palette_variants) {
				const fill = clamp_rgb(oklch_to_srgb(palette_stop_oklch(letter, '50', scheme)));
				const ui = wcag_contrast_ratio(fill, surface);
				assert(
					ui >= GATE_UI,
					`palette_${letter}_50 vs shade_00 ${scheme}: ${ui.toFixed(2)} < ${GATE_UI}`
				);
				const on_fill = wcag_contrast_ratio(text_max, fill);
				assert(
					on_fill >= GATE_FILL_TEXT,
					`text_max on palette_${letter}_50 ${scheme}: ${on_fill.toFixed(2)} < ${GATE_FILL_TEXT}`
				);
				const selected = wcag_contrast_ratio(text_00, fill);
				assert(
					selected >= GATE_SELECTED_TEXT,
					`text_00 on palette_${letter}_50 ${scheme}: ${selected.toFixed(2)} < ${GATE_SELECTED_TEXT}`
				);
			}
		}
	});
});

describe('neutral', () => {
	test('shade and text scales stay near the neutral hue with subtle chroma', () => {
		for (const scheme of color_scheme_variants) {
			for (const stop of RAMP_STOPS) {
				const [, chroma, hue] = shade_stop_oklch(stop, scheme);
				assert(chroma <= 0.03, `shade_${stop} ${scheme} chroma ${chroma} too strong`);
				assert(hue === NEUTRAL_HUE);
			}
		}
	});
});
