# @fuzdev/fuz_css

## 0.71.0

### Minor Changes

- feat: the ground tint (`--shade_chroma_00`) fades over the near-ground shade stops instead of stopping at `shade_00`, so raised surfaces keep a tinted page's cast; themes that set it (parchment, marquee, custom) carry more of the ground's tint across `shade_05`–`shade_40` ([bd2e688](https://github.com/fuzdev/fuz_css/commit/bd2e688))

  feat: add `--panel_fill`, the `.panel` fill (`--ink_10` by default)

## 0.70.0

### Minor Changes

- chore: upgrade fuz_util 0.77.0 ([623c2db](https://github.com/fuzdev/fuz_css/commit/623c2db))
- **breaking** chore: peer '@fuzdev/fuz_schema' `^0.5.0`, which caps a parse at a hundred issues (a `SchemaError` lists the first ten and `and N more`), labels every issue beneath a `message`, and refuses a `pipe` action narrower than the step before it ([6176a57](https://github.com/fuzdev/fuz_css/commit/6176a57))

### Patch Changes

- fix: widen the gap below an open `details` summary from `space_sm` to `space_md` ([cc5321d](https://github.com/fuzdev/fuz_css/commit/cc5321d))

## 0.69.0

### Minor Changes

- **breaking** feat: the build-time theme bake runs `validate_theme`, reporting each issue as a `theme_lint` diagnostic at its own level, so an unknown theme variable or a malformed theme is an error that fails a build throwing on errors (the CI default) ([c20a0a3](https://github.com/fuzdev/fuz_css/commit/c20a0a3))

## 0.68.0

### Minor Changes

- **breaking** feat: move the theme schemas from zod to fuz_schema ([dcbcc7f](https://github.com/fuzdev/fuz_css/commit/dcbcc7f))

  `Theme`, `StyleVariable`, `ThemeScheme`, and `StyleVariableName` in `variable.ts` are now `@fuzdev/fuz_schema` schemas, with the same names, the same verdicts, and types of the same shape:

  - `Theme.safeParse(x)` becomes `s.parse(Theme, x)` with `import * as s from '@fuzdev/fuz_schema/schema.ts'`, returning `{ok: true, value}` or `{ok: false, issues}`, and `Theme.parse(x)` becomes `s.parse_or_throw(Theme, x)`. `parse_theme` and `validate_theme` keep their signatures. `Theme` is no longer a zod schema, so it can't be nested in one.
  - `zod` is no longer a peer dependency, and `@fuzdev/fuz_schema` `^0.4.0` is a required one, with the `@fuzdev/fuz_util` peer raised to `>=0.76.0`, the first on that fuz_schema. The `Theme` and `StyleVariable` types no longer fall back to `any` where zod isn't installed.
  - `parse_theme` and `s.parse(Theme, x)` return a valid input as the same object, where zod returned a copy, so clone it before mutating a theme you don't own.
  - The descriptions on `summary` and `scheme` move to fuz_schema's `meta`, read with `get_meta` from `@fuzdev/fuz_schema/meta.ts`.
  - An issue on a variable whose `base` and `dark` are equal is at the path `variables.N.dark` as before. The cross-field rules (at least one of `base` or `dark`, the two differing) now run only once a variable's fields and keys are all valid, where zod also ran them past a failed name or slot check or an unknown key.

  `validate_theme` keeps fuz_css's own messages. The ones zod used to word read differently:

  - an unknown key: `Unrecognized key: "oops"` is now `unknown key "oops"`, one issue per key where zod listed several in one (`invalid variable "x": unknown key "light"` on a variable)
  - a wrong or missing value: `Invalid input: expected string, received undefined` is now `expected string, received undefined`, and likewise for `object` and `array`
  - a variable with an invalid field or an unknown key no longer also reports `must have at least one of base or dark` or `base and dark must differ when both specified`

## 0.67.0

### Minor Changes

- feat: focus-visible rings, ARIA state styles, and forced-colors support ([a46f55e](https://github.com/fuzdev/fuz_css/commit/a46f55e))

  Base styles render differently for these:

  - **Focus** - links, buttons, form controls, and `.clickable` show focus on `:focus-visible` instead of `:focus`, and a focused button no longer takes the hover fill, border, and shadow - the outline ring is the only focus signal. Keyboard focus and a click into a text field or select look as before; a link, button, or checkbox clicked with the mouse no longer holds the ring or the hover look, and `.clickable` no longer holds its focus scale after a click. A popover trigger that wants a held look while open can style its own `[aria-expanded='true']` state.
  - **ARIA states** - `button[aria-pressed='true']` takes the `.selected` fill but stays clickable like `.deselectable`, and `.selectable` and `.menuitem` map `aria-pressed='true'` to their selected tint on any element, forced colors included, labeling the item in the text color and keeping the pointer cursor; `.plain` keeps a pressed button's fill, edge, and shadow, as it does a selected one's; `a[aria-current]` (any value but `false`) takes the selected link look; `aria-disabled='true'` on a button, input, textarea, or select takes the disabled look (dashed border, `--disabled_opacity`, default cursor, no hover or active states) but keeps its outline and pointer events, and `:not(:disabled)` hover and checked states, in the base styles and in `.selectable` and `.menuitem`, now skip it too - a form that sets `aria-disabled` while submitting now looks disabled, and `aria-disabled='true'` on a `.deselectable` `.menuitem` or `.selectable` drops its pointer cursor; `aria-invalid='true'` on an input, textarea, or select sets `--border_color` and `--outline_color` to `--negative_50`.
  - **Forced colors** (Windows High Contrast) - a checked radio's dot, range thumbs and tracks, selected and pressed buttons, `.menuitem.selected`, `.selectable.selected`, and the edges of `.panel` and `.pane` vanished; they now render in system colors, and selects restore their native arrow. Selection shows as a `Highlight` border with an outline just inside it, which becomes a double `Highlight` ring when focused, while a focus ring alone takes `CanvasText`; the colors stay forced, so labels and colored text keep the system's text color, as do icons drawn in `currentColor`. `aria-disabled` takes `GrayText`, and the radio dot, range, and panel and pane edges `CanvasText`.
  - **Select arrow** - single selects draw a chevron in the text color, with right padding for it; `multiple` and list-box selects have none.
  - **First heading in a container** - an `h2`-`h6` that is the first child of `.panel`, `.pane`, `aside`, `blockquote`, `fieldset`, `dialog`, `li`, `td`, or `th` drops its top margin, sitting on the container's padding.
  - **Text size adjustment** - `text-size-adjust` is `100%` instead of `none`, so mobile browsers still skip automatic text inflation without the setting also reaching the reader's own text scaling.
  - **Disabled controls** - disabled checkboxes, radios, and other inputs take the default cursor; a `label` wrapping one still shows the pointer.

  The forced-colors rules ship in `fuz.preferences`, one block per element, so bundled output carries each only when its element is used; the composites' rules nest inside their own rules.

- **breaking** fix: run the Vite plugin's generated build CSS through Vite's CSS pipeline ([93ea01e](https://github.com/fuzdev/fuz_css/commit/93ea01e))

  The generated CSS was spliced into the bundled stylesheet after Vite processed it, so production builds shipped it unminified and untouched by PostCSS or lightningcss. The build now processes it with `preprocessCSS` and hands it to Vite before the stylesheet renders, so it's minified and post-processed like the rest of the stylesheet, in code-split and single-stylesheet builds alike, and an error from the project's own CSS pipeline fails the build. CSS that Vite inlines into JS (an `iife` output) now carries it too instead of failing the build. Splicing remains as a fallback, with a warning, for a Vite whose internals don't allow the handoff.

  Breaking: `to_hashed_css_placeholder` and `parse_css_placeholder_hash` are removed from `css_placeholder_splice.ts`.

- **breaking** fix: invalidate the extraction cache on upgrade, and read `CI=false` as not CI ([906890f](https://github.com/fuzdev/fuz_css/commit/906890f))

  The extraction cache now keys its entries by the installed versions of fuz_css, `svelte`, `acorn`, and `@sveltejs/acorn-typescript`, so upgrading any of them re-extracts every file instead of possibly serving extractions from the previous version. `CSS_CACHE_VERSION` is removed, since nothing needs to bump it.

  Breaking: `CSS_CACHE_VERSION` is removed, and `CachedExtraction.v` is now the `to_cache_version` string rather than a number.

  `CI` set to `false` or `0` (in any case), or empty, no longer counts as CI, so it keeps the extraction cache and the `on_error: 'log'` default instead of skipping the cache and throwing on errors. Any other value still counts.

- feat: follow the OS color scheme without JS ([76bd9e5](https://github.com/fuzdev/fuz_css/commit/76bd9e5))

  The dark scheme's variables render under `:root.dark` and again under `@media (prefers-color-scheme: dark)` for a root that has neither `.dark` nor `.light`, so a page using the stylesheets without fuz_ui's theme script follows the OS preference. A page that never names a scheme now renders dark on a dark OS - add `class="light"` to its root to keep it light - and its own unlayered `:root` variable overrides, which outrank both schemes, now apply over the dark one too. An explicit `.light` or `.dark` class still wins - so a page that toggles only `.dark` for its own scheme switch must also set `.light` for an explicit light choice on a dark OS (fuz_ui's theme state always sets one or the other). The same applies to `render_theme_style`, the bundled theme, the `prefers-contrast: more` dark mapping, and the `dark:`/`light:` modifier classes, which also no longer add specificity (`:where(:root.dark)`), so a `hover:` class wins while hovering in dark mode. A theme scoped with `render_theme_style`'s `id` option now renders light when its scope element has `.light`, even under `:root.dark`. The modifiers no longer emit nested CSS, dropping the Safari 16.5 requirement. `render_color_scheme_rules` in `theme.ts`, with the `COLOR_SCHEME_ROOTS` selectors, renders a scheme's rules both ways.

- **breaking** feat: keep derived theme data out of the `Theme` wire shape ([a812860](https://github.com/fuzdev/fuz_css/commit/a812860))

  A `Theme` is now only what was authored - `name`, `summary`, `scheme`, and `variables` - and what a theme implies travels beside it instead of inside it. A persisted or shared theme can no longer carry a stale copy of derived values, which are recomputed wherever the theme renders.

  - `Theme.scheme_mirror` is removed, so `parse_theme` and the `Theme` schema refuse a theme carrying one. `validate_theme` drops its missing-mirror and stale-mirror warnings, since a stance no longer needs anything stored beside it.
  - `theme.ts` adds `ThemeDerived` (`scheme_mirror` and `caps`, never persisted or validated) and `ResolvedTheme` (`{theme, ...ThemeDerived}`, wrapping the theme so serializing it can't leak the derived data). `RenderThemeStyleOptions` extends `ThemeDerived`, so a resolved theme renders as `render_theme_style(resolved.theme, resolved)`: the mirror (under a stance only, skipping any name the theme or the caps set), then the theme's variables, then the caps. The renderer drops an internal `_` name from `theme.variables`, is total over junk options as it is over a junk theme, and falls back to the `fuz.theme` layer for a `layer` that isn't a dotted layer name.
  - `render_style_variables(variables, options)` renders a variable set that isn't a theme, internal names included - how `theme.css` renders the full defaults, and the way to restore the defaults at runtime over a baked theme (`render_style_variables(default_variables)`).
  - `resolve_theme_stance(theme)` returns a `ResolvedTheme` instead of a theme carrying its mirror. The mirror depends on the stance alone: `scheme_stance_variables(stance, variables?)` re-slots the dual-slot entries of a variable set, the scheme-adaptive defaults unless one is passed, and no longer takes the theme's variables to exclude. `scheme_mirrors_equal` is removed.
  - `compile_theme` and `CompiledTheme` move to `theme_compile.ts`, and `compile_theme` returns a `CompiledTheme` (`ResolvedTheme` plus `report` and `issues`): the input theme as the same reference, its `scheme_mirror`, and the recomputed `_palette_chroma_NN` `caps` beside it, where they used to be appended to `variables`. Render it with `render_theme_style(compiled.theme, compiled)`. The input never carries caps now, so compiling is idempotent by construction. The cap recomputation alone is `compute_theme_caps` in `theme_check.ts`, which stays free of zod. `check_theme(theme, {caps})` and `create_theme_resolver(theme, {caps})` take the caps beside the theme, and a cap that isn't the compiled form lands in `unchecked`.
  - `phosphor_theme` and `marquee_theme` export the authored theme rather than resolving at module scope, so importing one no longer pulls the mirror data. Resolve where they render.
  - The build-time `theme` option accepts a `Theme` or a `ResolvedTheme` and derives the theme's data itself, recomputing any it's handed. A stanced theme's mirror now re-slots the configured `variables` rather than the defaults, so a customized scheme-adaptive variable keeps its own value under the stance. Its caps are recomputed, so a theme whose hues or lightness moved off the baked table bakes them last - the generated CSS changes for such themes - and its gates run with them, reporting as warnings: `theme_gate_failed` and `theme_gate_unchecked`. The caps and gates fold in the knob-tier values the configured `variables` change from the defaults, so a build that retunes a ramp knob is capped and gated at what it renders. The lint doesn't run at build time, since it needs zod, an optional peer. `bake_theme` in `variable_graph.ts` does the derivation, `apply_theme_variables` takes the baked `ResolvedTheme`, and `VariableDependencyGraph` carries it as `theme`.

  Breaking: render a stanced theme through `resolve_theme_stance` and pass the result as the options; code reading `theme.scheme_mirror` reads `resolved.scheme_mirror`, and code reading compiled caps from `compiled.theme.variables` reads `compiled.caps`. A theme saved with a `scheme_mirror` no longer parses - drop the field, or re-pick the theme. fuz_ui's `ThemeRoot` renders the bare theme until it takes a resolver, so a stanced theme rendered through it loses its mirror - upgrade fuz_ui alongside, or render the resolved theme yourself.

- feat: catalog the contextual hooks the base styles read ([9129b60](https://github.com/fuzdev/fuz_css/commit/9129b60))

  The custom properties `style.css` and the class definitions read without declaring them as variables - `--flow_margin`, `--font_size`, `--border_radius`, `--icon_size`, `--fill`, the `--button_*`, `--menuitem_*`, `--checkbox_content*`, `--thumb_*`, and `--clickable_*` hooks, `--chip_padding_x`, `--select_arrow_size`, `--shadow`, `--shadow_color`, `--shadow_alpha`, and `--overflow` - are cataloged in the new `style_hooks.ts` as the stable contextual surface. Each `StyleHook` entry names what reads it and the `var()` fallbacks that render where nothing sets it, or marks it `local` when the reading rule declares it itself, so a value reaches it only from a rule on the same element. Hooks still have no `:root` defaults. The variables docs page lists them.

  `validate_theme` reports a hook a theme sets as a warning instead of an unknown variable: a theme's root value retunes every element reading an inherited hook and never reaches a local one, so hooks belong on elements and themes turn the knobs. `known_theme_variable_names` still leaves them out.

  `.clickable` reads `--clickable_transform_origin` and `--clickable_transition_duration` with fallbacks now, `center` and `0s`, which render as before where they're unset.

- **breaking** feat: rename the adaptive alpha overlays `--fg_NN`/`--bg_NN` to `--ink_NN`/`--paper_NN` ([610cbf1](https://github.com/fuzdev/fuz_css/commit/610cbf1))

  The color-scheme-adaptive alpha overlays are now named for what they wash toward: `--ink_NN` toward the text color (darkening in light mode, lightening in dark mode), and `--paper_NN` toward the ground (the reverse). The opaque `bg_*` background classes (`bg_a_50`, `bg_positive_50`) no longer share a prefix with them and are unchanged, as are `--darken_NN`/`--lighten_NN`. Values are unchanged, and the `input_fill` default now reads `var(--paper_80)`.

  Breaking: rename every reference - `var()` reads in CSS and markup, `@fuz-variables` hints, and theme variables that set an overlay by name:

  - `--fg_NN` → `--ink_NN`
  - `--bg_NN` → `--paper_NN`

  As a GNU sed over your sources (it relies on `\b`; `NN` is a numeric stop, `00` through `100`, so `--bg_color`, `bg_a_50`, and other names are left alone):

  ```sh
  sed -i -E 's/\bfg_([0-9]{2,3})\b/ink_\1/g; s/\bbg_([0-9]{2,3})\b/paper_\1/g' FILES
  ```

  It doesn't catch names built at runtime (`'fg_' + n`, `` `bg_${n}` ``), so grep for `fg_`/`bg_` string fragments too.

- feat: add keyword classes, bare CSS keywords like `flex` and `sticky` ([6514ef3](https://github.com/fuzdev/fuz_css/commit/6514ef3))

  A CSS value keyword that names its property on its own is now a class setting that one declaration, with modifiers like any class (`md:flex`, `hover:underline`):

  - **display** — `flex`, `inline-flex`, `grid`, `inline-grid`, `inline-block`, `block`, `flow-root`
  - **position** — `relative`, `absolute`, `fixed`, `sticky`
  - **typography** — `uppercase`, `lowercase`, `capitalize`, `italic`, `oblique`, `bold`, `bolder`, `lighter`, and `underline`, `overline`, `line-through` (setting the `text-decoration-line` longhand)
  - **`hidden`** — `display: none`, mirroring the HTML attribute, for `max-md:hidden` and `print:hidden`; the `[hidden]` attribute still beats every class

  `hidden` orders after the display classes it ties with, a `display:*` literal included, so `class={['display:flex', {hidden: !open}]}` hides, while a media query still outranks it (`hidden md:flex` shows from `md` up). `row`, `column`, and `box` are unchanged composites, so `hidden md:row` stays hidden at every width - write `max-md:hidden row`. A class definition or interpreter can take the same order with the new `late` flag on `CssClassDefinitionBase`.

  These names are found implicitly like any class, so a project with its own classes named like them, or extracting a dependency that uses them, now gets their styles. A Tailwind project's `flex` or `hidden` now resolves to the same CSS Tailwind ships, while Tailwind's own names (`items-center`, `justify-between`) still generate nothing, silently.

- **breaking** feat: take a callback over the defaults for class definitions and interpreters ([7e6eea0](https://github.com/fuzdev/fuz_css/commit/7e6eea0))

  `class_definitions` and `class_interpreters` take a callback over the built-in defaults, as `base_css` and `variables` already do. The callback receives a copy of the defaults and returns the set to use, and one that returns the wrong shape fails generator creation. The plain forms are unchanged: a `class_definitions` record merges over the defaults, and a `class_interpreters` array replaces them.

  ```ts
  vite_plugin_fuz_css({
    class_interpreters: (defaults) => [grid_cols_interpreter, ...defaults],
  });
  ```

  Breaking:

  - `include_default_classes` is removed. Replace `include_default_classes: false, class_definitions: mine` with `class_definitions: () => mine`.
  - `merge_class_definitions` is replaced by `resolve_class_definitions(option)`, which takes the `class_definitions` option in any form; `resolve_class_interpreters(option)` is its interpreter twin.
  - `generate_bundled_css` no longer takes `include_utilities` - pass an empty `utility_css` to leave the utility classes out.
  - The `deps` option is marked `@internal`: it is a test seam for the extraction cache's filesystem access, not stable API.

- feat: label `.palette_X` buttons at stop 70 so they hold AA in every state ([61297da](https://github.com/fuzdev/fuz_css/commit/61297da))

  A `.palette_X` button's label moves from `--palette_X_60` to `--palette_X_70` at rest, hovered, and pressed, so it holds AA contrast on its own tinted fill as the tint deepens; at stop 60 a keyboard press (no hover) dropped it as low as 3.3:1 on light grounds. The label darkens in light schemes and lightens in dark ones (about 0.09 and 0.07 in OKLCH lightness); the border, focus ring, fill tint, and selected fill stay at stop 60, as do links, colored text, and chip labels. The `low contrast` modifier and the `guestbook` theme now clear every contrast gate.

  `check_theme` gates the label on each of the button's fills: rest (8%), hover (16%, with the hovered label's 10% mix toward `shade_max`), and pressed (24%), for a mouse press (hovered label) and a keyboard press (plain label). The rest entry is now `palette_X_70 on palette_X button fill`, joined by `palette_X_70 on palette_X active fill`, `palette_X_70 hovered on palette_X hover fill`, and `palette_X_70 hovered on palette_X active fill`, and `shade_max` is now a gate input, so a theme that pins it in a form the gates don't read reports it as `unchecked`.

- **breaking** feat: give the ramp intermediates a private spelling that themes can't set ([34deea5](https://github.com/fuzdev/fuz_css/commit/34deea5))

  The derived ramp stops between the knobs and the color stops are internal now, spelled with a leading underscore, and a theme can no longer pin one. Themes steer the ramps through their knobs (`--palette_lightness_00`/`_100`/`_curve` and the `shade_`/`text_` twins, `--palette_chroma_min`/`_max`, `--chroma_curve`) and can still pin a color stop like `--palette_a_50` directly. Rendered values are unchanged.

  - `--palette_lightness_NN`, `--shade_lightness_NN`, `--text_lightness_NN` (stops `05` through `95`) → `--_palette_lightness_NN`, `--_shade_lightness_NN`, `--_text_lightness_NN`; the `00`/`100` endpoints are the knobs and keep their names
  - `--chroma_shape_NN` → `--_chroma_shape_NN`
  - `--palette_chroma_NN` → `--_palette_chroma_NN`

  `STYLE_VARIABLE_NAME_MATCHER` rejects the leading underscore, so `parse_theme` and the `Theme` schema refuse a theme that sets an intermediate, and `validate_theme` reports it as an internal ramp variable. A theme still naming one by its old spelling gets an unknown-variable error that points at the knobs. `known_theme_variable_names` leaves the intermediates out, and `INTERNAL_VARIABLE_NAME_MATCHER` in `variable.ts` matches the private spelling.

  `check_theme` and `compile_theme` derive every intermediate from the knobs, so a theme's caps follow the lightness its endpoint and curve knobs give each stop. A theme that carries an intermediate anyway, skipping the schema, has it dropped the same way: `render_theme_style` doesn't render it, and the gates measure the derived value the page renders. The `ramps.ts` helpers `to_lightness_stop_name`, `to_chroma_shape_name`, and `to_palette_chroma_name` build the names, and `CSS_NUMBER_PATTERN` moves from `theme_resolver.ts` to `ramps.ts`.

  Breaking: a theme that pinned an intermediate loses the pin - move the endpoint or curve knobs instead, or pin the color stops it was shaping. A `var()` read of an intermediate in your own CSS needs the new spelling, and is unsupported: the intermediates can change shape between releases.

- **breaking** feat: remove the Gro generator ([faabe02](https://github.com/fuzdev/fuz_css/commit/faabe02))

  The Vite plugin is now the one way to generate bundled CSS. `gen_fuz_css.ts` is deleted, with `gen_fuz_css` and `GenFuzCssOptions` and its Gro-only options (`include_stats`, `project_root`, `concurrency`, `cache_io_concurrency`), and `@fuzdev/gro` is no longer an optional peer.

  To migrate a `fuz.gen.css.ts`, delete it and its generated `fuz.css`, add `vite_plugin_fuz_css()` to `plugins` in `vite.config.ts` with the same options, and import `virtual:fuz.css` where you imported `./fuz.css`. A SvelteKit app takes the plugin directly, beside `sveltekit()`.

  Breaking for code calling the pipeline directly: `resolve_css` and `generate_css` no longer take `include_stats`, and the `resolve_css` result has no `stats`, so `CssResolutionStats` is gone. `included_elements`, `included_rule_indices`, and `resolved_variables` on the result carry the same counts, and `style_rule_index.rules.length` the total rule count.

- feat: order utility classes by structure, with composites in their own sublayer ([8ae17b7](https://github.com/fuzdev/fuz_css/commit/8ae17b7))

  Generated classes now cascade in a declared order instead of an alphabetical one. Breakpoint classes apply in width order (`min-width` ascending, `max-width` descending, then feature queries like `print:`), an unprefixed class comes before its modified forms, shorthands and axis pairs come before longhands (`p_md` and `px_md` before `pl_lg`), and states follow link-visited-focus-hover-active order. Previously `md:padding:1rem` was emitted before `padding:0`, so the unprefixed class won at every width, and `lg:` rules could lose to `sm:` ones.

  Composites (`box`, `row`, `panel`, `sized_*`, ...) render in a `fuz.utilities.composites` sublayer, so a token or literal class always wins over a composite it overlaps. The single-property shortcuts (`circular`, `pixelated`, `mb_flow`, `mt_flow`) order with the token classes instead, and lose a same-property tie to a token or literal. Markup that combined a composite with a class setting the same property can render differently:

  - a modified composite now loses to a plain class: `display:none md:row` used to be flex at `md` and up, and is now hidden at every width. This is the Tailwind `hidden md:flex` habit - write `display:none md:display:flex` instead. `md:panel shadow_md` likewise takes `shadow_md` at every width
  - a composite's state, compound, and descendant rules now lose to tokens by layer, where they used to win by specificity: `menuitem selected shade_00` and `selectable selected shade_00` lose the selected background, `chip palette_a color_b_50` takes `color_b_50`, and `plain shadow_sm` shows the shadow at rest
  - custom `ruleset` and `composes` definitions render in the composites sublayer by default, so a token or literal class now beats them on the same property; set `composite: false` to keep one with the single-purpose classes

  `generate_classes_css` now returns its CSS wrapped in the `fuz.utilities` layer. A class definition can set `composite: true` (the default for `ruleset` and `composes` definitions, while a `declaration` alone defaults to single-purpose).

  Modifiers are stripped by the generator before a class resolves, so they apply to classes from custom interpreters too. Breaking for custom interpreters: `interpret` returns a definition (`{declaration}`, `{ruleset}`, or `{composes}`) instead of a CSS string, and `modified_class_interpreter` is removed - `css_class_interpreters` holds only `css_literal_interpreter`. Also removed: `extract_primary_property`, `generate_modified_ruleset` (replaced by `modify_ruleset`), and the literal output helpers `interpret_css_literal`, `generate_css_literal_simple`, `generate_selector`, `CssLiteralOutput`, and `InterpretCssLiteralResult`. Media modifier definitions carry the bare condition (`(width >= 48rem)`) plus a `width` bound, ancestor modifiers name their color scheme, and `parse_arbitrary_breakpoint` returns a width bound. Arbitrary breakpoints now decode `~` to a space, so `min-width(calc(100vw~-~20px)):` emits valid CSS.

- **breaking** feat: rename the `StyleVariable` `light` slot to `base` ([b3bb289](https://github.com/fuzdev/fuz_css/commit/b3bb289))

  The slot a variable renders on `:root` was called `light`, but it applies in both color schemes, with `dark` replacing it in the dark scheme only - `{name: 'chroma_scale', light: '1.25'}` was never light-only. It's now `base`: `{name: 'chroma_scale', base: '1.25'}`. Rendering is unchanged.

  Every API that reads or writes a slot follows: the `StyleVariable` and `Theme` schemas, `default_variables` and `scheme_adaptive_variables`, the shipped themes, `pick_stance_slot`, `overlay_style_variable`, `compose_themes`, the stance mirror from `resolve_theme_stance`, the cap overrides `compile_theme` emits, and `validate_theme`'s knob warnings, which name the slot as `base` (`chroma_scale base 5 is outside the safe range ...`). The schema refines read `must have at least one of base or dark` and `base and dark must differ when both specified`. In `variable_graph.ts`, `StyleVariableInfo`'s `light_deps`, `light_css`, and `dark_css` are now `base_deps`, `base_value`, and `dark_value` (they hold values, not CSS), and `generate_theme_css` returns `{root_css, dark_css}`, `root_css` being the `:root` block it renders.

  Breaking: rename `light:` to `base:` in every theme and variable you author, including the `variables` callback and `theme` option of the Vite plugin. A theme saved as JSON with `light` keys no longer renders its base values: the strict schemas reject the unknown key, so `parse_theme` returns `null`, and `render_theme_style` skips it, rendering only the `dark` slots. fuz_ui's `ThemeRoot` is where a stored theme hits this: it restores the theme it saved to `localStorage` under `fuz:theme` without parsing it, so a theme saved before this release renders only its `dark` slots. Rename the key in stored themes, or re-pick the theme so it's saved again.

### Patch Changes

- docs: lead the package description with the theming and plugin story, and point the stylesheet headers at the new setup docs ([1d5c99d](https://github.com/fuzdev/fuz_css/commit/1d5c99d))
- fix: install the generator's parser stack as dependencies so the Vite plugin loads on a fresh install ([029d240](https://github.com/fuzdev/fuz_css/commit/029d240))

  `svelte`, `acorn`, `@sveltejs/acorn-typescript`, `zimmerframe`, and `@webref/css` move from optional peers (`acorn` was undeclared) to `dependencies`; `vite` is declared as an optional peer (`>=6`). The plugin hashes with `node:crypto` instead of `@fuzdev/blake3-wasm`, which is no longer a peer. `acorn-jsx` is no longer a peer either - JSX projects still install it themselves and pass it through `acorn_plugins`.

- fix: reject literal classes that could end their declaration or rule ([c0334c2](https://github.com/fuzdev/fuz_css/commit/c0334c2))

  A literal class whose value could end its declaration or rule (an unclosed quote or bracket, a top-level `;`, a brace, comment, or escape outside a string, a `!` other than a trailing `!important`, or an unquoted `url(` holding what needs quotes) no longer generates CSS, nor does one whose custom-property name or modifier argument (`nth-child(...)`, `min-width(...)`) could: a class found in source logs a warning, and a hinted or listed one is an error. Quote such values or set them in a stylesheet.

  Modifier arguments must also be valid where they render: `nth-*(...)` takes An+B (`odd`, `2n+1`, `-n+3`), and a breakpoint takes a length or a `calc()`, `clamp()`, `min()`, or `max()` of lengths, so a unitless `min-width(800)`, a percentage, or `env()` no longer generates. `2xl:` classes, and any class name starting with a digit, now apply - their selector was invalid before. A class name containing a space, listed by hand, now renders as one selector.

- fix: label selected `.menuitem` and `.selectable` buttons in the text color ([23e465f](https://github.com/fuzdev/fuz_css/commit/23e465f))

  A selected button labels in the inverse text color for its solid fill, but `.menuitem.selected` and `.selectable.selected` paint a light tint instead, so their button labels were nearly invisible (about 1.1:1 to 1.4:1). `button.menuitem.selected` and `button.selectable.selected` now label in `--text_color` (the palette color with `.palette_X`), hovered, pressed, and focused alike. Other elements with these classes, which never took the inverse, are unchanged.

## 0.66.2

### Patch Changes

- fix: soften the dark shade ramp curve from 0.92 to 1.05 so the near-dark surface stops (`shade_05`, `shade_10`, `shade_20`) sit darker, closer to the pre-oklch look; the ramp endpoints are unchanged ([ea69e75](https://github.com/fuzdev/fuz_css/commit/ea69e75))
- fix: a dev change invalidates the served CSS in every Vite environment, not just `client` and `ssr`, and the plugin uses the per-environment module graphs and hot channel instead of the mixed `server.moduleGraph` and `server.hot`, so it runs clean under Vite's `future.removeServerModuleGraph`/`removeServerHot` flags ([928bc7e](https://github.com/fuzdev/fuz_css/commit/928bc7e))

## 0.66.1

### Patch Changes

- fix: keep the Vite dev server from watching the extraction cache ([8980e72](https://github.com/fuzdev/fuz_css/commit/8980e72))

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
