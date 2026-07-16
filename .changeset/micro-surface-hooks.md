---
'@fuzdev/fuz_css': minor
---

feat: theme scrollbars, caret, dialog backdrop, and the OS contrast preference

New micro-surface defaults in `style.css`, each themable through a `var()`
fallback hook (all registered theme variables):

- `scrollbar-color` on `:root` — thumb defaults to `var(--shade_40)` on a
  transparent track; hooks `--scrollbar_thumb_color` /
  `--scrollbar_track_color`
- `caret-color` on text inputs — defaults to `var(--accent_50)`; hook
  `--caret_color`
- `dialog::backdrop` — defaults to `var(--darken_60)`; hook
  `--backdrop_color`
- `@media (prefers-contrast: more)` maps the OS preference onto the curve
  knobs, mirroring the `'high contrast'` theme; theme overrides beat it

Also tunes the `'low contrast'` theme's shade compression to the softest
values that pass every `check_theme` contrast gate.
