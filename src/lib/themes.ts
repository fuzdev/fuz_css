import type {Theme} from './theme.ts';
import {base_theme} from './themes/base.ts';
import {low_contrast_theme} from './themes/low_contrast.ts';
import {high_contrast_theme} from './themes/high_contrast.ts';
import {terminal_green_theme} from './themes/terminal_green.ts';

export const DEFAULT_THEME: Theme = base_theme;

/**
 * The curated theme registry that theme pickers enumerate.
 *
 * Themes live one module per theme under `themes/` and every module ships as
 * an importable export — registry membership, not file location, is what
 * separates builtins from shipped exemplars. The expressive exemplars
 * (`themes/necromancer.ts`, `themes/sunset_ember.ts`, `themes/brutalist.ts`)
 * deliberately stay out of this list.
 */
export const default_themes: Array<Theme> = [
	DEFAULT_THEME,
	low_contrast_theme,
	high_contrast_theme,
	terminal_green_theme,
];
