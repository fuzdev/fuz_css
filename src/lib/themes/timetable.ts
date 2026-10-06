import type { Theme } from '../variable.ts';

/**
 * An exemplar theme: the station timetable. Structure comes from scale -
 * built to be read at a distance and in passing, the way transit signage is.
 * Generous spacing, an opened-up type scale, a heavier body weight under
 * bold grotesque headings, thick rules, flat fields, underlined links, and a
 * focus ring too wide to miss. The palette stays at the gamut caps: signage
 * color is saturated but it has to print.
 *
 * Dual-scheme, and the one exemplar whose accent changes between them: by day
 * the wayfinding blue of a printed board, by night the yellow of a lit
 * departure display. Built from levers only - the palette letters keep their
 * default hues.
 */
export const timetable_theme: Theme = {
	name: 'timetable',
	variables: [
		// enamel white and board black: barely any cast
		{ name: 'hue_neutral', light: 'var(--hue_a)' },
		{ name: 'neutral_chroma', light: '0.006' },
		// wayfinding blue by day, departure-board yellow by night
		{ name: 'hue_accent', light: 'var(--hue_a)', dark: 'var(--hue_e)' },
		// text pulled toward its contrast end across the whole ramp
		{ name: 'text_lightness_curve', light: '0.8', dark: '0.6' },
		// read at a distance: everything gets room
		{ name: 'space_scale', light: '1.2' },
		// a heavier body under bold grotesque headings
		{ name: 'font_weight', light: '500' },
		{ name: 'heading_font_family', light: 'var(--font_family_sans)' },
		{ name: 'heading_font_weight', light: '800' },
		{ name: 'heading_letter_spacing', light: '-0.01em' },
		// and bigger: the type scale opens up so headings carry from across a hall
		{ name: 'type_scale_ratio', light: '1.3' },
		// thick rules on flat fields
		{ name: 'border_width', light: 'var(--border_width_2)' },
		{ name: 'shadow_alpha_scale', light: '0' },
		// links are underlined at rest, never marked by color alone
		{ name: 'text_decoration', light: 'underline' },
		// a focus ring too wide to miss, set off from the control
		{ name: 'outline_width_focus', light: 'var(--border_width_4)' },
		{ name: 'outline_offset', light: '2px' }
	]
};
