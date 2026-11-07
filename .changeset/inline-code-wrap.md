---
'@fuzdev/fuz_css': minor
---

fix: wrap inline code with the text instead of jumping lines

`code` inside a `p` was `display: inline-block`, so a long span jumped whole to the next line, leaving a ragged gap, or overflowed. It's now plain inline, as it already was in a `li` or heading: it wraps with the text, each line's fragment keeps its own padding and rounded background (`box-decoration-break: clone`), and a token too long for any line breaks rather than overflowing (`overflow-wrap: break-word`, which also breaks a long token in block code that wraps, like a bare `pre > code`, rather than scrolling it). `code.inline` stays an unsplit `inline-block` for a span that should hold together.
