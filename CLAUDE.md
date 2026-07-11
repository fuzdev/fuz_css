# fuz_css

> CSS framework and design system for semantic HTML

fuz_css (`@fuzdev/fuz_css`) styles HTML elements by default and integrates
custom properties, themes, and utility classes into a complete system. It
ships two plain CSS files — the base `style.css` and replaceable `theme.css` —
that work with any framework and plain HTML, and its class generator supports
HTML/JS/TS, Svelte, and JSX (React/Preact/Solid). Early alpha with breaking
changes ahead.

For coding conventions, see Skill(fuz-stack). For UI
components (themes, color scheme controls), see [`fuz_ui`](../fuz_ui/CLAUDE.md).

## Committing

`git add` and `git commit` are denied by `.claude/settings.local.json` in
this repo — make the edits and stop, the user commits.

## Gro commands

```bash
gro check     # typecheck, test, lint, format check (run before committing)
gro typecheck # typecheck only (faster iteration)
gro test      # run tests (SKIP_EXAMPLE_TESTS=1 to skip slow integration tests)
gro gen       # regenerate theme.css and other .gen files
gro build     # build the package for production
```

IMPORTANT for AI agents: Do NOT run `gro dev` - the developer will manage the
dev server.

## Key dependencies

- Svelte 5 - `svelte/compiler` parses CSS and Svelte source in the extractor
  (optional peer); the component framework also powers the docs site
- SvelteKit - application framework (for docs site only)
- @sveltejs/acorn-typescript, acorn-jsx, zimmerframe - AST parsing and walking
- zod - schema validation
- @webref/css - CSS property validation
- @fuzdev/blake3_wasm - BLAKE3 content hashing for cache validation (optional
  peer, via fuz_util's `hash_blake3`)
- fuz_util (@fuzdev/fuz_util) - utility functions

## Scope

fuz_css is a **CSS framework and design system**:

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

**Default element styling is the baseline — reach past it only with a
reason.** fuz_css styles semantic HTML out of the box, so most content needs
no classes: headings are tiered, form controls share sizing and focus states,
and block elements (`p`, `ul`, `ol`, `table`, `aside`, `blockquote`, `pre`,
`fieldset`, …) get vertical rhythm automatically from the **flow-margin**
system — each gets `margin-bottom: var(--flow_margin, var(--space_lg))` unless
`:last-child` or `.unstyled`, and margins reset to 0 on the direct children of
a `.row` (horizontal flex; use `gap_*` there instead). Adding a
`mb_*`/`gap_*`/`p_*` class or a `<style>` block
should answer "what specific gap in the defaults does this close?" — the most
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
  `fuz.theme` cascade layer (defaults live in `fuz.base`, generated utility
  classes in `fuz.utilities`; consumers' unlayered styles beat everything)
- Color values are derived: curve knobs → ramp stops → color stops, computed
  in pure CSS (`calc()`/`pow()`/`oklch()`); the fitted knob constants and CSS
  emitters live in [ramps.ts](src/lib/ramps.ts) with design-time gamut and
  contrast gates in [oklch.ts](src/lib/oklch.ts)/[wcag.ts](src/lib/wcag.ts)
- [theme_check.ts](src/lib/theme_check.ts) turns those design-time gates into
  a theme API: `validate_theme` lints a theme's shape, `check_theme` runs the
  gamut/monotonicity/contrast gates against an arbitrary theme (resolving its
  bindings back to numbers), and `compile_theme` recomputes per-theme
  worst-hue chroma caps so rotated, monochrome, or dark-only themes stay in
  gamut

### Smart utility class generation

Two generators available, both using AST-based extraction and per-file caching:

1. **Vite plugin** (preferred) - [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts)
   exposes the generated CSS as `virtual:fuz.css` with HMR; works across
   SvelteKit/Svelte/React/Preact/Solid and needs no committed output file.
   In dev it pre-scans project sources at server startup (see `prescan`) so
   the first served CSS is complete, and resyncs clients whose HMR socket
   connects after a missed update
2. **Gro generator** - [gen_fuz_css.ts](src/lib/gen_fuz_css.ts), a SvelteKit
   alternative that writes a `fuz.css` genfile

Both funnel through the shared `generate_css` pipeline (generate → resolve →
bundle) and output only CSS for classes actually used. Supports Svelte 5.16+
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

- **Token classes** - Map to style variables: `p_md`, `palette_a_50`,
  `positive_50`, `gap_lg`. A bare scale class applies its family's dominant
  use (`palette_a_50`/`positive_50`/`text_70` set text color, `shade_50` sets
  background) with `bg_` twins (`bg_a_50`, `bg_positive_50`); in compound
  families a letter alone implies the palette (`border_a_50` vs the
  `border_color_50` alpha ramp)
- **Composite classes** - Multi-property shortcuts: `box`, `column`, `row`,
  `ellipsis`, `pixelated`, `circular`, `selectable`, `clickable`, `pane`,
  `panel`, the size composites `xs`/`sm`/`md`/`lg`/`xl` (uniform step offsets
  from the `md` default; `md` doubles as a cascade reset; they scale controls
  and spacing via `--flow_margin` — headings and prose keep their font sizes),
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

Custom properties work as literals too — `--flow_margin:0`, `--button_shadow:none`
set the property on the element straight from markup, which is how a consumer
reaches any theme/base hook without a dedicated token class.

## Variable naming

See [variables.ts](src/lib/variables.ts) for definitions,
[variable_data.ts](src/lib/variable_data.ts) for size/palette/intent variants.

**Colors (OKLCH, derived):**

- 10 palette hues glossed by color + default intent binding
  (`palette_glosses` in `variable_data.ts`): `a` (blue ·
  accent), `b` (green · positive), `c` (red · negative), `d` (purple), `e`
  (yellow), `f` (brown · neutral), `g` (pink), `h` (orange · caution), `i`
  (cyan · info), `j` (teal)
- Semantic intent knobs alias meaning over the letters: `--hue_accent`
  (links/focus/selection/selected), `--hue_neutral` + `--neutral_chroma`
  (all surfaces/text/borders/shadows — the neutral is an intent whose scales
  are `shade_*`/`text_*`), `--hue_positive`/`--hue_negative`/
  `--hue_caution`/`--hue_info`; each intent derives a full 13-stop scale
  through the shared ramps (`--accent_00`–`--accent_100`, same for the
  others) with matching text/background token classes (`.positive_50`,
  `.bg_caution_10`)
- Curve knobs drive everything: `--chroma_scale` (0 grayscale → >1 vivid),
  `--hue_shift` (degrees of rotation across a ramp), per-scheme lightness
  ramps (`--palette_lightness_00`/`_100`/`_curve`, same trio for `shade_`
  and `text_`), and the chroma curve
  (`--palette_chroma_min`/`_max`/`_curve`) clamped per stop by baked
  worst-hue sRGB gamut caps
- 13 intensity stops: `palette_a_00` (nearest the background) through
  `palette_a_100`, with `_50` as the base (steps: 00, 05, 10, 20, 30, 40,
  50, 60, 70, 80, 90, 95, 100)
- Form/scale knobs derive into token defaults so one move reshapes a family
  while tokens stay pinnable: `--radius_scale` (border radii), `--scale_factor`
  (spaces), `--shadow_alpha_scale` (shadow alphas incl. button shadows), plus
  `--font_weight`, `--heading_font_weight` (a hook with per-tier fallbacks —
  setting it flattens the heading ladder), `--heading_font_family`, and the
  `--background_image` decoration hook on `:root`
- [knobs.ts](src/lib/knobs.ts) is the typed knob catalog (`kind`, `axis`,
  `leverage`, `tier`, ranges) powering the themes docs page's inline editor
- `bg_*`/`fg_*` - color-scheme-aware (swap in dark mode, use alpha for stacking)
- `darken_*`/`lighten_*` - color-scheme-agnostic (don't swap)
- `text_*` - opaque text colors (`text_00`–`text_100`, alpha avoided for
  performance). `text_min`/`text_max` for untinted extremes (pure black/white).
- `shade_*` - shade scale (`shade_00`–`shade_100`), plus `shade_min`/`shade_max`

**Size variants:** Core pattern is `xs` → `sm` → `md` → `lg` → `xl`, with
extended ranges varying by family:

- Spaces: `xs5`...`xs` → `sm` → `md` → `lg` → `xl`...`xl15` (23 steps)
- Font sizes: `xs` → `sm` → `md` → `lg` → `xl`...`xl9` (13 steps)
- Icon sizes: `xs` → `sm` → `md` → `lg` → `xl`...`xl3` (7 steps)
- Border radii: `xs3`...`xs` → `sm` → `md` → `lg` → `xl` (7 steps)
- Distances, shadows, line heights: `xs` → `sm` → `md` → `lg` → `xl` (5 steps)

## Usage

### Bundled mode (default)

Generated CSS includes only the theme variables, base styles, and utility classes
your code uses:

**Vite (SvelteKit/Svelte/React/Preact/Solid):**

```ts
// vite.config.ts
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.ts';
export default defineConfig({plugins: [vite_plugin_fuz_css()]});

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
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.ts';
export const gen = gen_fuz_css();
```

Then import the generated file in your layout: `import './fuz.css';`

### Utility-only mode

For projects managing their own theme/base styles, set `base_css: null` and
`variables: null` in generator options, then import package CSS separately
(`@fuzdev/fuz_css/style.css` and `theme.css` include everything).

### Customization

Use `GenFuzCssOptions` or `VitePluginFuzCssOptions` to customize:

- `base_css` - Custom base styles or callback to modify defaults
- `variables` - Custom theme variables or callback to modify defaults
- `additional_classes` - Classes to always include (for dynamic names)
- `additional_elements` - Elements to always include, or `'all'` for all base styles
- `additional_variables` - Variables to always include, or `'all'` for all theme vars
- `exclude_classes` - Classes to exclude from output
- `exclude_elements` - Elements to exclude from base CSS
- `exclude_variables` - Variables to exclude from theme
- `on_error` (`'log' | 'throw'`) / `on_warning` (`'log' | 'throw' | 'ignore'`) -
  diagnostic handling; warnings flag configs that leave dangling `var()`
  references (`base_css` enabled with `variables: null`, or excluding a
  variable that shipped styles still reference)
- `filter_file` - which files get extracted (the default filter includes
  node_modules deps)
- `prescan` (Vite plugin only) - dev-only eager source scan at server
  startup so the first served CSS is complete (`true` = `src` under the
  Vite root, `false` disables, or an array of directories)
- `cache_dir` - extraction cache location (default `.fuz/cache/css`)

These are the common options — see
[css_plugin_options.ts](src/lib/css_plugin_options.ts) for the full set
(class definitions and interpreters, theme specificity, acorn plugins, deps).

## Docs

./src/routes/docs/ has pages for: introduction, api, examples,
semantic, themes, variables, classes, colors, buttons, chips, elements, forms,
typography, borders, shading, shadows, layout. See
[tomes.ts](src/routes/docs/tomes.ts) for structure.

## File organization

### Library - ./src/lib/

**Variables & themes:**

- [variables.ts](src/lib/variables.ts) - All style variable definitions
- [variable.ts](src/lib/variable.ts) - `StyleVariable` type and validation
- [variable_data.ts](src/lib/variable_data.ts) - Size, color, border variants
- [ramps.ts](src/lib/ramps.ts) - The derived color system: fitted knob
  constants, numeric evaluators, and the CSS `calc()`/`oklch()` emitters
- [oklch.ts](src/lib/oklch.ts) - OKLCH↔sRGB math and gamut search
  (design-time + tests only)
- [wcag.ts](src/lib/wcag.ts) - WCAG luminance/contrast (design-time + tests)
- [theme.ts](src/lib/theme.ts) - Theme rendering, cascade layers,
  `ColorScheme` type
- [themes.ts](src/lib/themes.ts) - The curated theme registry
- `src/lib/themes/` - One module per theme. The registry (base, low/high
  contrast) is semantic-tier: intent bindings + levers only, palette hues
  untouched. Unregistered exemplars: necromancer, sunset ember, brutalish,
  and `terminal.ts` (a `create_terminal_theme(hue)` factory; terminal green
  = 145), plus the `dark_only` helper
- [knobs.ts](src/lib/knobs.ts) - The theme knob catalog: typed metadata
  (kind/axis/leverage/tier/bindable/range) for the knob-tier variables, joined
  against `default_variables` by name; includes hook knobs like
  `heading_font_weight`
- [theme_check.ts](src/lib/theme_check.ts) - Theme lint (`validate_theme`),
  numeric-twin accessibility gates (`check_theme`: gamut, ramp monotonicity,
  contrast), and the worst-hue chroma-cap compile step (`compile_theme`) over
  a shared string→number resolution core
- [theme.gen.css.ts](src/lib/theme.gen.css.ts) - Gro generator that produces
  `theme.css`

**CSS extraction:**

- [css_class_extractor.ts](src/lib/css_class_extractor.ts) - AST-based class
  extraction from Svelte/TS/JSX files
- [file_filter.ts](src/lib/file_filter.ts) - `FileFilter` type for filtering
  extractable files
- [diagnostics.ts](src/lib/diagnostics.ts) - `SourceLocation`,
  `ExtractionDiagnostic`, `CssGenerationError` types

**CSS generation:**

- [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts) - Vite plugin
  (preferred) with HMR via `virtual:fuz.css`
- [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) - Gro generator with per-file caching
- [generate_css.ts](src/lib/generate_css.ts) - Shared generation pipeline
  (generate → resolve → bundle) used by both generators
- [bundled_resources.ts](src/lib/bundled_resources.ts) - Builds the bundled CSS
  resources (style-rule index, variable graph, class→variable index)
- [extract_file_cached.ts](src/lib/extract_file_cached.ts) - Cache-aware
  single-file extraction shared by both generators
- [css_plugin_options.ts](src/lib/css_plugin_options.ts) - Shared options types
  for Gro/Vite generators
- [css_cache.ts](src/lib/css_cache.ts) - Cache infrastructure with content hash
  validation, atomic writes, CI skip
- [css_bundled_resolution.ts](src/lib/css_bundled_resolution.ts) - Core bundled
  CSS resolution algorithm
- [variable_graph.ts](src/lib/variable_graph.ts) - Variable dependency graph for
  transitive resolution
- [css_variable_utils.ts](src/lib/css_variable_utils.ts) - CSS variable
  extraction utilities
- [class_variable_index.ts](src/lib/class_variable_index.ts) - Class to variable
  mapping for dependency resolution
- [style_rule_parser.ts](src/lib/style_rule_parser.ts) - CSS rule parsing for
  base style tree-shaking
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

### Examples - ./examples/

Vite plugin examples for Svelte, React, Preact, and Solid. Each demonstrates
token, composite, and literal classes with modifiers.

**Important:** All 4 example App files must be kept in sync. When updating one,
update all others with equivalent changes.

### Tests - ./src/test/

Tests use dot-separated aspect splitting. Major test suites:

- `css_class_extractor.{test,elements,expressions,jsx,locations,tracked_vars,typescript,utilities}.test.ts`
- `css_bundled_resolution.{test,diagnostics,variables}.test.ts`
- `css_ruleset_parser.{generation,modifiers,parse,selectors}.test.ts`
- `css_class_resolution.{test,literals}.test.ts`
- `style_rule_parser.{test,custom}.test.ts`

Plus standalone tests: `css_cache`, `css_classes`, `css_literal`, `variable`,
`variables`, `variable_graph`, `modifiers`, `diagnostics`, `file_filter`,
`themes`, `css_class_generators`, `css_plugin_options`, `css_variable_utils`,
`fuz_comments`, `generate_bundled_css`, `generate_classes_css`, `generate_css`,
and more.

Integration: `vite_plugin_examples.test.ts` (skip with
`SKIP_EXAMPLE_TESTS=1`).

## Known limitations

- **Static extraction only** - Runtime dynamic classes (`document.createElement`,
  `innerHTML`) won't be detected. Use `additional_classes` option as workaround.
- **No animation utilities** - Animation class generation not yet supported
- **Button composites incomplete** - Some button variant classes are work in
  progress
- **CSS Cascade Layers** - `@layer` support under consideration but not yet
  implemented
- **Unfinished areas flagged in the docs** - builtin themes, forms (checkboxes
  will likely become toggles), element/table styles, the shadows system,
  opaque border classes, and table cell padding that doesn't yet respond to
  size composites

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API (for docs site)
- Prettier with tabs, 100 char width
- Node >= 24.14
- Tests in `src/test/` (not co-located)

## Related projects

- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components built on fuz_css
- [`fuz_util`](../fuz_util/CLAUDE.md) - utility functions (no CSS dependency)
- [`fuz_template`](../fuz_template/CLAUDE.md) - starter template using fuz_css
- [`fuz_blog`](../fuz_blog/CLAUDE.md) - blog template using fuz_css
- [`fuz_mastodon`](../fuz_mastodon/CLAUDE.md) - Mastodon components using fuz_css
