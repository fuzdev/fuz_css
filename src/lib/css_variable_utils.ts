/**
 * CSS variable extraction utilities.
 *
 * Provides shared helper functions for extracting CSS custom property references
 * from CSS strings. Used by style_rule_parser, variable_graph, class_variable_index,
 * and css_class_generation.
 *
 * @module
 */

/**
 * Pattern for matching CSS variable references: `var(--name)` or `var(--name, fallback)`.
 * Captures the variable name without the `--` prefix.
 * Allows optional whitespace after the opening parenthesis per CSS spec.
 *
 * Examples:
 * - `var(--color_a_50)` → captures `color_a_50`
 * - `var(--font_size_md, 1.6rem)` → captures `font_size_md`
 * - `var( --spacing )` → captures `spacing`
 */
const CSS_VARIABLE_PATTERN = /var\(\s*--([a-zA-Z_][a-zA-Z0-9_-]*)/g;

/**
 * Extracts CSS variable names from a CSS string.
 *
 * Parses `var(--name)` patterns and returns the variable names
 * without the `--` prefix. Handles fallback values by extracting
 * only the primary variable reference.
 *
 * @param css - CSS string potentially containing `var(--*)` references
 * @returns set of variable names (without `--` prefix)
 *
 * @example
 * ```ts
 * extract_css_variables('color: var(--text_color);')
 * // → Set { 'text_color' }
 *
 * extract_css_variables('background: var(--bg_1, var(--bg_2));')
 * // → Set { 'bg_1', 'bg_2' }
 *
 * extract_css_variables('padding: 1rem;')
 * // → Set {}
 * ```
 */
export const extract_css_variables = (css: string): Set<string> => {
	const variables: Set<string> = new Set();
	for (const match of css.matchAll(CSS_VARIABLE_PATTERN)) {
		variables.add(match[1]!);
	}
	return variables;
};

/**
 * Non-global pattern for checking if CSS contains variable references.
 * Uses a separate non-global regex to avoid lastIndex state issues with test().
 */
const CSS_VARIABLE_CHECK_PATTERN = /var\(\s*--[a-zA-Z_][a-zA-Z0-9_-]*/;

/**
 * Checks if a CSS string contains any CSS variable references.
 *
 * More efficient than `extract_css_variables` when you only need
 * to know if variables exist, not what they are.
 *
 * @param css - CSS string to check
 * @returns true if the string contains `var(--*)` patterns
 */
export const has_css_variables = (css: string): boolean => {
	return CSS_VARIABLE_CHECK_PATTERN.test(css);
};
