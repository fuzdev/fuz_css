import type { Theme } from '../variable.ts';
import { resolve_theme_stance } from '../theme_stance.ts';
import { render_shadow_css } from '../shadow_css.ts';

/**
 * An exemplar theme: the green-phosphor CRT terminal. Structure comes from
 * packing - monospace, sharp-cornered, spacing and leading packed well past
 * the compact themes, and a type scale flattened nearly to one size, with
 * bold headings carrying the hierarchy, give it terminal density, and the three
 * shortest duration tokens are zero. The phosphor tint carries the surfaces
 * and accent, but the palette slots keep their own hues so status colors
 * still read - negative stays red, caution amber, info cyan, and positive
 * steps over to teal so a success never reads as a link.
 *
 * The screen emits rather than reflects: the ground is the gray-green of an
 * unlit tube face, lifted off black so a surface can still sink below it,
 * and controls glow where other themes cast shadows. Dark-only via the
 * `scheme` stance: a CRT has no daytime appearance.
 */
const authored: Theme = {
	name: 'phosphor',
	summary:
		'A terminal look for developer tools: monospace, packed tight, sharp-cornered, with controls that glow green on a tube-gray ground - the phosphor CRT. Dark only.',
	scheme: 'dark',
	variables: [
		// green-phosphor surfaces and text
		{ name: 'hue_neutral', light: 'var(--hue_b)' },
		{ name: 'neutral_chroma', light: '0.08' },
		// the unlit tube face: lifted off black, which keeps room on the sunken
		// side of the ground for input wells and darker panels
		{ name: 'shade_lightness_00', light: '0.22' },
		// links, focus, selection glow phosphor green
		{ name: 'hue_accent', light: 'var(--hue_b)' },
		// the accent took the green slot, so positive moves to teal
		{ name: 'hue_positive', light: 'var(--hue_j)' },
		// mono type everywhere - headings carry their own family knob, which
		// defaults to the serif stack, so a terminal has to retarget both
		{ name: 'font_family', light: 'var(--font_family_mono)' },
		{ name: 'heading_font_family', light: 'var(--font_family_mono)' },
		// a terminal has one type size - the scale flattens toward that, and
		// headings carry the hierarchy in weight instead, the way a terminal
		// marks a title in bold
		{ name: 'type_scale_ratio', light: '1.15' },
		{ name: 'heading_font_weight', light: '700' },
		// sharp: one knob zeroes every radius tier
		{ name: 'radius_scale', light: '0' },
		// emissive depth: the shadow colors turn to phosphor light, and controls
		// carry a centered halo that brightens on hover and turns inward when
		// pressed
		{ name: 'shadow_color_umbra', light: 'oklch(0.8 0.12 var(--hue_neutral))' },
		{ name: 'shadow_color_glow', light: 'oklch(0.85 0.14 var(--hue_neutral))' },
		{ name: 'button_shadow', light: render_shadow_css('shadow', 'md', 'glow', '40') },
		{ name: 'button_shadow_hover', light: render_shadow_css('shadow', 'lg', 'glow', '60') },
		{ name: 'button_shadow_active', light: render_shadow_css('shadow_inset', 'md', 'glow', '50') },
		// terminal density: spacing and body leading both packed well past ledger's
		// compact (leading
		// is deliberately decoupled from space_scale - the pin is the theme's own)
		{ name: 'space_scale', light: '0.7' },
		{ name: 'line_height_md', light: '1.25' },
		// instant: terminal chrome doesn't ease - the three shortest duration
		// tokens zero out, for the transitions a consumer times with them, while
		// the longer tiers keep their timing
		{ name: 'duration_1', light: '0s' },
		{ name: 'duration_2', light: '0s' },
		{ name: 'duration_3', light: '0s' }
	]
};

/**
 * Resolved at module scope so the stance mirror rides this module's chunk
 * rather than every consumer's theme path - see `theme_stance.ts`.
 */
export const phosphor_theme: Theme = resolve_theme_stance(authored);
