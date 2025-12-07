# Fuz CSS CSS framework

## Overview

Fuz CSS is a CSS framework and design system built on **style variables** - design tokens implemented as CSS custom properties with specific conventions. It provides:

- Plain CSS with zero dependencies
- Runtime theming with light/dark color-scheme support
- Exported stylesheets for immediate use
- Underlying CSS data, types, and helpers for advanced usage
- Framework-agnostic (works with any website or JS framework)

## Core concepts

### Style variables

- Design tokens defined as TypeScript objects in `src/lib/variables.ts`
- Each variable can have `light` and/or `dark` values
- Variables are the single source of truth for all styling
- Follow specific naming conventions for predictable behavior

### Themes

- Themes are groups of style variables (defined in `src/lib/themes.ts`)
- The base theme provides default variables
- Additional themes override specific variables while inheriting others
- Light/dark modes are color-schemes within each theme, not separate themes

### Color system

- 10 base hues: `hue_a` through `hue_j` (blue, green, red, purple, yellow, brown, pink, orange, cyan, teal)
- Each hue has numbered intensity variants (1-10)
- Semantic color variables like `bg_*`, `fg_*`, `text_color_*`
- Color-scheme-aware variables automatically adapt to light/dark mode

### Utility classes

- Optional utility classes generated from variables
- Automatic optimization to include only used classes via `gen_fuz_css.ts`
- Generated reference implementation at `src/routes/fuz.css` using
  Gro's [`gen`](https://github.com/ryanatkn/gro/blob/main/src/docs/gen.md)

## File organization

### Library (`src/lib/`)

- `variables.ts` - All style variable definitions
- `variable.ts` - StyleVariable type and utilities
- `variable_data.ts` - Size variants and naming patterns
- `theme.ts` - Theme rendering and color-scheme utilities
- `themes.ts` - Theme definitions
- `style.css` - Main stylesheet and CSS reset
- `theme.css` - Default theme stylesheet
- `gen_fuz_css.ts` - Utility class generation helpers
- `css_classes.ts` - Utility class definitions
- `css_class_helpers.ts` - CSS class extraction and generation

### Docs and examples (`src/routes/`)

- `docs/` - Documentation pages for all features
- `fuz.css` - Generated optimized utility classes
- `fuz.gen.css.ts` - Generator for fuz.css using `src/lib/gen_fuz_css.ts`

## Code style guidelines

### TypeScript/JS

- tabs for indentation (not spaces)
- snake_case and PascalCase naming for variables and types (e.g., `StyleVariable`, `bg_color_1`)
- prefer `const fn = () =>` arrow functions instead of using the `function` keyword.

### CSS variables

- CSS variable names use lowercase and underscores: `--bg_1`, `--color_a_1`
- semantic naming patterns:
  - `bg_*` and `fg_*` - color-scheme-aware (swap in dark mode)
  - `text_color_*` - text color variants
  - `color_[a-j]_[1-10]` - hue-based color palette
  - size variants: `xs5` through `xl15` for spacing/sizing
