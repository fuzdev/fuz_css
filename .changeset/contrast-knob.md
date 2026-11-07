---
'@fuzdev/fuz_css': minor
---

break: replace the contrast modifiers' knob overrides with a single `--contrast` knob

`--contrast` is a new theme knob, 0 to 1, default 0: the fraction of the way the shade ground moves from the theme's own `--shade_lightness_00` toward a per-scheme end (1 in light, 0.1 in dark, clamped to the ground so a ground already past it stays put), with the shade and text lightness curves bending with it. The neutral stops read private intermediates (`--_shade_lightness_00`, `--_shade_lightness_curve`, `--_text_lightness_curve`) in place of those knobs, so the knobs keep their meaning and the palette is untouched. At the default every color renders exactly as before.

- `high_contrast_theme` now sets only `contrast`, to `HIGH_CONTRAST` (0.5, exported from `ramps.ts`). It no longer sets `shade_lightness_00`, `text_lightness_curve`, `border_color`, `link_color`, or `panel_shadow`: a theme keeps its own ground, cast, borders, links, and panel shadow under it, strengthened rather than replaced. Picking it sets `contrast` to 0.5, as picking a theme sets its knobs, so it replaces a theme's own `contrast`, a higher one included. The modifier no longer forces a white ground: the ground moves halfway toward its scheme's end, so a tinted ground such as parchment's keeps part of its tint, and the control borders reach 3:1 against the ground through the bent shade curve, body text 12:1, on every shipped theme in both schemes.
- `low_contrast_theme` and `contrast_modifiers.low` are removed, and `ContrastModifiers` is `{high}`.
- The `prefers-contrast: more` mapping in `style.css` sets `--_contrast_preference: 0.5` instead of the five variables it restated from the modifier. The effective contrast is the larger of `--contrast` and that preference, so the OS preference and the modifier render the same derivation, a theme can author its own `contrast` baseline, no theme can silence the preference, and stanced themes respond to it too.
