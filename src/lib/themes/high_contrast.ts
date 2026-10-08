import type { Theme } from '../variable.ts';

/**
 * Stretched contrast: a pure white page background in light mode and a
 * deepened one in dark, text bent toward the contrast end - curve-knob moves,
 * not stop surgery - darker links, and stronger borders.
 *
 * The dark ground stops short of pure black because the bottom of the
 * lightness range carries almost no luminance: going to black buys text a
 * sliver of contrast while collapsing the surface steps and weakening
 * borders. The text bend is moderate for a similar reason - the stretched
 * ground already takes body text past AAA, and a harder bend lifts disabled
 * and subtle text to nearly body contrast, flattening the hierarchy those
 * stops encode.
 *
 * On the white ground an input's sunken fill has nowhere to go, so the border
 * alone marks a control, and it moves up the shade ramp to stay past 3:1
 * against the page. Panels get a ring in that border color, since their faint
 * fill reads as nothing beside the louder text and borders - which replaces a
 * theme's own `panel_shadow` while the modifier holds.
 */
export const high_contrast_theme: Theme = {
	name: 'high contrast',
	variables: [
		// pure white page background, a deepened dark one; the whole shade ramp
		// stretches to it
		{ name: 'shade_lightness_00', light: '1', dark: '0.12' },
		// bend text toward the contrast end, keeping disabled text clearly below body
		{ name: 'text_lightness_curve', light: '0.8', dark: '0.6' },
		// control boundaries step up the shade ramp
		{ name: 'border_color', light: 'var(--shade_50)' },
		// links step up the accent ramp to keep pace with the stretched body text
		{ name: 'link_color', light: 'var(--accent_70)' },
		// panels keep an edge when their fill can't carry one
		{ name: 'panel_shadow', light: '0 0 0 var(--border_width) var(--border_color)' }
	]
};
