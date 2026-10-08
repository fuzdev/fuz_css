import type { Theme } from '../variable.ts';
import { render_shadow_css } from '../shadow_css.ts';

/**
 * An exemplar theme: the river pebble. Structure comes from depth and
 * softness - round corners, controls that sit raised on a soft drop shadow
 * and press inward, panels that lift a little off the page, and generous
 * spacing. A cool gray whisper in the neutral and one sans family at a
 * semibold heading weight. The two shortest duration tokens stretch a touch,
 * for the transitions a consumer times with them.
 *
 * Dual-scheme: in dark the drop falls into the `shadow_color_shroud` black
 * while the top edge catches a little light. Built from levers only - the
 * palette letters keep their default hues, and nothing is pushed past the
 * gamut caps.
 */
export const pebble_theme: Theme = {
	name: 'pebble',
	variables: [
		// cool stone: the neutral binds to the blue slot at a whisper
		{ name: 'hue_neutral', light: 'var(--hue_a)' },
		{ name: 'neutral_chroma', light: '0.012', dark: '0.016' },
		// worn round, and deeper than the default (the alpha steps below stay
		// under the point where this scale would saturate them)
		{ name: 'radius_scale', light: '1.5' },
		{ name: 'shadow_alpha_scale', light: '1.3' },
		// raised controls: a drop shadow at rest that grows on hover and turns
		// inward when pressed
		{
			name: 'button_shadow',
			light: render_shadow_css('shadow_bottom', 'sm', 'umbra', '30'),
			dark: [
				render_shadow_css('shadow_bottom', 'sm', 'shroud', '50'),
				render_shadow_css('shadow_inset_top', 'xs', 'umbra', '20')
			].join(', ')
		},
		{
			name: 'button_shadow_hover',
			light: render_shadow_css('shadow_bottom', 'md', 'umbra', '40'),
			dark: [
				render_shadow_css('shadow_bottom', 'md', 'shroud', '60'),
				render_shadow_css('shadow_inset_top', 'xs', 'umbra', '30')
			].join(', ')
		},
		{
			name: 'button_shadow_active',
			light: render_shadow_css('shadow_inset_top', 'sm', 'umbra', '40'),
			dark: render_shadow_css('shadow_inset_top', 'sm', 'shroud', '50')
		},
		// embedded panels lift a little too, so depth separates surfaces as well
		// as controls
		{
			name: 'panel_shadow',
			light: render_shadow_css('shadow_bottom', 'xs', 'umbra', '20'),
			dark: render_shadow_css('shadow_bottom', 'sm', 'shroud', '40')
		},
		// airy
		{ name: 'space_scale', light: '1.15' },
		// one sans family, headings at a single semibold weight
		{ name: 'heading_font_family', light: 'var(--font_family_sans)' },
		{ name: 'heading_font_weight', light: '600' },
		// unhurried: the two shortest duration tokens stretch a little
		{ name: 'duration_1', light: '0.12s' },
		{ name: 'duration_2', light: '0.28s' }
	]
};
