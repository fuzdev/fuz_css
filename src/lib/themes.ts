import type {Theme} from './theme.js';

export const DEFAULT_THEME: Theme = {
	name: 'base',
	variables: [], // inherits base
};

/**
 * These are super basic proof-of-concept themes.
 */
export const default_themes: Array<Theme> = [
	DEFAULT_THEME,
	{
		name: 'low contrast',
		variables: [
			{name: 'tint_saturation', light: '8%'},
			{
				name: 'shade_00',
				light: 'hsl(var(--tint_hue) var(--tint_saturation) 86%)',
				dark: 'hsl(var(--tint_hue) var(--tint_saturation) 18%)',
			},
		],
	},
	{
		name: 'high contrast',
		variables: [
			{
				name: 'shade_00',
				light: '#fff',
				dark: '#000',
			},
			{
				name: 'text_80',
				light: 'hsl(var(--tint_hue) var(--tint_saturation) 8%)',
				dark: 'hsl(var(--tint_hue) var(--tint_saturation) 90%)',
			},
			{
				name: 'text_70',
				light: 'hsl(var(--tint_hue) var(--tint_saturation) 16%)',
				dark: 'hsl(var(--tint_hue) var(--tint_saturation) 83%)',
			},
			{
				name: 'text_50',
				light: 'hsl(var(--tint_hue) var(--tint_saturation) 24%)',
				dark: 'hsl(var(--tint_hue) var(--tint_saturation) 75%)',
			},
		],
	},
];
