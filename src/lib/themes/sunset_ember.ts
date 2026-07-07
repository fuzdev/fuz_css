import type {Theme} from '../theme.ts';

/**
 * A natural exemplar theme built entirely from semantic bindings and levers —
 * the palette letters keep their default hues. The warm haze comes from a
 * strengthened neutral tint (the neutral's default binding to brown `hue_f`
 * already sits at dusk-warm 60°), the ember accent from binding the accent
 * role to orange, and the sunset character from vivid chroma pushed past the
 * conservative caps on purpose (this theme exists partly to stress weak-hue
 * gamut clipping) with hue-shifted ramps so light ends glow gold and dark
 * ends sink toward crimson. Dual-scheme.
 *
 * Declared subversions: none.
 *
 * The signature move it can't make yet: a gradient sky. `body` background
 * and fill gradients need decoration hooks or the theme CSS block, so the
 * knob-only version leans on hue-shift and chroma instead (probe evidence).
 */
export const sunset_ember_theme: Theme = {
	name: 'sunset ember',
	variables: [
		// ember accent: links/focus/selection burn orange
		{name: 'hue_accent', light: 'var(--hue_h)'},
		// warm haze over every surface (neutral already binds to warm hue_f)
		{name: 'neutral_chroma', light: '0.028', dark: '0.035'},
		// vivid — deliberately past the caps; the browser clips, lightness holds
		{name: 'chroma_scale', light: '1.3', dark: '1.2'},
		// light ends gold, dark ends toward crimson dusk
		{name: 'hue_shift', light: '16'},
	],
};
