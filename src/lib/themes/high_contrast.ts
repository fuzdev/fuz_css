import type { Theme } from '../variable.ts';
import { HIGH_CONTRAST } from '../ramps.ts';

/**
 * Strengthened contrast: the theme it composes over, with its `--contrast`
 * knob at `HIGH_CONTRAST`. The ground stretches halfway from its own
 * lightness toward the contrast end, the shade curve bends a little so the
 * surfaces stay close to it, the default control border moves toward a
 * stronger shade stop - past 3:1 against the ground without pinning a border
 * color - and the bent text curve pulls the text stops toward the end. The
 * theme's ground, cast, palette, and roles stay its own, only strengthened:
 * the ground moves only part way to the end, so a tinted ground keeps part of
 * its tint.
 *
 * Picking the modifier sets `contrast` to `HIGH_CONTRAST`, as picking a
 * theme sets its knobs: composition is last-wins, so it replaces a theme's
 * own `contrast`, a higher one included. The OS `prefers-contrast: more`
 * preference reaches the same derivation through its own input
 * (`--_contrast_preference`, set in `style.css`), and the effective contrast
 * is the larger of the two - so the preference renders what the modifier
 * does over a theme at the default, only ever raises a theme's own contrast,
 * and no theme can silence it.
 */
export const high_contrast_theme: Theme = {
	name: 'high contrast',
	variables: [{ name: 'contrast', base: String(HIGH_CONTRAST) }]
};
