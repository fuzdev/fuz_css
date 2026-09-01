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
- Selected buttons use `--text_00` for inverse text (was
  `--text_05`/`--text_10`); `.palette_X` buttons fill with `palette_X_50`
  (was stop 40), the selected border matching the fill.
- Hovering an input, textarea, or select colors the border with
  `--outline_color` instead of `--border_color_20`; disabled inputs no
  longer react to hover.
- `section` bottom margin is a `--flow_margin` multiple (same default),
  scaled by size composites; `.unstyled` opts out.

New:

- Focus outlines use `outline-offset: var(--outline_offset)` (default
  `1px`).
- Themable micro-surfaces: `--scrollbar_thumb_color` (`var(--shade_40)`),
  `--scrollbar_track_color` (transparent), `--caret_color`
  (`var(--accent_50)`), `--backdrop_color` (`var(--darken_60)`).
- `@media (prefers-contrast: more)` maps onto the curve knobs in the
  `fuz.preferences` layer; theme overrides beat it.
- `check_theme` gains `GATE_SELECTED_TEXT`; the knob catalog's border
  styles gain `inset`/`outset`.
