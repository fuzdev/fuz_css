---
'@fuzdev/fuz_css': minor
---

feat: derived OKLCH color system with semantic intents

Breaking:

- `--color_X_NN` → `--palette_X_NN` (10 letters × 13 stops);
  `ColorVariant`/`color_variants` → `PaletteVariant`/`palette_variants`.
- Class renames: `border_color_X_NN` → `border_X_NN`,
  `outline_color_X_NN` → `outline_X_NN`, `shadow_color_X_NN` →
  `shadow_X_NN`, `.color_a`-`.color_j` → `.palette_a`-`.palette_j`.
  `.color_X_NN`, `bg_X_NN`, `border_color_NN`, and the semantic
  `shadow_color_umbra`/`_highlight`/`_glow`/`_shroud` keep their names.
- Classes removed: `.fg_NN`/`.bg_NN` (use
  `background-color:var(--fg_10)`; `bg_` is now the opaque prefix),
  `.hue_a`-`.hue_j` and `--hue`, and every `_light`/`_dark` variable and
  class.
- `--hue_a`…`--hue_j` are OKLCH angles (blue `250`, was `210`); replace
  `hsl(var(--hue_x) …)` with `oklch(<l> <c> var(--hue_x))` or a stop.
- `--tint_hue`/`--tint_saturation` → `--hue_neutral` + `--neutral_chroma`.
- Default colors change: surfaces, text, borders, and the palette are
  derived in OKLCH from the curve knobs instead of authored per stop in
  HSL, so an unthemed page shifts.
- Shipped `color-mix()` calls (button fills, shadows, borders) interpolate
  `in oklab` (was `in hsl`).
- The browser floor rises to Chrome and Edge 120 (was 111) and Firefox 118
  (was 113) for `pow()`, with no fallback; Safari stays at 16.2 (16.4 for
  responsive modifier classes, 16.5 for `dark:`/`light:` ones).
- `variables.ts` exports only `default_variables`; read a variable with
  `default_variables.find((v) => v.name === 'space_md')`. In
  `variable_data.ts`, `icon_sizes` → `ICON_SIZES`, keyed by variant with
  unitless values (`ICON_SIZES.xs === 18`, was
  `icon_sizes.icon_size_xs === '18px'`), and `Z_INDEX_MAX` is removed
  (inline `2147483647`).

New:

- Curve knobs: `--chroma_scale`, `--palette_lightness_00/_100/_curve` (and
  `shade_`/`text_`), `--palette_chroma_min/_max`, `--chroma_curve`, with
  pinnable derived stops `--palette_lightness_NN`, `--palette_chroma_NN`,
  `--chroma_shape_NN`.
- Intent knobs `--hue_accent`/`_positive`/`_negative`/`_caution`/`_info`,
  each with a 13-stop scale (`--accent_00`…`--accent_100`), token classes
  (`.positive_50`, `.bg_caution_10`), `--selection_color`,
  `intent_variants`/`IntentVariant`, and `palette_glosses`/
  `format_palette_gloss`. Base styles that read `--color_a_*` or
  `--color_c_*` - links, focus, selection, `accent-color`, checked inputs,
  range thumbs, `.selectable` and `.menuitem` selection, and disabled-active
  feedback - read the accent or negative intent instead.
- Per-slot chroma multipliers `--palette_X_chroma_scale` and
  `--<intent>_chroma_scale` (default `1`; brown `f` ships at `0.55`).
- `--border_color_lightness`/`--border_color_chroma` derive the
  `border_color_*` alpha ramp through the neutral intent.
- Value tables in `variable_data.ts`: `FONT_SIZES`, `SPACE_SIZES`,
  `BORDER_RADII`, `DISTANCES`, `LINE_HEIGHTS`, `DURATIONS`
  (+ `duration_variants`), `SHADOW_GEOMETRY`, `SHADOW_ALPHAS`,
  `OVERLAY_ALPHAS`.
- Design-time modules `ramps.ts`, `oklch.ts`, `wcag.ts`.
