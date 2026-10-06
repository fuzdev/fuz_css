import type { Theme } from '../variable.ts';

/**
 * Stretched contrast: pure white/black page background and text bent toward
 * the extremes across the whole ramp - curve-knob moves, not stop surgery -
 * plus stronger borders. At the extreme ground an input's sunken fill has
 * nowhere to go, so the border alone marks a control, and it moves up the
 * shade ramp to stay past 3:1 against the page.
 */
export const high_contrast_theme: Theme = {
	name: 'high contrast',
	variables: [
		// pure white/black page background; the whole shade ramp stretches to it
		{ name: 'shade_lightness_00', light: '1', dark: '0' },
		// bend text toward the contrast end across the whole ramp
		{ name: 'text_lightness_curve', light: '0.45', dark: '0.31' },
		// control boundaries step up the shade ramp
		{ name: 'border_color', light: 'var(--shade_50)' }
	]
};
