---
'@fuzdev/fuz_css': patch
---

fix: order `disabled:` and `enabled:` after the interaction states, so `disabled:opacity:50%` beats `hover:opacity:80%` on a hovered disabled element; the other states (`checked:`, `invalid:`, `odd:`, `nth-child(...)`, ...) keep yielding to hover, focus, and active
