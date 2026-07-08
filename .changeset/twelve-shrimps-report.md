---
'@fuzdev/fuz_css': minor
---

feat: rework the color system to derived OKLCH, add semantic roles, cascade layers, and themes

The color system is now derived: curve knobs → ramp stops → color stops →
utility classes, computed in pure CSS (`calc()`/`pow()`/`oklch()`), fitted to
minimize the perceptual delta from the old HSL palette. Breaking changes:

- **`color_` family renamed to `palette_`**: variables `--color_a_50` →
  `--palette_a_50`, token classes `.color_a_50` → `.palette_a_50`, semantic
  component classes `.color_a`–`.color_j` → `.palette_a`–`.palette_j`, and
  the hue+intensity class families `border_color_X_NN` → `border_palette_X_NN`,
  `outline_color_X_NN` → `outline_palette_X_NN`, `shadow_color_X_NN` →
  `shadow_palette_X_NN`. `bg_X_NN` classes keep their names. The
  `border_color_NN` alpha-ramp family (no hue letter) keeps its names.
- **`--hue_a`…`--hue_j` values reinterpreted** as OKLCH hue angles (blue is
  now `250`, not HSL `210`). Any consumer CSS doing `hsl(var(--hue_x) …)`
  breaks — use `oklch(<l> <c> var(--hue_x))` or the palette/role stops.
- **`--tint_hue`/`--tint_saturation` removed** → `--hue_neutral` (defaults to
  `var(--hue_f)`) + `--neutral_chroma` (peak chroma of the neutral scales).
- **Absolute `_light`/`_dark` variants removed** (~260 generated variables
  like `--color_a_50_light`/`--shade_20_dark` and their classes, including
  `shade_XX_light/dark`). Write the literal color or define one custom
  property instead.
- **New curve knobs** (the promoted theme API): `--chroma_scale`,
  `--hue_shift`, `--palette_lightness_00/_100/_curve` (same trio for
  `shade_`/`text_`), `--palette_chroma_min/_max/_curve` (clamped per stop by
  baked worst-hue sRGB gamut caps), plus derived per-stop variables
  (`--palette_lightness_NN`, `--palette_chroma_NN`, `--chroma_shape_NN`,
  `--hue_shift_NN`) that themes can pin individually.
- **New semantic role knobs**: `--hue_accent`, `--hue_positive`,
  `--hue_negative`, `--hue_caution`, `--hue_info`, with derived role stops
  `--accent_50`, `--accent_60`, `--negative_40`, `--negative_50` and the
  `--selection_color` site variable. Links, focus, selection, selected
  states, `accent-color`, and disabled-active feedback all route through
  them; focus now follows the element color (via `--outline_color`) with the
  accent as fallback.
- **Cascade layers**: all shipped CSS is layered `fuz.base` (defaults) <
  `fuz.theme` (theme overrides) < `fuz.utilities` (generated classes);
  consumers' unlayered styles beat everything. `render_theme_style` lost its
  `specificity` option (the `:root:root` hack) and gained
  `layer?: string | null` (default `'fuz.theme'`); `generate_theme_css` lost
  its specificity parameter; the `theme_specificity` generator option is
  removed.
- **`color-mix()` interpolation moved from `in hsl` to `in oklab`** in button
  fills/borders, composites, and shadow classes.
- **Themes**: one module per theme under `themes/`
  (`@fuzdev/fuz_css/themes/necromancer.ts` etc.); `themes.ts` exports the
  curated `default_themes` registry (base, low contrast, high contrast)
  with unregistered expressive exemplars (necromancer, sunset ember,
  brutalish, terminal green + the `create_terminal_theme(hue)` factory). The contrast themes are rewritten as curve-knob
  overrides.
- **New design-time modules**: `ramps.ts` (fitted knob constants, numeric
  evaluators, CSS emitters), `oklch.ts` (OKLCH↔sRGB + gamut math), `wcag.ts`
  (luminance/contrast), with tests gating every default stop for gamut,
  monotonicity, and contrast (AA/AAA thresholds the old palette partly
  failed).
