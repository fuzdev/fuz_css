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
- `theme.ts` no longer exports `render_theme_variable`.
- `render_theme_style` loses `specificity` and gains
  `layer?: string | null` (default `'fuz.theme'`); `generate_theme_css`
  loses its specificity parameter; the `theme_specificity` generator option
  is removed.
- A style variable's `light`/`dark` must be a non-blank, contained CSS
  value, and its `summary` must not close a comment: `parse_theme` and
  `validate_theme` reject a value that could end its own declaration (a
  top-level `;`, braces, `!important`, a comment, an escape or a quote
  outside a string, an unquoted `url()` holding what a quoted one would,
  unbalanced quotes or brackets, `</style`), and `render_theme_style`
  drops one. Quote a URL that needs those characters. `render_theme_style` takes any JSON value without
  throwing, for a theme that skipped the schema: what isn't the declared
  type is dropped (a `variables` that isn't an array, an entry that isn't
  an object, a name, slot, or summary that isn't a string).
- The font sizes above `md` (`--font_size_lg` to `--font_size_xl9`) derive
  from `--type_scale_ratio` (default `1.272`, also `TYPE_SCALE_RATIO` in
  `variable_data.ts`) instead of being literals. Computed sizes match the
  old values to two decimal places of a rem. The `lg`/`xl` size composites
  read those sizes, so they follow the ratio.
- `default_themes` is base and ledger. Low/high contrast are
  `contrast_modifiers`, composed over a theme with
  `compose_themes(base, ...overlays)`.

New:

- `Theme.scheme?: 'dual' | 'light' | 'dark'` (`ThemeScheme`). Author a
  single-scheme theme single-slot and pass it through
  `resolve_theme_stance` (`theme_stance.ts`), which fills `scheme_mirror`;
  the renderer pins `color-scheme`.
- Themes under `themes/`, one export per module (`base_theme`,
  `ledger_theme`, `zine_theme`, ...): ledger (registered), and the
  exemplars zine, pebble, parchment, phosphor (dark-only), guestbook,
  marquee (dark-only), timetable.
- Composition helpers in `theme.ts`: `compose_themes`, the slot merge it
  shares with the build-time overlay (`overlay_style_variable`),
  `pick_stance_slot`, `to_theme_stance`, and `FUZ_LAYER_ORDER_STATEMENT`; in
  `theme_stance.ts`, `scheme_stance_variables`; the generated
  `scheme_adaptive_variables`.
- `css_containment.ts`: `css_value_is_contained`, `css_comment_is_contained`,
  and `css_custom_property_name_is_contained`, the checks the schema and
  the renderer share.
- Scale knobs `--shadow_alpha_scale`, `--radius_scale`, `--space_scale`,
  `--type_scale_ratio`, `--font_weight`, `--heading_font_weight` (hook;
  setting it flattens the ladder), `--heading_font_family`,
  `--heading_letter_spacing` (headings read it, default `normal`),
  `--background_image`.
- `shadow_css.ts`: `render_shadow_css(shape, size, color, alpha)` builds one
  `box-shadow` layer from the shadow tokens, for authoring
  `--button_shadow`, `--pane_shadow`, and `--panel_shadow`; `ShadowShape`.
- `knobs.ts`: the typed knob catalog (`theme_knobs`, `theme_knob_by_name`,
  `theme_knob_axes`, `theme_knob_hook_names`); `palette_glosses` and
  `format_palette_gloss` in `variable_data.ts`.
- Theme checks over one resolution core (`theme_resolver.ts`,
  `create_theme_resolver`): `validate_theme(unknown)` in `theme_validate.ts`,
  which among its warnings flags an accent hue within
  `ACCENT_STATUS_HUE_SEPARATION` degrees of a status hue (intents at one hue
  render the same color), with `known_theme_variable_names`; and in
  `theme_check.ts`, `check_theme` (gamut, monotonicity, contrast gates;
  `GATE_*` thresholds), `compile_theme` (per-theme chroma caps, each computed
  at the lightness its stop resolves to), and `theme_gate_role_names`.
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
  `apply_theme_variables` is exported from `variable_graph.ts`. With
  `variables: null` the theme isn't emitted, and the warning
  `theme_discarded` says so.
- `theme.ts` no longer imports `variables.ts` (~1.3KB minified, was ~38KB).
