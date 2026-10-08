import type { Theme } from '../variable.ts';
import { resolve_theme_stance } from '../theme_stance.ts';

/**
 * An exemplar theme: the theater marquee at night. Color is the content -
 * a magenta accent over a deep purple-cast dark, shadows turned to cyan and
 * magenta glows, corners rounded onto a common floor like tube
 * bends. Vivid past the gamut caps on purpose - lightness holds through the
 * clipping. Dark-only via the `scheme` stance: a lit sign has no daytime
 * appearance.
 *
 * The one palette-tier exemplar: it rotates the yellow slot to the amber of
 * incandescent bulbs, so a letter hue itself moves - the move that keeps a
 * theme out of the semantic-tier registry.
 */
const authored: Theme = {
	name: 'marquee',
	summary:
		'Vivid for events and nightlife: a magenta accent on purple-cast surfaces, colored glows, rounded corners, color pushed past the gamut caps - the theater marquee. Dark only.',
	scheme: 'dark',
	variables: [
		// night cast: the neutral binds to the purple slot
		{ name: 'hue_neutral', light: 'var(--hue_d)' },
		{ name: 'neutral_chroma', light: '0.09' },
		// the night itself is purple, not only the surfaces raised off it
		{ name: 'shade_chroma_00', light: '0.03' },
		// magenta accent: links/focus/selection glow hot pink
		{ name: 'hue_accent', light: 'var(--hue_g)' },
		// vivid, knowingly clipping the weak hues
		{ name: 'chroma_scale', light: '1.25' },
		// palette tier: the yellow slot turns to bulb amber - the letter hue
		// itself moves
		{ name: 'hue_e', light: '78' },
		// glow depth: shadows are cyan/magenta halos instead of neutral light
		{ name: 'shadow_color_umbra', light: 'oklch(0.7 0.15 var(--hue_i))' },
		{ name: 'shadow_color_glow', light: 'oklch(0.72 0.18 var(--hue_accent))' },
		// the dialog backdrop dims to night-purple instead of neutral black
		{ name: 'backdrop_color', light: 'oklch(0.15 0.05 var(--hue_neutral) / 60%)' },
		// tube bends: the small tiers lift onto a rounded floor and the ladder
		// above it compresses to about half, so no corner is sharp
		{ name: 'border_radius_min', light: '0.5rem' },
		{ name: 'radius_scale', light: '0.54' }
	]
};

/**
 * Resolved at module scope so the stance mirror rides this module's chunk
 * rather than every consumer's theme path - see `theme_stance.ts`.
 */
export const marquee_theme: Theme = resolve_theme_stance(authored);
