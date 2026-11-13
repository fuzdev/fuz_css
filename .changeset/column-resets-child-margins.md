---
'@fuzdev/fuz_css': minor
---

feat: `.column` resets the flow margins of its direct children, as `.row` and `.row_wrap` do

Breaking:

- a `.column` no longer spaces flow children (`p`, `ul`, `label`, headings, `section`, list items) by their margins. A `gap_*` class on it is now its whole spacing, where it was added to each child's flow margin; a `.column` with no gap that relied on those margins needs a `gap_*` class, or loses `column` where it needs no flex layout. A margin class on a child (`mb_lg`) still applies, and `.box` and a plain `fieldset` keep flow margins.

Fixed:

- a `legend` keeps its bottom margin in a `fieldset` with `.row`, `.row_wrap`, or `.column`: a legend is never a flex item, so no gap spaced it from the fields below.
- the reset rule ships only when one of its classes is used; it was always included.
