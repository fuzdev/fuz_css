---
'@fuzdev/fuz_css': minor
---

complete the `.xs`–`.xl` size composite scale, realign `.sm` to be principled, rename `input_height_sm` to `input_height_compact`, remove `--min_height`, add chip padding chain and min-height override hooks

Size composites now span the full `.xs` / `.sm` / `.md` / `.lg` / `.xl` range and follow one rule: each variable is offset a fixed number of steps from its `.md` default on the variable's own scale — `.xs` two steps down, `.sm` one down, `.lg` one up, `.xl` two up. `.md` restates the defaults as a cascade reset. Because the fuz_css scales are geometric (~1.27× per step), every variable moves by the same proportion per step.

**New:**

- `.xs` and `.xl` composite classes — smallest and largest sizing, cascading to children.
- `.lg` composite class — larger sizing, one step up. (`.md` reset and `.sm` already existed.)
- `--chip_padding_x` override variable — chip horizontal padding now reads `var(--chip_padding_x, var(--space_xs))`. Size composites set it so chips scale horizontally (previously chips only scaled font-size).
- `--button_min_height` override variable — button `min-height` reads `var(--button_min_height, var(--input_height))` on regular buttons and `var(--button_min_height, var(--input_height_compact))` on inline buttons.
- `--menuitem_min_height` override variable — menuitem `min-height` reads `var(--menuitem_min_height, var(--input_height_compact))`.

**Breaking changes:**

- realign `.sm` to a uniform one-step-down offset. Four variables that previously dropped two steps now drop one: `--input_height` (`space_xl3` → `space_xl4`), `--input_height_compact` (`space_xl2` → `space_xl3`), `--input_padding_x` (`space_sm` → `space_md`), and the `--menuitem_padding` x-axis (`space_xs3` → `space_xs2`). The old, denser `.sm` look is now `.xs`.
- rename CSS variable `--input_height_sm` to `--input_height_compact` — used for checkboxes, radio buttons, and inline buttons. The old name conflicted with the size composite naming convention where `_sm` means "value when `.sm` is active."
- remove CSS variable `--min_height` — buttons now read `min-height: var(--button_min_height, var(--input_height))` directly, and inline buttons read `var(--button_min_height, var(--input_height_compact))`. The indirection layer is replaced by an explicit override hook.
- rename JS export `input_height_sm` to `input_height_compact` in `variables.ts`
- remove `input_height_inner` variable — was defined but unused
- menuitem default `min-height` changes from `var(--icon_size_sm)` (2rem) to `var(--input_height_compact)` (3.3rem)

**Migration:**

- if you relied on the previous denser `.sm`, switch those regions to `.xs`
- find-replace `--input_height_sm` → `--input_height_compact` in CSS and inline styles
- find-replace `input_height_sm` → `input_height_compact` in JS/TS imports
- replace `--min_height` overrides with `--button_min_height` (for buttons) or `--menuitem_min_height` (for menuitems)
