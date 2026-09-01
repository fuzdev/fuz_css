import type { Theme } from '../variable.ts';
import { resolve_theme_stance } from '../theme_stance.ts';

/**
 * An era exemplar theme: 80s neon signage at night. Magenta accent glow over
 * a deep purple-cast dark world, every shadow a colored halo instead of
 * neutral light, capsule-round corners like tube bends. Vivid past the gamut
 * caps on purpose - lightness holds through the clipping. Dark-only via the
 * `scheme` stance.
 *
 * The one palette-tier exemplar: it rotates the yellow slot toward
 * sodium-vapor warmth, so the letter hues themselves move - the move that
 * keeps a theme out of the semantic-tier registry. (The rotation is gentle
 * enough that `compile_theme` finds no cap drift worth emitting.)
 */
const authored: Theme = {
	name: 'neon',
	scheme: 'dark',
	variables: [
		// night cast: the neutral binds to the purple slot
		{ name: 'hue_neutral', light: 'var(--hue_d)' },
		{ name: 'neutral_chroma', light: '0.09' },
		// magenta accent: links/focus/selection glow hot pink
		{ name: 'hue_accent', light: 'var(--hue_g)' },
		// vivid, knowingly clipping the weak hues
		{ name: 'chroma_scale', light: '1.25' },
		// palette tier: sodium-vapor yellow - the letter hue itself moves
		{ name: 'hue_e', light: '90' },
		// glow depth: shadows are cyan/magenta halos instead of neutral light
		{ name: 'shadow_color_umbra', light: 'oklch(0.7 0.15 var(--hue_i))' },
		{ name: 'shadow_color_glow', light: 'oklch(0.72 0.18 var(--hue_accent))' },
		{ name: 'shadow_color_highlight', light: '#000' },
		// the dialog backdrop dims to night-purple instead of neutral black
		{ name: 'backdrop_color', light: 'oklch(0.15 0.05 var(--hue_neutral) / 60%)' },
		// capsule corners: the tier ladder lifts onto a rounded floor, which a
		// uniform radius_scale can't express, so the tokens pin (sanctioned escape)
		{ name: 'border_radius_xs3', light: '0.5rem' },
		{ name: 'border_radius_xs2', light: '0.5rem' },
		{ name: 'border_radius_xs', light: '0.5rem' },
		{ name: 'border_radius_sm', light: '0.7rem' },
		{ name: 'border_radius_md', light: '0.9rem' },
		{ name: 'border_radius_lg', light: '1.2rem' },
		{ name: 'border_radius_xl', light: '1.6rem' }
	]
};

/**
 * Resolved at module scope so the stance mirror rides this module's chunk
 * rather than every consumer's theme path - see `theme_stance.ts`.
 */
export const neon_theme: Theme = resolve_theme_stance(authored);
