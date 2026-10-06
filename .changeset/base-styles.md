---
'@fuzdev/fuz_css': minor
---

feat: rework base styles - interaction states, micro-surface variables, body font, button border style, section rhythm

Breaking:

- `body` reads `--font_family` (default `var(--font_family_sans)`) instead
  of `--font_family_sans`; set `--font_family` for a serif body.
- Buttons read `--button_border_style` (default `var(--border_style)`) and
  `--button_border_style_active` while pressed. A contextual
  `--border_style` on an ancestor no longer reaches buttons - set the
  button knobs there too.
- Colored labels move to stop 60, the text-safe stop links use, so they
  meet AA at rest: `.palette_X` buttons use `palette_X_60` for the label, fill,
  border, and outline (was stop 50, fill 40), `.chip.palette_X` labels use
  `palette_X_60`, and `label.selected` uses `--accent_60`.
- Selected buttons use `--text_00` for inverse text (was
  `--text_05`/`--text_10`) on a `--shade_60` fill (was `--shade_50`); the
  border stays `--border_color`, matching the fill only on `.palette_X`
  buttons.
- `.plain` strips the fill, border, and shadow from unselected elements
  only, so a `.plain.selected` button keeps the selected style (was a
  transparent fill under the inverse text until hover).
- A selected link's focus and pressed outline keeps the default
  `--outline_color` (`.selected` repointed it to `--border_color`).
- Hovering an input, textarea, or select colors the border with
  `--outline_color` instead of `--border_color_20`; disabled inputs no
  longer react to hover.
- `section` bottom margin is a `--flow_margin` multiple (same default),
  scaled by size composites; `.unstyled` opts out.
- `prefers-reduced-motion` clears the `--duration_*` variables with
  `!important`, so a theme or a `:root` rule can't re-enable them; set a
  duration on the element that needs one.
- The checkbox checkmark no longer reads the `--left`/`--top` position
  hooks.
- `.pane` takes its shadow from the declared `--pane_shadow` (same default)
  and no longer reads a contextual `--shadow_color`; `.panel` declares
  `box-shadow: var(--panel_shadow)` (default `none`), so it resets the
  shadow of an element it is combined with, like a `.pane` or a `button`. A
  `shadow_*` class on either still wins.
- The font sizes above `md` (`--font_size_lg` to `--font_size_xl9`) derive
  from `--type_scale_ratio` (default `1.272`, also `TYPE_SCALE_RATIO` in
  `variable_data.ts`) instead of being literals. Computed sizes match the
  old values to two decimal places of a rem. The `lg`/`xl` size composites
  read those sizes, so they follow the ratio.
- `::placeholder` and `::file-selector-button` styles are scoped to
  `input`/`textarea`, so bundled output ships them only with those elements.

New:

- Focus outlines use `outline-offset: var(--outline_offset)` (default
  `1px`).
- Headings read `letter-spacing: var(--heading_letter_spacing)` (default
  `normal`).
- Themable micro-surfaces: `--scrollbar_thumb_color` (`var(--shade_40)`),
  `--scrollbar_track_color` (transparent), `--caret_color`
  (`var(--accent_50)`), `--backdrop_color` (`var(--darken_60)`).
- `@media (prefers-contrast: more)` maps onto the curve knobs and steps
  `--border_color` up to `--shade_50` in the `fuz.preferences` layer; theme
  overrides beat it.
- `check_theme` gates the stop-60 pairings above at AA
  (`GATE_SELECTED_TEXT`, `GATE_PALETTE_TEXT`), measuring the `.palette_X`
  button label against its rendered rest fill (its own color at 8% alpha
  over `shade_00`).
