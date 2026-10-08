---
'@fuzdev/fuz_css': minor
---

feat: rework base styles - cascade layers, interaction states, surface variables, stop-60 labels

Breaking:

- Shipped CSS is layered: `style.css` and the default variables in
  `fuz.base` < OS preference mappings in `fuz.preferences` < themes in
  `fuz.theme` < generated utilities in `fuz.utilities`. Unlayered styles
  beat all of it, utility classes included, except `[hidden]` and the
  `prefers-reduced-motion` duration reset, now `!important` in
  `fuz.preferences` so a theme or `:root` rule can't re-enable motion; set
  a duration on the element that needs one.
- `body` reads `--font_family` (default `var(--font_family_sans)`) instead
  of `--font_family_sans`; set `--font_family` for a serif body. `body`
  also declares `font-weight: var(--font_weight)` and headings
  `letter-spacing: var(--heading_letter_spacing)`, so an ancestor's
  `font-weight` or `letter-spacing` no longer inherits into them.
- Buttons read `--button_border_style` (default `var(--border_style)`) and
  `--button_border_style_active` while pressed, and disabled buttons set
  `--button_border_style: solid dashed`. A contextual `--border_style` on
  an ancestor no longer reaches buttons - set the button knobs there too.
- Colored labels move to stop 60, the text-safe stop links use, so they
  meet AA at rest: `.palette_X` buttons use `palette_X_60` for the label,
  fill, border, and outline (was stop 50, fill 40), `.chip.palette_X`
  labels use `palette_X_60` (and set `--text_color`, so nested code
  inherits it), and `label.selected` uses `--accent_60`.
- Selected buttons use `--text_00` for inverse text (was `--text_05`) on a
  `--shade_60` fill (was `--shade_50`); the border stays `--border_color`,
  matching the fill only on `.palette_X` buttons.
- A focused button, input, textarea, or select takes `--outline_color` as
  its border color (was `--color_a_50`), and hovering an input, textarea,
  or select previews it (was `--border_color_20`; disabled ones no longer
  react). A focused `.palette_X` button or an element with an `outline_*`
  class keeps its own color - `outline_color_NN` now sets `--outline_color`
  too, like `outline_X_NN`.
- `.plain` strips the fill, border, and shadow from unselected elements
  only, so a `.plain.selected` button keeps the selected style (was a
  transparent fill under the inverse text until hover).
- A selected link's focus and pressed outline keeps the default
  `--outline_color` (`.selected` repointed it to `--border_color`).
- `section` bottom margin is a `--flow_margin` multiple (same default),
  scaled by size composites; `.unstyled` opts out.
- The checkbox checkmark drops `position: relative` and the `--left`/`--top`
  position hooks.
- `--button_shadow*` and `--pane_shadow` are declared defaults that name
  their shadow color, so a `:root` `--shadow_color` no longer tints them,
  nor does a shadow color class on a `.pane`; set the variable, or add a
  shape class (`shadow_md`). `.panel` sets `box-shadow:
  var(--panel_shadow)` (default `none`), which resets the shadow of a
  `.pane` or `button` it's combined with.
- New defaults change an unthemed page, each through a themable variable:
  focus outlines sit `--outline_offset` (`1px`) out, `:root` sets
  `scrollbar-color` from `--scrollbar_thumb_color` (`var(--shade_40)`) and
  `--scrollbar_track_color` (transparent), inputs, textareas, and selects
  set `caret-color` from `--caret_color` (`var(--accent_50)`), and
  `dialog::backdrop` dims with `--backdrop_color` (`var(--darken_60)`; was
  the browser's default).

New:

- `@media (prefers-contrast: more)` maps onto the curve knobs and steps
  `--border_color` up to `--shade_50` in the `fuz.preferences` layer; theme
  overrides beat it.
