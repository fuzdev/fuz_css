# fuz_css framework and design system

> CSS framework and design system for semantic HTML

fuz_css (`@fuzdev/fuz_css`) styles HTML elements by default and integrates
custom properties, themes, and utility classes into a complete system.
Early alpha with breaking changes ahead.

For coding conventions, see [`fuz-stack`](../fuz-stack/CLAUDE.md). For UI
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
- acorn - AST parsing for class extraction
- fuz_util (@fuzdev/fuz_util) - utility functions

## Scope

fuz_css is a **CSS framework and design system**:

- Semantic HTML styling without classes
- Design tokens as CSS custom properties
- Smart utility class generation (includes only used)
- Two generators: Gro (SvelteKit) and Vite plugin (React/Preact/Solid)

### What fuz_css does NOT include

- UI components (use fuz_ui)
- JavaScript runtime - pure CSS output
- Animation utilities (planned)
- Full Tailwind compatibility

## Design decisions

### Two core concepts

1. **Semantic styles** - The reset stylesheet styles HTML elements (buttons,
   inputs, links, headings, forms, tables) without adding classes. Uses
   low-specificity `:where()` selectors so your styles easily override the
   defaults. Uses `.unstyled` escape hatch.
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
2. **Vite plugin** - [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts)
   for Svelte/React/Preact/Solid via `virtual:fuz.css`

Both output only CSS for classes actually used. Supports Svelte 5.16+ class
syntax, JSX `className`, clsx/cn calls, and `// @fuz-classes` comment hints.

**Comment hints for static extraction:** The AST extractor cannot detect dynamic
class names, elements, or variables. Use comment hints to explicitly include them:

- `// @fuz-classes box row p_md` - Classes to include
- `// @fuz-elements button input` - Elements to include base styles for
- `// @fuz-variables hue_a color_a_5` - Variables to include in theme

All three produce **errors** if the specified item can't be resolved, helping
catch typos early. Implicitly detected classes that can't be resolved are
silently skipped (they may belong to other CSS frameworks).

See `GenFuzCssOptions` and `VitePluginFuzCssOptions` types for configuration.

### Three class types

- **Token classes** - Map to style variables: `p_md`, `color_a_5`, `gap_lg`
- **Composite classes** - Multi-property shortcuts: `box`, `row`, `ellipsis`
- **Literal classes** - CSS `property:value` syntax: `display:flex`, `opacity:50%`

All class types support modifiers: responsive (`md:`), state (`hover:`),
color-scheme (`dark:`), pseudo-element (`before:`).

### CSS-literal syntax

Literal classes use `property:value` syntax that maps 1:1 to CSS:

- `display:flex` → `display: flex;`
- `hover:opacity:80%` → `:hover { opacity: 80%; }`
- `md:dark:hover:opacity:80%` → nested media/ancestor/state wrappers

Space encoding uses `~` for multi-value properties (`margin:0~auto`). Arbitrary
breakpoints via `min-width(800px):` and `max-width(600px):`.

## Variable naming

See [variables.ts](src/lib/variables.ts) for definitions,
[variable_data.ts](src/lib/variable_data.ts) for size/color variants.

**Colors:**

- 10 hues with semantic roles: `a` (primary/blue), `b` (success/green), `c`
  (error/red), `d` (secondary/purple), `e` (tertiary/yellow), `f` (muted/brown),
  `g` (decorative/pink), `h` (caution/orange), `i` (info/cyan), `j`
  (flourish/teal)
- Intensities 1-9: `color_a_1` (lightest) through `color_a_9` (darkest), with
  `_5` as the base
- `bg_*`/`fg_*` - color-scheme-aware (swap in dark mode, use alpha for stacking)
- `darken_*`/`lighten_*` - color-scheme-agnostic (don't swap)
- `text_color_*` - opaque text colors (alpha avoided for performance)

**Size variants:** `xs5` → `xs` → `sm` → `md` → `lg` → `xl` → `xl15`

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

**Vite (Svelte/React/Preact/Solid):**

```ts
// vite.config.ts
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';
export default defineConfig({plugins: [vite_plugin_fuz_css()]});

// main.ts
import 'virtual:fuz.css';
```

### Utility-only mode

For projects managing their own theme/base styles, set `base_css: null` and
`variables: null` in generator options, then import package CSS separately
(`@fuzdev/fuz_css/style.css` and `theme.css` include everything).

### Customization

Use `GenFuzCssOptions` or `VitePluginFuzCssOptions` to customize:

- `base_css` - Custom base styles or callback to modify defaults
- `variables` - Custom theme variables or callback to modify defaults
- `include_all_base_css` - Include all base styles (default: false, only used)
- `include_all_variables` - Include all variables (default: false, only used)
- `additional_classes` - Classes to always include (for dynamic names)
- `additional_elements` - Elements to always include styles for
- `additional_variables` - Variables to always include
- `exclude_classes` - Classes to exclude from output
- `exclude_elements` - Elements to exclude from base CSS
- `exclude_variables` - Variables to exclude from theme

## Docs

[src/routes/docs/](src/routes/docs/) has pages for: introduction, api, examples,
semantic, themes, variables, classes, colors, buttons, elements, forms,
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
- [css_literal.ts](src/lib/css_literal.ts) - CSS-literal parser and validator
- [modifiers.ts](src/lib/modifiers.ts) - Modifier definitions (breakpoints,
  states, pseudo-elements)
- [operations.ts](src/lib/operations.ts) - `CacheOperations` interface for
  dependency injection
- [operations_defaults.ts](src/lib/operations_defaults.ts) - Default filesystem
  implementations

**Stylesheets (for utility-only mode or direct import):**

- [style.css](src/lib/style.css) - CSS reset and element defaults (all rules)
- [theme.css](src/lib/theme.css) - Generated base theme variables (all variables)

### Examples - [examples/](examples/)

Vite plugin examples for Svelte, React, Preact, and Solid. Each demonstrates
token, composite, and literal classes with modifiers.

**Important:** All 4 example App files must be kept in sync. When updating one,
update all others with equivalent changes.

### Tests - [src/test/](src/test/)

- `variable*.test.ts` - StyleVariable type and consistency tests
- `css_classes.test.ts` - CssClasses collection tests
- `css_cache.test.ts` - Cache save/load, version invalidation, atomic writes
- `css_class_*.test.ts` - Generation, resolution, extraction tests
- `css_literal.test.ts` - CSS-literal parsing and validation
- `vite_plugin_examples.test.ts` - Integration tests (skip with
  `SKIP_EXAMPLE_TESTS=1`)

## Known limitations

- **Static extraction only** - Runtime dynamic classes (`document.createElement`,
  `innerHTML`) won't be detected. Use `additional_classes` option as workaround.
- **No animation utilities** - Animation class generation not yet supported
- **HSL color system** - OKLCH migration planned for better perceptual uniformity
- **Button composites incomplete** - Some button variant classes are work in
  progress
- **CSS Cascade Layers** - `@layer` support under consideration but not yet
  implemented
- **Error handling** - `CssGenerationError` includes `diagnostics` array for
  programmatic access to individual errors

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
