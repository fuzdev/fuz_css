import type { Theme } from '../variable.ts';

/**
 * Gentle contrast: a softer neutral tint and compressed surface range, tuned
 * to the softest compression that still passes every `check_theme` WCAG gate.
 */
export const low_contrast_theme: Theme = {
	name: 'low contrast',
	variables: [
		{ name: 'neutral_chroma', light: '0.017', dark: '0.018' },
		// compress the shade ramp from the page-background end
		{ name: 'shade_lightness_00', light: '0.92', dark: '0.245' }
	]
};
