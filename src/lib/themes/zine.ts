import type { Theme } from '../variable.ts';

/**
 * An exemplar theme: the photocopied zine. Structure comes from line and
 * weight alone, since that is all a photocopier reproduces - paper white and
 * toner black with no gray between them, thick opaque borders, square corners,
 * no shadows, heavy grotesque headings set tight, links marked by an
 * underline. The three shortest duration tokens are zero, since print
 * doesn't ease. The palette keeps its full chroma, the spot color run over
 * the black plate.
 *
 * Dual-scheme: the dark appearance is the same page run as a negative, on a
 * near-black ground that stays inside the contrast modifiers' range, so high
 * contrast still deepens it and panels keep a visible fill.
 * Built from levers only - the palette letters keep their default hues.
 */
export const zine_theme: Theme = {
	name: 'zine',
	summary:
		'Stark print for sites that want no decoration: black on white, thick borders, square corners, heavy headings, underlined links - the photocopied zine.',
	variables: [
		// toner has no cast - the neutral drops its tint entirely
		{ name: 'neutral_chroma', light: '0' },
		// paper white and a near-black negative, with the text ramp bent to the
		// same ends - pure black would sit past high contrast's ground and
		// collapse the surface steps
		{ name: 'shade_lightness_00', light: '1', dark: '0.15' },
		{ name: 'text_lightness_curve', light: '0.5', dark: '0.35' },
		// at an extreme ground the default sunken input fill has nowhere to go,
		// so fields are bare ruled boxes on the page
		{ name: 'input_fill', light: 'transparent' },
		// line carries the structure: heavier, opaque, high-contrast rules
		{ name: 'border_width', light: 'var(--border_width_2)' },
		{ name: 'border_color', light: 'var(--text_60)' },
		// sharp: one knob zeroes every radius tier
		{ name: 'radius_scale', light: '0' },
		// flat: one knob zeroes the whole alpha ramp, button shadows included
		{ name: 'shadow_alpha_scale', light: '0' },
		// heavy grotesque headings - the sans stack, because the default serif
		// stack has no weight past bold for the flattened ladder to reach
		{ name: 'heading_font_family', light: 'var(--font_family_sans)' },
		{ name: 'heading_font_weight', light: '900' },
		// heavy display type sets tight
		{ name: 'heading_letter_spacing', light: '-0.02em' },
		// headlines shout: the type scale opens up, body text stays where it is
		{ name: 'type_scale_ratio', light: '1.33' },
		// links are underlined at rest: ink is the only way to mark one
		{ name: 'text_decoration', light: 'underline' },
		// print doesn't ease - the three shortest duration tokens zero out, for
		// the transitions a consumer times with them, while the longer tiers
		// keep their timing
		{ name: 'duration_1', light: '0s' },
		{ name: 'duration_2', light: '0s' },
		{ name: 'duration_3', light: '0s' }
	]
};
