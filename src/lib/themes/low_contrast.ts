import type {Theme} from '../theme.ts';

/**
 * Gentle contrast: a softer neutral tint and compressed surface range.
 */
export const low_contrast_theme: Theme = {
	name: 'low contrast',
	variables: [
		{name: 'neutral_chroma', light: '0.017', dark: '0.018'},
		// compress the shade ramp from the page-background end
		{name: 'shade_lightness_00', light: '0.89', dark: '0.3'},
	],
};
