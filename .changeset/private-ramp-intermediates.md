---
'@fuzdev/fuz_css': minor
---

**breaking** feat: give the ramp intermediates a private spelling that themes can't set

The derived ramp stops between the knobs and the color stops are internal now, spelled with a leading underscore, and a theme can no longer pin one. Themes steer the ramps through their knobs (`--palette_lightness_00`/`_100`/`_curve` and the `shade_`/`text_` twins, `--palette_chroma_min`/`_max`, `--chroma_curve`) and can still pin a color stop like `--palette_a_50` directly. Rendered values are unchanged.

- `--palette_lightness_NN`, `--shade_lightness_NN`, `--text_lightness_NN` (stops `05` through `95`) → `--_palette_lightness_NN`, `--_shade_lightness_NN`, `--_text_lightness_NN`; the `00`/`100` endpoints are the knobs and keep their names
- `--chroma_shape_NN` → `--_chroma_shape_NN`
- `--palette_chroma_NN` → `--_palette_chroma_NN`

`STYLE_VARIABLE_NAME_MATCHER` rejects the leading underscore, so `parse_theme` and the `Theme` schema refuse a theme that sets an intermediate, and `validate_theme` reports it as an internal ramp variable. A theme still naming one by its old spelling gets an unknown-variable error that points at the knobs. `known_theme_variable_names` leaves the intermediates out, and `INTERNAL_VARIABLE_NAME_MATCHER` in `variable.ts` matches the private spelling.

`check_theme` and `compile_theme` derive every intermediate from the knobs, so a theme's caps follow the lightness its endpoint and curve knobs give each stop. A theme that carries an intermediate anyway, skipping the schema, has it dropped the same way: `render_theme_style` doesn't render it, and the gates measure the derived value the page renders. The `ramps.ts` helpers `to_lightness_stop_name`, `to_chroma_shape_name`, and `to_palette_chroma_name` build the names, and `CSS_NUMBER_PATTERN` moves from `theme_resolver.ts` to `ramps.ts`.

Breaking: a theme that pinned an intermediate loses the pin - move the endpoint or curve knobs instead, or pin the color stops it was shaping. A `var()` read of an intermediate in your own CSS needs the new spelling, and is unsupported: the intermediates can change shape between releases.
