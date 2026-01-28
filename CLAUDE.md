# fuz_css framework and design system

CSS framework and design system for semantic HTML.
It styles HTML elements by default and integrates
custom properties, themes, and utility classes into a complete system.
Early alpha with breaking changes ahead.

For code style, see the `fuz-stack` skill. For UI components (themes, color scheme controls), see `@fuzdev/fuz_ui`.

## Gro commands

```bash
gro check     # typecheck, test, lint, format check (run before committing)
gro typecheck # typecheck only (faster iteration)
gro test      # run tests (SKIP_EXAMPLE_TESTS=1 to skip slow integration tests)
gro gen       # regenerate theme.css and other .gen files
gro build     # build the package for production
```

## Design decisions

### Two core concepts

1. **Semantic styles** - The reset stylesheet with semantic defaults styles HTML elements (buttons, inputs, links, headings, forms, tables) without adding classes. Uses low-specificity `:where()` selectors so your styles easily override the defaults. Uses `.unstyled` escape hatch.
2. **Style variables** - Design tokens as CSS custom properties that enable customization and runtime theming. Each variable provides values for light and/or dark color-schemes.

### 3-layer architecture

1. [style.css](src/lib/style.css) - Reset stylesheet with semantic defaults, styles HTML elements using variables
2. [theme.css](src/lib/theme.css) - Style variables as CSS custom properties (~250+), generated from TypeScript definitions
3. `fuz.css` - Utility classes (optional, generated per-project, only includes used classes)

### Style variables as source of truth

- TypeScript objects in [variables.ts](src/lib/variables.ts) define all design tokens
- Each variable can have `light` and/or `dark` values
- Light/dark are color-schemes _within_ a theme, not separate themes
- [`render_theme_style()`](src/lib/theme.ts) generates CSS with specificity multiplier for reliable theme override

### Smart utility class generation

Two generators available, both using AST-based extraction ([css_class_extractor.ts](src/lib/css_class_extractor.ts)) and per-file caching with content hash validation:

1. **Gro generator** - [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) for SvelteKit projects using Gro
2. **Vite plugin** - [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts) for Svelte/React/Preact/Solid via `virtual:fuz.css`

Both output only CSS for classes actually used. Supports Svelte 5.16+ class syntax, JSX `className`, clsx/cn calls, and `// @fuz-classes` comment hints.

**Troubleshooting missing classes:** When iterating over variant arrays to generate class names dynamically (e.g., `class="shadow_alpha_{variant}"` where `variant` comes from `shadow_alpha_variants`), the AST extractor cannot statically detect the full class names. Use `// @fuz-classes` comments to list all possible values:

```ts
// @fuz-classes shadow_alpha_00 shadow_alpha_05 shadow_alpha_10 ... shadow_alpha_100
{#each shadow_alpha_variants as variant}
  <div class="shadow_alpha_{variant}">...</div>
{/each}
```

This is especially easy to miss for edge values like `_00` and `_100` that may not appear in other static usages.

**Shared options (both generators):**

- `filter_file` - Which files to extract from (default: `.svelte`, `.html`, `.ts`, `.js`, `.tsx`, `.jsx`, excluding tests/gen files)
- `class_definitions` - Additional definitions to merge with builtins (user takes precedence)
- `class_interpreters` - Custom interpreters (replaces builtins if provided)
- `include_classes` - Classes to always include (for dynamic class names)
- `exclude_classes` - Classes to exclude (filter false positives)
- `acorn_plugins` - Additional acorn plugins (use `acorn-jsx` for React/Preact/Solid)
- `on_error` - `'log'` (default) or `'throw'` for CSS-literal errors
- `cache_dir` - Cache directory (default: `.fuz/cache/css`)

**Gro-only options:**

- `include_stats` - Include file statistics in output
- `project_root` - Project root directory (default: `process.cwd()`)
- `concurrency` - Max concurrent file processing (default: 8)
- `cache_io_concurrency` - Max concurrent cache I/O (default: 50)

**Key implementation differences:**

- **HMR**: Vite plugin has HMR with 10ms debouncing; Gro regenerates on file change
- **Cache writes**: Vite uses fire-and-forget; Gro awaits with concurrency control
- **External files**: Both use hashed paths in `_external/` subdirectory for files outside project root (e.g., symlinked deps with pnpm)
- **Error types**: Both throw `CssGenerationError` with `diagnostics` property for programmatic error access
- **CI behavior**: Both skip cache writes on CI

### Three class types

- **Token classes** - Map to style variables: `p_md`, `color_a_5`, `gap_lg`
- **Composite classes** - Multi-property shortcuts: `box`, `row`, `ellipsis`
- **Literal classes** - CSS `property:value` syntax: `display:flex`, `opacity:50%`

All class types support modifiers: responsive (`md:`), state (`hover:`), color-scheme (`dark:`), pseudo-element (`before:`).

### CSS-literal syntax

Literal classes use `property:value` syntax that maps 1:1 to CSS:

- `display:flex` → `display: flex;`
- `hover:opacity:80%` → `:hover { opacity: 80%; }`
- `md:dark:hover:opacity:80%` → nested media/ancestor/state wrappers

Space encoding uses `~` for multi-value properties (`margin:0~auto`). Arbitrary breakpoints via `min-width(800px):` and `max-width(600px):`.

## Variable naming

See [variables.ts](src/lib/variables.ts) for definitions, [variable_data.ts](src/lib/variable_data.ts) for size/color variants.

**Colors:**

- 10 hues with semantic roles: `a` (primary/blue), `b` (success/green), `c` (error/red), `d` (secondary/purple), `e` (tertiary/yellow), `f` (muted/brown), `g` (decorative/pink), `h` (caution/orange), `i` (info/cyan), `j` (flourish/teal)
- Intensities 1-9: `color_a_1` (lightest) through `color_a_9` (darkest), with `_5` as the base
- `bg_*`/`fg_*` - color-scheme-aware (swap in dark mode, use alpha for stacking)
- `darken_*`/`lighten_*` - color-scheme-agnostic (don't swap)
- `text_color_*` - opaque text colors (alpha avoided for performance)

**Size variants:** `xs5` → `xs` → `sm` → `md` → `lg` → `xl` → `xl15` (spacing, font sizes, etc.)

## Usage

Import [style.css](src/lib/style.css) + [theme.css](src/lib/theme.css) for base styles. Generate utility classes via:

**SvelteKit (Gro):** Use [gen_fuz_css()](src/lib/gen_fuz_css.ts) in a `.gen.css.ts` file.

**Vite (Svelte/React/Preact/Solid):**

```ts
// vite.config.ts
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';
import jsx from 'acorn-jsx'; // only needed for JSX frameworks

export default defineConfig({
	plugins: [vite_plugin_fuz_css({acorn_plugins: [jsx()]})],
});

// main.ts
import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css'; // or bring your own
import 'virtual:fuz.css';
```

## Docs

[src/routes/docs/](src/routes/docs/) has pages for: introduction, api, examples, semantic, themes, variables, classes, colors, buttons, elements, forms, typography, borders, shading, shadows, layout. See [tomes.ts](src/routes/docs/tomes.ts) for structure.

## File organization

### Library - [src/lib/](src/lib/)

**Variables & themes:**

- [variables.ts](src/lib/variables.ts) - All style variable definitions (~250+)
- [variable.ts](src/lib/variable.ts) - `StyleVariable` type and validation
- [variable_data.ts](src/lib/variable_data.ts) - Size, color, and border variant definitions
- [theme.ts](src/lib/theme.ts) - Theme rendering, `ColorScheme` type, `render_theme_style()`
- [themes.ts](src/lib/themes.ts) - Theme definitions (base, low/high contrast)

**CSS extraction:**

- [css_class_extractor.ts](src/lib/css_class_extractor.ts) - AST-based class extraction from Svelte/TS/JSX files
- [file_filter.ts](src/lib/file_filter.ts) - `FileFilter` type and `filter_file_default` for filtering extractable files
- [diagnostics.ts](src/lib/diagnostics.ts) - `SourceLocation`, `ExtractionDiagnostic`, `GenerationDiagnostic` types

**CSS generation:**

- [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) - Gro generator API with per-file caching
- [vite_plugin_fuz_css.ts](src/lib/vite_plugin_fuz_css.ts) - Vite plugin for Svelte/React/Preact/Solid, `virtual:fuz.css` virtual module with HMR
- [css_cache.ts](src/lib/css_cache.ts) - Cache infrastructure (`.fuz/cache/css/`)
- [css_classes.ts](src/lib/css_classes.ts) - `CssClasses` collection for tracking classes per-file
- [css_class_generation.ts](src/lib/css_class_generation.ts) - `CssClassDefinition` types, `generate_classes_css()`
- [css_class_definitions.ts](src/lib/css_class_definitions.ts) - Combined token + composite class registry
- [css_class_generators.ts](src/lib/css_class_generators.ts) - Token class template generators
- [css_class_composites.ts](src/lib/css_class_composites.ts) - Composite classes (`.box`, `.row`, `.column`, `.ellipsis`, `.pane`, `.panel`)
- [css_class_resolution.ts](src/lib/css_class_resolution.ts) - `resolve_composes()` for composing definitions
- [css_class_interpreters.ts](src/lib/css_class_interpreters.ts) - `modified_class_interpreter` and `css_literal_interpreter`
- [css_literal.ts](src/lib/css_literal.ts) - CSS-literal parser and validator
- [css_ruleset_parser.ts](src/lib/css_ruleset_parser.ts) - CSS ruleset parsing, selector modification
- [modifiers.ts](src/lib/modifiers.ts) - Modifier definitions (breakpoints, states, pseudo-elements)

**Example utilities:**

- [example_class_utilities.ts](src/lib/example_class_utilities.ts) - Demo exports for testing node_modules extraction

**Stylesheets:**

- [style.css](src/lib/style.css) - CSS reset and element defaults (uses `.unstyled` class for opt-out)
- [theme.css](src/lib/theme.css) - Generated base theme variables (`:root` selectors)
- [theme.gen.css.ts](src/lib/theme.gen.css.ts) - Generator for theme.css

### Docs site - [src/routes/](src/routes/)

- [docs/](src/routes/docs/) - Documentation pages organized by [tomes.ts](src/routes/docs/tomes.ts)
- [fuz.css](src/routes/fuz.css) - Generated optimized utility classes for this site
- [fuz.gen.css.ts](src/routes/fuz.gen.css.ts) - Generator using `gen_fuz_css()`

### Examples - [examples/](examples/)

Vite plugin examples:

- [vite-svelte/](examples/vite-svelte/) - Svelte 5 example
- [vite-react/](examples/vite-react/) - React 19 example
- [vite-preact/](examples/vite-preact/) - Preact example
- [vite-solid/](examples/vite-solid/) - Solid example

Each demonstrates token, composite, and literal classes with responsive/hover/dark modifiers. Uses classes from [example_class_utilities.ts](src/lib/example_class_utilities.ts) to verify node_modules extraction.

**Important:** All 4 example App files must be kept in sync. When updating one, update all others with equivalent changes (accounting for framework differences like React's `className` vs others' `class`). The [vite_plugin_examples.test.ts](src/test/vite_plugin_examples.test.ts) verifies all examples produce the same CSS classes.

### Tests - [src/test/](src/test/)

- [variable.test.ts](src/test/variable.test.ts) - StyleVariable type validation
- [variables.test.ts](src/test/variables.test.ts) - Variable consistency (no duplicates, valid names)
- [styles.test.ts](src/test/styles.test.ts) - Style output tests
- [css_classes.test.ts](src/test/css_classes.test.ts) - CssClasses collection tests
- [css_cache.test.ts](src/test/css_cache.test.ts) - Cache save/load, version invalidation, atomic writes
- [css_class_generation.test.ts](src/test/css_class_generation.test.ts) - CSS escaping, generation, interpreters
- [css_class_resolution.test.ts](src/test/css_class_resolution.test.ts) - Class resolution, cycle detection
- [css_class_extractor.test.ts](src/test/css_class_extractor.test.ts) - AST extraction, location tracking
- [css_class_extractor.jsx.test.ts](src/test/css_class_extractor.jsx.test.ts) - JSX-specific extraction
- [css_literal.test.ts](src/test/css_literal.test.ts) - CSS-literal parsing, validation, modifiers
- [css_ruleset_parser.test.ts](src/test/css_ruleset_parser.test.ts) - Ruleset parsing, selector modification
- [diagnostics.test.ts](src/test/diagnostics.test.ts) - Diagnostic formatting tests
- [vite_plugin_examples.test.ts](src/test/vite_plugin_examples.test.ts) - Integration tests building examples (skip with `SKIP_EXAMPLE_TESTS=1`)
