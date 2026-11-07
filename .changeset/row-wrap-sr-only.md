---
'@fuzdev/fuz_css': minor
---

feat: add the `row_wrap` and `sr_only` composites

- `row_wrap` is a `row` that wraps (`flex-wrap: wrap`), replacing `row flex-wrap:wrap`; its direct children get the same flow-margin reset as a `row`'s, and `label.row_wrap` takes the `label.row` styles
- `sr_only` hides an element visually while assistive technology still reads it, with `clip-path: inset(50%)` in place of the legacy `clip`
