---
'@fuzdev/fuz_css': minor
---

feat: rename the size composite classes to `sized_*`

Breaking:

- The size composite classes take a `sized_` prefix, so they no longer
  share names with the breakpoint modifiers and the size-suffixed tokens:
  - `xs` → `sized_xs`
  - `sm` → `sized_sm`
  - `md` → `sized_md`
  - `lg` → `sized_lg`
  - `xl` → `sized_xl`
- The old names no longer resolve. To migrate, search class attributes,
  `class:` directives, clsx/class arrays, and `@fuz-classes` hints for the
  bare names and add the prefix (`md:sm` becomes `md:sized_sm`). An old name
  in a `@fuz-classes` hint or `additional_classes` now errors. In markup, a
  bare old name like `sm` is silently skipped and generates no CSS, while a
  modified one like `md:sm` logs an unknown CSS property warning (`"md"`).
  A plain search for `sm` also matches breakpoint modifiers (`sm:`) and
  size-suffixed tokens (`gap_sm`), so check each hit.
