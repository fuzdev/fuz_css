---
'@fuzdev/fuz_css': minor
---

feat: separate the focus ring from the border with a 1px gap

Focusable elements (links, buttons, inputs, contenteditable) now draw their
outline with `outline-offset: var(--outline_offset, 1px)`. The ring and the
border share a color by design (the element color, defaulting to the
accent), so without a gap they merged into one thick band; the offset makes
them read as two shapes while keeping the ring's full contrast against the
page. `--outline_offset` is a themable hook in the knob catalog.
