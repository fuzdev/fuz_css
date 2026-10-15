import type { Theme } from '../variable.ts';

/**
 * An exemplar theme: the guestbook of a 90s homepage. Structure comes from
 * controls drawn as objects - sunken fields under raised buttons that press
 * to `inset`, the bevel doing the work shadows do elsewhere. Colorless system
 * chrome on a ground that sits off the paper-white extreme, one serif family
 * for everything the way the browser default was, square corners, packed
 * dense, and links underlined at rest. Sits between ledger's compact and
 * phosphor's terminal density.
 *
 * The proof that `--button_border_style`/`--button_border_style_active`
 * express a raised/pressed pair. Dual-scheme: by night the same chrome in
 * slate, the hi-color desktop after dark. Built from levers only - the
 * palette letters keep their default hues, and nothing is pushed past the
 * gamut caps.
 */
export const guestbook_theme: Theme = {
	name: 'guestbook',
	summary:
		'Retro web for the fun of it: colorless system chrome, serif everything, square corners, underlined links, beveled buttons that press in, a dotted focus ring - the 90s guestbook.',
	variables: [
		// system chrome is colorless - the neutral drops its tint entirely
		{ name: 'neutral_chroma', base: '0' },
		// the desktop, not the page: the ground steps off the extreme in both
		// schemes, as far as the text and fill contrast gates allow
		{ name: 'shade_lightness_00', base: '0.923', dark: '0.24' },
		// text is tuned for a white page by default; on a gray ground the mid
		// stops wash, so the ramp pulls harder toward its ends
		{ name: 'text_lightness_curve', base: '0.9', dark: '0.7' },
		// one family for everything, headings included by default
		{ name: 'font_family', base: 'var(--font_family_serif)' },
		// bold headings, not the light display h1 - flatten the weight ladder
		{ name: 'heading_font_weight', base: '700' },
		// the era's default heading sizes: an h1 about twice the body text
		{ name: 'type_scale_ratio', base: '1.2' },
		// beveled chrome: raised buttons that press in, over sunken fields
		{ name: 'border_style', base: 'inset' },
		{ name: 'button_border_style', base: 'outset' },
		{ name: 'button_border_style_active', base: 'inset' },
		{ name: 'border_width', base: 'var(--border_width_2)' },
		// the bevel is the depth, so the corners square off and shadows go flat
		{ name: 'radius_scale', base: '0' },
		{ name: 'shadow_alpha_scale', base: '0' },
		// desktop density: small type packed tight, between ledger's compact and
		// phosphor's terminal compression (leading is decoupled from space_scale,
		// so the body leading pin is the theme's own)
		{ name: 'space_scale', base: '0.9' },
		{ name: 'line_height_md', base: '1.45' },
		// links are underlined at rest, not on hover
		{ name: 'text_decoration', base: 'underline' },
		// the era's dotted focus rectangle, kept at the default width - at 1px
		// the dots blur into the bevel and the ring stops reading
		{ name: 'outline_style', base: 'dotted' }
	]
};
