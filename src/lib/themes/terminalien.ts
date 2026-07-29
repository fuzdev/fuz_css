import type { Theme } from '../theme.ts';
import { resolve_theme_stance } from '../theme_stance.ts';

/**
 * A dense terminal theme with an alien cast: dark, monospace, sharp-cornered,
 * flat-depth terminal chrome carrying a green-phosphor tint in the surfaces
 * and accent, but the palette slots keep their own hues so status colors
 * still read - negative stays red, caution amber, info cyan. Compact spacing
 * and tightened leading give it terminal density. Dark-only via the `scheme`
 * stance.
 */
const authored: Theme = {
	name: 'terminalien',
	scheme: 'dark',
	variables: [
		// green-phosphor surfaces and text - the terminal cast, kept low-chroma so
		// the palette colors read over it
		{ name: 'hue_neutral', light: 'var(--hue_b)' },
		{ name: 'neutral_chroma', light: '0.05' },
		// links, focus, selection glow phosphor green
		{ name: 'hue_accent', light: 'var(--hue_b)' },
		// mono type everywhere
		{ name: 'font_family_sans', light: 'var(--font_family_mono)' },
		// sharp: one knob zeroes every radius tier
		{ name: 'radius_scale', light: '0' },
		// flat: one knob zeroes the whole alpha ramp, button shadows included
		{ name: 'shadow_alpha_scale', light: '0' },
		// terminal density: compact spacing plus tightened leading (leading is
		// deliberately decoupled from scale_factor - these pins are the theme's own)
		{ name: 'scale_factor', light: '0.85' },
		{ name: 'line_height_md', light: '1.4' },
		{ name: 'line_height_lg', light: '1.6' },
		{ name: 'line_height_xl', light: '2' }
	]
};

/**
 * Resolved at module scope so the stance mirror rides this module's chunk
 * rather than every consumer's theme path - see `theme_stance.ts`.
 */
export const terminalien_theme: Theme = resolve_theme_stance(authored);
