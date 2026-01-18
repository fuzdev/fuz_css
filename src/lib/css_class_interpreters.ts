import {escape_css_selector, type CssClassDefinitionInterpreter} from './css_class_generation.js';
import {
	is_possible_css_literal,
	interpret_css_literal,
	generate_css_literal_simple,
	extract_segments,
	extract_and_validate_modifiers,
	type CssLiteralOutput,
} from './css_literal.js';
import {generate_modified_ruleset} from './css_ruleset_parser.js';
import {resolve_class_definition} from './css_class_resolution.js';

/**
 * Interpreter for modified token/composite classes (e.g., `hover:p_md`, `md:box`, `dark:hover:panel`).
 * Applies modifiers to existing declaration-based or ruleset-based classes.
 *
 * This interpreter must run BEFORE css_literal_interpreter to handle cases like `hover:box`
 * where `box` is a known class (not a CSS property).
 */
export const modified_class_interpreter: CssClassDefinitionInterpreter = {
	pattern: /^.+:.+$/,
	interpret: (matched, ctx) => {
		const class_name = matched[0];
		const segments = extract_segments(class_name);

		// Extract modifiers from the front
		const result = extract_and_validate_modifiers(segments, class_name);

		if (!result.ok) {
			// Modifier validation error - let css_literal_interpreter try
			return null;
		}

		const {modifiers, remaining} = result;

		// Must have exactly one remaining segment (the base class name)
		if (remaining.length !== 1) {
			return null;
		}

		const base_class_name = remaining[0]!;

		// Check if the base class is known
		const base_class = ctx.class_definitions[base_class_name];
		if (!base_class) {
			return null;
		}

		// Must have at least one modifier (otherwise it's just the base class)
		const has_modifiers =
			modifiers.media ||
			modifiers.ancestor ||
			modifiers.states.length > 0 ||
			modifiers.pseudo_element;
		if (!has_modifiers) {
			return null;
		}

		const escaped_class_name = escape_css_selector(class_name);

		// Build state and pseudo-element CSS suffixes
		let state_css = '';
		for (const state of modifiers.states) {
			state_css += state.css;
		}
		const pseudo_element_css = modifiers.pseudo_element?.css ?? '';

		// Handle composes-based or declaration-based definitions
		if ('composes' in base_class || 'declaration' in base_class) {
			const resolution_result = resolve_class_definition(
				base_class,
				base_class_name,
				ctx.class_definitions,
			);
			if (!resolution_result.ok) {
				ctx.diagnostics.push(resolution_result.error);
				return null;
			}
			// Add warnings if any
			if (resolution_result.warnings) {
				for (const warning of resolution_result.warnings) {
					ctx.diagnostics.push(warning);
				}
			}
			if (!resolution_result.declaration) {
				return null;
			}

			// Build the selector
			let selector = `.${escaped_class_name}`;
			selector += state_css;
			selector += pseudo_element_css;

			// Create output compatible with generate_css_literal_simple
			const output: CssLiteralOutput = {
				declaration: resolution_result.declaration,
				selector,
				media_wrapper: modifiers.media?.css ?? null,
				ancestor_wrapper: modifiers.ancestor?.css ?? null,
			};

			const css = generate_css_literal_simple(output);
			return css.trimEnd();
		}

		// Handle ruleset-based classes
		if ('ruleset' in base_class && base_class.ruleset) {
			const result = generate_modified_ruleset(
				base_class.ruleset,
				base_class_name,
				escaped_class_name,
				state_css,
				pseudo_element_css,
				modifiers.media?.css ?? null,
				modifiers.ancestor?.css ?? null,
			);

			// Emit warnings for skipped modifiers
			if (result.skipped_modifiers) {
				for (const skipped of result.skipped_modifiers) {
					if (skipped.reason === 'pseudo_element_conflict') {
						ctx.diagnostics.push({
							level: 'warning',
							class_name,
							message: `Rule "${skipped.selector}" already contains a pseudo-element; "${skipped.conflicting_modifier}" modifier was not applied`,
							suggestion: `The rule is included with just the class renamed`,
						});
					} else {
						ctx.diagnostics.push({
							level: 'warning',
							class_name,
							message: `Rule "${skipped.selector}" already contains "${skipped.conflicting_modifier}"; modifier was not applied to avoid redundancy`,
							suggestion: `The rule is included with just the class renamed`,
						});
					}
				}
			}

			return result.css.trimEnd();
		}

		return null;
	},
};

/**
 * Interpreter for CSS-literal classes (e.g., `display:flex`, `hover:opacity:80%`).
 * Generates full CSS rulesets including any modifier wrappers.
 */
export const css_literal_interpreter: CssClassDefinitionInterpreter = {
	pattern: /^.+:.+$/,
	interpret: (matched, ctx) => {
		const class_name = matched[0];

		if (!is_possible_css_literal(class_name)) {
			return null;
		}

		const escaped_class_name = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped_class_name, ctx.css_properties);

		if (!result.ok) {
			ctx.diagnostics.push(result.error);
			return null;
		}

		// Collect warnings for upstream handling
		if (result.warnings) {
			for (const warning of result.warnings) {
				ctx.diagnostics.push(warning);
			}
		}

		// Generate the full CSS including any wrappers
		const css = generate_css_literal_simple(result.output);

		// Return the CSS but strip trailing newline for consistency
		return css.trimEnd();
	},
};

/**
 * Collection of all builtin interpreters for dynamic CSS class generation.
 * Order matters: modified_class_interpreter runs first to handle `hover:box` before
 * css_literal_interpreter tries to interpret it as `hover:box` (property:value).
 */
export const css_class_interpreters: Array<CssClassDefinitionInterpreter> = [
	modified_class_interpreter,
	css_literal_interpreter,
];
