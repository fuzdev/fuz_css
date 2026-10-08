# fuz_css

> semantic-first CSS framework and design system

fuz_css (`@fuzdev/fuz_css`) styles HTML elements by default and integrates
custom properties, themes, and utility classes into a complete system. It
ships two plain CSS files - the base `style.css` and replaceable `theme.css` -
that work with any framework and plain HTML, and its class generator supports
HTML/JS/TS, Svelte, and JSX (React/Preact/Solid). Early alpha with breaking
changes ahead.

For coding conventions, see Skill(fuz-stack). For UI
components (themes, color scheme controls), see [`fuz_ui`](../fuz_ui/CLAUDE.md).

## Gro commands

```bash
gro check     # typecheck, test, lint, format check (run before committing)
gro typecheck # typecheck only (faster iteration)
gro test      # run tests (SKIP_EXAMPLE_TESTS=1 to skip slow integration tests)
gro gen       # regenerate theme.css and other .gen files
gro build     # build the package for production
```

## Key dependencies

- Svelte 5 - `svelte/compiler` parses CSS and Svelte source in the extractor
  (optional peer); the component framework also powers the docs site
- SvelteKit - application framework (for docs site only)
- @sveltejs/acorn-typescript, acorn-jsx, zimmerframe - AST parsing and walking
- zod - schema validation
- @webref/css - CSS property validation
- @fuzdev/blake3-wasm - BLAKE3 content hashing for cache validation (optional
  peer, via fuz_util's `hash_blake3`)
- fuz_util (@fuzdev/fuz_util) - utility functions
- Vite 6+ - required by the Vite plugin only

## Scope

fuz_css is a **semantic-first CSS framework and design system**:

- Semantic HTML styling without classes
- Design tokens as CSS custom properties
- Smart utility class generation (includes only used)

### What fuz_css does NOT include

- UI components (use fuz_ui)
- JavaScript runtime - all output is pure CSS
- Animation utilities (planned)
- Full Tailwind compatibility

## Design decisions

### Styling philosophy

**Default element styling is the baseline - reach past it only with a
reason.** fuz_css styles semantic HTML out of the box, so most content needs
no classes: headings are tiered, form controls share sizing and focus states,
and block elements (`p`, `ul`, `ol`, `table`, `aside`, `blockquote`, `pre`,
`fieldset`, …) get vertical rhythm automatically from the **flow-margin**
system - each gets `margin-bottom: var(--flow_margin, var(--space_lg))` unless
`:last-child` or `.unstyled` (headings and `section` take multiples of it),
and margins reset to 0 on the direct children of a `.row` (horizontal flex;
use `gap_*` there instead). Adding a
`mb_*`/`gap_*`/`p_*` class or a `<style>` block
should answer "what specific gap in the defaults does this close?" - the most
common misuse is hand-spacing elements that flow margin already spaces, or
re-declaring typography/color the element already carries. When you do style,
work down the ladder and stop at the first rung that suffices: right semantic
element → built-in class convention (`.selected`, `.palette_a`) → composite
(`box`, `row`, `panel`) → token class (`p_md`, `gap_lg`) → literal
(`display:flex`) → `<style>` block with design tokens. Never hardcode spacing
or color values.

### Two core concepts

1. **Semantic styles** - The reset stylesheet styles HTML elements (buttons,
   inputs, links, headings, forms, tables) without adding classes. Uses
   low-specificity `:where()` selectors so your styles easily override the
   defaults. Add `class="unstyled"` to any element to opt out of opinionated
   styling (colors, borders, decorative properties) while keeping
   normalizations (font inheritance, border-collapse).
2. **Style variables** - Design tokens as CSS custom properties that enable
   customization and runtime theming. Each variable provides values for light
   and/or dark color-schemes.

### 3-layer architecture

1. **Base styles** - Reset stylesheet with semantic defaults
2. **Theme variables** - Style variables as CSS custom properties
3. **Utility classes** - Generated per-project, only includes used classes

In bundled mode (`virtual:fuz.css` or `./fuz.css`), all three layers are
combined and only used content is included. In utility-only mode, import
`style.css` and `theme.css` from the package separately (full content).

### Style variables as source of truth

- TypeScript objects in [variables.ts](src/lib/variables.ts) define all design
  tokens
- Each variable can have `light` and/or `dark` values
- Light/dark are color-schemes _within_ a theme, not separate themes
- [`render_theme_style()`](src/lib/theme.ts) generates CSS into the
  `fuz.theme` cascade layer (defaults live in `fuz.base`, OS user-preference
  mappings like `prefers-contrast` in `fuz.preferences` above them, generated
  utility classes in `fuz.utilities`; consumers' unlayered styles beat
  everything except the two `!important` declarations in layers - the
  `prefers-reduced-motion` mapping, so a theme's durations can't re-enable
  motion, and `[hidden]`)
- A theme applies either at build time (the generators' `theme` option, baked
  into the bundled CSS, no JS shipped) or at runtime (fuz_ui's `ThemeRoot`
  renders it to a `<style>` element). They compose - the baked theme's
  overlay renders into the `fuz.theme.baked` sublayer, which a runtime
  theme's direct `fuz.theme` styles outrank whatever the specificity
- Color values are derived: curve knobs → ramp stops → color stops, computed
  in pure CSS (`calc()`/`pow()`/`oklch()`); the fitted knob constants and CSS
  emitters live in [ramps.ts](src/lib/ramps.ts) with design-time gamut and
  contrast gates in [oklch.ts](src/lib/oklch.ts)/[wcag.ts](src/lib/wcag.ts)
- [theme_check.ts](src/lib/theme_check.ts) turns those design-time gates into
  a theme API: `validate_theme` ([theme_validate.ts](src/lib/theme_validate.ts))
  lints a theme's shape, `check_theme` runs the
  gamut/monotonicity/contrast gates against an arbitrary theme (resolving its
  bindings back to numbers, following the role variables the default styles
  paint through - `text_color`, `link_color`, `border_color`, and the rest of
  `theme_gate_role_names` - and reporting any gate input it can't evaluate as
  `unchecked` rather than passing it unread), and `compile_theme` recomputes
  per-theme worst-hue chroma caps at each stop's resolved lightness so
  rotated, monochrome, dark-only, or lightness-pinned themes stay in gamut -
  all three over the string→number resolution core in
  [theme_resolver.ts](src/lib/theme_resolver.ts)

### Smart utility class generation

Two generators available, both using AST-based extraction and per-file caching:

1. **Vite plugin** (preferred) - [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts)
   exposes the generated CSS as `virtual:fuz.css` with HMR; works across
   SvelteKit/Svelte/React/Preact/Solid and needs no committed output file.
   In dev it pre-scans project sources and the root `index.html` at server
   startup (see `prescan`) so the first served CSS is complete, keeps those
   files current from the watcher, and extracts everything else as the dev
   server transforms it - keyed by file path with Vite's `?v=`/`?t=`
   cache-busters dropped, and a pre-bundled dependency through the source
   files its sourcemap lists (or as its bundled chunk when those can't be
   read). A client can't take a hot update before the
   virtual module has evaluated, so CSS that changes while a page is loading
   is delivered by a handshake: each client reports the module code it
   evaluated, and the server pushes that client an update when a refetch
   would give it different code, once per reported code (no report is
   added when `server.ws` or `server.hmr` is off). In build the virtual
   module is a
   placeholder rule until every transform has run: `renderChunk` restates it
   with a hash of the generated CSS, so the stylesheet's filename (and the
   chunks named from it) tracks that CSS, and `generateBundle` splices the
   CSS in at the placeholder's position in one of two passes, chosen by
   `build.cssCodeSplit` - at the default order ahead of other plugins for a
   code-split build, so their `generateBundle` hooks read finished
   stylesheets, or at `order: 'post'` for the single stylesheet Vite emits
   late with `build.cssCodeSplit: false` (the `build.lib` default). Each
   build environment's CSS comes from the modules in its own graph, so a
   client build never carries an SSR-only class, and a watch rebuild drops
   a deleted file's. The build's passes and the dev handshake need
   different places in the plugin order, so `vite_plugin_fuz_css()` returns
   several plugin objects (pass the array to `plugins` as is), and the
   plugin needs Vite 6 or later
2. **Gro generator** - [gen_fuz_css.ts](src/lib/gen_fuz_css.ts), a SvelteKit
   alternative that writes a `fuz.css` genfile

Both render through one shared core (`css_generator.ts`: option defaults,
resources, and a diagnostic dispatch that logs a persisting diagnostic once
rather than on every re-render) over the `generate_css` pipeline (generate →
resolve → bundle), and output only CSS for classes actually used. Supports Svelte 5.16+
class syntax, JSX `className`, clsx/cn calls, and `// @fuz-classes` comment
hints.

**Comment hints for static extraction:** The AST extractor cannot detect dynamic
class names or elements. Use comment hints to explicitly include them:

- `// @fuz-classes box row p_md` - Classes to include
- `// @fuz-elements button input` - Elements to include base styles for
- `// @fuz-variables shade_40 text_50` - CSS variables to include in theme

Both produce **errors** if the specified item can't be resolved, helping catch
typos early. Implicitly detected classes that can't be resolved are silently
skipped (they may belong to other CSS frameworks).

**CSS variable detection:** Variables are detected via simple regex scan of
`var(--name` patterns in source files. Only theme variables are included;
unknown variables are silently ignored. This catches usage in component props
like `size="var(--icon_size_xs)"` that AST-based extraction would miss.

See `GenFuzCssOptions` and `VitePluginFuzCssOptions` types for configuration.

### Three class types

- **Token classes** - Map to style variables: `p_md`, `color_a_50`,
  `positive_50`, `gap_lg`. Palette-letter classes are property-first and the
  letter alone implies the palette: `color_a_50`, `bg_a_50`, `border_a_50`,
  and `outline_a_50` apply the `--palette_a_NN` stops to their named property
  and `shadow_a_50` sets the contextual `--shadow_color` (`border_color_50` is
  the letterless alpha ramp). A bare intent or neutral scale class applies its
  family's dominant use
  (`positive_50`/`text_70` set text color, `shade_50` sets background) with
  `bg_` twins (`bg_positive_50`). The adaptive alpha overlays
  (`--fg_*`/`--bg_*`) are variables only, reached via literals
  (`background-color:var(--fg_10)`) - `bg_` classes are always opaque
- **Composite classes** - Multi-property shortcuts: `box`, `column`, `row`,
  `ellipsis`, `pixelated`, `circular`, `selectable`, `clickable`, `pane`,
  `panel`, the size composites `xs`/`sm`/`md`/`lg`/`xl` (uniform step offsets
  from the `md` default; `md` doubles as a cascade reset; they scale controls
  and spacing via `--flow_margin` - headings and prose keep their font sizes,
  while a bare `.heading` reads the current `--font_size`, so a composite or
  a `--font_size` literal tiers it),
  `mb_flow`/`mt_flow` (flow-aware margins), `icon_button`, `plain`,
  `menuitem`, `chevron`, `chip`
- **Literal classes** - CSS `property:value` syntax: `display:flex`, `opacity:50%`

All class types support modifiers: responsive (`md:`), state (`hover:`),
color-scheme (`dark:`), pseudo-element (`before:`).

### CSS-literal syntax

Literal classes use `property:value` syntax that maps 1:1 to CSS:

- `display:flex` → `display: flex;`
- `hover:opacity:80%` → `:hover { opacity: 80%; }`
- `md:dark:hover:opacity:80%` → nested media/ancestor/state wrappers

Modifier ordering is `[media:][ancestor:][state...:][pseudo-element:]property:value`.
Space encoding uses `~` for multi-value properties (`margin:0~auto`). Arbitrary
breakpoints via `min-width(800px):` and `max-width(600px):`. Built-in max-width
variants (`max-sm:`, `max-md:`, etc.) and media feature queries (`print:`,
`motion-safe:`, `contrast-more:`, etc.) are also available.

Custom properties work as literals too - `--flow_margin:0`, `--button_shadow:none`
set the property on the element straight from markup, which is how a consumer
reaches a contextual base hook without a dedicated token class. The knobs and
the tokens derived from them resolve on `:root`, so setting one on an element
(`--space_scale:0.8`) changes nothing below it - knobs belong in a theme.

## Variable naming

See [variables.ts](src/lib/variables.ts) for definitions,
[variable_data.ts](src/lib/variable_data.ts) for size/palette/intent variants.

**Colors (OKLCH, derived):**

- Palette hues `a`-`j`, glossed by color + default intent binding
  (`palette_glosses` in `variable_data.ts`): `a` (blue · accent), `b`
  (green · positive), `c` (red · negative), `d` (purple), `e` (yellow), `f`
  (brown · neutral), `g` (pink), `h` (orange · caution), `i` (cyan · info),
  `j` (teal)
- Semantic intent knobs alias meaning over the letters: `--hue_accent`
  (links/focus/selection/selected), `--hue_neutral` + `--neutral_chroma`
  (all surfaces/text/borders/shadows - the neutral is an intent whose scales
  are `shade_*`/`text_*`; the chroma shape is 0 at the ends, so the page
  ground `shade_00` is untinted unless `--shade_chroma_00` tints it),
  `--hue_positive`/`--hue_negative`/
  `--hue_caution`/`--hue_info`; each intent derives the full stop scale
  through the shared ramps (`--accent_00`–`--accent_100`, same for the
  others) with matching text/background token classes (`.positive_50`,
  `.bg_caution_10`)
- Curve knobs drive everything: `--chroma_scale` (0 collapses the palette
  to grayscale → >1 vivid; the neutral scales ride `--neutral_chroma`
  instead), per-scheme lightness
  ramps (`--palette_lightness_00`/`_100`/`_curve`, same trio for `shade_`
  and `text_`), and the chroma curve (`--chroma_curve`, shared with the
  neutral scales, over the palette's `--palette_chroma_min`/`_max`) clamped
  per stop by baked worst-hue sRGB gamut caps
- Per-slot chroma character: `--palette_a_chroma_scale`…`_j_` and intent
  twins (`--accent_chroma_scale`, …) multiply one slot's chroma under
  `--chroma_scale`; the brown slot `f` ships muted at 0.55 (brown is
  low-chroma orange). A hue binding shares only the angle - `validate_theme`
  warns when a bound letter's multiplier differs from the intent's twin
- Intensity stops: `palette_a_00` (nearest the background) through
  `palette_a_100`, with `_50` as the base (steps: 00, 05, 10, 20, 30, 40,
  50, 60, 70, 80, 90, 95, 100). `_60` is the text-safe stop: links, the
  `.palette_X` button and chip labels, and selected-button fills use it, and
  `check_theme` gates those pairings at AA - the button label against its
  rest fill (its own color at 8% alpha over `shade_00`); the pairings an
  exemplar or composition knowingly gives up are declared as exact
  exceptions in the theme_check tests
- Form/scale knobs derive into token defaults so one move reshapes a family
  while tokens stay pinnable: `--radius_scale` (border radii, floored at
  `--border_radius_min`; controls read `--control_radius`, the `sm` tier
  by default, so a theme rounds controls apart from panels), `--space_scale`
  (spaces), `--shadow_alpha_scale` (shadow alphas incl. button shadows),
  `--font_size_scale` (every font size, body text included - `body` reads
  `--font_size_md`), `--type_scale_ratio` (the font sizes above `md`, as
  `md * ratio^n`, so the knob moves the heading hierarchy without moving
  body text; the `lg`/`xl` size composites step up the same ladder, so
  their font size follows it while `xs`/`sm` stay put), plus
  `--font_weight`, `--heading_font_weight` (a hook with per-tier fallbacks -
  setting it flattens the heading ladder), `--heading_font_family`,
  `--heading_letter_spacing` (heading tracking, `normal` by default, best
  set in em), and the `--background_image` decoration hook on `:root`
- Surface shadows are declared variables a theme can retarget:
  `--button_shadow`/`_hover`/`_active`, `--pane_shadow` (the floating
  `.pane`), and `--panel_shadow` (the embedded `.panel`, `none` by default).
  The composed defaults name their shadow colors outright, since a value
  declared on `:root` can't see a contextual `--shadow_color`, so a shadow
  color or alpha class alone no longer tints them; a shadow shape class
  (`shadow_md`) on the element still wins by source order, except over a
  modified composite (`md:panel`), which is emitted after it. `.panel`
  declares `box-shadow`, so it resets the shadow of an element it is
  combined with (a `.pane`, a `button`)
- `--font_family` is the body font (default `var(--font_family_sans)`), kept
  apart from the three stacks (`--font_family_sans`/`_serif`/`_mono`) so
  retargeting the body doesn't make one of them mean something it isn't;
  headings still take `--heading_font_family`, so "one family everywhere" is
  two knobs by design
- `--border_style` is global, but buttons read `--button_border_style`
  (default `var(--border_style)`) and swap to `--button_border_style_active`
  while pressed - the raised/pressed pair `outset`/`inset` needs, and the
  only element with that affordance. A theme's contextual `--border_style`
  override doesn't reach buttons, since the derived default resolves at
  `:root`
- Micro-surface variables declared in `default_variables`: `--caret_color`
  (defaults to the accent), `--scrollbar_thumb_color`/
  `--scrollbar_track_color` (the thumb defaults into the shade scale, the
  track to transparent), `--backdrop_color`
  (the `dialog::backdrop` dim), `--outline_offset` (the border-to-focus-ring
  gap, default 1px); `--heading_font_weight` is the lone `var()`-fallback
  hook among the knobs (per-tier fallbacks, so no single default exists); `prefers-contrast:
  more` mirrors the high-contrast modifier (the ground and text curve knobs
  plus a stronger `--border_color`), theme-overridable
- [knobs.ts](src/lib/knobs.ts) is the typed knob catalog (`kind`, `axis`,
  `leverage`, `tier`, ranges) powering the themes docs page's inline editor
- `bg_*`/`fg_*` - color-scheme-aware (swap in dark mode, use alpha for stacking)
- `darken_*`/`lighten_*` - color-scheme-agnostic (don't swap)
- `text_*` - opaque text colors (`text_00`–`text_100`, alpha avoided for
  performance). `text_min`/`text_max` for untinted extremes (pure black/white).
- `shade_*` - shade scale (`shade_00`–`shade_100`), plus `shade_min`/`shade_max`

**Size variants:** Core pattern is `xs` → `sm` → `md` → `lg` → `xl`, with
extended ranges varying by family:

- Spaces: `xs5`...`xs` → `sm` → `md` → `lg` → `xl`...`xl15`
- Font sizes: `xs` → `sm` → `md` → `lg` → `xl`...`xl9`
- Icon sizes: `xs` → `sm` → `md` → `lg` → `xl`...`xl3`
- Border radii: `xs3`...`xs` → `sm` → `md` → `lg` → `xl`
- Distances, shadows, line heights: `xs` → `sm` → `md` → `lg` → `xl`

## Usage

### Bundled mode (default)

Generated CSS includes only the theme variables, base styles, and utility classes
your code uses:

**Vite (SvelteKit/Svelte/React/Preact/Solid):**

```ts
// vite.config.ts
import { vite_plugin_fuz_css } from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';
export default defineConfig({ plugins: [vite_plugin_fuz_css()] });

// main.ts (or your SvelteKit root layout)
import 'virtual:fuz.css';
```

The Vite plugin supports HMR - changes to source files automatically trigger
CSS regeneration during development. For TypeScript consumers, declare the
module's type once (e.g. in `src/app.d.ts`):

```ts
declare module 'virtual:fuz.css' {
	const css: string;
	export default css;
}
```

**Gro generator (SvelteKit alternative):**

```ts
// src/routes/fuz.gen.css.ts
import { gen_fuz_css } from '@fuzdev/fuz_css/gen_fuz_css.ts';
export const gen = gen_fuz_css();
```

Then import the generated file in your layout: `import './fuz.css';`

### Utility-only mode

For projects managing their own theme/base styles, set `base_css: null` and
`variables: null` in generator options, then import package CSS separately
(`@fuzdev/fuz_css/style.css` and `theme.css` include everything).

### Customization

Use `GenFuzCssOptions` or `VitePluginFuzCssOptions` to customize:

- `base_css` - Custom base styles (a string) or callback to modify defaults.
  The contract is pass-through with shallow tree-shaking: any CSS the parser
  accepts (`parseCss` from `svelte/compiler`), which the generator places in
  `fuz.base`, a callback's additions included (so they sit below themes and
  utilities). Top-level style rules and top-level
  `@media`/`@supports`/`@container` rules tree-shake by the elements and
  classes they target (a conditional rule ships whole or not at all, and a
  rule with a selector the index can't match - one that can match an
  element carrying none of its names (names inside `:not()` don't count),
  or an escaped or non-ASCII name - always ships); every other at-rule ships as
  written; every `var()` in what ships is tracked at any nesting depth. The
  generator owns layering - only top-level `@layer fuz.base`/`fuz.preferences`
  blocks and the shipped order statement are recognized, as `style.css` uses
  them. A top-level `@charset` is the one construct left out
- `variables` - Custom theme variables (an array replacing the defaults) or
  callback to modify defaults; the set is the whole theme
- `theme` - A `Theme` baked into the generated CSS, overlaid onto `variables`
  last-wins by name. The static counterpart to fuz_ui's `ThemeRoot`: no
  runtime theme rendering, and the output stays tree-shaken because the
  overlay happens before the dependency graph is built. A stanced theme's
  `scheme_mirror` auto-resolves at build time, so hand-rolled themes don't
  need `resolve_theme_stance`
- `additional_classes` - Classes to always include (for dynamic names)
- `additional_elements` - Elements to always include, or `'all'` for all base styles
- `additional_variables` - Variables to always include, or `'all'` for all theme vars
- `exclude_classes` - Classes to exclude from output
- `exclude_elements` - Elements to exclude from base CSS
- `exclude_variables` - Variables to exclude from theme
- `on_error` (`'log' | 'throw'`) / `on_warning` (`'log' | 'throw' | 'ignore'`) -
  diagnostic handling. Errors from the base stylesheet: `base_css_layer` (an
  `@layer` rule of the consumer's own, at any depth) and
  `base_css_unsupported_at_rule` (`@import`/`@namespace`, invalid inside a
  layer) name the construct and its line and never remove CSS - it ships as
  written - and `undefined_theme_variables` fires when emitted base styles
  reference, with no fallback, a variable the defaults define that nothing
  defines: the configured `variables` lack it (`null`, `[]`, or a partial
  set), the referencing rule doesn't declare it, and no shipped
  top-level rule with a selector that is exactly `:root`, `:host`, `html`,
  `body`, or `*` does. A variable-free base and the
  consumer's own property names stay silent, as does a name listed in
  `exclude_variables` (`default_variables.map((v) => v.name)` pairs bundled
  base styles with a separately imported `theme.css`). Set both options to
  `null` for utility-only mode, or `additional_variables: 'all'` to bundle
  the full theme. Warnings flag excluding a variable that shipped styles
  still reference, and a `theme` configured with `variables: null`
  (`theme_discarded`). The parse diagnostics ride the `StyleRuleIndex` (built
  once per generator) and `resolve_css` forwards them on every render, so
  they dispatch like any other; a `base_css` the parser rejects, or a
  callback returning a non-string, throws from `create_bundled_resources`
  with an error naming `base_css`
- `filter_file` - which files get extracted, called with the file id and
  the project root (the default filter includes node_modules deps and
  judges test directories inside the project or the dependency's package)
- `cache_salt` - folded into the extraction cache key, for a change to an
  acorn plugin's options (the key already covers content and the plugins'
  source)
- `prescan` (Vite plugin only) - dev-only eager source scan at server
  startup so the first served CSS is complete (`true` = `src` under the
  Vite root, `false` disables, or an array of directories; the root
  `index.html` is scanned whichever directories are given). Its TSDoc lists
  where dev and build extraction differ
- `cache_dir` - extraction cache location (default `.fuz/cache/css`)

These are the common options - see
[css_plugin_options.ts](src/lib/css_plugin_options.ts) for the full set
(class definitions and interpreters, acorn plugins, deps).

## Docs

./src/routes/docs/ has pages for: introduction, api, examples,
semantic, themes, variables, classes, colors, buttons, chips, elements, forms,
typography, borders, shading, shadows, layout. See
[tomes.ts](src/routes/docs/tomes.ts) for structure.

## File organization

### Library - ./src/lib/

**Variables & themes:**

- [variables.ts](src/lib/variables.ts) - All style variable definitions, as a
  single `default_variables` export; uniform families are loop-built from the
  variant lists and ramp emitters and spread into it in place
- [variable.ts](src/lib/variable.ts) - The `StyleVariable` and `Theme` zod
  schemas (with `ThemeScheme` and `parse_theme`), kept apart from `theme.ts`
  so the renderer stays zod-free; a theme's optional `summary` is the
  sentence pickers show beside its name
- [variable_data.ts](src/lib/variable_data.ts) - The variable vocabulary:
  size/color/border variant lists plus the fitted value tables their ladders
  step through (`FONT_SIZES`, `SPACE_SIZES`, `BORDER_RADII`, `DISTANCES`,
  `LINE_HEIGHTS`, `ICON_SIZES`, `DURATIONS`, `SHADOW_GEOMETRY`,
  `SHADOW_ALPHAS`, `OVERLAY_ALPHAS`), keyed by variant and unitless -
  `variables.ts` adds the unit and any `calc()` wrapper
- [ramps.ts](src/lib/ramps.ts) - The derived color system: fitted knob
  constants, numeric evaluators, and the CSS `calc()`/`oklch()` emitters
- [oklch.ts](src/lib/oklch.ts) - OKLCH↔sRGB math and gamut search
  (design-time + tests; never needed by the shipped CSS, though display
  tooling like the docs swatches may import the conversions)
- [wcag.ts](src/lib/wcag.ts) - WCAG luminance/contrast (design-time + tests)
- [theme.ts](src/lib/theme.ts) - Theme rendering, cascade layers,
  `compose_themes` (flatten + last-wins fragment composition - the
  hand-flatten precursor to `extends`), `overlay_style_variable` (the one
  slot merge `compose_themes` and the build-time overlay share: wholesale
  replacement, a dark-only overlay keeping the light slot beneath it),
  `ColorScheme` type (`Theme` itself lives in `variable.ts`). A pure renderer:
  it holds no variable data, so mounting a theme costs ~1.3KB minified
  instead of ~38KB. It renders what the theme carries (the `scheme_mirror`
  only under a stance) and pins `color-scheme` for a `scheme` stance
- [css_containment.ts](src/lib/css_containment.ts) - Containment checks for
  text rendered verbatim into a stylesheet (`css_value_is_contained` and its
  comment and property-name twins). A theme may be untrusted data, so the
  `Theme` schema rejects a value that could end its own declaration or the
  `<style>` element, and `render_theme_style` drops one. The checks take
  `unknown` and fail non-strings, and the renderer is total over any JSON
  value - what isn't the type `Theme` declares is dropped, never thrown on.
  `escape_css_identifier` writes the renderer's `id` option into its
  selector, escaping punctuation by code point so `</style` can't form
- [theme_stance.ts](src/lib/theme_stance.ts) - `resolve_theme_stance`, which
  computes a single-scheme theme's `scheme_mirror` (the scheme-adaptive
  defaults re-slotted so its one appearance holds in both schemes). Kept out
  of `theme.ts` so only consumers of a stanced theme pay for the data; the
  shipped stanced exemplars resolve at their own module scope
- [scheme_adaptive_variables.ts](src/lib/scheme_adaptive_variables.ts) -
  generated literal twin of the dual-slot subset of `default_variables`,
  emitted so the mirror carries no dependency on `variables.ts` (whose
  module-init emitter calls defeat tree-shaking - reaching for
  `default_variables` costs ~20KB)
- [themes.ts](src/lib/themes.ts) - The curated theme registry
  (`default_themes`, semantic-tier policy) plus `contrast_modifiers`:
  low/high contrast are modifiers composed over any theme via
  `compose_themes`, not themes themselves - users see one flat "themes"
  list
- `src/lib/themes/` - One module per theme. Registered: base and ledger
  (the plain working theme for apps and tools - cool, visibly compact, eased
  chroma, one sans family).
  Each shipped exemplar takes one channel to carry the structure and quiets
  the rest, and is named last, for the artifact that already looks that
  way: zine (line and weight - paper white and toner black, thick opaque
  borders, sharp, flat, heavy sans headings set tight, underlined links),
  pebble (depth and softness - pill controls through `control_radius` on
  rounded panels, raised on soft drop shadows through `button_shadow*` and
  `panel_shadow`, airy, cool whisper), parchment (type and ruling - serif
  body on a tinted paper ground, rubrication-red accent with the negative
  and caution intents moved off it, double-ruled borders, candlelit in
  dark), phosphor (packing - mono, compact, a flattened type scale under
  bold headings, a green cast on a ground lifted off black, halo button
  shadows, positive moved to teal off the green accent, dark-only),
  guestbook (controls as objects - colorless chrome on an off-white ground,
  serif everything, underlined links, `outset` buttons pressing to `inset`
  over `inset` fields, a thin dotted focus ring), marquee (color - magenta
  accent on a purple ground, colored glow shadows, a radius floor, vivid
  past the caps, a rotated yellow slot making it the one palette-tier
  exemplar, dark-only), and signage (scale and weight, for legibility -
  spacious, larger body text through `font_size_scale`, an opened-up type
  scale, heavier text under bold sans headings, thick borders, a wide focus
  ring, and an accent that changes between schemes). Each summary leads
  with who the theme is for, so a picker reads as a menu of use cases.
  Only phosphor and marquee take a `scheme` stance; everything else is
  dual-scheme. zine and phosphor zero the short `duration_*` tokens - base
  styles carry no transitions, so that reaches what a consumer times with
  the tokens (fuz_ui's dialog backdrop and hashlinks among them). The
  contrast pair live here too as the modifier modules
- [shadow_css.ts](src/lib/shadow_css.ts) - `render_shadow_css`, the shape
  of a declared shadow variable (a geometry token plus a shadow color mixed
  down to an alpha step). A leaf module with type-only imports, so the
  theme modules that author `button_shadow*`/`panel_shadow` can use it
  without pulling variable data into a runtime chunk
- [knobs.ts](src/lib/knobs.ts) - The theme knob catalog: typed metadata
  (kind/axis/leverage/tier/bindable/range) for the knob-tier variables, joined
  against `default_variables` by name; includes hook knobs like
  `heading_font_weight` and the micro-surface color variables
- [theme_resolver.ts](src/lib/theme_resolver.ts) - The string→number
  resolution core the lint and the gates share: it resolves a theme's knobs
  and derived stops the way the renderer's cascade would, exposed as
  `create_theme_resolver` for memoized UI lookups (the theme editor's
  derived-knob readouts)
- [theme_validate.ts](src/lib/theme_validate.ts) - Theme lint
  (`validate_theme`, which also warns when an intent binding drops a slot's
  chroma character or the accent hue lands on a status hue)
- [theme_check.ts](src/lib/theme_check.ts) - Numeric-twin accessibility gates
  (`check_theme`: gamut, ramp monotonicity, contrast - a directly authored
  color stop or role is measured when it's an `oklch(L C H)` numeric literal
  or an exact `var()` reference to a color the gates evaluate, and lands in
  `unchecked` otherwise), and the worst-hue chroma-cap compile step
  (`compile_theme`, which caps each stop at the lightness it resolves to,
  emits any cap that tightens, and emits nothing when a hue won't resolve to
  a number)
- [theme.gen.css.ts](src/lib/theme.gen.css.ts) - Gro generator that produces
  `theme.css`
- [scheme_adaptive_variables.gen.ts](src/lib/scheme_adaptive_variables.gen.ts) -
  Gro generator that produces `scheme_adaptive_variables.ts`

**CSS extraction:**

- [css_class_extractor.ts](src/lib/css_class_extractor.ts) - AST-based class
  extraction from Svelte/TS/JSX files
- [file_filter.ts](src/lib/file_filter.ts) - `FileFilter` type, the
  default filter (`filter_file_default`) for extractable files, and
  `to_filter_scope`, the root- or package-relative part it judges
- [diagnostics.ts](src/lib/diagnostics.ts) - `SourceLocation`,
  `ExtractionDiagnostic`, `CssGenerationError` types, and the deduping
  dispatch the generators share

**CSS generation:**

- [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts) - Vite plugin
  (preferred) with HMR via `virtual:fuz.css`, as several plugin objects: the
  `enforce: 'pre'` one, a build-only one placed after Vite's CSS
  processing, and a serve-only `enforce: 'post'` one that appends the
  evaluation report to the virtual module's client code; it holds the dev
  side (pre-scan, watcher, HMR debounce, the handshake)
- [vite_plugin_fuz_css_build.ts](src/lib/vite_plugin_fuz_css_build.ts) - The
  plugin's build passes and its build-only plugin object, which captures the
  virtual module's text as the CSS pipeline (PostCSS, lightningcss) left it;
  the hash is restated into that text by calling the `transform` of Vite's
  `vite:css-post` plugin - a reach into Vite internals that degrades to a
  filename hash that doesn't cover the generated CSS, with a one-time
  warning, never to wrong CSS
- [css_extraction_state.ts](src/lib/css_extraction_state.ts) - The Vite
  plugin's per-file extraction state: race-safe ingestion (a per-file epoch,
  so a deletion or newer ingest landing mid-cache-read wins), removal, and a
  version that keys the dev render cache
- [css_placeholder_splice.ts](src/lib/css_placeholder_splice.ts) - The
  build-mode placeholder (one declaration, unhashed at load and restated in
  place with the generated CSS's hash) and the splice that writes the
  generated CSS at its position in the bundled stylesheet
- [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) - Gro generator with per-file caching
- [css_generator.ts](src/lib/css_generator.ts) - The core both generators
  render through: option defaults, the resources a render needs, and the
  render with its diagnostics dispatched
- [generate_css.ts](src/lib/generate_css.ts) - Shared generation pipeline
  (generate → resolve → bundle) used by both generators, plus the checks
  that span options (`undefined_theme_variables`, `theme_discarded`)
- [bundled_resources.ts](src/lib/bundled_resources.ts) - Builds the bundled CSS
  resources (style-rule index, variable graph)
- [extract_file_cached.ts](src/lib/extract_file_cached.ts) - Cache-aware
  single-file extraction shared by both generators
- [css_plugin_options.ts](src/lib/css_plugin_options.ts) - Shared options types
  for Gro/Vite generators
- [css_cache.ts](src/lib/css_cache.ts) - Cache infrastructure with content hash
  validation plus a configuration key (`to_extraction_cache_key`, over
  `acorn_plugins` and `cache_salt`), atomic writes, the cache-path lookup
  the generators share, CI skip
- [css_bundled_resolution.ts](src/lib/css_bundled_resolution.ts) - Core bundled
  CSS resolution algorithm
- [variable_graph.ts](src/lib/variable_graph.ts) - Variable dependency graph for
  transitive resolution; it leaves out a value that would escape its
  declaration, as the runtime renderer does, with an `uncontained_theme_value`
  error
- [css_variable_utils.ts](src/lib/css_variable_utils.ts) - CSS variable
  extraction utilities: references, fallback-less references, declarations,
  and comment stripping
- [style_rule_parser.ts](src/lib/style_rule_parser.ts) - Base stylesheet
  parsing for tree-shaking: indexes top-level rules by the elements and
  classes they target, tracks their variables, and collects the `base_css`
  parse diagnostics
- [css_class_generation.ts](src/lib/css_class_generation.ts) -
  `CssClassDefinition` types, `generate_classes_css()`
- [css_class_definitions.ts](src/lib/css_class_definitions.ts) - Token and
  composite class registry
- [css_classes.ts](src/lib/css_classes.ts) - CssClasses collection for tracking
  classes per-file
- [css_class_generators.ts](src/lib/css_class_generators.ts) - Token class
  template generators
- [css_class_composites.ts](src/lib/css_class_composites.ts) - Composite class
  definitions
- [css_class_resolution.ts](src/lib/css_class_resolution.ts) - Class resolution
  and cycle detection
- [css_class_interpreters.ts](src/lib/css_class_interpreters.ts) - Modified
  class and literal interpreters
- [css_ruleset_parser.ts](src/lib/css_ruleset_parser.ts) - CSS ruleset parsing
- [css_literal.ts](src/lib/css_literal.ts) - CSS-literal parser and validator
- [modifiers.ts](src/lib/modifiers.ts) - Modifier definitions (breakpoints,
  states, pseudo-elements)
- [deps.ts](src/lib/deps.ts) - `CacheDeps` interface for dependency injection
- [deps_defaults.ts](src/lib/deps_defaults.ts) - Default filesystem
  implementations
- [example_class_utilities.ts](src/lib/example_class_utilities.ts) - Example
  classes for Vite plugin integration tests

**Stylesheets (for utility-only mode or direct import):**

- [style.css](src/lib/style.css) - CSS reset and element defaults (all rules)
- [theme.css](src/lib/theme.css) - Generated base theme variables (all variables)

### Docs site - ./src/routes/

The themes docs page hosts an inline theme editor built from
[ThemeEditor.svelte](src/routes/ThemeEditor.svelte),
[KnobControl.svelte](src/routes/KnobControl.svelte),
[RampStrip.svelte](src/routes/RampStrip.svelte), and
[theme_editor_state.svelte.ts](src/routes/theme_editor_state.svelte.ts)
(marked `TODO upstream to fuz_ui`), with
[ThemePreview.svelte](src/routes/ThemePreview.svelte) (beside the picker: the
picked theme's `summary` over a compact sample of basic elements, wrapping
below the picker on narrow screens), and
[theme_draft.ts](src/routes/theme_draft.ts) holding the draft-name constant
in a leaf module so the root layout doesn't pull the editor's dependency
graph. `ThemeEditorState` owns what the page applies - the dirty draft or its
base, composed with the active contrast modifier (`applied_theme`) - plus the
shared discard guard (`load_theme_guarded`) and `sync_applied_theme`, which
adopts a theme already applied at mount so a persisted theme or contrast
composition isn't replaced by the editor's defaults. The themes page keeps
one editor per browser session, so a draft survives in-app navigation, and
only bridges `applied_theme` to fuz_ui's theme state.
[root_color_scheme.svelte.ts](src/routes/root_color_scheme.svelte.ts) reads
the scheme the page renders off the root class reactively; the editor's
edited slot and the swatch readouts follow it rather than the theme state,
which can disagree with what's on screen. [resolved_color.svelte.ts](src/routes/docs/resolved_color.svelte.ts)
resolves rendered colors for the docs swatches. `vite.config.ts` declares
the docs site's own generator inputs: a `docs_classes` list plus
`additional_variables: 'all'` / `additional_elements: 'all'`, which is what
lets fully dynamic references like `RampStrip`'s `var(--{prefix}_{stop})`
work without per-page `@fuz-classes` walls.

### Examples - ./examples/

Vite plugin examples for Svelte, React, Preact, and Solid. Each demonstrates
token, composite, and literal classes with modifiers.

**Important:** All the example App files must be kept in sync. When updating one,
update all others with equivalent changes.

### Tests - ./src/test/

Tests use dot-separated aspect splitting. Major test suites:

- `css_class_extractor.{test,elements,expressions,jsx,locations,tracked_vars,typescript,utilities}.test.ts`
- `css_bundled_resolution.{test,diagnostics,variables}.test.ts`
- `css_ruleset_parser.{generation,modifiers,parse,selectors}.test.ts`
- `css_class_resolution.{test,literals}.test.ts`
- `style_rule_parser.{test,at_rules,custom}.test.ts`
- `theme_check.{test,compile,pins}.test.ts`
- `theme_resolver.{test,defaults}.test.ts`
- `ramps.{test,emitters}.test.ts`

Plus standalone tests: `css_cache`, `css_classes`, `css_literal`,
`css_placeholder_splice`, `theme_validate`, `variable`, `variables`,
`variable_graph`, `modifiers`, `diagnostics`, `file_filter`,
`themes`, `css_class_generators`, `css_plugin_options`, `css_variable_utils`,
`fuz_comments`, `bundled_resources`, `gen_fuz_css`, `generate_bundled_css`,
`generate_classes_css`, `generate_css`, and more.

The theme suites discover the shipped themes by glob through
`theme_test_helpers.ts` (`shipped_themes`, `shipped_base_themes`), so a new
module under `themes/` is linted, gated on its own, and composed with both
contrast modifiers without being added to a list. A theme that knowingly
gives up a pairing gets its own test and a name in the standalone
exceptions set.

The Vite plugin has `vite_plugin_fuz_css.{build,dev,ws}.test.ts`, plus
`css_placeholder_splice.test.ts` for the build splice: the
build suite runs in-memory `build()`s against `src/test/fixtures/vite_build/`,
varying the generated CSS through `additional_classes` so the emitted JS
stays byte-identical. The dev suite runs middleware-mode servers over
`src/test/fixtures/vite_dev/`, and over a temp root for the tests that write
files or stand in for the dependency optimizer's output; the ws suite runs a
listening server and speaks the `vite-hmr` protocol for the evaluation
handshake. The three share their fixture roots, filters, polling, and
capturing logger through `vite_plugin_test_helpers.ts`. Integration:
`vite_plugin_examples.test.ts` (skip with `SKIP_EXAMPLE_TESTS=1`).

Component tests (`ContrastInput`, `KnobControl`, `RampStrip`, `ThemeEditor`,
`resolved_color.svelte`) render in jsdom via a per-file
`@vitest-environment jsdom` pragma - mounting through
`component_test_helpers.ts` (`create_mount_tracker`) with context harnesses (`*Harness.svelte` in
`src/test/`), the fuz_ui pattern. All other suites stay in node;
`vite.config.ts` sets `resolve.conditions: ['browser']` in test mode so
svelte's `mount()` resolves to the client build.

## Known limitations

- **Static extraction only** - Runtime dynamic classes (`document.createElement`,
  `innerHTML`) won't be detected. Use `additional_classes` option as workaround.
- **No animation utilities** - Animation class generation not yet supported
- **Button composites incomplete** - Some button variant classes are work in
  progress
- **Browser floor, no fallbacks** - the shipped CSS needs Chrome or Edge
  120, Firefox 118 (both set by `pow()`), or Safari 16.2, and Safari 16.4
  for responsive modifiers, which emit media range syntax, and 16.5 for the
  `dark:`/`light:` modifiers, which emit nested CSS
- **Unfinished areas flagged in the docs** - builtin themes, forms (checkboxes
  will likely become toggles), element/table styles, the shadows system,
  opaque border classes, and table cell padding that doesn't yet respond to
  size composites

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API (for docs site)
- tsv (`gro format`) with tabs, 100 char width
- Node >= 24.14
- Tests in `src/test/` (not co-located)

## Related projects

- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components built on fuz_css
- [`fuz_util`](../fuz_util/CLAUDE.md) - utility functions (no CSS dependency)
- [`fuz_template`](../fuz_template/CLAUDE.md) - starter template using fuz_css
- [`fuz_blog`](../fuz_blog/CLAUDE.md) - blog template using fuz_css
- [`fuz_mastodon`](../fuz_mastodon/CLAUDE.md) - Mastodon components using fuz_css
