---
'@fuzdev/fuz_css': minor
---

fix: keep selected-button text readable under contrast-bent themes and colored fills

Selected buttons now use `--text_00` (the text ramp endpoint) instead of
`--text_05`/`--text_10` for inverse text. Themes bending
`--text_lightness_curve` — the high-contrast registry theme, brutalish, and
the OS `prefers-contrast: more` mapping — dragged the near-background stops
toward the fill lightness, washing selected text out (down to ~1.2:1); the
endpoints are the knobs themselves, so the curve can never move them.

Colored buttons (`.palette_X`) now fill with `palette_X_50` instead of
`palette_X_40`, matching the neutral `shade_50` selected fill — the stop-40
fills left light-scheme inverse text at ~2.5:1, below the 3:1 large-text
floor (the disabled-active feedback fill moves `negative_40` → `negative_50`
for the same reason). The selected border now matches the fill, rendering
flat. Unselected tint fills mix from the same `--fill`, so they read
slightly richer.

`check_theme` gains a matching contrast gate — `GATE_SELECTED_TEXT`:
`text_00` on `shade_50` and on every stop-50 fill must clear 3:1 — so these
pairings can't silently regress. The selected-deselectable hover swaps
`--shade_min` for its text-semantic twin `--text_min` (identical values).
The brutalish exemplar drops its `chroma_scale: 0.5` so the palette keeps
its default punch as the theme's docs describe.
