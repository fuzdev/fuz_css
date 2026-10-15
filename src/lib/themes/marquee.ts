import type { Theme } from '../variable.ts';

/**
 * An exemplar theme: the theater marquee at night. Color is the content -
 * a magenta accent over a deep purple-cast dark, shadows turned to cyan and
 * magenta glows, corners rounded onto a common floor like tube
 * bends. Vivid past the gamut caps on purpose - lightness holds through the
 * clipping, so `check_theme` reports gamut failures and baking it through the
 * build-time `theme` option warns with them. Dark-only via the `scheme`
 * stance: a lit sign has no daytime appearance, so it renders through
 * `resolve_theme_stance`, which computes the stance mirror beside it.
 *
 * The one palette-tier exemplar: it rotates the yellow slot to the amber of
 * incandescent bulbs, so a letter hue itself moves - the move that keeps a
 * theme out of the semantic-tier registry.
 */
export const marquee_theme: Theme = {
	name: 'marquee',
	summary:
		'Vivid for events and nightlife: a magenta accent on purple-cast surfaces, colored glows, rounded corners, color pushed past the gamut caps - the marquee lit for opening night. Dark only.',
	scheme: 'dark',
	variables: [
		// night cast: the neutral binds to the purple slot
		{ name: 'hue_neutral', base: 'var(--hue_d)' },
		{ name: 'neutral_chroma', base: '0.09' },
		// the night itself is purple, not only the surfaces raised off it
		{ name: 'shade_chroma_00', base: '0.03' },
		// magenta accent: links/focus/selection glow hot pink
		{ name: 'hue_accent', base: 'var(--hue_g)' },
		// vivid, knowingly clipping the weak hues
		{ name: 'chroma_scale', base: '1.25' },
		// palette tier: the yellow slot turns to bulb amber - the letter hue
		// itself moves
		{ name: 'hue_e', base: '78' },
		// glow depth: shadows are cyan/magenta halos instead of neutral light
		{ name: 'shadow_color_umbra', base: 'oklch(0.7 0.15 var(--hue_i))' },
		{ name: 'shadow_color_glow', base: 'oklch(0.72 0.18 var(--hue_accent))' },
		// the dialog backdrop dims to night-purple instead of neutral black
		{ name: 'backdrop_color', base: 'oklch(0.15 0.05 var(--hue_neutral) / 60%)' },
		// tube bends: the small tiers lift onto a rounded floor and the ladder
		// above it compresses to about half, so no corner is sharp
		{ name: 'border_radius_min', base: '0.5rem' },
		{ name: 'radius_scale', base: '0.54' }
	]
};
