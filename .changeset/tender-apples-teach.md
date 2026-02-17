---
'@fuzdev/fuz_css': patch
---

add `.compact` composite class for tighter sizing by overriding sizing variables

- update `.chip`, `.pane`, and `.panel` to use `var(--border_radius, var(--border_radius_xs))` fallback pattern so container overrides cascade
- add `font-size: var(--font_size, inherit)` to `.chip` so font-size overrides cascade
- add compact demos to buttons, chips, forms, and classes docs pages
