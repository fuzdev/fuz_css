---
'@fuzdev/fuz_css': minor
---

feat: add keyword classes, bare CSS keywords like `flex` and `sticky`

A CSS value keyword that names its property on its own is now a class setting that one declaration, with modifiers like any class (`md:flex`, `hover:underline`):

- **display** — `flex`, `inline-flex`, `grid`, `inline-grid`, `inline-block`, `block`, `flow-root`
- **position** — `relative`, `absolute`, `fixed`, `sticky`
- **typography** — `uppercase`, `lowercase`, `capitalize`, `italic`, `oblique`, `bold`, `bolder`, `lighter`, and `underline`, `overline`, `line-through` (setting the `text-decoration-line` longhand)
- **`hidden`** — `display: none`, mirroring the HTML attribute, for `max-md:hidden` and `print:hidden`; the `[hidden]` attribute still beats every class

`hidden` orders after the display classes it ties with, a `display:*` literal included, so `class={['display:flex', {hidden: !open}]}` hides, while a media query still outranks it (`hidden md:flex` shows from `md` up). `row`, `column`, and `box` are unchanged composites, so `hidden md:row` stays hidden at every width - write `max-md:hidden row`. A class definition or interpreter can take the same order with the new `late` flag on `CssClassDefinitionBase`.

These names are found implicitly like any class, so a project with its own classes named like them, or extracting a dependency that uses them, now gets their styles. A Tailwind project's `flex` or `hidden` now resolves to the same CSS Tailwind ships, while Tailwind's own names (`items-center`, `justify-between`) still generate nothing, silently.
