import type { CssClassDefinitionInterpreter } from './css_class_generation.ts';
import type { ClassInterpretersOption } from './css_plugin_options.ts';
import {
	is_possible_css_literal,
	parse_css_literal,
	has_modifiers,
	generate_declaration
} from './css_literal.ts';

/**
 * Interpreter for CSS-literal classes (e.g., `display:flex`, `opacity:80%`).
 * Modifiers (`hover:opacity:80%`) are stripped by the generator before an
 * interpreter runs, so a literal reaching it is exactly `property:value`.
 */
export const css_literal_interpreter: CssClassDefinitionInterpreter = {
	pattern: /^.+:.+$/,
	interpret: (matched, ctx) => {
		const class_name = matched[0];

		if (!is_possible_css_literal(class_name)) {
			return null;
		}

		const result = parse_css_literal(class_name, ctx.css_properties);

		if (!result.ok) {
			ctx.diagnostics.push(result.error);
			return null;
		}

		// the generator strips modifiers first, so a remaining one means the
		// segment wasn't a property:value pair
		if (has_modifiers(result.parsed)) {
			return null;
		}

		if (result.diagnostics) {
			for (const diagnostic of result.diagnostics) {
				ctx.diagnostics.push(diagnostic);
			}
		}

		return { declaration: generate_declaration(result.parsed) };
	}
};

/**
 * Collection of all builtin interpreters for dynamic CSS class generation.
 * Modifier handling isn't an interpreter - the generator strips modifiers
 * from every class name and applies them to whatever the base resolves to.
 */
export const css_class_interpreters: Array<CssClassDefinitionInterpreter> = [
	css_literal_interpreter
];

/**
 * Resolves the `class_interpreters` option against the builtin interpreters.
 * An array replaces them, and a callback receives a copy of them and returns
 * the interpreters to use.
 *
 * @param option - the `class_interpreters` option
 * @returns the interpreters to generate with
 * @throws Error - if a callback returns something other than an array
 */
export const resolve_class_interpreters = (
	option: ClassInterpretersOption
): Array<CssClassDefinitionInterpreter> => {
	if (typeof option === 'function') {
		const result: unknown = option([...css_class_interpreters]);
		if (!Array.isArray(result)) {
			throw new Error(
				`The class_interpreters callback must return an array of interpreters, got ${
					result === null ? 'null' : typeof result
				}`
			);
		}
		return result as Array<CssClassDefinitionInterpreter>;
	}
	return option ?? css_class_interpreters;
};
