/**
 * Shared options for CSS generation plugins (Gro and Vite).
 *
 * Both `gen_fuz_css` (Gro generator) and `vite_plugin_fuz_css` share
 * the same core options for extraction, generation, and unified CSS.
 * This module provides the shared types to ensure consistency.
 *
 * @module
 */

import type {FileFilter} from './file_filter.js';
import type {AcornPlugin} from './css_class_extractor.js';
import type {CssClassDefinition, CssClassDefinitionInterpreter} from './css_class_generation.js';
import type {StyleVariable} from './variable.js';
import type {FsOperations} from './operations.js';

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
	 * @default true
	 */
	include_default_classes?: boolean;
	/**
	 * Custom interpreters for dynamic class generation.
	 * Replaces the builtin interpreters entirely if provided.
	 */
	class_interpreters?: Array<CssClassDefinitionInterpreter>;
	/**
	 * Classes to always include in the output, regardless of detection.
	 * Useful for dynamically generated class names that can't be statically extracted.
	 */
	additional_classes?: Iterable<string>;
	/**
	 * Classes to exclude from the output, even if detected.
	 * Useful for filtering out false positives from extraction.
	 */
	exclude_classes?: Iterable<string>;
}

/**
 * Type for the base_css option used by CSS generators.
 * Supports four forms:
 * - `undefined` - Use default style.css
 * - `null` - Disable base styles entirely
 * - `string` - Custom CSS to replace defaults
 * - `(default_css) => string` - Callback to modify default CSS
 */
export type BaseCssOption = string | ((default_css: string) => string) | null | undefined;

/**
 * Type for the variables option used by CSS generators.
 * Supports four forms:
 * - `undefined` - Use default variables
 * - `null` - Disable theme generation entirely
 * - `Array<StyleVariable>` - Custom variables array (replaces defaults)
 * - `(defaults) => Array<StyleVariable>` - Callback to modify defaults
 */
export type VariablesOption =
	| Array<StyleVariable>
	| ((defaults: Array<StyleVariable>) => Array<StyleVariable>)
	| null
	| undefined;

/**
 * Options for unified CSS generation (theme + base + utilities).
 * Controls how the three CSS layers are combined.
 */
export interface UnifiedCssOptions {
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
	 * Whether to tree-shake base styles to only include rules for detected elements.
	 * When false, includes all rules from the base styles.
	 * @default true
	 */
	treeshake_base_css?: boolean;
	/**
	 * Whether to tree-shake theme variables to only include those referenced.
	 * When false, includes all variables.
	 * @default true
	 */
	treeshake_variables?: boolean;
	/**
	 * Specificity multiplier for theme CSS selectors.
	 * Value of 1 generates `:root`, higher values generate more specific selectors (e.g., `:root:root`).
	 * @default 1
	 */
	theme_specificity?: number;
	/**
	 * Additional HTML elements to always include styles for.
	 * Useful for elements generated at runtime via `document.createElement()`.
	 */
	additional_elements?: Iterable<string>;
	/**
	 * Additional CSS variables to always include in theme output.
	 * Useful for variables referenced dynamically.
	 */
	additional_variables?: Iterable<string>;
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
	ops?: FsOperations;
}

/**
 * Combined base options shared by both Gro and Vite plugins.
 * These options work identically in both contexts.
 */
export interface CssGeneratorBaseOptions
	extends
		CssExtractionOptions,
		CssClassOptions,
		UnifiedCssOptions,
		CssDiagnosticsOptions,
		CssCacheOptions {}
