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
 * @module
 */

import type {FileFilter} from './file_filter.js';
import type {AcornPlugin} from './css_class_extractor.js';
import type {CssClassDefinition, CssClassDefinitionInterpreter} from './css_class_generation.js';
import type {StyleVariable} from './variable.js';
import type {CacheOperations} from './operations.js';

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
 * - `undefined` - Use default style.css (framework defaults)
 * - `null` - Disable base styles entirely (explicit opt-out)
 * - `string` - Custom CSS to replace defaults
 * - `(default_css) => string` - Callback to modify default CSS
 *
 * See module documentation for the `undefined` vs `null` convention.
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
	 * ```
	 */
	variables?: VariablesOption;
	/**
	 * Specificity multiplier for theme CSS selectors.
	 * Defaults to 1 which generates `:root`, higher values generate more specific selectors (e.g., `:root:root`).
	 */
	theme_specificity?: number;
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
	 * Useful for filtering out variables you don't want in the theme.
	 */
	exclude_variables?: Iterable<string>;
}

/**
 * Options for error and warning handling.
 */
export interface CssDiagnosticsOptions {
	/**
	 * How to handle CSS-literal errors during generation.
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
	 * Filesystem operations for cache management.
	 * Defaults to production implementation. Override for testing.
	 */
	ops?: CacheOperations;
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
