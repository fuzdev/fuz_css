import type {StyleVariable} from '../variable.ts';

/**
 * Mirrors the dark scheme's ramp knobs into the light slots so a theme
 * renders dark in both color schemes.
 *
 * This is the current cost of a "dark-only" scheme stance — twelve knob
 * mirrors — because the stance isn't a first-class theme concept yet. The
 * gamut caps baked into the chroma stops stay scheme-specific, so the light
 * scheme of a dark-only theme gets the (more conservative) light caps at the
 * ramp extremes.
 */
export const dark_only_variables: Array<StyleVariable> = [
	{name: 'palette_lightness_00', light: '0.147'},
	{name: 'palette_lightness_100', light: '0.971'},
	{name: 'palette_lightness_curve', light: '0.76'},
	{name: 'shade_lightness_00', light: '0.171'},
	{name: 'shade_lightness_100', light: '0.97'},
	{name: 'shade_lightness_curve', light: '0.92'},
	{name: 'text_lightness_00', light: '0.146'},
	{name: 'text_lightness_100', light: '0.97'},
	{name: 'text_lightness_curve', light: '0.87'},
	{name: 'palette_chroma_min', light: '0.044'},
	{name: 'palette_chroma_max', light: '0.136'},
	{name: 'palette_chroma_curve', light: '3'},
];
