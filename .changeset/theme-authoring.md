---
'@fuzdev/fuz_css': minor
---

feat: themes as knob-sets - schema, registry and modifiers, scheme stance, knob catalog, checks, pure renderer, build-time `theme` option

Breaking:

- `Theme` moves to `variable.ts` as a strict zod schema:
  `import type {Theme} from '@fuzdev/fuz_css/variable.ts'` (was
  `theme.ts`). `Theme` and `StyleVariable` reject unknown properties (a
  misspelled slot is an error), a theme's `name` must be non-empty, and
  `parse_theme(value)` returns a theme-or-`null`.
- `RenderThemeStyleOptions.empty_default_theme` removed, and a theme named
  `base` no longer renders empty - it renders its variables like any
  other. Render the defaults with
  `render_theme_style({name: 'base', variables: default_variables})`.
- `theme.ts` no longer exports `render_theme_variable`.
- `render_theme_style` loses `specificity` and gains
  `layer?: string | null` (default `'fuz.theme'`); the `theme_specificity`
  generator option is removed. Summary comments render only with
  `comments: true` (the light block always rendered them). With `id`,
  dark slots render for `#id.dark` and `:root.dark #id` (was
  `#id#id.dark`), so a scoped theme follows the page's scheme.
- A style variable's `light`/`dark` must be a non-blank CSS value that
  can't end its own declaration, and its `summary` must not close a
  comment or hold `</style`. `parse_theme` and `validate_theme` reject a
  value with a top-level `;`, braces, `!important`, a comment, an escape
  or a quote outside a string, unbalanced quotes or brackets, `</style`,
  or an unquoted `url()` holding what only a quoted one may - quote a URL
  that needs those characters.
- `render_theme_style` drops what the schema rejects, and takes any JSON
  value without throwing, for a theme that skipped the schema: a
  `variables` that isn't an array, an entry that isn't an object, a name
  that isn't a plain identifier (`[\w-]+`), and a slot or summary that
  isn't a contained string are left out.
- Spaces, border radii, and shadow alphas derive from `--space_scale`,
  `--radius_scale`, and `--shadow_alpha_scale` (default `1`), and the font
  sizes above `md` (`--font_size_lg` to `--font_size_xl9`) from
  `--type_scale_ratio` (default `1.272`, also `TYPE_SCALE_RATIO` in
  `variable_data.ts`), instead of being literals. Computed values match
  the old ones (font sizes to two decimal places of a rem). The `lg`/`xl`
  size composites read the font sizes, so they follow the ratio.
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
- Knobs `--font_weight`, `--heading_font_weight` (hook; setting it
  flattens the heading ladder), `--heading_font_family`,
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
  `GATE_*` thresholds, the stop-60 labels at AA through
  `GATE_SELECTED_TEXT` and `GATE_PALETTE_TEXT` - the `.palette_X` button
  label against its rest fill, its own color at 8% alpha over
  `shade_00`), `compile_theme` (per-theme chroma caps, each computed
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
