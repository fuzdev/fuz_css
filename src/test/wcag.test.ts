import { describe, test, assert } from 'vitest';

import type { RgbUnit } from '@fuzdev/fuz_util/oklch.ts';

import { srgb_relative_luminance, wcag_contrast_ratio } from '#lib/wcag.ts';

describe('srgb_relative_luminance', () => {
	test('luminance of white and black', () => {
		assert.closeTo(srgb_relative_luminance([1, 1, 1]), 1, 1e-6);
		assert.closeTo(srgb_relative_luminance([0, 0, 0]), 0, 1e-6);
	});
});

describe('wcag_contrast_ratio', () => {
	test('contrast ratio extremes and a known mid pair', () => {
		assert.closeTo(wcag_contrast_ratio([1, 1, 1], [0, 0, 0]), 21, 1e-6);
		assert.closeTo(wcag_contrast_ratio([0, 0, 0], [1, 1, 1]), 21, 1e-6);
		// #767676 on white is the canonical ~4.54:1 AA boundary gray
		const gray: RgbUnit = [0x76 / 255, 0x76 / 255, 0x76 / 255];
		assert.closeTo(wcag_contrast_ratio(gray, [1, 1, 1]), 4.54, 0.01);
	});
});
