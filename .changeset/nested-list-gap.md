---
'@fuzdev/fuz_css': patch
---

fix: space a nested list one item gap below its item's content, and give `menu` items the list item gap

A styled `ul`, `ol`, or `menu` nested in a styled list's `li` now gets a top margin of the item gap (`flow_margin` × 0.62, `sm` at the default density), so it no longer sits flush against the item's text. A preceding block's larger margin, such as a `p`, collapses over it. A styled `menu`'s items now take the same item gap as `ul` and `ol`, matching the padding and flow margin `menu` already shared with them.
