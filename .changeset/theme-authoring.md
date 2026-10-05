---
'@fuzdev/fuz_css': minor
---

feat: themes as knob-sets - schema, registry and modifiers, scheme stance, knob catalog, checks, pure renderer, build-time `theme` option

Breaking:

- `Theme` moves to `variable.ts` as a strict zod schema:
  `import type {Theme} from '@fuzdev/fuz_css/variable.ts'` (was
  `theme.ts`). Unknown properties are errors; `parse_theme(value)` returns
  a theme-or-`null`.
- `RenderThemeStyleOptions.empty_default_theme` removed - pass the defaults:
  `render_theme_style({name: 'base', variables: default_variables})`.
- `render_theme_style` loses `specificity` and gains
  `layer?: string | null` (default `'fuz.theme'`); `generate_theme_css`
  loses its specificity parameter; the `theme_specificity` generator option
  is removed.
- A style variable's `light`/`dark` must be a contained CSS value, and its
  `summary` must not close a comment: `parse_theme` and `validate_theme`
  reject a value that could end its own declaration (a top-level `;`,
  braces, `!important`, a comment, unbalanced quotes or brackets,
  `</style`), and `render_theme_style` drops one. Quote a URL that needs
  those characters.
- `default_themes` is just base. Low/high contrast are `contrast_modifiers`,
  composed over a theme with `compose_themes(base, ...overlays)`.

New:

- `Theme.scheme?: 'dual' | 'light' | 'dark'` (`ThemeScheme`). Author a
  single-scheme theme single-slot and pass it through
  `resolve_theme_stance` (`theme_stance.ts`), which fills `scheme_mirror`;
  the renderer pins `color-scheme`.
- Exemplar themes under `themes/`: smolder, parchment, concrete, nineties,
  phosphor (dark-only), neon (dark-only).
- Scale knobs `--shadow_alpha_scale`, `--radius_scale`, `--scale_factor`,
  `--font_weight`, `--heading_font_weight` (hook; setting it flattens the
  ladder), `--heading_font_family`, `--background_image`.
- `knobs.ts`: the typed knob catalog (`theme_knobs`, `theme_knob_by_name`,
  `theme_knob_axes`); `palette_glosses` in `variable_data.ts`.
- `theme_check.ts`: `validate_theme(unknown)`, `check_theme` (gamut,
  monotonicity, contrast gates; `GATE_*` thresholds), `compile_theme`
  (per-theme chroma caps, each computed at the lightness its stop resolves
  to), `create_theme_resolver`, `known_theme_variable_names`,
  `theme_gate_role_names`.
  `check_theme().ok` is true only when every gate passes and nothing is
  `unchecked`: a gate input that can't be evaluated is reported there
  instead of passing unread. The contrast gates follow the role variables
  the default styles paint through (`theme_gate_role_names`: `text_color`,
  `link_color`, `border_color`, ...), and a directly authored color stop or
  role is measured as written when it is an `oklch(L C H)` numeric literal
  or an exact `var()` reference to a color the gates evaluate.
- Generators take `theme`, baked into the output and tree-shaken:
  `vite_plugin_fuz_css({theme: phosphor_theme})`. Composes with fuz_ui's
  `ThemeRoot`: the baked theme renders into the `fuz.theme.baked` sublayer
  (`FUZ_BAKED_THEME_LAYER`), so the runtime theme wins.
  `apply_theme_variables` is exported from `variable_graph.ts`.
- `theme.ts` no longer imports `variables.ts` (~1.3KB minified, was ~38KB).
