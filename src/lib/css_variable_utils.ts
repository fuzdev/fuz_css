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
 * - `var(--palette_a_50)` → captures `palette_a_50`
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

/**
 * Pattern for `var(--name` references plus what follows the name: `)` for a
 * reference with no fallback, `,` for one with a fallback.
 */
const CSS_VARIABLE_REFERENCE_PATTERN = /var\(\s*--([a-zA-Z_][a-zA-Z0-9_-]*)\s*([,)])?/g;

/**
 * Extracts the CSS variables a string references with no fallback - the ones
 * that must be defined for the value to resolve. `var(--a, 1px)` can't
 * resolve to nothing, so `a` is left out, while the `b` in
 * `var(--a, var(--b))` is required.
 *
 * @param css - CSS string potentially containing `var(--*)` references
 * @returns set of variable names (without `--` prefix)
 */
export const extract_required_css_variables = (css: string): Set<string> => {
	const variables: Set<string> = new Set();
	for (const match of css.matchAll(CSS_VARIABLE_REFERENCE_PATTERN)) {
		if (match[2] !== ',') variables.add(match[1]!);
	}
	return variables;
};

/**
 * Pattern for a custom property declaration: `--name:` at the start of a
 * declaration - after a block's brace, a `;`, the `}` of a nested rule, or
 * whitespace - which a `var(--name` reference or a dashed ident in an at-rule
 * prelude never is.
 */
const CSS_VARIABLE_DECLARATION_PATTERN = /(?:^|[{};\s])--([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/g;

/**
 * Extracts the custom properties a CSS string declares.
 *
 * @param css - CSS string potentially containing `--name: value` declarations
 * @returns set of variable names (without `--` prefix)
 */
export const extract_declared_css_variables = (css: string): Set<string> => {
	const variables: Set<string> = new Set();
	for (const match of css.matchAll(CSS_VARIABLE_DECLARATION_PATTERN)) {
		variables.add(match[1]!);
	}
	return variables;
};

/** Whether `css` has an unquoted `url(` function token at `index`. */
const is_css_url_start = (css: string, index: number): boolean =>
	css.slice(index, index + 4).toLowerCase() === 'url(' &&
	(index === 0 || !/[\w-]/.test(css[index - 1]!));

/**
 * Removes the comments from a CSS string, so text inside one isn't read as
 * CSS. Quoted strings and unquoted `url()` values are left intact - a `/*`
 * inside either is not a comment - and each comment becomes a space because a
 * comment separates tokens. For analysis, not for output.
 *
 * @param css - CSS string potentially containing comments
 * @returns the string without its comments, or `css` itself when it has none
 */
export const strip_css_comments = (css: string): string => {
	if (!css.includes('/*')) return css;
	let result = '';
	let kept_from = 0;
	let quote: string | null = null;
	let i = 0;
	while (i < css.length) {
		const char = css[i]!;
		if (quote !== null) {
			if (char === '\\') {
				i++; // skip the escaped character
			} else if (char === quote) {
				quote = null;
			}
		} else if (char === '"' || char === "'") {
			quote = char;
		} else if ((char === 'u' || char === 'U') && is_css_url_start(css, i)) {
			// an unquoted url runs to its closing paren; a quoted one is a
			// string, which the next iteration reads as one
			let j = i + 4;
			while (css[j] === ' ' || css[j] === '\t' || css[j] === '\n') j++;
			if (css[j] !== '"' && css[j] !== "'") {
				const end = css.indexOf(')', j);
				i = end === -1 ? css.length : end + 1;
				continue;
			}
			i = j;
			continue;
		} else if (char === '/' && css[i + 1] === '*') {
			const end = css.indexOf('*/', i + 2);
			result += css.slice(kept_from, i) + ' ';
			i = end === -1 ? css.length : end + 2;
			kept_from = i;
			continue;
		}
		i++;
	}
	return result + css.slice(kept_from);
};
