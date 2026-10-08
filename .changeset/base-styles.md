---
'@fuzdev/fuz_css': minor
---

feat: rework base styles - interaction states, micro-surface variables, body font, button border style, surface shadows, section rhythm

Breaking:

- `body` reads `--font_family` (default `var(--font_family_sans)`) instead
  of `--font_family_sans`; set `--font_family` for a serif body.
- Buttons read `--button_border_style` (default `var(--border_style)`) and
  `--button_border_style_active` while pressed. A contextual
  `--border_style` on an ancestor no longer reaches buttons - set the
  button knobs there too.
- Colored labels move to stop 60, the text-safe stop links use, so they
  meet AA at rest: `.palette_X` buttons use `palette_X_60` for the label,
  fill, border, and outline (was stop 50, fill 40), `.chip.palette_X`
  labels use `palette_X_60`, and `label.selected` uses `--accent_60`.
- Selected buttons use `--text_00` for inverse text (was `--text_05`) on a
  `--shade_60` fill (was `--shade_50`); the border stays `--border_color`,
  matching the fill only on `.palette_X` buttons.
- A focused button, input, textarea, or select takes `--outline_color` as
  its border color (was `--color_a_50`), so a focused `.palette_X` button
  keeps its own color. Hovering an input, textarea, or select previews it
  the same way (was `--border_color_20`); disabled inputs no longer react
  to hover.
- `.plain` strips the fill, border, and shadow from unselected elements
  only, so a `.plain.selected` button keeps the selected style (was a
  transparent fill under the inverse text until hover).
- A selected link's focus and pressed outline keeps the default
  `--outline_color` (`.selected` repointed it to `--border_color`).
- `section` bottom margin is a `--flow_margin` multiple (same default),
  scaled by size composites; `.unstyled` opts out.
- `prefers-reduced-motion` clears the `--duration_*` variables with
  `!important`, so a theme or a `:root` rule can't re-enable them; set a
  duration on the element that needs one.
- The checkbox checkmark no longer reads the `--left`/`--top` position
  hooks.
- `.pane` takes its shadow from `--pane_shadow` (same default), which names
  its shadow color outright, so a shadow color class (`shadow_a_50`) alone
  no longer tints it - add a shape class or set `--pane_shadow`; the
  button shadows likewise ignore a `--shadow_color` set on `:root`.
  `.panel` declares `box-shadow: var(--panel_shadow)` (default `none`), so
  it resets the shadow of an element it is combined with, like a `.pane`
  or a `button`. A shadow shape class (`shadow_md`, `shadow_inset_xs`) on
  either still wins, except over a modified composite (`md:panel`), which
  is emitted after it.
- `::placeholder` styles are scoped to `input`/`textarea` and
  `::file-selector-button` styles to `input`, so bundled output ships them
  only with those elements.
- New defaults change an unthemed page, each through a themable variable:
  focus outlines sit `--outline_offset` (`1px`) out, `:root` sets
  `scrollbar-color` from `--scrollbar_thumb_color` (`var(--shade_40)`) and
  `--scrollbar_track_color` (transparent), inputs, textareas, and selects set `caret-color` from
  `--caret_color` (`var(--accent_50)`), and `dialog::backdrop` dims with
  `--backdrop_color` (`var(--darken_60)`; was the browser's default).

New:

- `@media (prefers-contrast: more)` maps onto the curve knobs and steps
  `--border_color` up to `--shade_50` in the `fuz.preferences` layer; theme
  overrides beat it.
