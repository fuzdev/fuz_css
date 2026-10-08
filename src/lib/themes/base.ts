import type { Theme } from '../variable.ts';

/**
 * The default theme - inherits every base default variable.
 */
export const base_theme: Theme = {
	name: 'base',
	summary:
		'The defaults: a blue accent on warm neutrals, serif headings over sans text, every knob at its starting value.',
	variables: [] // inherits base
};
