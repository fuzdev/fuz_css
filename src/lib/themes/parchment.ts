import type { Theme } from '../theme.ts';
import { resolve_theme_stance } from '../theme_stance.ts';

/**
 * An era exemplar theme: the illuminated manuscript. Warm parchment surfaces
 * (the neutral's default brown binding, tinted up), rubrication-red accents
 * the way scribes marked emphasis, serif body text, and double-ruled frames.
 * Chroma eases below 1 for aged pigment - the one exemplar that turns the
 * headline chroma lever down instead of up. Light-only via the `scheme`
 * stance - the sole light-stance exemplar, mirroring the dark-stanced pair.
 */
const authored: Theme = {
	name: 'parchment',
	scheme: 'light',
	variables: [
		// warm parchment: the neutral keeps its brown binding, tinted stronger
		{ name: 'neutral_chroma', light: '0.03' },
		// rubrication: links/focus/selection mark themselves in red
		{ name: 'hue_accent', light: 'var(--hue_c)' },
		// aged pigment - inks fade, so the whole palette eases down
		{ name: 'chroma_scale', light: '0.85' },
		// serif body text; headings are already serif by default
		{ name: 'font_family_sans', light: 'var(--font_family_serif)' },
		// double-ruled frames, wide enough for the two lines to render
		{ name: 'border_style', light: 'double' },
		{ name: 'border_width', light: 'var(--border_width_3)' },
		// rectilinear but not brutal - the page corner, softened a hair
		{ name: 'radius_scale', light: '0.5' }
	]
};

/**
 * Resolved at module scope so the stance mirror rides this module's chunk
 * rather than every consumer's theme path - see `theme_stance.ts`.
 */
export const parchment_theme: Theme = resolve_theme_stance(authored);
