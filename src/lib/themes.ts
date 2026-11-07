import type { Theme } from './variable.ts';
import { base_theme } from './themes/base.ts';
import { ledger_theme } from './themes/ledger.ts';
import { high_contrast_theme } from './themes/high_contrast.ts';

/**
 * The registry's default: the first of `default_themes`, the theme an app
 * renders before one is picked. It names a policy rather than aliasing
 * `base_theme` - the registry could make another theme its default while
 * `themes/base.ts` stays the theme of the shipped defaults - so the two stay
 * separate exports.
 */
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
 * separates registered themes from shipped exemplars. The registry holds the
 * plain working themes: the base and `themes/ledger.ts` (compact, cool, for
 * tools used all day).
 *
 * The exemplars deliberately stay out of this list. Each takes one channel
 * to carry the structure and quiets the rest, and is named for the artifact
 * that already looks that way: `themes/zine.ts` (line and weight),
 * `themes/pebble.ts` (depth and softness), `themes/parchment.ts` (type and
 * ruling), `themes/phosphor.ts` (packing, dark-only), `themes/guestbook.ts`
 * (controls as beveled objects), `themes/marquee.ts` (color, dark-only and
 * the one palette-tier exemplar), and `themes/signage.ts` (scale and weight,
 * for legibility).
 *
 * Contrast is not a theme: it's the `--contrast` knob, which the
 * high-contrast modifier (`contrast_modifiers`) sets over any theme composed
 * with `compose_themes`.
 */
export const default_themes: Array<Theme> = [DEFAULT_THEME, ledger_theme];

/**
 * The contrast modifiers: axis fragments composed over any theme via
 * `compose_themes` rather than picked as themes themselves. The one modifier,
 * high contrast, sets the `--contrast` knob alone, so it strengthens the
 * theme beneath it rather than replacing its knobs: the theme's ground moves
 * toward the contrast end and its shade and text curves bend, while its
 * neutral cast, palette, borders, links, and panel shadow stay its own.
 * Picking the modifier sets `contrast` to `HIGH_CONTRAST`, as picking a theme
 * sets its knobs: composition is last-wins, so it replaces a theme's own
 * `contrast`, a higher one included. The OS `prefers-contrast: more`
 * preference feeds the same derivation through its own input, which only
 * ever raises the effective contrast.
 */
export const contrast_modifiers: ContrastModifiers = {
	high: high_contrast_theme
};

/**
 * The contrast modifiers, keyed by the name a contrast picker selects.
 */
export interface ContrastModifiers {
	/** Strengthens the ground-to-text range and separates the surfaces. */
	high: Theme;
}
