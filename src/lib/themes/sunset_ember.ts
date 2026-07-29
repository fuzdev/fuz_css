import type { Theme } from '../theme.ts';

/**
 * A natural exemplar theme built entirely from semantic bindings and levers -
 * the palette letters keep their default hues. The warm haze comes from a
 * strengthened neutral tint (the neutral's default binding to brown `hue_f`
 * already sits at dusk-warm 60°), the ember accent from binding the accent
 * intent to orange, and the sunset character from vivid chroma pushed past the
 * conservative caps on purpose (this theme exists partly to stress weak-hue
 * gamut clipping). The gradient sky rides the `background_image`
 * decoration hook: gold high to crimson low by day, indigo sinking to
 * crimson dusk by night. Dual-scheme.
 */
export const sunset_ember_theme: Theme = {
	name: 'sunset ember',
	variables: [
		// ember accent: links/focus/selection burn orange
		{ name: 'hue_accent', light: 'var(--hue_h)' },
		// warm haze over every surface (neutral already binds to warm hue_f)
		{ name: 'neutral_chroma', light: '0.028', dark: '0.035' },
		// vivid - deliberately past the caps; the browser clips, lightness holds
		{ name: 'chroma_scale', light: '1.3', dark: '1.2' },
		// gradient sky: kept near the shade_00 lightness so text contrast holds
		{
			name: 'background_image',
			light:
				'linear-gradient(to bottom, oklch(0.96 0.05 var(--hue_e)), oklch(0.975 0.028 var(--hue_h)) 45%, oklch(0.965 0.035 var(--hue_c)))',
			dark: 'linear-gradient(to bottom, oklch(0.23 0.045 var(--hue_d)), oklch(0.19 0.04 var(--hue_c)) 55%, oklch(0.16 0.045 var(--hue_c)))'
		}
	]
};
