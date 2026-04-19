---
'@fuzdev/fuz_css': minor
---

add `.lg` size composite class, rename `input_height_sm` to `input_height_compact`, remove `--min_height`, add chip padding chain and min-height override hooks

**New:**

- `.lg` composite class — larger sizing, cascading to children. Symmetric with `.sm` and `.md`. Sets `--font_size_lg`, `--input_height: space_xl6`, `--input_height_compact: space_xl5`, `--input_padding_x: space_xl`, `--chip_padding_x: space_sm`, `--icon_size_lg`, `--menuitem_padding`, `--flow_margin: space_xl`.
- `--chip_padding_x` override variable — chip horizontal padding now reads `var(--chip_padding_x, var(--space_xs))`. Size composites set it so chips scale with `.sm` / `.md` / `.lg` (previously chips only scaled font-size).
- `--button_min_height` override variable — button `min-height` reads `var(--button_min_height, var(--input_height))` on regular buttons and `var(--button_min_height, var(--input_height_compact))` on inline buttons.
- `--menuitem_min_height` override variable — menuitem `min-height` reads `var(--menuitem_min_height, var(--input_height_compact))`.

**Breaking changes:**

- rename CSS variable `--input_height_sm` to `--input_height_compact` — used for checkboxes, radio buttons, and inline buttons. The old name conflicted with the size composite naming convention where `_sm` means "value when `.sm` is active."
- remove CSS variable `--min_height` — buttons now read `min-height: var(--button_min_height, var(--input_height))` directly, and inline buttons read `var(--button_min_height, var(--input_height_compact))`. The indirection layer is replaced by an explicit override hook.
- rename JS export `input_height_sm` to `input_height_compact` in `variables.ts`
- remove `input_height_inner` variable — was defined but unused
- menuitem default `min-height` changes from `var(--icon_size_sm)` (2rem) to `var(--input_height_compact)` (3.3rem)

**Migration:**

- find-replace `--input_height_sm` → `--input_height_compact` in CSS and inline styles
- find-replace `input_height_sm` → `input_height_compact` in JS/TS imports
- replace `--min_height` overrides with `--button_min_height` (for buttons) or `--menuitem_min_height` (for menuitems)
