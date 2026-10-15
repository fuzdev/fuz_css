---
'@fuzdev/fuz_css': minor
---

feat: order utility classes by structure, with composites in their own sublayer

Generated classes now cascade in a declared order instead of an alphabetical one. Breakpoint classes apply in width order (`min-width` ascending, `max-width` descending, then feature queries like `print:`), an unprefixed class comes before its modified forms, shorthands and axis pairs come before longhands (`p_md` and `px_md` before `pl_lg`), and states follow link-visited-focus-hover-active order. Previously `md:padding:1rem` was emitted before `padding:0`, so the unprefixed class won at every width, and `lg:` rules could lose to `sm:` ones.

Composites (`box`, `row`, `panel`, `sized_*`, ...) render in a `fuz.utilities.composites` sublayer, so a token or literal class always wins over a composite it overlaps. The single-property shortcuts (`circular`, `pixelated`, `mb_flow`, `mt_flow`) order with the token classes instead, and lose a same-property tie to a token or literal. Markup that combined a composite with a class setting the same property can render differently:

- a modified composite now loses to a plain class: `display:none md:row` used to be flex at `md` and up, and is now hidden at every width. This is the Tailwind `hidden md:flex` habit - write `display:none md:display:flex` instead. `md:panel shadow_md` likewise takes `shadow_md` at every width
- a composite's state, compound, and descendant rules now lose to tokens by layer, where they used to win by specificity: `menuitem selected shade_00` and `selectable selected shade_00` lose the selected background, `chip palette_a color_b_50` takes `color_b_50`, and `plain shadow_sm` shows the shadow at rest
- custom `ruleset` and `composes` definitions render in the composites sublayer by default, so a token or literal class now beats them on the same property; set `composite: false` to keep one with the single-purpose classes

`generate_classes_css` now returns its CSS wrapped in the `fuz.utilities` layer. A class definition can set `composite: true` (the default for `ruleset` and `composes` definitions, while a `declaration` alone defaults to single-purpose).

Modifiers are stripped by the generator before a class resolves, so they apply to classes from custom interpreters too. Breaking for custom interpreters: `interpret` returns a definition (`{declaration}`, `{ruleset}`, or `{composes}`) instead of a CSS string, and `modified_class_interpreter` is removed - `css_class_interpreters` holds only `css_literal_interpreter`. Also removed: `extract_primary_property`, `generate_modified_ruleset` (replaced by `modify_ruleset`), and the literal output helpers `interpret_css_literal`, `generate_css_literal_simple`, `generate_selector`, `CssLiteralOutput`, and `InterpretCssLiteralResult`. Media modifier definitions carry the bare condition (`(width >= 48rem)`) plus a `width` bound, ancestor modifiers name their color scheme, and `parse_arbitrary_breakpoint` returns a width bound. Arbitrary breakpoints now decode `~` to a space, so `min-width(calc(100vw~-~20px)):` emits valid CSS.
