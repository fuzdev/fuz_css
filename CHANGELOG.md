# @fuzdev/fuz_css

## 0.66.0

### Minor Changes

- **breaking** refactor: the `oklch.ts` module moves to `@fuzdev/fuz_util/oklch.ts` — import `Oklch`, `RgbUnit`, `oklch_to_srgb`, `oklch_max_srgb_chroma`, and the rest from there; the `@fuzdev/fuz_util` peer dependency is now `>=0.72.0` ([b7f1deb](https://github.com/fuzdev/fuz_css/commit/b7f1deb))

### Patch Changes

- fix: zine's dark ground is near-black (`0.15`), not pure black, so high contrast deepens it and panels stay visible ([8fa1650](https://github.com/fuzdev/fuz_css/commit/8fa1650))

## 0.65.3

### Patch Changes

- fix: bundled mode includes theme variables referenced by imported CSS files, including dependencies' - `filter_file_default` accepts `.css` files, scanned for `var()` references only ([b1246fe](https://github.com/fuzdev/fuz_css/commit/b1246fe))

## 0.65.2

### Patch Changes

- fix: the `body` min-height is `100svh` (was `100vh`), so a short page no longer scrolls by the toolbar's height on mobile browsers ([f6dfce8](https://github.com/fuzdev/fuz_css/commit/f6dfce8))

## 0.65.1

### Patch Changes

- fix: a `@fuz-classes` hint or `additional_classes` entry naming a class only base styles define (like `selected`, `palette_a`, or a class in a custom `base_css`) no longer errors when base styles are bundled, since the hint ships the rules that target it ([f9b194b](https://github.com/fuzdev/fuz_css/commit/f9b194b))
- fix: a `chip` keeps its element's own font size (`small`, `sub`, `sup`, `legend`) when no size composite, `font_size_*` class, or heading sets a size context, instead of inheriting its parent's ([f2c25c9](https://github.com/fuzdev/fuz_css/commit/f2c25c9))
- fix: `button.unstyled` inherits its font (family, size, and line height) like `input`, `textarea`, and `select` do, instead of the browser's button font ([a5fde51](https://github.com/fuzdev/fuz_css/commit/a5fde51))

## 0.65.0

### Minor Changes

- feat: rework base styles - cascade layers, interaction states, surface variables, stop-60 labels ([4cea28a](https://github.com/fuzdev/fuz_css/commit/4cea28a))

  Breaking:

  - Shipped CSS is layered: `style.css` and the default variables in
    `fuz.base` < OS preference mappings in `fuz.preferences` < themes in
    `fuz.theme` < generated utilities in `fuz.utilities`. Unlayered styles
    beat all of it, utility classes included, except `[hidden]` and the
    `prefers-reduced-motion` duration reset, now `!important` in
    `fuz.preferences` so a theme or `:root` rule can't re-enable motion; set
    a duration on the element that needs one.
  - `body` reads `--font_family` (default `var(--font_family_sans)`) instead
    of `--font_family_sans`; set `--font_family` for a serif body. `body`
    also declares `font-weight: var(--font_weight)` and headings
    `letter-spacing: var(--heading_letter_spacing)`, so an ancestor's
    `font-weight` or `letter-spacing` no longer inherits into them.
  - Buttons read `--button_border_style` (default `var(--border_style)`) and
    `--button_border_style_active` while pressed, and disabled buttons set
    `--button_border_style: solid dashed`. A contextual `--border_style` on
    an ancestor no longer reaches buttons - set the button knobs there too.
  - Colored labels move to stop 60, the text-safe stop links use, so they
    meet AA at rest: `.palette_X` buttons use `palette_X_60` for the label,
    fill, border, and outline (was stop 50, fill 40), `.chip.palette_X`
    labels use `palette_X_60` (and set `--text_color`, so nested code
    inherits it), and `label.selected` uses `--accent_60`.
  - Selected buttons use `--text_00` for inverse text (was `--text_05`) on a
    `--shade_60` fill (was `--shade_50`); the border stays `--border_color`,
    matching the fill only on `.palette_X` buttons.
  - A focused button, input, textarea, or select takes `--outline_color` as
    its border color (was `--color_a_50`), and hovering an input, textarea,
    or select previews it (was `--border_color_20`; disabled ones no longer
    react). A focused `.palette_X` button or an element with an `outline_*`
    class keeps its own color - `outline_color_NN` now sets `--outline_color`
    too, like `outline_X_NN`.
  - `.plain` strips the fill, border, and shadow from unselected elements
    only, so a `.plain.selected` button keeps the selected style (was a
    transparent fill under the inverse text until hover).
  - A selected link's focus and pressed outline keeps the default
    `--outline_color` (`.selected` repointed it to `--border_color`).
  - `section` bottom margin is a `--flow_margin` multiple (same default),
    scaled by size composites; `.unstyled` opts out.
  - The checkbox checkmark drops `position: relative` and the `--left`/`--top`
    position hooks.
  - `--button_shadow*` and `--pane_shadow` are declared defaults that name
    their shadow color, so a `:root` `--shadow_color` no longer tints them,
    nor does a shadow color class on a `.pane`; set the variable, or add a
    shape class (`shadow_md`). `.panel` sets `box-shadow:
var(--panel_shadow)` (default `none`), which resets the shadow of a
    `.pane` or `button` it's combined with.
  - New defaults change an unthemed page, each through a themable variable:
    focus outlines sit `--outline_offset` (`1px`) out, `:root` sets
    `scrollbar-color` from `--scrollbar_thumb_color` (`var(--shade_40)`) and
    `--scrollbar_track_color` (transparent), inputs, textareas, and selects
    set `caret-color` from `--caret_color` (`var(--accent_50)`), and
    `dialog::backdrop` dims with `--backdrop_color` (`var(--darken_60)`; was
    the browser's default).

  New:

  - `@media (prefers-contrast: more)` maps onto the curve knobs and steps
    `--border_color` up to `--shade_50` in the `fuz.preferences` layer; theme
    overrides beat it.

- feat: dev-server prescan, content-hashed build CSS, and a stated `base_css` contract ([4cea28a](https://github.com/fuzdev/fuz_css/commit/4cea28a))

  Breaking:

  - `vite_plugin_fuz_css()` returns an array of plugin objects instead of
    one. Passing it to `plugins` works as before; list it after any plugin
    that rewrites CSS in its `transform` hook. The Vite plugin requires Vite
    6 or later.
  - New errors, which fail a CI build (where `on_error` defaults to
    `'throw'`):
    - `undefined_theme_variables`: emitted base styles reference, with no
      fallback, a default variable that `variables` (`null`, `[]`, or a
      partial set) leaves undefined. Names declared in the same rule or a
      top-level `:root`/`:host`/`html`/`body`/`*` rule, and names in
      `exclude_variables`, are skipped. Define them, set `base_css: null` for
      utility-only mode, or pair with a separately imported `theme.css`
      through `exclude_variables: default_variables.map((v) => v.name)`.
      It replaces the `theme_variables_disabled` warning, which covered only
      `variables: null`.
    - `uncontained_theme_value`: a `variables` or `theme` value that could
      escape its declaration, or is blank, is left out (a theme's keeps the
      value beneath it), as is a variable whose name isn't a plain
      identifier. `variables` values were written into the stylesheet as is.
    - `base_css_layer` for an `@layer` rule in `base_css`, and
      `base_css_unsupported_at_rule` for `@import` and `@namespace`. Each
      names the rule and its line, and the CSS ships as written (a layer as
      a sublayer of `fuz.base`). Top-level `@layer fuz.base` and
      `@layer fuz.preferences` blocks are unwrapped as `style.css` uses them.
  - A `base_css` the parser rejects, or a callback that doesn't return a
    string, fails with an error naming `base_css` (was the CSS parser's bare
    error).
  - `style_rule_parser.ts`: `resolve_base_css_option` is removed;
    `parse_style_css(css)` drops its `content_hash` parameter and
    `StyleRuleIndex` trades `content_hash` for `diagnostics`;
    `generate_base_css` → `generate_base_css_by_layer`, returning one string
    per `RuleLayer`; `StyleRuleBase` gains the required `layer`,
    `variables_required`, and `variables_defined`; `CoreReason` loses
    `media_query` and `font_face` and gains `conditional_core`, `at_rule`,
    and `untargetable`. `load_style_rule_index` and `load_default_style_css`
    drop the `style_css_path` parameter.
  - `variable_graph.ts`: `build_variable_graph(variables)` drops its
    `content_hash` parameter and `VariableDependencyGraph` trades its
    `content_hash` field for `diagnostics`; `resolve_variables_transitive`
    takes the excluded names and reports the ones it reached in
    `ResolveVariablesResult.excluded`; `build_variable_graph_from_options`
    takes a theme, applied by the new `apply_theme_variables`.
  - The `theme_specificity` option is removed, along with the specificity
    parameter of `generate_css`, `resolve_css`, and `generate_theme_css` -
    layer order does that job. `CssResolutionResult` gains
    `preferences_css`, `generate_bundled_css` takes `theme_overlay_css`, and
    `generate_css` takes `theme` and filters `detected_css_variables` itself
    (pass the source's `var()` names unfiltered).
  - `class_variable_index.ts` is removed: the variables generated classes
    reference come from the CSS they generate, which covers composite and
    literal classes too. `BundledCssResources` and `resolve_css`'s options
    lose `class_variable_index`, and `create_bundled_resources` trades
    `class_definitions` for `theme`.
  - `splice_css_at_placeholder` moves from `vite_plugin_fuz_css.ts` to
    `css_placeholder_splice.ts`.
  - `css_variable_utils.ts` gains `extract_required_css_variables`,
    `extract_declared_css_variables`, and `strip_css_comments`, and loses
    `has_css_variables`.
  - Removed as unused: `extract_css_comment` (`css_ruleset_parser.ts`),
    `format_dimension_value`, `CSS_DIRECTIONS`, and `CssDirection`
    (`css_class_generators.ts`), and `has_variable` (`variable_graph.ts`);
    `resolve_variables_option` is no longer exported.
  - `FileFilter` takes the project root as a second argument
    (`(path, root) => boolean`); a one-argument filter still works.

  New:

  - The Vite plugin pre-scans sources at dev-server startup so the first
    page load has complete utility CSS. New `prescan` option: `true`
    (default, `src` under the Vite root), `false`, or an array of
    directories. The Vite root's `index.html` is scanned too, so its classes
    are styled in dev as they are in build, and edits to pre-scanned files
    are picked up whether or not a module imports them.
  - The built stylesheet's filename hash covers the generated CSS, so a
    change in the classes, elements, or variables used renames it (and the
    chunks that load it) instead of shipping different CSS under a cached
    filename.
  - `build.cssCodeSplit: false` and `build.lib` builds that import
    `virtual:fuz.css` are supported; they failed with "no CSS asset exists".
  - Custom `base_css` is any CSS the parser accepts, placed in `fuz.base`,
    callback additions included. Top-level style rules and `@media`,
    `@supports`, and `@container` groups, nested groups included, are
    tree-shaken by the elements and classes they target; every other at-rule
    ships as written except a top-level `@charset`. `@keyframes`,
    `@property`, `@scope`, `@page`, and `@layer` statements were dropped, and
    so was a group holding only a nested group.
  - `cache_salt` option, folded into the extraction cache key - change it
    when only an acorn plugin's options change.

  Fixes:

  - In dev, node_modules dependencies are extracted on the client path, not
    only when SSR transforms them: a dependency served as its own files, and
    a pre-bundled one through the sources its sourcemap lists, so classes
    used only by a dependency are styled in a client-rendered app.
  - In dev, CSS that changes while a page is still loading (a dependency or
    a file outside the pre-scan extracted for the first time) reaches that
    page without a reload.
  - In dev, an edit that fails the render under `on_error: 'throw'` surfaces
    on the next request as Vite's error, instead of the last good CSS being
    served as if nothing changed.
  - Each build environment's CSS comes from the modules in its own graph: a
    client build no longer carries the classes of SSR-only modules (or the
    reverse), and a watch rebuild drops the classes of a file that was
    deleted or is no longer imported.
  - A diagnostic is logged once while it persists, not on every re-render.
  - Base rules that detection can't match always ship. Bundled output
    dropped a rule naming no element or class (`::selection`, `[hidden]`)
    and a conditional group of such rules, including a `:root` block in any
    media query but `prefers-reduced-motion`. A rule also always ships when
    one selector in its list is unmatchable (`button, [role='button']`), can
    match through a branch naming nothing (`:is(input, [contenteditable])`),
    or has an escaped or non-ASCII name (`.md\:flex`). The `::placeholder`
    and `::file-selector-button` styles ship with `input`/`textarea`.
  - Names inside `:not()` no longer decide whether a base rule ships (using
    `.unstyled` anywhere shipped every `:not(.unstyled)` rule).
  - Base selectors are read from the parsed selector tree, so a name inside
    an attribute selector no longer counts as an element or class
    (`[aria-label="Close dialog"]` shipped only with `<dialog>`,
    `a[href$=".pdf"]` only with a `.pdf` class), and `[href*="x"]` is no
    longer taken for the universal selector.
  - Every `var()` in base CSS that ships pulls in its theme variable at any
    nesting depth, not only one level into a conditional group.
  - `exclude_variables` holds against dependencies: an excluded variable that
    a shipped variable depends on stays out, with a warning, along with the
    variables only it needs.
  - A brace or semicolon inside a comment, string, or `url()` ahead of
    `virtual:fuz.css`'s position in an unminified build no longer swallows
    the generated CSS.
  - The default `style.css` loads from a package path holding a space or a
    Windows drive (the URL's encoded path was read as a file path).
  - The default file filter judges test directories inside the project or
    the dependency's package, so a project checked out under a `test/`
    directory no longer has every file filtered out.
  - The extraction cache key covers `acorn_plugins`, so adding or removing
    one (`acorn-jsx`) re-extracts files cached without it; the cache version
    bumps, so every file re-extracts once.

- feat: derived OKLCH color system with semantic intents ([4cea28a](https://github.com/fuzdev/fuz_css/commit/4cea28a))

  Breaking:

  - `--color_X_NN` → `--palette_X_NN` (10 letters × 13 stops);
    `ColorVariant`/`color_variants` → `PaletteVariant`/`palette_variants`.
  - Class renames: `border_color_X_NN` → `border_X_NN`,
    `outline_color_X_NN` → `outline_X_NN`, `shadow_color_X_NN` →
    `shadow_X_NN`, `.color_a`-`.color_j` → `.palette_a`-`.palette_j`.
    `.color_X_NN`, `bg_X_NN`, `border_color_NN`, and the semantic
    `shadow_color_umbra`/`_highlight`/`_glow`/`_shroud` keep their names.
  - Classes removed: `.fg_NN`/`.bg_NN` (use
    `background-color:var(--fg_10)`; `bg_` is now the opaque prefix),
    `.hue_a`-`.hue_j` and `--hue`, and every `_light`/`_dark` variable and
    class.
  - `--hue_a`…`--hue_j` are OKLCH angles (blue `250`, was `210`); replace
    `hsl(var(--hue_x) …)` with `oklch(<l> <c> var(--hue_x))` or a stop.
  - `--tint_hue`/`--tint_saturation` → `--hue_neutral` + `--neutral_chroma`.
  - Default colors change: surfaces, text, borders, and the palette are
    derived in OKLCH from the curve knobs instead of authored per stop in
    HSL, so an unthemed page shifts.
  - Shipped `color-mix()` calls (button fills, shadows, borders) interpolate
    `in oklab` (was `in hsl`).
  - The browser floor rises to Chrome and Edge 120 (was 111) and Firefox 118
    (was 113) for `pow()`, with no fallback; Safari stays at 16.2 (16.4 for
    responsive modifier classes, 16.5 for `dark:`/`light:` ones).
  - `variables.ts` exports only `default_variables`; read a variable with
    `default_variables.find((v) => v.name === 'space_md')`. In
    `variable_data.ts`, `icon_sizes` → `ICON_SIZES`, keyed by variant with
    unitless values (`ICON_SIZES.xs === 18`, was
    `icon_sizes.icon_size_xs === '18px'`), and `Z_INDEX_MAX` is removed
    (inline `2147483647`).

  New:

  - Curve knobs: `--chroma_scale`, `--palette_lightness_00/_100/_curve` (and
    `shade_`/`text_`), `--palette_chroma_min/_max`, `--chroma_curve`, with
    pinnable derived stops `--palette_lightness_NN`, `--palette_chroma_NN`,
    `--chroma_shape_NN`.
  - Intent knobs `--hue_accent`/`_positive`/`_negative`/`_caution`/`_info`,
    each with a 13-stop scale (`--accent_00`…`--accent_100`), token classes
    (`.positive_50`, `.bg_caution_10`), `--selection_color`,
    `intent_variants`/`IntentVariant`, and `palette_glosses`/
    `format_palette_gloss`. Base styles that read `--color_a_*` or
    `--color_c_*` - links, focus, selection, `accent-color`, checked inputs,
    range thumbs, `.selectable` and `.menuitem` selection, and disabled-active
    feedback - read the accent or negative intent instead.
  - Per-slot chroma multipliers `--palette_X_chroma_scale` and
    `--<intent>_chroma_scale` (default `1`; brown `f` ships at `0.55`).
  - `--border_color_lightness`/`--border_color_chroma` derive the
    `border_color_*` alpha ramp through the neutral intent.
  - Value tables in `variable_data.ts`: `FONT_SIZES`, `SPACE_SIZES`,
    `BORDER_RADII`, `DISTANCES`, `LINE_HEIGHTS`, `DURATIONS`
    (+ `duration_variants`), `SHADOW_GEOMETRY`, `SHADOW_ALPHAS`,
    `OVERLAY_ALPHAS`.
  - Design-time modules `ramps.ts`, `oklch.ts`, `wcag.ts`.

- feat: rename the size composite classes to `sized_*` ([e9c6450](https://github.com/fuzdev/fuz_css/commit/e9c6450))

  Breaking:

  - The size composite classes take a `sized_` prefix, so they no longer
    share names with the breakpoint modifiers and the size-suffixed tokens:
    - `xs` → `sized_xs`
    - `sm` → `sized_sm`
    - `md` → `sized_md`
    - `lg` → `sized_lg`
    - `xl` → `sized_xl`
  - The old names no longer resolve. To migrate, search class attributes,
    `class:` directives, clsx/class arrays, and `@fuz-classes` hints for the
    bare names and add the prefix (`md:sm` becomes `md:sized_sm`). An old name
    in a `@fuz-classes` hint or `additional_classes` now errors. In markup, a
    bare old name like `sm` is silently skipped and generates no CSS, while a
    modified one like `md:sm` logs an unknown CSS property warning (`"md"`).
    A plain search for `sm` also matches breakpoint modifiers (`sm:`) and
    size-suffixed tokens (`gap_sm`), so check each hit.

- feat: themes as validated knob-sets, with exemplars and a build-time `theme` option ([4cea28a](https://github.com/fuzdev/fuz_css/commit/4cea28a))

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
    two decimal places of a rem). The `sized_lg`/`sized_xl` composites read the
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

## 0.64.0

### Minor Changes

- **breaking** chore: the optional peer dep `@fuzdev/blake3_wasm` is renamed to `@fuzdev/blake3-wasm` (`^0.2.0`) — swap the dependency and any `optimizeDeps.exclude` entry ([d865cdc](https://github.com/fuzdev/fuz_css/commit/d865cdc))

## 0.63.3

### Patch Changes

- fix: splice the generated CSS at the build-mode placeholder's position instead of appending it, so stylesheets imported after `virtual:fuz.css` cascade over fuz_css in production builds like they do in dev ([572d001](https://github.com/fuzdev/fuz_css/commit/572d001))

## 0.63.2

### Patch Changes

- fix: dev theme `var()` references left undefined in `virtual:fuz.css` ([5a794ba](https://github.com/fuzdev/fuz_css/commit/5a794ba))

  Two dev-only fixes:

  - Variable detection no longer depends on the bundled theme graph being loaded.
    The graph loads lazily on the first `load()`, but SvelteKit resolves (and thus
    transforms) route modules during SSR _before_ that first `load()` — so a theme
    `var()` used only in a route (e.g. a `+page.svelte`) was silently dropped, and
    the cached content hash meant it never re-scanned until the file was edited.
    References are now recorded unfiltered and narrowed to theme variables at render
    time, when the graph is always available.
  - HMR now invalidates every served virtual-module variant, not just the bare id.
    SvelteKit's dev FOUC-inlining reads the separately-cached `?inline` variant,
    which was never refreshed — so SSR reloads kept serving stale inlined `<head>`
    CSS after a mid-session edit.

## 0.63.1

### Patch Changes

- fix: invalidate dev SSR-inlined CSS variants on HMR ([0bbc764](https://github.com/fuzdev/fuz_css/commit/0bbc764))

## 0.63.0

### Minor Changes

- feat: warn on bundled-CSS configs that leave dangling `var()` references ([d89d3da](https://github.com/fuzdev/fuz_css/commit/d89d3da))
- fix: remove z-index from `menuitem` ([6622420](https://github.com/fuzdev/fuz_css/commit/6622420))

## 0.62.0

### Minor Changes

- chore: fix peer deps ([727ed77](https://github.com/fuzdev/fuz_css/commit/727ed77))
- bump peer deps ([79447f8](https://github.com/fuzdev/fuz_css/commit/79447f8))
- fix: vite plugin FOUC in dev ([#87](https://github.com/fuzdev/fuz_css/pull/87))

## 0.61.1

### Patch Changes

- fix: vite plugin emission ([a3dda84](https://github.com/fuzdev/fuz_css/commit/a3dda84))

## 0.61.0

### Minor Changes

- feat: migrate to `svelte-docinfo` ([218140a](https://github.com/fuzdev/fuz_css/commit/218140a))

## 0.60.0

### Minor Changes

- feat: `.xs`–`.xl` size composites classes ([#85](https://github.com/fuzdev/fuz_css/pull/85))
- bump node@24.14 ([#85](https://github.com/fuzdev/fuz_css/pull/85))
- share the CSS generation pipeline between the Gro generator and Vite plugin ([ab4e857](https://github.com/fuzdev/fuz_css/commit/ab4e857)) ([refactor](https://github.com/fuzdev/fuz_css/commit/refactor))

  - add `generate_css` (generate → resolve → bundle), called by both `gen_fuz_css` and `vite_plugin_fuz_css`
  - add `create_bundled_resources` and `extract_file_cached`, shared by both generators
  - fix the Vite transform resurrecting a file deleted during its in-flight cache read

- feat: better default fonts ([651a82a](https://github.com/fuzdev/fuz_css/commit/651a82a))

## 0.59.0

### Minor Changes

- upgrade fuz_util ([#86](https://github.com/fuzdev/fuz_css/pull/86))

### Patch Changes

- fix: trim whitespace before `!important` ([349322d](https://github.com/fuzdev/fuz_css/commit/349322d))

## 0.58.0

### Minor Changes

- fix: make `label` blocks by default ([498a930](https://github.com/fuzdev/fuz_css/commit/498a930))

## 0.57.0

### Minor Changes

- feat: replace `.compact` with `.sm` and add `.xs-.xl` ([#84](https://github.com/fuzdev/fuz_css/pull/84))

### Patch Changes

- fix: bug with interpreter disallowing class names matching modifiers ([#84](https://github.com/fuzdev/fuz_css/pull/84))

## 0.56.0

### Minor Changes

- rename `menuitem` from `menu_item` ([48f9f70](https://github.com/fuzdev/fuz_css/commit/48f9f70))

## 0.55.0

### Minor Changes

- switch to blake3 hashing, add optional peer dep `@fuzdev/blake3-wasm` ([#83](https://github.com/fuzdev/fuz_css/pull/83))

## 0.54.0

### Minor Changes

- migrate to "deps" pattern from "ops" ([607d04b](https://github.com/fuzdev/fuz_css/commit/607d04b))

## 0.53.1

### Patch Changes

- improve generated style sorting ([#82](https://github.com/fuzdev/fuz_css/pull/82))

## 0.53.0

### Minor Changes

- upgrade `fuz_util` and `gro` ([#81](https://github.com/fuzdev/fuz_css/pull/81))

## 0.52.0

### Minor Changes

- remove bg from `blockquote` ([#78](https://github.com/fuzdev/fuz_css/pull/78))
- space out line heights ([#78](https://github.com/fuzdev/fuz_css/pull/78))

### Patch Changes

- add `.compact` composite class for tighter sizing by overriding variables, cascading to children ([#78](https://github.com/fuzdev/fuz_css/pull/78))
  - update `.chip`, `.pane`, and `.panel` to use `var(--border_radius, var(--border_radius_xs))` fallback pattern so container overrides cascade
  - add `font-size: var(--font_size, inherit)` to `.chip` so font-size overrides cascade
  - add `var(--flow_margin, var(--space_lg))` to flow elements and headings so compact can tighten vertical spacing
  - add `.mb_flow` and `.mt_flow` composite classes for flow-aware spacing on non-flow elements
  - move `legend` into the flow elements selector
  - add compact demos to buttons, chips, forms, typography, and classes docs pages

## 0.51.0

### Minor Changes

- refactor extraction pipeline APIs and diagnostics ([#80](https://github.com/fuzdev/fuz_css/pull/80))

  - replace positional parameters with `ExtractionData` object in `CssClasses.add()` and `save_cached_extraction()`
  - rename `GenerationDiagnostic.class_name` and `InterpreterDiagnostic.class_name` to `identifier`
  - deduplicate three identical `parse_fuz_*_comment` functions into `create_fuz_comment_parser` factory
  - vite plugin warning/error logs now use `format_diagnostic()` with location info and suggestions

- add `@fuz-variables` comment hints for explicitly bundling theme variables ([#79](https://github.com/fuzdev/fuz_css/pull/79))

## 0.50.0

### Minor Changes

- revert zeroing of margin-bottom for .box and .column ([07ec817](https://github.com/fuzdev/fuz_css/commit/07ec817))
- upgrade @fuzdev/fuz_util ([07ec817](https://github.com/fuzdev/fuz_css/commit/07ec817))

## 0.49.1

### Patch Changes

- remove @ryanatkn/gro from deps to finish migration to @fuzdev/gro ([d4a14cc](https://github.com/fuzdev/fuz_css/commit/d4a14cc))

## 0.49.0

### Minor Changes

- upgrade gro after fuzdev transfer ([1174e4a](https://github.com/fuzdev/fuz_css/commit/1174e4a))

## 0.48.0

### Minor Changes

- remove margin from the children of semantic flex containers ([#77](https://github.com/fuzdev/fuz_css/pull/77))

## 0.47.0

### Minor Changes

- simplify CSS variable detection with regex-based scanning ([#76](https://github.com/fuzdev/fuz_css/pull/76))

  **Breaking changes:**

  - remove `include_all_base_css` option - use `additional_elements: 'all'` instead
  - remove `include_all_variables` option - use `additional_variables: 'all'` instead
  - remove `@fuz-variables` comment support - variables are now detected automatically via regex

  **Improvements:**

  - CSS variables are now detected via simple regex scan of `var(--name` patterns in all source files
  - this catches usage in component props like `size="var(--icon_size_xs)"` that AST-based extraction missed
  - unknown variables (not in theme) are silently ignored

## 0.46.0

### Minor Changes

- bundle theme variables and base styles into generated `fuz.css` output ([#75](https://github.com/fuzdev/fuz_css/pull/75))
- rename treeshake*\* to include_all*\*, add exclude_elements/exclude_variables, move additional_classes/exclude_classes to CssOutputOptions ([#75](https://github.com/fuzdev/fuz_css/pull/75))

## 0.45.0

### Minor Changes

- add optional zod peer dep ([d7bc9a3](https://github.com/fuzdev/fuz_css/commit/d7bc9a3))
- rework shading and color systems ([#74](https://github.com/fuzdev/fuz_css/pull/74))

## 0.44.1

### Patch Changes

- bump peer deps ([1a623e6](https://github.com/fuzdev/fuz_css/commit/1a623e6))

## 0.44.0

### Minor Changes

- implement CSS literal classes ([#73](https://github.com/fuzdev/fuz_css/pull/73))

## 0.43.0

### Minor Changes

- improve the reset styles ([7a46704](https://github.com/fuzdev/fuz_css/commit/7a46704))

### Patch Changes

- support `.unstyled` for more elements in `style.css` ([c543b0f](https://github.com/fuzdev/fuz_css/commit/c543b0f))

## 0.42.1

### Patch Changes

- tweak teal to be slightly less green ([#71](https://github.com/fuzdev/fuz_css/pull/71))

## 0.42.0

### Minor Changes

- rename `gen_fuz_css` from `gen_moss_css` ([7562ced](https://github.com/fuzdev/fuz_css/commit/7562ced))

## 0.41.0

### Minor Changes

- migrate to fuzdev and rename to fuz_css from moss ([#70](https://github.com/fuzdev/fuz_css/pull/70))

### Patch Changes

- fix: add fuz_util as optional peer dep ([#70](https://github.com/fuzdev/fuz_css/pull/70))

## 0.40.0

### Minor Changes

- move to fuzdev and rename to fuz_css from moss ([29efeba](https://github.com/ryanatkn/moss/commit/29efeba))

## 0.39.0

### Minor Changes

- rename `PascalCase` from `Upper_Snake_Case` (lol) ([#69](https://github.com/ryanatkn/moss/pull/69))

## 0.38.0

### Minor Changes

- improve code element styles and remove `.pre` ([#68](https://github.com/ryanatkn/moss/pull/68))

## 0.37.0

### Minor Changes

- improve code element styles and remove `.pre` ([#67](https://github.com/ryanatkn/moss/pull/67))

### Patch Changes

- tweak teal hue to be greener and further from cyan ([9b288f3](https://github.com/ryanatkn/moss/commit/9b288f3))

## 0.36.3

### Patch Changes

- reduce `legend` text soze to lg from xl ([a86caed](https://github.com/ryanatkn/moss/commit/a86caed))

## 0.36.2

### Patch Changes

- fix class sort order ([ff438fd](https://github.com/ryanatkn/moss/commit/ff438fd))

## 0.36.1

### Patch Changes

- remove default fieldset border ([48ec114](https://github.com/ryanatkn/moss/commit/48ec114))
- fix a type import ([88ec26e](https://github.com/ryanatkn/moss/commit/88ec26e))

## 0.36.0

### Minor Changes

- rename utility classes for consistency with CSS declarations ([#66](https://github.com/ryanatkn/moss/pull/66))

  - rename `flex_wrap_wrap` from `flex_wrap`
  - rename `flex_wrap_wrap_reverse` from `flex_wrap_reverse`
  - rename `flex_wrap_nowrap` from `flex_nowrap`
  - rename `flex_direction_row` from `flex_row`
  - rename `flex_direction_row_reverse` from `flex_row_reverse`
  - rename `flex_direction_column` from `flex_column`
  - rename `flex_direction_column_reverse` from `flex_column_reverse`
  - rename `top_N` from `t_N`
  - rename `right_N` from `r_N`
  - rename `bottom_N` from `b_N`
  - rename `left_N` from `l_N`
  - rename `flex_shrink_1` from `shrink`
  - rename `flex_shrink_0` from `shrink_0`
  - rename `flex_grow_1` from `grow`
  - rename `flex_grow_0` from `grow_0`

- expand `generate_classes_css` with support for interpreters ([#66](https://github.com/ryanatkn/moss/pull/66))

## 0.35.0

### Minor Changes

- fix gen CSS watch ([#65](https://github.com/ryanatkn/moss/pull/65))

## 0.34.1

### Patch Changes

- add color j ([#64](https://github.com/ryanatkn/moss/pull/64))

## 0.34.0

### Minor Changes

- default `include_stats` to false in `gen_moss_css` ([#63](https://github.com/ryanatkn/moss/pull/63))

## 0.33.0

### Minor Changes

- remove gro plugin and switch to a gen file for CSS, see `$lib/gen_moss_css.ts` and `$routes/moss.gen.css.ts` ([#62](https://github.com/ryanatkn/moss/pull/62))

## 0.32.0

### Minor Changes

- upgrade deps ([#60](https://github.com/ryanatkn/moss/pull/60))

## 0.31.0

### Minor Changes

- change some classes to be more aligned with the platform ([#58](https://github.com/ryanatkn/moss/pull/58))
  - add `position_` prefix
  - fill out `float_` classes

## 0.30.0

### Minor Changes

- remove `fade_` variables and replace with `opacity_` utility classes and hardcoded values ([#57](https://github.com/ryanatkn/moss/pull/57))

### Patch Changes

- add more CSS utilities aligning with the platform ([#57](https://github.com/ryanatkn/moss/pull/57))

## 0.29.0

### Minor Changes

- bump node@22.15 from 22.11 ([commit](https://github.com/ryanatkn/moss/commit/3c8154b49adfd6bd8295964d22b76c0521b92045)) ([f950917](https://github.com/ryanatkn/moss/commit/f950917))

## 0.28.0

### Minor Changes

- rework some utility classes ([#55](https://github.com/ryanatkn/moss/pull/55))
  - rename `border_$STYLE` variants to `border_style_$STYLE`
  - rename `radius_` variants to `border_radius_`
  - add top/right/bottom/left border radius variants, e.g. `border_top_left_radius`
  - support `.unstyled` on more base elements
  - prefix `font_sans`, `font_serif`, and `font_mono` with `font_family_`
  - prefix display classes with `display_` and
    remove classes `inline|inline_block|inline_flex|inline_grid|block|flex|grid`

## 0.27.0

### Minor Changes

- rework some styles and classes ([#49](https://github.com/ryanatkn/moss/pull/49))
  - rename `--distance_` vars from `--width_`
  - add `border_width_7-9` and change them to default to 1px increments
  - replace `outline_width_1` with `outline_width_0` and remove its variable,
    replace `outline_width_2` with `outline_width_focus`,
    and `outline_width_3` with `outline_width_active`

### Patch Changes

- add basic table styles ([#49](https://github.com/ryanatkn/moss/pull/49))

## 0.26.0

### Minor Changes

- change some base styles to be entirely wrapped in `:where`, reducing specificity, breaking by causing potentially unintended overrides in existing code ([#54](https://github.com/ryanatkn/moss/pull/54))
- remove deprecated `get_sorted_array` in `css_class_helpers.ts` ([#54](https://github.com/ryanatkn/moss/pull/54))

## 0.25.0

### Minor Changes

- bump node@22.11 ([4eec6d6](https://github.com/ryanatkn/moss/commit/4eec6d6))

## 0.24.3

### Patch Changes

- fix CSS class generation sort order ([#51](https://github.com/ryanatkn/moss/pull/51))

## 0.24.2

### Patch Changes

- add cursor styles to `.menuitem` ([c1e71ea](https://github.com/ryanatkn/moss/commit/c1e71ea))

## 0.24.1

### Patch Changes

- add `.menuitem` styles ([455199c](https://github.com/ryanatkn/moss/commit/455199c))

## 0.24.0

### Minor Changes

- break: change `.unstyled` lists to have no `margin-bottom` ([c27315e](https://github.com/ryanatkn/moss/commit/c27315e))

## 0.23.2

### Patch Changes

- add scrollbar-width and scrollbar-gutter css classes ([9d6866d](https://github.com/ryanatkn/moss/commit/9d6866d))

## 0.23.1

### Patch Changes

- add `user-select` css classes ([cc4865b](https://github.com/ryanatkn/moss/commit/cc4865b))

## 0.23.0

### Minor Changes

- add `font_serif` and make it the default for headings ([#50](https://github.com/ryanatkn/moss/pull/50))

### Patch Changes

- add `--size` for `.size_*` classes and `--font_weight` for `.font_weight_*` classes ([#50](https://github.com/ryanatkn/moss/pull/50))
- add `.heading` for h1-6-like behavior ([#50](https://github.com/ryanatkn/moss/pull/50))

## 0.22.5

### Patch Changes

- set border color variable instead of property on `.plain` ([e6efe3e](https://github.com/ryanatkn/moss/commit/e6efe3e))

## 0.22.4

### Patch Changes

- make active state behave the same as hover for plain borders ([7f6cda1](https://github.com/ryanatkn/moss/commit/7f6cda1))

## 0.22.3

### Patch Changes

- make `.plain` have a transparent border on hover ([04f711a](https://github.com/ryanatkn/moss/commit/04f711a))

## 0.22.2

### Patch Changes

- add line-height 1 to `.icon_button` ([caf4e3e](https://github.com/ryanatkn/moss/commit/caf4e3e))

## 0.22.1

### Patch Changes

- add `width_xl`, `width_lg`, and `width_xs` classes ([#48](https://github.com/ryanatkn/moss/pull/48))
- add `min_width` class variants ([#48](https://github.com/ryanatkn/moss/pull/48))

## 0.22.0

### Minor Changes

- fix css class order, giving simpler utility classes higher priority ([#46](https://github.com/ryanatkn/moss/pull/46))

### Patch Changes

- add word_break classes ([#47](https://github.com/ryanatkn/moss/pull/47))
- fix `shadow_xs` CSS class ([#47](https://github.com/ryanatkn/moss/pull/47))

## 0.21.1

### Patch Changes

- update description ([35c0195](https://github.com/ryanatkn/moss/commit/35c0195))

## 0.21.0

### Minor Changes

- fix border colors in dark mode ([bb8e522](https://github.com/ryanatkn/moss/commit/bb8e522))

## 0.20.2

### Patch Changes

- fix `.pre` with `.inline` ([96c90bd](https://github.com/ryanatkn/moss/commit/96c90bd))

## 0.20.1

### Patch Changes

- add `.pre` utility class ([b901812](https://github.com/ryanatkn/moss/commit/b901812))

## 0.20.0

### Minor Changes

- move some css class helpers ([470472b](https://github.com/ryanatkn/moss/commit/470472b))

## 0.19.0

### Minor Changes

- move gro plugin to gro ([#45](https://github.com/ryanatkn/moss/pull/45))

## 0.18.2

### Patch Changes

- fix `gro_plugin_moss` banner ([044430c](https://github.com/ryanatkn/moss/commit/044430c))

## 0.18.1

### Patch Changes

- add `banner` option to `gro_plugin_moss` ([55cab52](https://github.com/ryanatkn/moss/commit/55cab52))

## 0.18.0

### Minor Changes

- upgrade gro ([99f61de](https://github.com/ryanatkn/moss/commit/99f61de))

## 0.17.0

### Minor Changes

- add `gro_plugin_moss` ([#43](https://github.com/ryanatkn/moss/pull/43))

## 0.16.1

### Patch Changes

- fix pane shadow ([#42](https://github.com/ryanatkn/moss/pull/42))

## 0.16.0

### Minor Changes

- bump required node version to `20.17` ([0bce067](https://github.com/ryanatkn/moss/commit/0bce067))

## 0.15.0

### Minor Changes

- rework shadows ([738f4dd](https://github.com/ryanatkn/moss/commit/738f4dd))
  - rename `shadow_color_a-i` from `shadow_a-i_color`
  - rename `shadow_color_highlight` from `highlight_color`
  - rename `shadow_color_glow` from `glow_color`
  - rename `shadow_color_shroud` from `shroud_color`
  - rename `shadow_inset_bottom_` variables from `shadow_outset_`
  - rename `shadow_inset_top_` variables from `shadow_inset_`
    and add `shadow_inset_` variants with no y offset
  - remove shadow color variable variants `shadow_color_1-5`
    along with `highlight`/`glow`/`shroud` and colors `a-i` -
    alpha must now be applied manually with `color-mix` or relative colors,
    though maybe we'll add these back when we efficiently build only what's used

## 0.14.1

### Patch Changes

- add more layout classes ([#39](https://github.com/ryanatkn/moss/pull/39))

## 0.14.0

### Minor Changes

- improve shadows ([#37](https://github.com/ryanatkn/moss/pull/37))
  - add `inner` and `outer` shadow variants
  - remove `x` offset from all shadows

## 0.13.4

### Patch Changes

- change `input`, `select`, and `textarea` to be blocks by default ([07274c8](https://github.com/ryanatkn/moss/commit/07274c8))

## 0.13.3

### Patch Changes

- add utility classes for `overflow-wrap` ([#35](https://github.com/ryanatkn/moss/pull/35))

## 0.13.2

### Patch Changes

- fix summary margin ([d65d160](https://github.com/ryanatkn/moss/commit/d65d160))

## 0.13.1

### Patch Changes

- add some flex utility classes ([#34](https://github.com/ryanatkn/moss/pull/34))
  - add variants for `.align|justify_items|content|self_`
  - add `.grow`, `.grow_0`, `.shrink`, and `.shrink_1`
  - add `.column`

## 0.13.0

### Minor Changes

- rename shadow color variables to numbered weights ([#33](https://github.com/ryanatkn/moss/pull/33))

### Patch Changes

- add `flex_nowrap` class ([#33](https://github.com/ryanatkn/moss/pull/33))

## 0.12.2

### Patch Changes

- add flex direction classes ([fb99dd8](https://github.com/ryanatkn/moss/commit/fb99dd8))

## 0.12.1

### Patch Changes

- add margin auto variants ([f684712](https://github.com/ryanatkn/moss/commit/f684712))

## 0.12.0

### Minor Changes

- rename `text_color_0-10` from `text_1-5` ([#32](https://github.com/ryanatkn/moss/pull/32))

## 0.11.1

### Patch Changes

- fix `.selectable` styles ([c55e4dd](https://github.com/ryanatkn/moss/commit/c55e4dd))

## 0.11.0

### Minor Changes

- change colors back to including `hsl()` ([#30](https://github.com/ryanatkn/moss/pull/30))
- move `StyleVariable` to `variables.ts` ([#29](https://github.com/ryanatkn/moss/pull/29))

### Patch Changes

- rework styles ([#31](https://github.com/ryanatkn/moss/pull/31))
  - rework button styles
  - reduce input border radius
  - rework shadow styles, reducing variable count by separating shadow position/blue/spread and color

## 0.10.1

### Patch Changes

- refactor some variables ([#28](https://github.com/ryanatkn/moss/pull/28))

  - add `button_shadow`, `button_shadow_hover`, and `button_shadow_active`

- soften xs and sm shadows ([d309880](https://github.com/ryanatkn/moss/commit/d309880))

## 0.10.0

### Minor Changes

- swap styles for colored buttons and selected variants ([#27](https://github.com/ryanatkn/moss/pull/27))

## 0.9.0

### Minor Changes

- add colors `h` and `i` ([#26](https://github.com/ryanatkn/moss/pull/26))

## 0.8.0

### Minor Changes

- remove the `hsl_` variables and change the `--color_` variables to require being wrapped in `hsl()` ([#24](https://github.com/ryanatkn/moss/pull/24))

## 0.7.1

### Patch Changes

- publish src files ([d4289dc](https://github.com/ryanatkn/moss/commit/d4289dc))
- enable tsconfig `declaration` and `declarationMap` ([fe60a19](https://github.com/ryanatkn/moss/commit/fe60a19))
- add tsconfig `sourceRoot` ([039be68](https://github.com/ryanatkn/moss/commit/039be68))

## 0.7.0

### Minor Changes

- update some theme-related styles ([#22](https://github.com/ryanatkn/moss/pull/22))
  - remove `.themed` styles
  - support `light` inside `.dark`, but as the fallback
  - add explicit `color-scheme: light dark` to `:root`

## 0.6.3

### Patch Changes

- add `sideEffects` to `package.json` ([9285817](https://github.com/ryanatkn/moss/commit/9285817))
- add vertical_align and missing text_align utility classes ([d5891ea](https://github.com/ryanatkn/moss/commit/d5891ea))

## 0.6.2

### Patch Changes

- fix input styles to not use `:where` for pseudo-elements ([#18](https://github.com/ryanatkn/moss/pull/18))

## 0.6.1

### Patch Changes

- upgrade gro with correctly formatted exports ([3b4f1cf](https://github.com/ryanatkn/moss/commit/3b4f1cf))

## 0.6.0

### Minor Changes

- support `node@20.12` and later ([108a2a7](https://github.com/ryanatkn/moss/commit/108a2a7))

## 0.5.0

### Minor Changes

- upgrade `node@22.3` ([#16](https://github.com/ryanatkn/moss/pull/16))

## 0.4.0

### Minor Changes

- extract composable shadow variables and remove the create shadow helpers ([#14](https://github.com/ryanatkn/moss/pull/14))

### Patch Changes

- extract hsl color variables ([#15](https://github.com/ryanatkn/moss/pull/15))

## 0.3.2

### Patch Changes

- remove `:where` from style components ([a9199e0](https://github.com/ryanatkn/moss/commit/a9199e0))

## 0.3.1

### Patch Changes

- tweak shadows ([#13](https://github.com/ryanatkn/moss/pull/13))

## 0.3.0

### Minor Changes

- upstream Svelte-specific theme helpers ([#9](https://github.com/ryanatkn/moss/pull/9))
- rename some variables ([#8](https://github.com/ryanatkn/moss/pull/8))

  - `button_fill` from `button_bg`
  - `button_fill_hover` from `button_bg_hover`
  - `button_fill_active` from `button_bg_active`
  - `input_fill` from `input_bg`

- use `:where` everywhere in the reset to fix specificity issues ([#3](https://github.com/ryanatkn/moss/pull/3))

### Patch Changes

- add fill color variables ([#7](https://github.com/ryanatkn/moss/pull/7))
- add `button_fill_selected` ([#6](https://github.com/ryanatkn/moss/pull/6))
- add colorful border variants ([#6](https://github.com/ryanatkn/moss/pull/6))
- add colorful shadow variants ([#3](https://github.com/ryanatkn/moss/pull/3))

## 0.2.0

### Minor Changes

- break: rename `shadow_inset_bottom_md` from `shadow_inset_md` and `shadow_inset_md` from `shadow_inset_inverse_md` ([#2](https://github.com/ryanatkn/moss/pull/2))

### Patch Changes

- feat: add variables shadow_inset|outset_xs-xl including utility classes ([#2](https://github.com/ryanatkn/moss/pull/2))

## 0.1.0

### Minor Changes

- extract from @ryanatkn/fuz - ([#1](https://github.com/ryanatkn/moss/pull/1))
  [github.com/ryanatkn/fuz/pull/20](https://github.com/ryanatkn/fuz/pull/20)
