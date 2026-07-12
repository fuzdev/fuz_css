---
'@fuzdev/fuz_css': minor
---

feat: theme scrollbars, caret, dialog backdrop, and the OS contrast preference

New micro-surface defaults in `style.css`, each themable through a `var()`
fallback hook (registered in the knob catalog so `validate_theme` accepts
them):

- `scrollbar-color` on `:root` — thumb defaults to `var(--shade_40)` on a
  transparent track, so scrollbars follow the theme's neutral; hooks
  `--scrollbar_thumb_color` / `--scrollbar_track_color`
- `caret-color` on text inputs — defaults to `var(--accent_50)`, matching
  selection and focus; hook `--caret_color`
- `dialog::backdrop` — defaults to `var(--darken_60)`, the same dim fuz_ui's
  `Dialog` uses; hook `--backdrop_color`
- `@media (prefers-contrast: more)` maps the OS preference onto the curve
  knobs, mirroring the `'high contrast'` theme's moves
  (`--shade_lightness_00`, `--text_lightness_curve`); theme overrides beat
  it from the `fuz.theme` layer

Also tunes the `'low contrast'` registry theme's shade compression
(`shade_lightness_00` 0.92 light / 0.245 dark) to the softest values that
pass every `check_theme` WCAG gate, so the whole registry passes its own
gates.
