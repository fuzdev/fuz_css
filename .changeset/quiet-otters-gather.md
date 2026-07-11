---
'@fuzdev/fuz_css': minor
---

feat: add theme validation, numeric-twin accessibility gates, and a compile step

New `theme_check.ts` module with three functions over a shared numeric
resolution core that turns a theme's authored CSS back into numbers (knob
defaults from the `ramps.ts` numeric twin, `var(--x)` bindings recursed with a
cycle guard, and the machine-emitted compiled-cap `min(calc(...), <n>)` form):

- `validate_theme` — the structural lint: non-empty name, `StyleVariable`
  shape, and known variable names as errors, plus advisory type/range warnings
  for the knob-tier variables.
- `check_theme` — evaluates the gamut, ramp-monotonicity, and contrast gates
  (the same thresholds `ramps.test.ts` asserts for the defaults) against an
  arbitrary theme, resolved through its bindings. Report-only, never throws.
- `compile_theme` — recomputes each theme's per-stop worst-hue chroma caps
  from its own hues, lightness ramp, and hue shift, then emits
  `palette_chroma_NN` overrides where the baked caps no longer fit (a rotated,
  monochrome, or dark-only theme), and re-checks the result.

The gate thresholds (`GATE_BODY_TEXT`, `GATE_SUBTLE_TEXT`, `GATE_LINK`,
`GATE_UI`, `GATE_FILL_TEXT`) move to `theme_check.ts` as exported constants.
`ramps.ts` gains `ramp_hue_shift_offset` (the numeric twin of the hue-shift
CSS emitter) and `compute_palette_chroma_caps` (the generalized worst-hue cap
search behind the baked table and the compile step); `ramp_chroma` and
`render_chroma_stop_css` take optional knob/cap parameters.
