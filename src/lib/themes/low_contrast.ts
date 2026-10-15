import type { Theme } from '../variable.ts';

/**
 * Gentle contrast: a compressed surface range, tuned to the softest
 * compression that still clears the `check_theme` text, link, border, and
 * fill gates over the base theme. Composed over a theme with a tighter ground
 * it can dip below a gate, so check the composition.
 *
 * It moves the ground and nothing else, so a theme keeps its own neutral
 * cast under it.
 */
export const low_contrast_theme: Theme = {
	name: 'low contrast',
	variables: [
		// compress the shade ramp from the page-background end
		{ name: 'shade_lightness_00', base: '0.923', dark: '0.245' }
	]
};
