# fuz_css

> CSS framework and design system for semantic HTML

fuz_css (`@fuzdev/fuz_css`) styles HTML elements by default and integrates
custom properties, themes, and utility classes into a complete system.
Early alpha with breaking changes ahead.

For coding conventions, see Skill(fuz_stack). For UI
components (themes, color scheme controls), see [`fuz_ui`](../fuz_ui/CLAUDE.md).

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

- Svelte 5 - component framework (for docs site only)
- SvelteKit - application framework (for docs site only)
- @sveltejs/acorn-typescript, acorn-jsx, zimmerframe - AST parsing and walking
- zod - schema validation
- @webref/css - CSS property validation
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
- [`render_theme_style()`](src/lib/theme.ts) generates CSS with specificity
  multiplier

### Smart utility class generation

Two generators available, both using AST-based extraction and per-file caching:

1. **Gro generator** - [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) for SvelteKit
   projects using Gro
2. **Vite plugin** - [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts)
   for Svelte/React/Preact/Solid via `virtual:fuz.css`

Both output only CSS for classes actually used. Supports Svelte 5.16+ class
syntax, JSX `className`, clsx/cn calls, and `// @fuz-classes` comment hints.

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

- **Token classes** - Map to style variables: `p_md`, `color_a_50`, `gap_lg`
- **Composite classes** - Multi-property shortcuts: `box`, `column`, `row`,
  `ellipsis`, `pixelated`, `circular`, `selectable`, `clickable`, `pane`,
  `panel`, `icon_button`, `plain`, `menu_item`, `chevron`, `chip`
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

## Variable naming

See [variables.ts](src/lib/variables.ts) for definitions,
[variable_data.ts](src/lib/variable_data.ts) for size/color variants.

**Colors:**

- 10 hues with semantic roles: `a` (primary/blue), `b` (success/green), `c`
  (error/red), `d` (secondary/purple), `e` (tertiary/yellow), `f` (muted/brown),
  `g` (decorative/pink), `h` (caution/orange), `i` (info/cyan), `j`
  (flourish/teal)
- 13 intensity stops: `color_a_00` (lightest) through `color_a_100` (darkest),
  with `_50` as the base (steps: 00, 05, 10, 20, 30, 40, 50, 60, 70, 80, 90,
  95, 100)
- `bg_*`/`fg_*` - color-scheme-aware (swap in dark mode, use alpha for stacking)
- `darken_*`/`lighten_*` - color-scheme-agnostic (don't swap)
- `text_*` - opaque text colors (`text_00`–`text_100`, alpha avoided for
  performance). `text_min`/`text_max` for untinted extremes (pure black/white).
- `shade_*` - shade scale (`shade_00`–`shade_100`), plus `shade_min`/`shade_max`

**Size variants:** Core pattern is `xs` → `sm` → `md` → `lg` → `xl`, with
extended ranges varying by family:

- Spaces: `xs5`...`xs` → `sm` → `md` → `lg` → `xl`...`xl15` (21 steps)
- Font sizes: `xs` → `sm` → `md` → `lg` → `xl`...`xl9` (13 steps)
- Icon sizes: `xs` → `sm` → `md` → `lg` → `xl`...`xl3` (7 steps)
- Border radii: `xs3`...`xs` → `sm` → `md` → `lg` → `xl` (7 steps)
- Distances, shadows, line heights: `xs` → `sm` → `md` → `lg` → `xl` (5 steps)

## Usage

### Bundled mode (default)

Generated CSS includes only the theme variables, base styles, and utility classes
your code uses:

**SvelteKit (Gro):**

```ts
// src/routes/fuz.gen.css.ts
import {gen_fuz_css} from '@fuzdev/fuz_css/gen_fuz_css.js';
export const gen = gen_fuz_css();
```

Then import the generated file in your layout: `import './fuz.css';`

**Vite (Svelte/React/Preact/Solid):**

```ts
// vite.config.ts
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';
export default defineConfig({plugins: [vite_plugin_fuz_css()]});

// main.ts
import 'virtual:fuz.css';
```

The Vite plugin supports HMR - changes to source files automatically trigger
CSS regeneration during development.

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

## Docs

[src/routes/docs/](src/routes/docs/) has pages for: introduction, api, examples,
semantic, themes, variables, classes, colors, buttons, chips, elements, forms,
typography, borders, shading, shadows, layout. See
[tomes.ts](src/routes/docs/tomes.ts) for structure.

## File organization

### Library - [src/lib/](src/lib/)

**Variables & themes:**

- [variables.ts](src/lib/variables.ts) - All style variable definitions
- [variable.ts](src/lib/variable.ts) - `StyleVariable` type and validation
- [variable_data.ts](src/lib/variable_data.ts) - Size, color, border variants
- [theme.ts](src/lib/theme.ts) - Theme rendering, `ColorScheme` type
- [themes.ts](src/lib/themes.ts) - Theme definitions (base, low/high contrast)
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

- [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) - Gro generator with per-file caching
- [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts) - Vite plugin with
  HMR via `virtual:fuz.css`
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
- [operations.ts](src/lib/operations.ts) - `CacheOperations` interface for
  dependency injection
- [operations_defaults.ts](src/lib/operations_defaults.ts) - Default filesystem
  implementations
- [example_class_utilities.ts](src/lib/example_class_utilities.ts) - Example
  classes for Vite plugin integration tests

**Stylesheets (for utility-only mode or direct import):**

- [style.css](src/lib/style.css) - CSS reset and element defaults (all rules)
- [theme.css](src/lib/theme.css) - Generated base theme variables (all variables)

### Examples - [examples/](examples/)

Vite plugin examples for Svelte, React, Preact, and Solid. Each demonstrates
token, composite, and literal classes with modifiers.

**Important:** All 4 example App files must be kept in sync. When updating one,
update all others with equivalent changes.

### Tests - [src/test/](src/test/)

Tests use dot-separated aspect splitting. Major test suites:

- `css_class_extractor.{test,elements,expressions,jsx,locations,tracked_vars,typescript,utilities}.test.ts`
- `css_bundled_resolution.{test,diagnostics,variables}.test.ts`
- `css_ruleset_parser.{test,generation,modifiers,parse,selectors}.test.ts`
- `css_class_resolution.{test,literals}.test.ts`
- `style_rule_parser.{test,custom}.test.ts`

Plus standalone tests: `css_cache`, `css_classes`, `css_literal`, `variable`,
`variables`, `variable_graph`, `modifiers`, `diagnostics`, `file_filter`,
`themes`, `css_class_generators`, `css_plugin_options`, `css_variable_utils`,
`fuz_comments`, `generate_bundled_css`, `generate_classes_css`, and more.

Integration: `vite_plugin_examples.test.ts` (skip with
`SKIP_EXAMPLE_TESTS=1`).

## Known limitations

- **Static extraction only** - Runtime dynamic classes (`document.createElement`,
  `innerHTML`) won't be detected. Use `additional_classes` option as workaround.
- **No animation utilities** - Animation class generation not yet supported
- **HSL color system** - OKLCH migration planned for better perceptual uniformity
- **Button composites incomplete** - Some button variant classes are work in
  progress
- **CSS Cascade Layers** - `@layer` support under consideration but not yet
  implemented

## Project standards

- TypeScript strict mode
- Svelte 5 with runes API (for docs site)
- Prettier with tabs, 100 char width
- Node >= 22.15
- Tests in `src/test/` (not co-located)

## Related projects

- [`fuz_ui`](../fuz_ui/CLAUDE.md) - UI components built on fuz_css
- [`fuz_util`](../fuz_util/CLAUDE.md) - utility functions (no CSS dependency)
- [`fuz_template`](../fuz_template/CLAUDE.md) - starter template using fuz_css
- [`fuz_blog`](../fuz_blog/CLAUDE.md) - blog template using fuz_css
- [`fuz_mastodon`](../fuz_mastodon/CLAUDE.md) - Mastodon components using fuz_css
