---
'@fuzdev/fuz_css': minor
---

feat: rework interaction states and micro-surfaces - focus ring gap, hover previews focus, themable surface hooks, contrast-safe selected buttons

Focus and hover now read as one escalating highlight:

- Focusable elements (links, buttons, inputs, contenteditable) draw their
  outline with `outline-offset: var(--outline_offset, 1px)`. The ring and
  the border share a color by design (the element color, defaulting to the
  accent), so without a gap they merged into one thick band; the offset
  makes them read as two shapes while keeping the ring's full contrast
  against the page.
- Hovering an input, textarea, or select colors the border with
  `var(--outline_color)` — the element color when one is set (an
  `outline_*` class, or `.palette_*` on buttons), the accent intent
  otherwise — instead of fading it to the weaker `--border_color_20`
  alpha. Focus keeps setting the border to the same color and adds the
  outline. Disabled inputs no longer react to hover.

New micro-surface defaults in `style.css`, each themable through a `var()`
fallback hook (all in the knob catalog, so theme validation accepts them):

- `scrollbar-color` on `:root` — thumb defaults to `var(--shade_40)` on a
  transparent track; hooks `--scrollbar_thumb_color` /
  `--scrollbar_track_color`
- `caret-color` on text inputs — defaults to `var(--accent_50)`; hook
  `--caret_color`
- `dialog::backdrop` — defaults to `var(--darken_60)`; hook
  `--backdrop_color`
- `--outline_offset` — the border-to-focus-ring gap above
- `@media (prefers-contrast: more)` maps the OS preference onto the curve
  knobs, mirroring the `'high contrast'` theme; theme overrides beat it

Selected-button text stays readable under contrast-bent themes and colored
fills:

- Selected buttons use `--text_00` (the text ramp endpoint) instead of
  `--text_05`/`--text_10` for inverse text. Themes bending
  `--text_lightness_curve` — the high-contrast modifier, the OS
  `prefers-contrast: more` mapping — drag the near-background stops toward
  the fill lightness, washing selected text out (down to ~1.2:1); the
  endpoints are the knobs themselves, so the curve can never move them.
- Colored buttons (`.palette_X`) fill with `palette_X_50` instead of
  `palette_X_40`, matching the neutral `shade_50` selected fill — stop-40
  fills leave light-scheme inverse text at ~2.5:1, below the 3:1
  large-text floor (disabled-active feedback fills with `negative_50` for
  the same reason). The selected border now matches the fill, rendering
  flat. Unselected tint fills mix from the same `--fill`, so they read
  slightly richer.
- A matching contrast gate in `check_theme` — `GATE_SELECTED_TEXT`:
  `text_00` on `shade_50` and on every stop-50 fill must clear 3:1 — keeps
  these pairings from silently regressing. The selected-deselectable hover
  uses `--text_min`, the text-semantic twin of `--shade_min` (identical
  values).
