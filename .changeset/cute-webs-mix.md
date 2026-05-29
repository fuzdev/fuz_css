---
'@fuzdev/fuz_css': minor
---

complete the `.xs`–`.xl` size composite scale, realign `.sm`, rename `input_height_sm` to `input_height_compact`, remove `--min_height`, add the chip-padding chain and min-height override hooks

Size composites now span the full `.xs` / `.sm` / `.md` / `.lg` / `.xl` range under one rule: each variable is offset a fixed number of steps from its `.md` default on its own scale — `.xs` two down, `.sm` one down, `.lg` one up, `.xl` two up; `.md` restates the defaults as a cascade reset. The scales are geometric (~1.27× per step), so every variable moves by the same proportion.

**New:**

- `.xs`, `.lg`, and `.xl` composite classes, cascading to children (`.sm` and `.md` already existed).
- `--chip_padding_x` override hook — chips now scale horizontally, not just font-size: padding reads `var(--chip_padding_x, var(--space_xs))`.
- `--button_min_height` and `--menuitem_min_height` override hooks — replace the removed `--min_height` indirection (see below).

**Breaking changes:**

- realign `.sm` to a uniform one-step-down offset. Four variables that previously dropped two steps now drop one: `--input_height` (`space_xl3` → `space_xl4`), `--input_height_compact` (`space_xl2` → `space_xl3`), `--input_padding_x` (`space_sm` → `space_md`), and the `--menuitem_padding` x-axis (`space_xs3` → `space_xs2`). The old, denser `.sm` look is now `.xs`.
- rename `--input_height_sm` → `--input_height_compact` (CSS variable and the `input_height_sm` JS export in `variables.ts`) — used for checkboxes, radio buttons, and inline buttons. The old name conflicted with the size composite naming where `_sm` means "value when `.sm` is active."
- remove `--min_height` — buttons now read `min-height: var(--button_min_height, var(--input_height))` and inline buttons `var(--button_min_height, var(--input_height_compact))`; the indirection layer is replaced by explicit override hooks.
- remove `input_height_inner` — was defined but unused.
- menuitem default `min-height` changes from `var(--icon_size_sm)` (2rem) to `var(--input_height_compact)` (3.3rem).

**Migration:**

- if you relied on the previous denser `.sm`, switch those regions to `.xs`
- find-replace `input_height_sm` → `input_height_compact` (CSS `--`-prefixed and JS imports)
- replace `--min_height` overrides with `--button_min_height` (buttons) or `--menuitem_min_height` (menuitems)
