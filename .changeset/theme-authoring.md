---
'@fuzdev/fuz_css': minor
---

feat: themes as validated knob-sets, with exemplars and a build-time `theme` option

Breaking:

- `Theme` moves to `variable.ts` as a strict zod schema:
  `import type {Theme} from '@fuzdev/fuz_css/variable.ts'` (was
  `theme.ts`). `Theme` and `StyleVariable` reject unknown properties (a
  misspelled slot is an error), and a theme's `name` must be non-empty.
- `RenderThemeStyleOptions.empty_default_theme` removed: a theme named
  `base` renders its own variables like any other (it rendered nothing,
  or the defaults with `empty_default_theme: false`). Render the defaults
  as `theme.css` does with `render_theme_style({name: 'base', variables:
  default_variables}, {layer: 'fuz.base'})`.
- `theme.ts` drops `render_theme_variable`, and `render_theme_style`
  trades `specificity` for `layer?: string | null` (default
  `'fuz.theme'`). Summary comments render only with `comments: true` (the
  light block always rendered them). With `id`, dark slots render for
  `#id.dark` and `:root.dark #id` (was `#id#id.dark`), so a scoped theme
  follows the page's scheme, and the id is escaped into the selector
  (`escape_css_identifier`), so any string matches the element with that
  `id` and none can end the rule.
- A style variable's `light`/`dark` must be a non-blank CSS value that
  can't end its own declaration, and its `summary` must not close a
  comment or hold `</style`. `parse_theme` and `validate_theme` reject a
  value with a top-level `;`, braces, a `!`, a comment, an escape
  or a quote outside a string, unbalanced quotes or brackets, `</style`,
  or an unquoted `url()` holding what only a quoted one may - quote a URL
  that needs those characters.
- `render_theme_style` drops what the schema rejects, and takes any JSON
  value without throwing, for a theme that skipped the schema: a
  `variables` that isn't an array, an entry that isn't an object, a name
  that isn't a plain identifier (`[\w-]+`), and a slot or summary that
  isn't a contained string are left out.
- The `default_variables` spaces, border radii, and shadow alphas are
  `calc()` expressions over the new knobs `--space_scale`,
  `--radius_scale`, and `--shadow_alpha_scale` (default `1`), the border
  radii floored by `--border_radius_min` (default `0rem`), and every font
  size over `--font_size_scale` (default `1`), with the sizes above `md`
  (`--font_size_lg` to `--font_size_xl9`) also over `--type_scale_ratio`
  (default `1.272`, also `TYPE_SCALE_RATIO` in `variable_data.ts`),
  instead of literals. Computed values match the old ones (font sizes to
  two decimal places of a rem). The `lg`/`xl` size composites read the
  font sizes, so they follow the ratio.
- `body` reads `--font_size_md` (was a fixed `1.6rem`), so
  `--font_size_scale` moves body text.
- Buttons and form fields take their corner radius from
  `--control_radius` (default `var(--border_radius_sm)`, was the
  `--border_radius_sm` token directly), so a contextual
  `--border_radius_sm` no longer reaches them; the per-element
  `--border_radius` hook still does. Checkboxes keep `--border_radius_xs`.
- `default_themes` is base and ledger. Low/high contrast are
  `contrast_modifiers`, composed over a theme with
  `compose_themes(base, ...overlays)`.

New:

- `parse_theme(value)` (`variable.ts`) returns a theme-or-`null`, for
  untrusted input.
- `Theme.scheme?: 'dual' | 'light' | 'dark'` (`ThemeScheme`). Author a
  single-scheme theme single-slot and pass it through
  `resolve_theme_stance` (`theme_stance.ts`), which fills `scheme_mirror`
  (idempotent; recomputes a stale mirror); the renderer pins
  `color-scheme`. `validate_theme` warns when a stanced theme's mirror is
  missing or no longer matches the defaults.
- `Theme.summary?: string`, a sentence for theme pickers to show beside
  the name (never rendered into CSS), leading with who the theme is for.
  Every shipped theme except the contrast modifiers carries one, and
  `compose_themes` keeps the base's.
- Themes under `themes/`, one export per module (`base_theme`,
  `ledger_theme`, `zine_theme`, ...): ledger (registered), the exemplars
  zine, pebble, parchment, phosphor (dark-only), guestbook, marquee
  (dark-only), signage, and the contrast modifiers `low_contrast_theme`
  and `high_contrast_theme`.
- Composition helpers: `compose_themes`, `overlay_style_variable` (the
  slot merge it shares with the build-time overlay), `pick_stance_slot`,
  and `to_theme_stance` in `theme.ts`; `scheme_stance_variables` and
  `scheme_mirrors_equal` in `theme_stance.ts`.
- `css_containment.ts`: `css_value_is_contained`, `css_comment_is_contained`,
  and `css_custom_property_name_is_contained`, the checks the schema and
  the renderer share, and `escape_css_identifier`.
- Knobs `--font_weight`, `--heading_font_weight` (hook; setting it
  flattens the heading ladder), `--heading_font_family`,
  `--heading_letter_spacing` (headings read it, default `normal`),
  `--background_image`, `--font_size_scale`, `--border_radius_min`,
  `--control_radius`, and `--shade_chroma_00` (the page ground's chroma,
  default `0`: the neutral's chroma shape is 0 at the ground, so
  `--neutral_chroma` alone tints surfaces but never the page).
- `shadow_css.ts`: `render_shadow_css(shape, size, color, alpha)` builds one
  `box-shadow` layer from the shadow tokens, for authoring
  `--button_shadow`, `--pane_shadow`, and `--panel_shadow`; `ShadowShape`.
- `knobs.ts`: the typed knob catalog (`theme_knobs`, `theme_knob_by_name`,
  `theme_knob_axes`, `theme_knob_hook_names`).
- Theme checks over one resolution core (`create_theme_resolver`,
  `theme_resolver.ts`): `validate_theme(unknown)` (`theme_validate.ts`,
  with `known_theme_variable_names`) lints the shape and warns when the
  accent sits within `ACCENT_STATUS_HUE_SEPARATION` (20) degrees of a
  status hue; `check_theme` (`theme_check.ts`) runs gamut, monotonicity, and
  contrast gates at the `GATE_*` thresholds over the role variables the
  default styles paint through (`theme_gate_role_names`), reporting what
  it can't evaluate as `unchecked` - `ok` is true only when nothing fails
  or is unchecked; `compile_theme` emits per-theme chroma caps at each
  stop's resolved lightness.
- Generators take `theme`, baked into the output and tree-shaken:
  `vite_plugin_fuz_css({theme: phosphor_theme})`. It renders into the
  `fuz.theme.baked` sublayer (`FUZ_BAKED_THEME_LAYER`, with the layer
  order in `FUZ_LAYER_ORDER_STATEMENT`), so fuz_ui's `ThemeRoot` still
  wins at runtime. With `variables: null` the theme isn't emitted, and the
  warning `theme_discarded` says so.
- `theme.ts` no longer imports `variables.ts`, so mounting a theme costs
  ~1.3KB minified (was ~38KB).
