import {escape_css_selector, type CssClassDeclarationInterpreter} from './css_class_helpers.js';
import {
	is_possible_css_literal,
	interpret_css_literal,
	generate_css_literal_simple,
} from './css_literal.js';

/**
 * Interpreter for CSS-literal classes (e.g., `display:flex`, `hover:opacity:80%`).
 * Generates full CSS rulesets including any modifier wrappers.
 */
export const css_literal_interpreter: CssClassDeclarationInterpreter = {
	pattern: /^.+:.+$/,
	interpret: (matched, log, diagnostics) => {
		const class_name = matched[0];

		if (!is_possible_css_literal(class_name)) {
			return null;
		}

		const escaped_class_name = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped_class_name, log, diagnostics);

		if (!output) {
			return null;
		}

		// Generate the full CSS including any wrappers
		const css = generate_css_literal_simple(output);

		// Return the CSS but strip trailing newline for consistency
		return css.trimEnd();
	},
	comment: undefined, // No comment for generated CSS-literal classes
};

/**
 * Collection of all builtin interpreters for dynamic CSS class generation.
 */
export const css_class_interpreters: Array<CssClassDeclarationInterpreter> = [
	css_literal_interpreter,
];
