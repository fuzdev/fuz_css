---
'@fuzdev/fuz_css': minor
---

feat: rework the color system to derived OKLCH with semantic intents and cascade layers

Colors are now derived - curve knobs → ramp stops → color stops - in pure
CSS (`calc()`/`pow()`/`oklch()`), fitted to minimize the perceptual delta
from the old HSL palette.

Breaking changes:

- **`color_` renamed to `palette_`**: `--color_a_50` → `--palette_a_50`,
  `.color_a_50` → `.palette_a_50`, `.color_a`-`.color_j` →
  `.palette_a`-`.palette_j`. In compound families the letter alone implies
  the palette: `border_color_X_NN` → `border_X_NN`, `outline_color_X_NN` →
  `outline_X_NN`, `shadow_color_X_NN` → `shadow_X_NN` (`bg_X_NN` and the
  letterless families — `border_color_NN`, `outline_color_NN`,
  `shadow_color_umbra` — keep their names). In TS:
  `ColorVariant`/`color_variants` → `PaletteVariant`/`palette_variants`.
- **`--hue_a`…`--hue_j` are now OKLCH hue angles** (blue is `250`, not HSL
  `210`). Consumer CSS doing `hsl(var(--hue_x) …)` breaks — use
  `oklch(<l> <c> var(--hue_x))` or the palette/intent stops.
- **`--tint_hue`/`--tint_saturation` removed** → `--hue_neutral` (defaults
  to `var(--hue_f)`) + `--neutral_chroma`.
- **Absolute `_light`/`_dark` variants removed**: the ~286 generated
  variables (`--color_a_50_light`-style, `--shade_XX_light/dark`) and all
  their classes. Write the literal color or define one custom property
  instead.
- **`color-mix()` interpolation moved from `in hsl` to `in oklab`** in
  button fills/borders, composites, and shadow classes.
- **Cascade layers**: all shipped CSS is layered `fuz.base` < `fuz.theme` <
  `fuz.utilities`, so consumers' unlayered styles beat everything. Custom
  `base_css` is re-layered into `fuz.base` in bundled output.

New:

- **Curve knobs** (the promoted theme API): `--chroma_scale`,
  `--palette_lightness_00/_100/_curve` (same trio for `shade_`/`text_`),
  and `--palette_chroma_min/_max/_curve` clamped per stop by baked worst-hue
  sRGB gamut caps, plus per-stop derived variables themes can pin
  individually (`--palette_lightness_NN`, `--palette_chroma_NN`,
  `--chroma_shape_NN`).
- **Semantic intent knobs**: `--hue_accent`, `--hue_positive`,
  `--hue_negative`, `--hue_caution`, `--hue_info`, each deriving a full
  13-stop scale through the shared ramps (`--accent_00`…`--accent_100`,
  etc.) with matching token classes (`.positive_50`, `.bg_caution_10`),
  plus `--selection_color` and `intent_variants`/`IntentVariant` in
  `variable_data.ts`. Links, focus, selection, `accent-color`, and
  disabled-active feedback route through them; focus follows the element
  color (via `--outline_color`) with the accent as fallback.
- **Per-slot chroma character**: `--palette_a_chroma_scale` …
  `--palette_j_chroma_scale` and intent twins (`--accent_chroma_scale`,
  same for positive/negative/caution/info), default `1`, each multiplying
  its slot's chroma under the global `--chroma_scale` so the slot's
  character holds at any global setting — grayscale stays grayscale and
  vivid scales proportionally. Values at or below 1 stay inside the sRGB
  gamut caps by construction; above 1 knowingly clips, like the global
  knob. The brown slot `f` ships at `0.55`: brown is low-chroma dark
  orange, so under uniform chroma it read as a second orange beside
  `--hue_h`. An intent hue bound to a palette letter shares only the angle
  — `validate_theme` warns when the bound letter's multiplier differs from
  the intent's twin, and `check_theme` runs its gates through the
  multipliers.
- **Design-time modules**: `ramps.ts` (fitted knob constants, numeric
  evaluators, CSS emitters), `oklch.ts` (OKLCH↔sRGB + gamut math), and
  `wcag.ts` (luminance/contrast), with tests gating every default stop for
  gamut, monotonicity, and contrast.
