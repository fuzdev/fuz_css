/**
 * Shared options for CSS generation plugins (Gro and Vite).
 *
 * Both `gen_fuz_css` (Gro generator) and `vite_plugin_fuz_css` share
 * the same core options for extraction, generation, and bundled CSS.
 * This module provides the shared types to ensure consistency.
 *
 * ## Bundled mode (default)
 *
 * By default, the generated CSS (`virtual:fuz.css` or `./fuz.css`) includes
 * only the content your code uses from all three layers:
 * - Base styles (element defaults)
 * - Theme variables (CSS custom properties)
 * - Utility classes
 *
 * ## `undefined` vs `null` Convention
 *
 * Configuration options that accept both `undefined` and `null` follow this pattern:
 *
 * - **`undefined`** - Use framework defaults. The feature is enabled with standard behavior.
 * - **`null`** - Explicitly disable the feature. No output is generated for that layer.
 *
 * This applies to `BaseCssOption` and `VariablesOption`.
 * Setting both to `null` enables "utility-only mode" where you manage
 * your own theme and base styles via direct imports (`@fuzdev/fuz_css/style.css`
 * and `theme.css`, which include all content).
 *
 * The two are checked against each other: base styles that reference a theme
 * variable nothing defines raise the `undefined_theme_variables` error,
 * whether `variables` is `null`, empty, or missing some of the defaults. To
 * bundle every variable instead, keep `variables` and set
 * `additional_variables: 'all'`.
 *
 * @module
 */

import type { FileFilter } from './file_filter.ts';
import type { AcornPlugin } from './css_class_extractor.ts';
import type { CssClassDefinition, CssClassDefinitionInterpreter } from './css_class_generation.ts';
import type { StyleVariable, Theme } from './variable.ts';
import type { CacheDeps } from './deps.ts';

/**
 * Options for CSS class extraction from source files.
 * Controls which files to scan and how to parse them.
 */
export interface CssExtractionOptions {
	/**
	 * Filter function to determine which files to extract classes from.
	 * By default, extracts from .svelte, .html, .ts, .js, .tsx, .jsx files,
	 * excluding test files and .gen files.
	 */
	filter_file?: FileFilter;
	/**
	 * Additional acorn plugins for parsing.
	 * Use `acorn-jsx` for React/Preact/Solid projects.
	 *
	 * @example
	 * ```ts
	 * import jsx from 'acorn-jsx';
	 * gen_fuz_css({ acorn_plugins: [jsx()] });
	 * ```
	 */
	acorn_plugins?: Array<AcornPlugin>;
}

/**
 * Options for CSS class definitions and interpretation.
 * Controls how classes are defined and how dynamic classes are generated.
 */
export interface CssClassOptions {
	/**
	 * Additional class definitions to merge with defaults.
	 * User definitions take precedence over defaults with the same name.
	 * Required when `include_default_classes` is `false`.
	 */
	class_definitions?: Record<string, CssClassDefinition | undefined>;
	/**
	 * Whether to include default class definitions (token and composite classes).
	 * When `false`, `class_definitions` is required.
	 */
	include_default_classes?: boolean;
	/**
	 * Custom interpreters for dynamic class generation.
	 * Replaces the builtin interpreters entirely if provided.
	 */
	class_interpreters?: Array<CssClassDefinitionInterpreter>;
}

/**
 * Type for the base_css option used by CSS generators.
 *
 * Supports four forms:
 * - `undefined` - Use default `style.css` (framework defaults)
 * - `null` - Disable base styles entirely (explicit opt-out)
 * - `string` - Custom CSS to replace defaults
 * - `(default_css) => string` - Callback to modify default CSS
 *
 * See module documentation for the `undefined` vs `null` convention, and
 * `CssOutputOptions.base_css` for what the generators do with the stylesheet.
 */
export type BaseCssOption = string | ((default_css: string) => string) | null | undefined;

/**
 * Type for the variables option used by CSS generators.
 *
 * Supports four forms:
 * - `undefined` - Use default variables (framework defaults)
 * - `null` - Disable theme generation entirely (explicit opt-out)
 * - `Array<StyleVariable>` - Custom variables array (replaces defaults)
 * - `(defaults) => Array<StyleVariable>` - Callback to modify defaults
 *
 * See module documentation for the `undefined` vs `null` convention.
 */
export type VariablesOption =
	| Array<StyleVariable>
	| ((defaults: Array<StyleVariable>) => Array<StyleVariable>)
	| null
	| undefined;

/**
 * Options for CSS output generation (theme + base + utilities).
 * Controls how the three CSS layers are combined.
 */
export interface CssOutputOptions {
	/**
	 * Base styles (element defaults) configuration.
	 * - `undefined` (default): Use default style.css
	 * - `null`: Disable base styles entirely
	 * - `string`: Custom CSS to replace defaults
	 * - `(default_css) => string`: Callback to modify default CSS
	 *
	 * The stylesheet is any CSS the parser accepts (`parseCss` from
	 * `svelte/compiler`), which the generator places in the `fuz.base` cascade
	 * layer, below themes and utility classes:
	 *
	 * - Top-level style rules and top-level `@media`, `@supports`, and
	 *   `@container` rules are tree-shaken by the elements and classes they
	 *   target. A conditional rule ships whole or not at all. Rules that target
	 *   `:root`, `:host`, `html`, `body`, or `*` always ship, and so does a
	 *   rule with a selector that can't be matched against detected usage: one
	 *   naming no element or class (`[role='button']`, `::selection`), or with
	 *   an escaped or non-ASCII name (`.md\:flex`).
	 * - Every other at-rule ships as written (`@keyframes`, `@font-face`,
	 *   `@property`, `@scope`, ...), used or not.
	 * - Every `var()` reference in CSS that ships is tracked, however deeply
	 *   it is nested, so the theme includes the variables it needs.
	 * - The generator owns layering. A callback's additions land in `fuz.base`
	 *   with everything else, so they lose to themes, utility classes, and
	 *   unlayered styles - put overrides that must win in your own stylesheet.
	 *   Top-level `@layer fuz.base` and `@layer fuz.preferences` blocks are
	 *   recognized as the default stylesheet uses them; any other `@layer`
	 *   rule is the error `base_css_layer`.
	 * - `@import` and `@namespace` are invalid inside a layer and are the
	 *   error `base_css_unsupported_at_rule`.
	 *
	 * An error never removes CSS: the construct ships as written (a layer
	 * becomes a sublayer of `fuz.base`, and browsers ignore the other two),
	 * and the error names it and its line. The one construct left out is a
	 * top-level `@charset`, which means nothing in a string. A stylesheet the
	 * parser rejects, or a callback that doesn't return a string, fails
	 * generation with an error naming `base_css`.
	 *
	 * @example
	 * ```ts
	 * // Append custom reset
	 * base_css: (css) => css + '\n\n* { box-sizing: border-box; }'
	 *
	 * // Prepend custom styles
	 * base_css: (css) => '.my-reset { margin: 0; }\n\n' + css
	 * ```
	 */
	base_css?: BaseCssOption;
	/**
	 * Theme variables configuration.
	 * - `undefined` (default): Use default variables from fuz_css
	 * - `null`: Disable theme entirely
	 * - `Array<StyleVariable>`: Custom variable definitions (replaces defaults)
	 * - `(defaults) => Array<StyleVariable>`: Callback to modify default variables
	 *
	 * The set is the whole theme: only variables in it are emitted, and only
	 * the ones the output references. Base styles that reference a variable
	 * the fuz_css defaults define but this set lacks - with `null`, an empty
	 * array, or an array or callback result missing some - raise the error
	 * `undefined_theme_variables`, because a `var()` with no fallback would
	 * resolve to nothing. A reference with a fallback (`var(--x, 1px)`) is
	 * never an error, nor is a name the base styles declare themselves: in the
	 * rule that references it, or in a top-level rule with a selector that is
	 * exactly `:root`, `:host`, `html`, `body`, or `*`.
	 * Custom property names of your own are never checked.
	 *
	 * To fix the error, define the variables here (keep the defaults a
	 * callback receives unless you replace what they style), or set
	 * `base_css: null` too for utility-only mode. To pair bundled base styles
	 * with a theme stylesheet imported separately, tell the generator the
	 * default set is defined elsewhere through `exclude_variables`.
	 *
	 * @example
	 * ```ts
	 * // Override specific variables
	 * variables: (defaults) => defaults.map(v =>
	 *     v.name === 'hue_a' ? { ...v, light: '30' } : v
	 * )
	 *
	 * // Add custom variables
	 * variables: (defaults) => [
	 *     ...defaults,
	 *     { name: 'my_brand', light: '#ff6600', dark: '#ff8833' }
	 * ]
	 *
	 * // Bundled base styles over a separately imported `theme.css`
	 * variables: null,
	 * exclude_variables: default_variables.map((v) => v.name)
	 * ```
	 */
	variables?: VariablesOption;
	/**
	 * A theme to bake into the generated CSS, overlaid onto `variables`
	 * last-wins by name. This is how a project picks a theme statically: no JS
	 * theme rendering at runtime, and the output stays tree-shaken because the
	 * overlay happens before the dependency graph is built, so a theme's
	 * referenced variables are pulled in transitively.
	 *
	 * For runtime switching use fuz_ui's `ThemeRoot`; the two compose, with the
	 * runtime theme winning by cascade layer. A single-scheme theme's
	 * `scheme_mirror` resolves automatically at build time (unlike the runtime
	 * renderer, which needs `resolve_theme_stance` called first). The theme's
	 * own overlay also renders into the `fuz.theme.baked` sublayer - above the
	 * `fuz.preferences` OS mappings, with `color-scheme` pinned for a stance,
	 * and below a runtime theme's direct `fuz.theme` styles - so the baked
	 * theme behaves like the same theme at runtime until one overrides it.
	 *
	 * The baked values become the output's defaults, so a runtime theme can't
	 * revert to the pre-bake appearance by being empty - the base theme
	 * renders nothing. To offer "back to fuz defaults" at runtime, render the
	 * defaults explicitly:
	 * `render_theme_style({name: 'base', variables: default_variables})`.
	 *
	 * @example
	 * ```ts
	 * import {phosphor_theme} from '@fuzdev/fuz_css/themes/phosphor.ts';
	 * vite_plugin_fuz_css({theme: phosphor_theme});
	 * ```
	 */
	theme?: Theme | null;
	/**
	 * Classes to always include in the output, regardless of detection.
	 * Useful for dynamically generated class names that can't be statically extracted.
	 */
	additional_classes?: Iterable<string>;
	/**
	 * Additional HTML elements to always include base styles for.
	 * Use `'all'` to include all base styles regardless of detection.
	 * Useful for elements generated at runtime via `document.createElement()`.
	 */
	additional_elements?: Iterable<string> | 'all';
	/**
	 * Additional CSS variables to always include in theme output.
	 * Use `'all'` to include all theme variables regardless of detection.
	 * Useful for variables referenced dynamically.
	 */
	additional_variables?: Iterable<string> | 'all';
	/**
	 * Classes to exclude from the output, even if detected.
	 * Useful for filtering out false positives from extraction.
	 */
	exclude_classes?: Iterable<string>;
	/**
	 * Elements to exclude from base CSS output, even if detected.
	 * Useful for filtering out elements you don't want styles for.
	 */
	exclude_elements?: Iterable<string>;
	/**
	 * CSS variables to exclude from theme output, even if referenced.
	 * Useful for filtering out variables you don't want in the theme, and for
	 * declaring that something else defines one: excluding a variable the
	 * output references is a warning when the theme has it, and a name listed
	 * here is skipped by the `undefined_theme_variables` check.
	 *
	 * @example
	 * ```ts
	 * // every default variable is defined by a stylesheet imported separately
	 * exclude_variables: default_variables.map((v) => v.name)
	 * ```
	 */
	exclude_variables?: Iterable<string>;
}

/**
 * Options for error and warning handling.
 */
export interface CssDiagnosticsOptions {
	/**
	 * How to handle errors during generation: unresolvable comment hints,
	 * invalid CSS literals, and the base stylesheet and theme variable checks.
	 * - 'log': Log errors, skip invalid classes, continue
	 * - 'throw': Throw on first error, fail the build
	 * @default 'throw' in CI, 'log' otherwise
	 */
	on_error?: 'log' | 'throw';
	/**
	 * How to handle warnings during generation.
	 * - 'log': Log warnings, continue
	 * - 'throw': Throw on first warning, fail the build
	 * - 'ignore': Suppress warnings entirely
	 * @default 'log'
	 */
	on_warning?: 'log' | 'throw' | 'ignore';
}

/**
 * Options for cache behavior.
 */
export interface CssCacheOptions {
	/**
	 * Cache directory relative to project root.
	 * @default '.fuz/cache/css'
	 */
	cache_dir?: string;
	/**
	 * Filesystem deps for cache management.
	 * Defaults to production implementation. Override for testing.
	 */
	deps?: CacheDeps;
}

/**
 * Combined base options shared by both Gro and Vite plugins.
 * These options work identically in both contexts.
 */
export interface CssGeneratorBaseOptions
	extends
		CssExtractionOptions,
		CssClassOptions,
		CssOutputOptions,
		CssDiagnosticsOptions,
		CssCacheOptions {}
