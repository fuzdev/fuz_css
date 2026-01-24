import type {ArrayElement} from '@fuzdev/fuz_util/types.js';

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
	'xl9',
] as const;

export const font_size_names = font_size_variants.map((s) => 'font_size_' + s);

export type FontFamilyVariant = ArrayElement<typeof font_family_variants>;
export const font_family_variants = [
	'font_family_sans',
	'font_family_serif',
	'font_family_mono',
] as const;

export type TextVariant = ArrayElement<typeof text_variants>;
export const text_variants = [
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
	'100',
] as const;

export type ShadeVariant = ArrayElement<typeof shade_variants>;
export const shade_variants = [
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
	'100',
] as const;

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
	'xl15',
] as const;

export type DistanceVariant = ArrayElement<typeof distance_variants>;
export const distance_variants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export type BorderRadiusVariant = ArrayElement<typeof border_radius_variants>;
export const border_radius_variants = ['xs3', 'xs2', 'xs', 'sm', 'md', 'lg', 'xl'] as const;

export type LineHeightVariant = ArrayElement<typeof line_height_variants>;
export const line_height_variants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export const line_height_names = line_height_variants.map((s) => 'line_height_' + s);

export const shadow_variant_prefixes = [
	'shadow_',
	'shadow_top_',
	'shadow_bottom_',
	'shadow_inset_',
	'shadow_inset_top_',
	'shadow_inset_bottom_',
] as const;

export type ShadowSizeVariant = ArrayElement<typeof shadow_size_variants>;
export const shadow_size_variants = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

export type ShadowAlphaVariant = ArrayElement<typeof shadow_alpha_variants>;
export const shadow_alpha_variants = [1, 2, 3, 4, 5] as const;

export type ShadowSemanticValue = ArrayElement<typeof shadow_semantic_values>;
export const shadow_semantic_values = ['highlight', 'glow', 'shroud'] as const;

export type IconSizeVariant = ArrayElement<typeof icon_size_variants>;
export const icon_size_variants = ['xs', 'sm', 'md', 'lg', 'xl', 'xl2', 'xl3'] as const;

// TODO maybe put this inline? factor out the pieces with `icon_size_variants`?
export const icon_sizes = {
	icon_size_xs: '18px',
	icon_size_sm: '32px',
	icon_size_md: '48px',
	icon_size_lg: '80px',
	icon_size_xl: '128px',
	icon_size_xl2: '192px',
	icon_size_xl3: '256px',
};

export type ColorVariant = ArrayElement<typeof color_variants>;
export const color_variants = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] as const;

export type IntensityVariant = ArrayElement<typeof intensity_variants>;
export const intensity_variants = [
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
	'100',
] as const;

export type BorderWidthVariant = ArrayElement<typeof border_width_variants>;
export const border_width_variants = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type AlphaVariant = ArrayElement<typeof alpha_variants>;
export const alpha_variants = [
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
] as const;

export type DarkenLightenVariant = ArrayElement<typeof darken_lighten_variants>;
export const darken_lighten_variants = alpha_variants;

export type ColorSchemeVariant = ArrayElement<typeof color_scheme_variants>;
export const color_scheme_variants = ['light', 'dark'] as const;

export type OutlineWidthVariant = ArrayElement<typeof outline_width_variants>;
export const outline_width_variants = ['focus', 'active'] as const;

/**
 * Maximum value for CSS z-index property (32-bit signed integer max).
 */
export const Z_INDEX_MAX = 2_147_483_647;
