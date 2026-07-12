---
'@fuzdev/fuz_css': minor
---

feat: add the theme scheme stance

`Theme` gains `scheme?: 'dual' | 'light' | 'dark'` (default `'dual'`). A
single-scheme theme renders that appearance in both color schemes:
`render_theme_style` mirrors every scheme-adaptive default the theme doesn't
override (including the `palette_chroma_NN` gamut-cap stops, so the mirrored
scheme gets correct caps) and pins `color-scheme` on the scope so form
controls and native scrollbars agree. The mirror is exported as
`scheme_stance_variables`. A stanced theme's own variables are best authored
single-slot in the light/base position.

`validate_theme` checks the field, and `check_theme`/`compile_theme` resolve
through the same mirror so the gates and cap recomputation evaluate the
stanced reality in both schemes. The necromancer and terminal exemplars use
the stance instead of hand-mirrored ramp knobs.
