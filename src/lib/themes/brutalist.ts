import type {Theme} from '../theme.ts';

/**
 * An era exemplar theme: concrete, sharp, flat, border-forward — built from
 * levers only, the palette letters keep their default hues. Chroma collapses
 * to a whisper (raw concrete rather than pure gray, so statuses stay faintly
 * legible); shape and depth flatten; borders carry the structure.
 *
 * Declared subversions: status colors are nearly (not fully) desaturated —
 * semantics mostly carry through text and weight.
 *
 * The signature move it can't make yet: heavy display type. Font-weight
 * knobs don't exist (`--font_weight`, `--heading_font_weight`), so headings
 * stay at browser default weight (probe evidence).
 */
export const brutalist_theme: Theme = {
	name: 'brutalist',
	variables: [
		// concrete: collapse chroma to a whisper rather than pure gray
		{name: 'chroma_scale', light: '0.15'},
		{name: 'neutral_chroma', light: '0.006'},
		// paper white / void black, max contrast
		{name: 'shade_lightness_00', light: '1', dark: '0'},
		{name: 'text_lightness_curve', light: '0.5', dark: '0.35'},
		// border-forward: heavier, opaque, high-contrast borders
		{name: 'border_width', light: 'var(--border_width_2)'},
		{name: 'border_color', light: 'var(--text_60)'},
		// sharp: no radius-scale knob exists yet, so the tokens pin (probe evidence)
		{name: 'border_radius_xs3', light: '0'},
		{name: 'border_radius_xs2', light: '0'},
		{name: 'border_radius_xs', light: '0'},
		{name: 'border_radius_sm', light: '0'},
		{name: 'border_radius_md', light: '0'},
		{name: 'border_radius_lg', light: '0'},
		{name: 'border_radius_xl', light: '0'},
		// flat: no shadow-alpha scale knob exists yet, so the ramp zeroes (probe evidence)
		{name: 'shadow_alpha_05', light: '0%'},
		{name: 'shadow_alpha_10', light: '0%'},
		{name: 'shadow_alpha_20', light: '0%'},
		{name: 'shadow_alpha_30', light: '0%'},
		{name: 'shadow_alpha_40', light: '0%'},
		{name: 'shadow_alpha_50', light: '0%'},
		{name: 'shadow_alpha_60', light: '0%'},
		{name: 'shadow_alpha_70', light: '0%'},
		{name: 'shadow_alpha_80', light: '0%'},
		{name: 'shadow_alpha_90', light: '0%'},
		{name: 'shadow_alpha_95', light: '0%'},
		{name: 'shadow_alpha_100', light: '0%'},
		{name: 'button_shadow', light: 'none'},
		{name: 'button_shadow_hover', light: 'none'},
		{name: 'button_shadow_active', light: 'none'},
	],
};
