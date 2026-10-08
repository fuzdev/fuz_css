import type { Theme } from './variable.ts';
import { base_theme } from './themes/base.ts';
import { ledger_theme } from './themes/ledger.ts';
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
 * Contrast is not a theme: the low/high contrast pair are modifiers
 * (`contrast_modifiers`) composed over any theme with `compose_themes`.
 */
export const default_themes: Array<Theme> = [DEFAULT_THEME, ledger_theme];

/**
 * The contrast modifiers: small axis fragments composed over any theme via
 * `compose_themes` rather than picked as themes themselves. Composition is
 * flatten + last-wins, so a modifier's variables replace the base theme's
 * same-named ones - a base that moves the same knobs cedes them to the
 * modifier. Both move the shade endpoint (`shade_lightness_00`), since
 * contrast is the ground-to-text range, so a theme whose identity is its
 * ground yields it. High contrast also bends the text curve
 * (`text_lightness_curve`) and sets `border_color` to a stop that holds a
 * control's boundary against a ground its fill can no longer separate from
 * - a base with its own `border_color` cedes it like any other variable,
 * stronger rules included. Neither touches the neutral cast, which stays the
 * theme's.
 */
export const contrast_modifiers: Array<Theme> = [low_contrast_theme, high_contrast_theme];
