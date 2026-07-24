---
'@fuzdev/fuz_css': minor
---

feat: add theme scale knobs, the knob catalog, validation/gates/compile, and the scheme stance

New theme knobs, each derived into existing token defaults so one knob move
reshapes a whole family while individual tokens stay pinnable:
`--shadow_alpha_scale` (multiplies the `shadow_alpha_*` ramp, including
button shadows), `--radius_scale` (multiplies the `border_radius_*` tiers),
`--scale_factor` (multiplies the `space_*` scale), `--font_weight` (body),
`--heading_font_weight` (a hook with per-tier fallbacks - setting it
flattens the heading ladder), `--heading_font_family`, and
`--background_image` (decoration hook on `:root`).

New `knobs.ts`: `theme_knobs`, a typed catalog of the theme-facing knobs
(`kind`, `axis`, `leverage`, `tier`, `bindable`, ranges), which powers the
inline theme editor on the themes docs page. `variable_data.ts` gains
`palette_glosses`, the letter → color/default-intent display data.

New `theme_check.ts`, resolving a theme's authored values back to numbers
(literals, `var(--hue_x)` binding chains, compiled-cap overrides):

- `validate_theme` — structural lint: shape and unknown-name errors, plus
  advisory type/range warnings for the knob-tier variables
- `check_theme` — report-only gamut, ramp-monotonicity, and contrast gates
  (the same thresholds the repo's tests assert, exported as the `GATE_*`
  constants)
- `compile_theme` — recomputes per-stop worst-hue chroma caps from a theme's
  own hues, lightness ramp, and hue shift, emits `palette_chroma_NN`
  overrides where the baked caps no longer fit, and re-checks the result

`ramps.ts` gains `ramp_hue_shift_offset` and `compute_palette_chroma_caps`.
The `'low contrast'` registry theme's shade compression is retuned to the
softest values that pass every `check_theme` contrast gate.

New scheme stance: `Theme` gains `scheme?: 'dual' | 'light' | 'dark'`
(default `'dual'`). A single-scheme theme renders its one appearance in both
color schemes: `render_theme_style` mirrors every scheme-adaptive default
the theme doesn't override (exported as `scheme_stance_variables`, including
the `palette_chroma_NN` gamut-cap stops) and pins `color-scheme` on the
scope so form controls and native scrollbars agree. Author a stanced theme's
own variables single-slot in the light/base position. `validate_theme` warns
on dark slots a single-scheme stance makes meaningless;
`check_theme`/`compile_theme` resolve through the same mirror so the gates
evaluate the stanced reality in both schemes. The necromancer and terminal
exemplars use the stance instead of hand-mirrored ramp knobs.
