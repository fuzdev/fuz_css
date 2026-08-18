import type { Theme } from '../variable.ts';

/**
 * An era exemplar theme: the illuminated manuscript. Warm parchment surfaces
 * (the neutral's default brown binding, tinted up), rubrication-red accents
 * the way scribes marked emphasis, serif body text, and double-ruled frames.
 * Chroma eases below 1 for aged pigment - the one exemplar that turns the
 * headline chroma lever down instead of up.
 *
 * Dual-scheme: the dark appearance is the same page by candlelight, the
 * ground deepening to tanned leather and the ink warming to cream rather than
 * white. The material reads in both, so it takes no `scheme` stance - a
 * dark-mode reader who picks it isn't flashed a lit page.
 */
export const parchment_theme: Theme = {
	name: 'parchment',
	variables: [
		// warm parchment: the neutral keeps its brown binding, tinted stronger,
		// and warmer still under candlelight
		{ name: 'neutral_chroma', light: '0.03', dark: '0.038' },
		// by night the ground is tanned leather, not the default near-black
		{ name: 'shade_lightness_00', dark: '0.19' },
		// cream ink rather than white - vellum never held a pure highlight - with
		// the ramp pulled toward its end to buy the contrast the warmth costs
		{ name: 'text_lightness_100', dark: '0.95' },
		{ name: 'text_lightness_curve', dark: '0.72' },
		// rubrication: links/focus/selection mark themselves in red
		{ name: 'hue_accent', light: 'var(--hue_c)' },
		// aged pigment - inks fade, so the whole palette eases down
		{ name: 'chroma_scale', light: '0.85' },
		// serif body text; headings are already serif by default
		{ name: 'font_family', light: 'var(--font_family_serif)' },
		// double-ruled frames, wide enough for the two lines to render
		{ name: 'border_style', light: 'double' },
		{ name: 'border_width', light: 'var(--border_width_3)' },
		// rectilinear but not brutal - the page corner, softened a hair
		{ name: 'radius_scale', light: '0.5' }
	]
};
