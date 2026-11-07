---
'@fuzdev/fuz_css': minor
---

**breaking** feat: delete `circular` and the space-scale width, height, and positional classes

A single non-token declaration gets no coined class name - the literal is the shorthand.

Breaking:

- `circular` is removed - use `border-radius:50%`
- the space-scale `width_*` and `height_*` classes (`width_md`, ...) are removed - use `width:var(--space_md)`; the distance families (`width_atmost_*`, `width_atleast_*`, `height_atmost_*`, `height_atleast_*`) stay
- the space-scale `top_*`, `right_*`, `bottom_*`, `left_*`, and `inset_*` classes are removed - use `top:var(--space_md)`
