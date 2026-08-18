/**
 * The variable vocabulary: which variants each style-variable family has, and
 * the fitted values its ladder steps through.
 *
 * Variant lists name the steps (`space_variants`, `numeric_scale_variants`);
 * the tables beside them hold what those steps are worth, keyed by variant and
 * unitless - the emitters in `variables.ts` add the unit and any `calc()`
 * wrapper, so one table serves both the CSS and anything that wants the
 * numbers. Colors are the exception: their values are derived rather than
 * fitted per step, and live in `ramps.ts`.
 *
 * @module
 */

import type { ArrayElement } from '@fuzdev/fuz_util/types.ts';

export type SizeVariant = ArrayElement<typeof font_size_variants>;
export const font_size_variants = [
	'xs',
	'sm',
	'md',
	'lg',
	'xl',
	'xl2',
	'xl3',
	'xl4',
	'xl5',
	'xl6',
	'xl7',
	'xl8',
	'xl9'
] as const;

export const font_size_names = font_size_variants.map((s) => 'font_size_' + s);

/** Font sizes in rem, stepping by roughly sqrt(golden ratio) and rounded. */
export const FONT_SIZES: Record<SizeVariant, number> = {
	xs: 1,
	sm: 1.3,
	md: 1.6,
	lg: 2.04,
	xl: 2.59,
	xl2: 3.29,
	xl3: 4.19,
	xl4: 5.33,
	xl5: 6.78,
	xl6: 8.62,
	xl7: 10.97,
	xl8: 13.95,
	xl9: 17.74
};

export type FontFamilyVariant = ArrayElement<typeof font_family_variants>;
export const font_family_variants = [
	'font_family_sans',
	'font_family_serif',
	'font_family_mono'
] as const;

/**
 * The standard numeric scale used across multiple variable families.
 * Provides 13 steps from 00 (surface/subtle) to 100 (contrast/bold).
 */
export type NumericScaleVariant = ArrayElement<typeof numeric_scale_variants>;
export const numeric_scale_variants = [
	'00',
	'05',
	'10',
	'20',
	'30',
	'40',
	'50',
	'60',
	'70',
	'80',
	'90',
	'95',
	'100'
] as const;

/**
 * Numeric scale with min/max extremes for scales that need untinted endpoints.
 * Used by text and shade scales where min/max represent pure black/white values.
 */
export type NumericScaleWithExtremesVariant = ArrayElement<typeof numeric_scale_with_extremes>;
export const numeric_scale_with_extremes = ['min', ...numeric_scale_variants, 'max'] as const;

export type TextVariant = NumericScaleVariant;
export const text_variants = numeric_scale_variants;

/** Full text scale including min/max extremes for knockout text. */
export type TextScaleVariant = NumericScaleWithExtremesVariant;
export const text_scale_variants = numeric_scale_with_extremes;

export type ShadeVariant = NumericScaleVariant;
export const shade_variants = numeric_scale_variants;

/** Full shade scale including min/max extremes for untinted surfaces. */
export type ShadeScaleVariant = NumericScaleWithExtremesVariant;
export const shade_scale_variants = numeric_scale_with_extremes;

export type SpaceVariant = ArrayElement<typeof space_variants>;
export const space_variants = [
	'xs5',
	'xs4',
	'xs3',
	'xs2',
	'xs',
	'sm',
	'md',
	'lg',
	'xl',
	'xl2',
	'xl3',
	'xl4',
	'xl5',
	'xl6',
	'xl7',
	'xl8',
	'xl9',
	'xl10',
	'xl11',
	'xl12',
	'xl13',
	'xl14',
	'xl15'
] as const;

/** Spaces in rem, before the `--scale_factor` multiplier. */
export const SPACE_SIZES: Record<SpaceVariant, number> = {
	xs5: 0.1,
	xs4: 0.2,
	xs3: 0.3,
	xs2: 0.4,
	xs: 0.6,
	sm: 0.8,
	md: 1,
	lg: 1.3,
	xl: 1.6,
	xl2: 2.1,
	xl3: 2.6,
	xl4: 3.3,
	xl5: 4.2,
	xl6: 5.4,
	xl7: 6.9,
	xl8: 8.7,
	xl9: 11.1,
	xl10: 14.1,
	xl11: 17.9,
	xl12: 22.8,
	xl13: 29,
	xl14: 36.9,
	xl15: 47
};

export type DistanceVariant = ArrayElement<typeof distance_variants>;
export const distance_variants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/** Layout distances in px - breakpoint-ish widths, insensitive to font size. */
export const DISTANCES: Record<DistanceVariant, number> = {
	xs: 200,
	sm: 320,
	md: 800,
	lg: 1200,
	xl: 1600
};

export type BorderRadiusVariant = ArrayElement<typeof border_radius_variants>;
export const border_radius_variants = ['xs3', 'xs2', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

/** Border radii in rem, before the `--radius_scale` multiplier. */
export const BORDER_RADII: Record<BorderRadiusVariant, number> = {
	xs3: 0.3,
	xs2: 0.5,
	xs: 0.8,
	sm: 1.3,
	md: 2.1,
	lg: 3.4,
	xl: 5.5
};

export type LineHeightVariant = ArrayElement<typeof line_height_variants>;
export const line_height_variants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export const line_height_names = line_height_variants.map((s) => 'line_height_' + s);

/** Line heights, unitless so they scale with the font size. */
export const LINE_HEIGHTS: Record<LineHeightVariant, number> = {
	xs: 1,
	sm: 1.2,
	md: 1.5,
	lg: 1.8,
	xl: 2.2
};

export const shadow_variant_prefixes = [
	'shadow_',
	'shadow_top_',
	'shadow_bottom_',
	'shadow_inset_',
	'shadow_inset_top_',
	'shadow_inset_bottom_'
] as const;

export type ShadowSizeVariant = ArrayElement<typeof shadow_size_variants>;
export const shadow_size_variants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/**
 * Shadow geometry per size in px. The directional variants sign the offset,
 * and the inset pair signs it the other way, so `top` always names the lit
 * edge; see `shadow_variant_prefixes` for the six shapes each size emits.
 */
export const SHADOW_GEOMETRY: Record<
	ShadowSizeVariant,
	{ offset: number; blur: number; spread: number }
> = {
	xs: { offset: 1, blur: 3, spread: 0 },
	sm: { offset: 1.5, blur: 4, spread: 0 },
	md: { offset: 2.5, blur: 6, spread: 0 },
	lg: { offset: 3.5, blur: 10, spread: 0 },
	xl: { offset: 5, blur: 20, spread: 1 }
};

export type ShadowSemanticValue = ArrayElement<typeof shadow_semantic_values>;
export const shadow_semantic_values = ['umbra', 'highlight', 'glow', 'shroud'] as const;

export type IconSizeVariant = ArrayElement<typeof icon_size_variants>;
export const icon_size_variants = ['xs', 'sm', 'md', 'lg', 'xl', 'xl2', 'xl3'] as const;

/**
 * Icon sizes in px, decreasing by the golden ratio and rounded to the nearest
 * pixel. Deliberately insensitive to font size, hence px rather than rem.
 */
export const ICON_SIZES: Record<IconSizeVariant, number> = {
	xs: 18,
	sm: 32,
	md: 48,
	lg: 80,
	xl: 128,
	xl2: 192,
	xl3: 256
};

export type PaletteVariant = ArrayElement<typeof palette_variants>;
export const palette_variants = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] as const;

/**
 * The semantic color intents that derive full scales through the shared
 * ramps. The neutral is also an intent (`--hue_neutral`) but is absent here
 * because its scales are `shade_*` and `text_*` rather than a
 * `neutral_00` through `neutral_100` family.
 */
export type IntentVariant = ArrayElement<typeof intent_variants>;
export const intent_variants = ['accent', 'positive', 'negative', 'caution', 'info'] as const;

/**
 * Letter glosses: each palette slot's default color plus its default intent
 * binding where one exists. Display data for docs and the theme editor -
 * themes recolor the slots, so these describe the defaults, not promises.
 * The neutral binds like an intent (`--hue_neutral: var(--hue_f)`) despite
 * being absent from `intent_variants`.
 */
export const palette_glosses: Record<
	PaletteVariant,
	{ color: string; binding?: IntentVariant | 'neutral' }
> = {
	a: { color: 'blue', binding: 'accent' },
	b: { color: 'green', binding: 'positive' },
	c: { color: 'red', binding: 'negative' },
	d: { color: 'purple' },
	e: { color: 'yellow' },
	f: { color: 'brown', binding: 'neutral' },
	g: { color: 'pink' },
	h: { color: 'orange', binding: 'caution' },
	i: { color: 'cyan', binding: 'info' },
	j: { color: 'teal' }
};

/**
 * Formats a letter's gloss for display: the color name plus the default
 * intent binding where one exists, e.g. `blue · default accent`. Shared by
 * display surfaces so the phrasing can't drift.
 */
export const format_palette_gloss = (letter: PaletteVariant): string => {
	const gloss = palette_glosses[letter];
	return gloss.binding ? `${gloss.color} · default ${gloss.binding}` : gloss.color;
};

export type IntensityVariant = NumericScaleVariant;
export const intensity_variants = numeric_scale_variants;

export type BorderWidthVariant = ArrayElement<typeof border_width_variants>;
export const border_width_variants = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type AlphaVariant = NumericScaleVariant;
export const alpha_variants = numeric_scale_variants;

export type DarkenLightenVariant = ArrayElement<typeof darken_lighten_variants>;
export const darken_lighten_variants = alpha_variants;

/**
 * The perceptual alpha curve the `darken_*`/`lighten_*` overlays share: the
 * hex alpha byte each stop renders with, and the percentage it works out to.
 */
export const OVERLAY_ALPHAS: Record<NumericScaleVariant, { hex: string; percent: string }> = {
	'00': { hex: '00', percent: '0%' },
	'05': { hex: '08', percent: '3%' },
	'10': { hex: '0f', percent: '6%' },
	'20': { hex: '1f', percent: '12%' },
	'30': { hex: '36', percent: '21%' },
	'40': { hex: '52', percent: '32%' },
	'50': { hex: '73', percent: '45%' },
	'60': { hex: 'a6', percent: '65%' },
	'70': { hex: 'cc', percent: '80%' },
	'80': { hex: 'e3', percent: '89%' },
	'90': { hex: 'f5', percent: '96%' },
	'95': { hex: 'fa', percent: '98%' },
	'100': { hex: 'ff', percent: '100%' }
};

export type ShadowAlphaVariant = ArrayElement<typeof shadow_alpha_variants>;
export const shadow_alpha_variants = alpha_variants;

/**
 * Shadow alphas in %, per color scheme, before the `--shadow_alpha_scale`
 * multiplier. A perceptually-uniform curve - small gaps at the low end where
 * subtle changes are perceptible, large at the high end - boosted at the low
 * end in dark mode, where shadows read weakly against dark backgrounds.
 */
export const SHADOW_ALPHAS: Record<NumericScaleVariant, { light: number; dark: number }> = {
	'00': { light: 0, dark: 0 },
	'05': { light: 6, dark: 13 },
	'10': { light: 10, dark: 19 },
	'20': { light: 16, dark: 27 },
	'30': { light: 25, dark: 37 },
	'40': { light: 36, dark: 47 },
	'50': { light: 50, dark: 59 },
	'60': { light: 64, dark: 71 },
	'70': { light: 77, dark: 83 },
	'80': { light: 88, dark: 91 },
	'90': { light: 96, dark: 98 },
	'95': { light: 99, dark: 100 },
	'100': { light: 100, dark: 100 }
};

export type ColorSchemeVariant = ArrayElement<typeof color_scheme_variants>;
export const color_scheme_variants = ['light', 'dark'] as const;

export type OutlineWidthVariant = ArrayElement<typeof outline_width_variants>;
export const outline_width_variants = ['focus', 'active'] as const;

export type DurationVariant = ArrayElement<typeof duration_variants>;
export const duration_variants = [1, 2, 3, 4, 5, 6] as const;

/** Transition durations in seconds, from a UI beat to a slow ambient sweep. */
export const DURATIONS: Record<DurationVariant, number> = {
	1: 0.08,
	2: 0.2,
	3: 0.5,
	4: 1,
	5: 1.5,
	6: 3
};
