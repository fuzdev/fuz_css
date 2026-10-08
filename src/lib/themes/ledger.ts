import type { Theme } from '../variable.ts';

/**
 * The working theme: the ledger. For tools used all day - a cool gray
 * whisper in the neutral, color eased down so status reads without shouting,
 * compact spacing and leading (visibly tighter than the base, so the
 * registry's two entries read as two choices), one sans family, a flatter type scale,
 * restrained corners and depth, and the two shortest duration tokens
 * tightened. Plain on purpose: no decoration, no clipped gamut, the default
 * accent.
 *
 * Dual-scheme and semantic-tier - it moves levers only, so the palette
 * letters keep their hues and it sits in the registry beside the base theme.
 */
export const ledger_theme: Theme = {
	name: 'ledger',
	summary:
		'For apps and tools used all day: calmer color, tighter spacing, one sans family, restrained corners and shadows.',
	variables: [
		// cool gray: the neutral binds to the blue slot at a whisper
		{ name: 'hue_neutral', light: 'var(--hue_a)' },
		{ name: 'neutral_chroma', light: '0.008', dark: '0.012' },
		// color steps back so statuses read as signal
		{ name: 'chroma_scale', light: '0.85' },
		// compact: spacing and leading both tighten (leading is deliberately
		// decoupled from space_scale - the pin is the theme's own)
		{ name: 'space_scale', light: '0.85' },
		{ name: 'line_height_md', light: '1.4' },
		// restrained shape and depth
		{ name: 'radius_scale', light: '0.5' },
		{ name: 'shadow_alpha_scale', light: '0.5' },
		// one sans family, headings at a single semibold weight
		{ name: 'heading_font_family', light: 'var(--font_family_sans)' },
		{ name: 'heading_font_weight', light: '600' },
		// a flatter type scale: headings label sections, they don't announce them
		{ name: 'type_scale_ratio', light: '1.2' },
		// quick: the two shortest duration tokens tighten
		{ name: 'duration_1', light: '0.05s' },
		{ name: 'duration_2', light: '0.12s' }
	]
};
