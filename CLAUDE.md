# Fuz CSS framework and design system

CSS framework and design system built around **semantic styles** and **style variables** (design tokens as CSS custom properties). Early alpha with breaking changes ahead.

For code style, see the `fuz-stack` skill. For UI components (themes, color scheme controls), see `@fuzdev/fuz_ui`.

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

[gen_fuz_css.ts](src/lib/gen_fuz_css.ts) scans source files with regex extractors, collects class names, and outputs only CSS for classes actually used. Dynamic [interpreters](src/lib/css_class_interpreters.ts) handle pattern-based classes like `opacity_50`, `font_weight_700`, `z_index_100`.

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

**CSS generation:**

- [gen_fuz_css.ts](src/lib/gen_fuz_css.ts) - Main generator API for Gro
- [css_classes.ts](src/lib/css_classes.ts) - All static class definitions (~1000+)
- [css_class_generators.ts](src/lib/css_class_generators.ts) - Class template generation functions
- [css_class_composites.ts](src/lib/css_class_composites.ts) - Composite classes (`.box`, `.row`, `.column`, `.ellipsis`)
- [css_class_interpreters.ts](src/lib/css_class_interpreters.ts) - Dynamic interpreters for opacity, font-weight, z-index, border-radius
- [css_class_helpers.ts](src/lib/css_class_helpers.ts) - CSS class extraction, `CssClasses` collection, `generate_classes_css()`

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
- [css_class_helpers.test.ts](src/test/css_class_helpers.test.ts) - CSS extraction from Svelte/JS patterns
