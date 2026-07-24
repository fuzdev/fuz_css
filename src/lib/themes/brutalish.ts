import type { Theme } from '../theme.ts';

/**
 * An era exemplar theme riffing on brutalism — brutal-ish: raw concrete
 * surfaces with punchy saturated accents, sharp, flat, border-forward —
 * built from levers only, the palette letters keep their default hues. The
 * neutral collapses to a concrete whisper while the palette keeps real
 * color, so statuses and accents punch against the raw ground; shape and
 * depth flatten to single scale knobs; borders carry the structure;
 * headings go display-heavy through the flattened weight ladder.
 *
 * Declared subversions: none.
 */
export const brutalish_theme: Theme = {
	name: 'brutalish',
	variables: [
		// concrete ground, saturated accents: the neutral goes raw while the
		// palette keeps its full default chroma for punch
		{ name: 'neutral_chroma', light: '0.006' },
		// paper white / void black, max contrast
		{ name: 'shade_lightness_00', light: '1', dark: '0' },
		{ name: 'text_lightness_curve', light: '0.5', dark: '0.35' },
		// border-forward: heavier, opaque, high-contrast borders
		{ name: 'border_width', light: 'var(--border_width_2)' },
		{ name: 'border_color', light: 'var(--text_60)' },
		// sharp: one knob zeroes every radius tier
		{ name: 'radius_scale', light: '0' },
		// flat: one knob zeroes the whole alpha ramp, button shadows included
		{ name: 'shadow_alpha_scale', light: '0' },
		// heavy display type: flatten the heading weight ladder to max
		{ name: 'heading_font_weight', light: '900' }
	]
};
