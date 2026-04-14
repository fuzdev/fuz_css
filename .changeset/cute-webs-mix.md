---
'@fuzdev/fuz_css': minor
---

add `.lg` size composite class, rename `input_height_sm` to `input_height_compact`, add `input_height_lg`, remove `--min_height`

**Breaking changes:**

- rename CSS variable `--input_height_sm` to `--input_height_compact` — used for checkboxes, radio buttons, and inline buttons. The old name conflicted with the size composite naming convention where `_sm` means "value when `.sm` is active."
- remove CSS variable `--min_height` — buttons now read `min-height: var(--input_height)` directly, and inline buttons read `min-height: var(--input_height_compact)`. The indirection layer is no longer needed.
- rename JS export `input_height_sm` to `input_height_compact` in `variables.ts`
- menuitem default `min-height` changes from `var(--icon_size_sm)` (2rem) to `var(--input_height_compact)` (3.3rem)

**Migration:**

- find-replace `--input_height_sm` → `--input_height_compact` in CSS and inline styles
- find-replace `input_height_sm` → `input_height_compact` in JS/TS imports
- remove any references to `--min_height` — use `--input_height` or `--input_height_compact` directly
