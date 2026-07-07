/**
 * WCAG 2.x relative luminance and contrast ratio.
 *
 * Design-time and test use only, like `oklch.ts` — these power the contrast
 * gates that assert readable default pairings (body text on surfaces, links,
 * focus outlines) across the derived palette.
 *
 * @module
 */

import {srgb_component_to_linear, type RgbUnit} from './oklch.ts';

/**
 * Computes WCAG 2.x relative luminance of a gamma-encoded sRGB color.
 */
export const srgb_relative_luminance = ([r, g, b]: RgbUnit): number =>
	0.2126 * srgb_component_to_linear(r) +
	0.7152 * srgb_component_to_linear(g) +
	0.0722 * srgb_component_to_linear(b);

/**
 * Computes the WCAG 2.x contrast ratio between two gamma-encoded sRGB colors,
 * in [1, 21] regardless of argument order.
 */
export const wcag_contrast_ratio = (a: RgbUnit, b: RgbUnit): number => {
	const la = srgb_relative_luminance(a);
	const lb = srgb_relative_luminance(b);
	const lighter = Math.max(la, lb);
	const darker = Math.min(la, lb);
	return (lighter + 0.05) / (darker + 0.05);
};
