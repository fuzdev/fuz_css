---
'@fuzdev/fuz_css': minor
---

feat: catalog the contextual hooks the base styles read

The custom properties `style.css` and the class definitions read without declaring them as variables - `--flow_margin`, `--font_size`, `--border_radius`, `--icon_size`, `--fill`, the `--button_*`, `--menuitem_*`, `--checkbox_content*`, `--thumb_*`, and `--clickable_*` hooks, `--chip_padding_x`, `--select_arrow_size`, `--shadow`, `--shadow_color`, `--shadow_alpha`, and `--overflow` - are cataloged in the new `style_hooks.ts` as the stable contextual surface. Each `StyleHook` entry names what reads it and the `var()` fallbacks that render where nothing sets it, or marks it `local` when the reading rule declares it itself, so a value reaches it only from a rule on the same element. Hooks still have no `:root` defaults. The variables docs page lists them.

`validate_theme` reports a hook a theme sets as a warning instead of an unknown variable: a theme's root value retunes every element reading an inherited hook and never reaches a local one, so hooks belong on elements and themes turn the knobs. `known_theme_variable_names` still leaves them out.

`.clickable` reads `--clickable_transform_origin` and `--clickable_transition_duration` with fallbacks now, `center` and `0s`, which render as before where they're unset.
