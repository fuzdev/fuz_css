import type { Theme } from '../variable.ts';

/**
 * An exemplar theme: built for legibility, the way public signage is - read
 * at a distance, in passing, by anyone. Structure comes from scale and
 * weight: generous spacing, larger body text, an opened-up type scale, a heavier body weight
 * under bold grotesque headings at normal tracking, thick borders, flat
 * fields, underlined links, and a focus ring too wide to miss. The palette
 * stays at the gamut caps: signage color is saturated but it has to print.
 *
 * For public-facing sites, older readers, kiosks, and anyone who wants the
 * defaults turned up rather than restyled. Dual-scheme, and the one exemplar
 * whose accent changes between them: by day the wayfinding blue of a printed
 * board, by night the yellow of a lit departure display. Built from levers
 * only - the palette letters keep their default hues.
 */
export const signage_theme: Theme = {
	name: 'signage',
	summary:
		"Legible for public sites, older readers, and kiosks: larger, heavier body text, bold headings at normal tracking, roomy controls, underlined links, and a focus ring you can't miss - the transit sign.",
	variables: [
		// enamel white and board black: barely any cast
		{ name: 'hue_neutral', base: 'var(--hue_a)' },
		{ name: 'neutral_chroma', base: '0.006' },
		// wayfinding blue by day, departure-board yellow by night
		{ name: 'hue_accent', base: 'var(--hue_a)', dark: 'var(--hue_e)' },
		// text pulled toward its contrast end across the whole ramp
		{ name: 'text_lightness_curve', base: '0.8', dark: '0.6' },
		// read at a distance: everything gets room, and body text grows a size
		// (18px at the browser default), small text with it
		{ name: 'space_scale', base: '1.2' },
		{ name: 'font_size_scale', base: '1.125' },
		// a heavier body under bold grotesque headings, tracked normally -
		// tight tracking is a display move that costs legibility
		{ name: 'font_weight', base: '500' },
		{ name: 'heading_font_family', base: 'var(--font_family_sans)' },
		{ name: 'heading_font_weight', base: '700' },
		// and bigger: the type scale opens up so headings carry from across a hall
		{ name: 'type_scale_ratio', base: '1.3' },
		// thick rules on flat fields
		{ name: 'border_width', base: 'var(--border_width_2)' },
		{ name: 'shadow_alpha_scale', base: '0' },
		// links are underlined at rest, never marked by color alone
		{ name: 'text_decoration', base: 'underline' },
		// a focus ring too wide to miss, set off from the control
		{ name: 'outline_width_focus', base: 'var(--border_width_4)' },
		{ name: 'outline_offset', base: '2px' }
	]
};
