import type { Theme } from '../variable.ts';

/**
 * An era exemplar theme: the 90s desktop web. Colorless system chrome on a
 * ground that sits off the paper-white extreme, one serif family for
 * everything the way the browser default was, square corners, packed dense,
 * and beveled borders doing the work shadows do elsewhere - buttons raised,
 * pressing to `inset`, fields sunken. Links are the era's tell: underlined at
 * rest. Sits just short of phosphor's terminal density.
 *
 * The one exemplar built on borders rather than depth, and the proof that
 * `--button_border_style`/`--button_border_style_active` express a
 * raised/pressed pair. Dual-scheme: by night the same chrome in slate, the
 * hi-color desktop after dark. Built from levers only - the palette letters
 * keep their default hues, and nothing is pushed past the gamut caps.
 */
export const nineties_theme: Theme = {
	name: 'nineties',
	variables: [
		// system chrome is colorless - the neutral drops its tint entirely,
		// the only exemplar with no cast at all
		{ name: 'neutral_chroma', light: '0' },
		// the desktop, not the page: the ground steps off the extreme in both
		// schemes, as far as the contrast gates allow
		{ name: 'shade_lightness_00', light: '0.92', dark: '0.24' },
		// text is tuned for a white page by default; on a gray ground the mid
		// stops wash, so the ramp pulls harder toward its ends
		{ name: 'text_lightness_curve', light: '0.9', dark: '0.7' },
		// one family for everything, headings included by default
		{ name: 'font_family', light: 'var(--font_family_serif)' },
		// bold headings, not the light display h1 - flatten the weight ladder
		{ name: 'heading_font_weight', light: '700' },
		// beveled chrome: raised buttons that press in, over sunken fields
		{ name: 'border_style', light: 'inset' },
		{ name: 'button_border_style', light: 'outset' },
		{ name: 'button_border_style_active', light: 'inset' },
		{ name: 'border_width', light: 'var(--border_width_2)' },
		// the bevel is the depth, so the corners square off and shadows go flat
		{ name: 'radius_scale', light: '0' },
		{ name: 'shadow_alpha_scale', light: '0' },
		// desktop density: small type packed tight, a step short of phosphor's
		// terminal compression (leading is decoupled from scale_factor, so the
		// leading pins are the theme's own)
		{ name: 'scale_factor', light: '0.9' },
		{ name: 'line_height_md', light: '1.45' },
		{ name: 'line_height_lg', light: '1.7' },
		{ name: 'line_height_xl', light: '2.1' },
		// links are underlined at rest, not on hover
		{ name: 'text_decoration', light: 'underline' }
	]
};
