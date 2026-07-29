import type { Theme } from './theme.ts';
import { base_theme } from './themes/base.ts';
import { low_contrast_theme } from './themes/low_contrast.ts';
import { high_contrast_theme } from './themes/high_contrast.ts';

export const DEFAULT_THEME: Theme = base_theme;

/**
 * The curated theme registry that theme pickers enumerate.
 *
 * Registry themes are semantic-tier by policy: they move intent bindings
 * (which palette letter a meaning points at) and levers (chroma scale,
 * curves, form knobs) but never the palette hues themselves, so the letters
 * stay a stable vocabulary across every registered theme.
 *
 * Themes live one module per theme under `themes/` and every module ships as
 * an importable export - registry membership, not file location, is what
 * separates registered themes from shipped exemplars. Palette-tier themes
 * (rotations, duotone/monochrome collapses like `themes/terminalien.ts`) and
 * the expressive exemplars (`themes/necromancer.ts`,
 * `themes/sunset_ember.ts`, `themes/brutalish.ts`) deliberately stay out of
 * this list.
 *
 * Contrast is not a theme: the low/high contrast pair are modifiers
 * (`contrast_modifiers`) composed over any theme with `compose_themes`.
 */
export const default_themes: Array<Theme> = [DEFAULT_THEME];

/**
 * The contrast modifiers: axis fragments (2 variables each) composed over
 * any theme via `compose_themes` rather than picked as themes themselves.
 * Composition is flatten + last-wins, so a modifier's variables replace the
 * base theme's same-named ones - a base that moves the same knobs
 * (`shade_lightness_00`, `text_lightness_curve`) cedes them to the modifier.
 */
export const contrast_modifiers: Array<Theme> = [low_contrast_theme, high_contrast_theme];
