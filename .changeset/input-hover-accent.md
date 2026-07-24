---
'@fuzdev/fuz_css': minor
---

feat: input hover borders preview the focus color

Hovering an input, textarea, or select now colors the border with
`var(--outline_color)` — the element color when classed (`.palette_*` sets
it), the accent intent otherwise — instead of fading it to the weaker
`--border_color_20` alpha. Focus keeps setting the border to the same color
and adds the outline, so hover → focus reads as one escalating highlight.
Disabled inputs no longer react to hover.
