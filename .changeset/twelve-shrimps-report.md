---
'@fuzdev/fuz_css': minor
---

feat: rework the color system to derived OKLCH, add semantic intents, cascade layers, and themes

The color system is now derived: curve knobs → ramp stops → color stops →
utility classes, computed in pure CSS (`calc()`/`pow()`/`oklch()`), fitted to
minimize the perceptual delta from the old HSL palette. Breaking changes:

- **`color_` family renamed to `palette_`**: variables `--color_a_50` →
  `--palette_a_50`, token classes `.color_a_50` → `.palette_a_50`, and semantic
  component classes `.color_a`–`.color_j` → `.palette_a`–`.palette_j`. In
  compound class families the letter alone implies the palette:
  `border_color_X_NN` → `border_X_NN`, `outline_color_X_NN` → `outline_X_NN`,
  `shadow_color_X_NN` → `shadow_X_NN`, and `bg_X_NN` keeps its name. The
  letterless families are unchanged (`border_color_NN` alpha ramp,
  `outline_color_NN` shade outlines, `shadow_color_umbra` semantic colors).
  At the TS level, the letter list in `variable_data.ts` renames with the
  family: `ColorVariant`/`color_variants` → `PaletteVariant`/`palette_variants`.
- **`--hue_a`…`--hue_j` values reinterpreted** as OKLCH hue angles (blue is
  now `250`, not HSL `210`). Any consumer CSS doing `hsl(var(--hue_x) …)`
  breaks — use `oklch(<l> <c> var(--hue_x))` or the palette/intent stops.
- **`--tint_hue`/`--tint_saturation` removed** → `--hue_neutral` (defaults to
  `var(--hue_f)`) + `--neutral_chroma` (peak chroma of the neutral scales).
- **Absolute `_light`/`_dark` variants removed**: the ~286 generated
  variables (`--color_a_50_light`-style, including `--shade_XX_light/dark`)
  and all their classes — `color_X_NN_light/dark`, `bg_X_NN_light/dark`, and
  `shade_NN_light/dark`. Write the literal color or define one custom
  property instead.
- **New curve knobs** (the promoted theme API): `--chroma_scale`,
  `--hue_shift`, `--palette_lightness_00/_100/_curve` (same trio for
  `shade_`/`text_`), `--palette_chroma_min/_max/_curve` (clamped per stop by
  baked worst-hue sRGB gamut caps), plus derived per-stop variables
  (`--palette_lightness_NN`, `--palette_chroma_NN`, `--chroma_shape_NN`,
  `--hue_shift_NN`) that themes can pin individually.
- **New semantic intent knobs**: `--hue_accent`, `--hue_positive`,
  `--hue_negative`, `--hue_caution`, `--hue_info`, each deriving a full
  13-stop scale through the shared ramps (`--accent_00`…`--accent_100`, same
  for positive/negative/caution/info) with matching lazily-generated text and
  background token classes (`.positive_50`, `.bg_caution_10`), plus the
  `--selection_color` site variable and the `intent_variants`/`IntentVariant`
  list in `variable_data.ts`. Links, focus, selection, selected states,
  `accent-color`, and disabled-active feedback all route through them; focus
  now follows the element color (via `--outline_color`) with the accent as
  fallback.
- **Cascade layers**: all shipped CSS is layered `fuz.base` (defaults) <
  `fuz.theme` (theme overrides) < `fuz.utilities` (generated classes);
  consumers' unlayered styles beat everything. `render_theme_style` lost its
  `specificity` option (the `:root:root` hack) and gained
  `layer?: string | null` (default `'fuz.theme'`); `generate_theme_css` lost
  its specificity parameter; the `theme_specificity` generator option is
  removed. `render_theme_style`'s default-theme special case now keys on
  empty `variables` rather than the `'base'` name — a theme that carries
  variables always renders them regardless of its name; an empty theme still
  renders nothing by default and the full `default_variables` set under
  `empty_default_theme: false`. Custom `base_css` input is re-layered into
  `fuz.base` in bundled output — its own `@layer` identities aren't
  preserved.
- **`color-mix()` interpolation moved from `in hsl` to `in oklab`** in button
  fills/borders, composites, and shadow classes.
- **Themes**: one module per theme under `themes/`
  (`@fuzdev/fuz_css/themes/necromancer.ts` etc.); `themes.ts` exports the
  curated `default_themes` registry (base, low contrast, high contrast)
  with unregistered expressive exemplars (necromancer, sunset ember,
  brutalish, terminal green + the `create_terminal_theme(hue)` factory).
  The contrast themes are rewritten as curve-knob overrides.
- **New design-time modules**: `ramps.ts` (fitted knob constants, numeric
  evaluators, CSS emitters), `oklch.ts` (OKLCH↔sRGB + gamut math), `wcag.ts`
  (luminance/contrast), with tests gating every default stop for gamut,
  monotonicity, and contrast (AA/AAA thresholds the old palette partly
  failed).
