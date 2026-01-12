# Fuz CSS framework and design system

CSS framework and design system built on **semantic styles** and **style variables** (design tokens as CSS custom properties). Early alpha with breaking changes ahead.

For code style, see the `fuz-stack` skill. For UI components (themes, color scheme controls), see `@fuzdev/fuz_ui`.

## Gro commands

```bash
gro check     # typecheck, test, lint, format check (run before committing)
gro typecheck # typecheck only (faster iteration)
gro test      # run tests with vitest
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

[gen_fuz_css.ts](src/lib/gen_fuz_css.ts) scans source files with AST-based extraction ([css_class_extractor.ts](src/lib/css_class_extractor.ts)), collects class names, and outputs only CSS for classes actually used. Supports Svelte 5.16+ class syntax (`class={[...]}`, `class={{...}}`), clsx/cn calls, and `// @fuz-classes` comment hints.

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

Import [style.css](src/lib/style.css) + [theme.css](src/lib/theme.css) for base styles. Optionally generate project-specific `fuz.css` using [gen_fuz_css()](src/lib/gen_fuz_css.ts) in a Gro generator.

## Docs

[src/routes/docs/](src/routes/docs/) has pages for: colors, themes, variables, classes, typography, buttons, forms, elements, layout, borders, shadows, shading. See [tomes.ts](src/routes/docs/tomes.ts) for structure.

## File organization

### Library - [src/lib/](src/lib/)

**Variables & themes:**

- [variables.ts](src/lib/variables.ts) - All style variable definitions (~250+)
- [variable.ts](src/lib/variable.ts) - `StyleVariable` type and validation
- [variable_data.ts](src/lib/variable_data.ts) - Size variants, color intensities, CSS data values
- [theme.ts](src/lib/theme.ts) - Theme rendering, `ColorScheme` type, `render_theme_style()`
- [themes.ts](src/lib/themes.ts) - Theme definitions (base, low/high contrast)

**CSS extraction:**

- [css_class_extractor.ts](src/lib/css_class_extractor.ts) - AST-based class extraction from Svelte/TS files, `SourceLocation`, `ExtractionResult`

**CSS generation:**

- [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) - Main generator API for Gro, includes per-file caching with content hash validation
- [css_cache.ts](src/lib/css_cache.ts) - Cache infrastructure for incremental extraction (`.fuz/cache/css/`)
- [css_classes.ts](src/lib/css_classes.ts) - `CssClasses` collection class for tracking extracted classes per-file
- [css_class_generation.ts](src/lib/css_class_generation.ts) - Type definitions (`CssClassDefinition`, `CssClassInterpreterContext`), `generate_classes_css()`, CSS escaping
- [css_class_definitions.ts](src/lib/css_class_definitions.ts) - Combined token + composite class definitions, the main class registry
- [css_class_generators.ts](src/lib/css_class_generators.ts) - Class template generation functions for token classes
- [css_class_composites.ts](src/lib/css_class_composites.ts) - Composite classes (`.box`, `.row`, `.column`, `.ellipsis`, `.pane`, `.panel`)
- [css_class_interpreters.ts](src/lib/css_class_interpreters.ts) - Two interpreters: `modified_class_interpreter` (handles `hover:box`, `md:p_lg`) and `css_literal_interpreter` (handles `display:flex`)
- [css_literal.ts](src/lib/css_literal.ts) - CSS-literal parser, validator, `extract_and_validate_modifiers()`
- [css_ruleset_parser.ts](src/lib/css_ruleset_parser.ts) - CSS ruleset parsing via Svelte's parser, selector modification for modifiers
- [modifiers.ts](src/lib/modifiers.ts) - Declarative modifier definitions (breakpoints, states, pseudo-elements)

**Stylesheets:**

- [style.css](src/lib/style.css) - CSS reset and element defaults (uses `.unstyled` class for opt-out)
- [theme.css](src/lib/theme.css) - Generated base theme variables (`:root` selectors)
- [theme.gen.css.ts](src/lib/theme.gen.css.ts) - Generator for theme.css

### Docs site - [src/routes/](src/routes/)

- [docs/](src/routes/docs/) - Documentation pages organized by [tomes.ts](src/routes/docs/tomes.ts)
- [fuz.css](src/routes/fuz.css) - Generated optimized utility classes for this site
- [fuz.gen.css.ts](src/routes/fuz.gen.css.ts) - Generator using `gen_fuz_css()`

### Tests - [src/test/](src/test/)

- [variables.test.ts](src/test/variables.test.ts) - Variable consistency (no duplicates, valid names)
- [css_cache.test.ts](src/test/css_cache.test.ts) - Cache save/load, version invalidation, atomic writes
- [css_class_generation.test.ts](src/test/css_class_generation.test.ts) - CSS escaping, generation, interpreters, CssClasses
- [css_class_extractor.test.ts](src/test/css_class_extractor.test.ts) - AST extraction, location tracking
- [css_literal.test.ts](src/test/css_literal.test.ts) - CSS-literal parsing, validation, modifiers
- [css_ruleset_parser.test.ts](src/test/css_ruleset_parser.test.ts) - Ruleset parsing, selector modification
