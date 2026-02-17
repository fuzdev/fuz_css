---
'@fuzdev/fuz_css': patch
---

add `.compact` composite class for tighter sizing by overriding variables, cascading to children

- update `.chip`, `.pane`, and `.panel` to use `var(--border_radius, var(--border_radius_xs))` fallback pattern so container overrides cascade
- add `font-size: var(--font_size, inherit)` to `.chip` so font-size overrides cascade
- add `var(--flow_margin, var(--space_lg))` to flow elements and headings so compact can tighten vertical spacing
- add `.mb_flow` and `.mt_flow` composite classes for flow-aware spacing on non-flow elements
- move `legend` into the flow elements selector
- add compact demos to buttons, chips, forms, typography, and classes docs pages
