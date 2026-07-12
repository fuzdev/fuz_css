---
'@fuzdev/fuz_css': minor
---

feat: add theme scale knobs, the knob catalog, and theme validation/gates/compile

New high-leverage theme knobs, each derived into existing token defaults so
one knob move reshapes a whole family while individual tokens stay pinnable:

- `--shadow_alpha_scale` — multiplies the `shadow_alpha_*` ramp (0 flattens
  all shadows including button shadows, which reference the ramp)
- `--radius_scale` — multiplies the `border_radius_*` tiers (0 is sharp,
  above 1 is rounder; per-element tiers survive)
- `--scale_factor` — multiplies the `space_*` scale (tight ↔ spacious)
- `--font_weight` — base body font weight (applied on `body`)
- `--heading_font_weight` — a hook with per-tier fallbacks (h1 300 … h5 900);
  setting it flattens the heading weight ladder deliberately
- `--heading_font_family` — headings' font family (defaults to
  `var(--font_family_serif)`)
- `--background_image` — decoration hook on `:root` for gradient skies,
  vignettes, and textures (defaults to `none`)

New `knobs.ts` module: `theme_knobs`, a typed catalog of the theme-facing
knobs (`kind`, `axis`, `leverage`, `tier`, `bindable`, ranges, and the
`knob_axes` display order), which powers the inline theme editor on the
themes docs page. `variable_data.ts` gains `palette_glosses`, the letter →
color/default-intent-binding display data.

New `theme_check.ts` module with three functions that resolve a theme's
authored values back to numbers — numeric literals, `var(--hue_x)` binding
chains, and compiled-cap overrides — with knob defaults falling through to
the numeric twin in `ramps.ts`:

- `validate_theme` — the structural lint: non-empty name, `StyleVariable`
  shape, and known variable names as errors, plus advisory type/range
  warnings for the knob-tier variables.
- `check_theme` — evaluates the gamut, ramp-monotonicity, and contrast gates
  (the same thresholds the repo's tests assert for the defaults) against an
  arbitrary theme. Report-only, never throws.
- `compile_theme` — recomputes each theme's per-stop worst-hue chroma caps
  from its own hues, lightness ramp, and hue shift, then emits
  `palette_chroma_NN` overrides where the baked caps no longer fit (a
  rotated, monochrome, or dark-only theme), and re-checks the result.

The gate thresholds are exported constants (`GATE_BODY_TEXT`,
`GATE_SUBTLE_TEXT`, `GATE_LINK`, `GATE_UI`, `GATE_FILL_TEXT`). `ramps.ts`
gains `ramp_hue_shift_offset` (the numeric twin of the hue-shift CSS
emitter) and `compute_palette_chroma_caps` (the generalized worst-hue cap
search behind the baked table and the compile step); `ramp_chroma` and
`render_chroma_stop_css` take optional knob/cap parameters.
