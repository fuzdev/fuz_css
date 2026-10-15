---
'@fuzdev/fuz_css': minor
---

**breaking** feat: rename the `StyleVariable` `light` slot to `base`

The slot a variable renders on `:root` was called `light`, but it applies in both color schemes, with `dark` replacing it in the dark scheme only - `{name: 'chroma_scale', light: '1.25'}` was never light-only. It's now `base`: `{name: 'chroma_scale', base: '1.25'}`. Rendering is unchanged.

Every API that reads or writes a slot follows: the `StyleVariable` and `Theme` schemas, `default_variables` and `scheme_adaptive_variables`, the shipped themes, `pick_stance_slot`, `overlay_style_variable`, `compose_themes`, the stance mirror from `resolve_theme_stance`, the cap overrides `compile_theme` emits, and `validate_theme`'s knob warnings, which name the slot as `base` (`chroma_scale base 5 is outside the safe range ...`). The schema refines read `must have at least one of base or dark` and `base and dark must differ when both specified`. In `variable_graph.ts`, `StyleVariableInfo`'s `light_deps`, `light_css`, and `dark_css` are now `base_deps`, `base_value`, and `dark_value` (they hold values, not CSS), and `generate_theme_css` returns `{root_css, dark_css}`, `root_css` being the `:root` block it renders.

Breaking: rename `light:` to `base:` in every theme and variable you author, including the `variables` callback and `theme` option of the Vite plugin. A theme saved as JSON with `light` keys no longer renders its base values: the strict schemas reject the unknown key, so `parse_theme` returns `null`, and `render_theme_style` skips it, rendering only the `dark` slots. fuz_ui's `ThemeRoot` is where a stored theme hits this: it restores the theme it saved to `localStorage` under `fuz:theme` without parsing it, so a theme saved before this release renders only its `dark` slots. Rename the key in stored themes, or re-pick the theme so it's saved again.
