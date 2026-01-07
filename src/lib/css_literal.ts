/**
 * CSS-literal syntax parser, validator, and interpreter.
 *
 * Enables writing utility classes using actual CSS syntax:
 * - `display:flex` → `.display\:flex { display: flex; }`
 * - `hover:opacity:80%` → `.hover\:opacity\:80\%:hover { opacity: 80%; }`
 * - `md:dark:hover:before:opacity:80%` → nested CSS with media query, ancestor, state, pseudo-element
 *
 * @see {@link https://github.com/fuzdev/fuz_css} for documentation
 * @module
 */

import type {Logger} from '@fuzdev/fuz_util/log.js';

import {get_modifier, get_all_modifier_names, type ModifierDefinition} from './modifiers.js';

// Types

/**
 * Parsed CSS-literal class with all components extracted.
 */
export interface ParsedCssLiteral {
	/** Original class name */
	class_name: string;
	/** Media modifier (breakpoint or feature query) */
	media: ModifierDefinition | null;
	/** Ancestor modifier (dark/light) */
	ancestor: ModifierDefinition | null;
	/** State modifiers in alphabetical order (can have multiple) */
	states: Array<ModifierDefinition>;
	/** Pseudo-element modifier (before, after, etc.) */
	pseudo_element: ModifierDefinition | null;
	/** CSS property name */
	property: string;
	/** CSS value (with ~ replaced by spaces) */
	value: string;
}

/**
 * Diagnostic message for CSS-literal parsing/validation.
 */
export interface CssLiteralDiagnostic {
	level: 'error' | 'warning';
	message: string;
	class_name: string;
	suggestion?: string;
}

/**
 * Result of parsing a CSS-literal class name.
 */
export type ParseResult =
	| {ok: true; parsed: ParsedCssLiteral; diagnostics: Array<CssLiteralDiagnostic>}
	| {ok: false; error: CssLiteralDiagnostic};

// CSS Property Validation

/**
 * Set of valid CSS property names, populated from @webref/css.
 * Loaded asynchronously on first use.
 */
let css_properties: Set<string> | null = null;
let css_properties_loading: Promise<Set<string>> | null = null;

/**
 * Loads CSS properties from @webref/css.
 * Properties are cached after first load.
 */
export const load_css_properties = async (): Promise<Set<string>> => {
	if (css_properties) return css_properties;

	if (css_properties_loading) return css_properties_loading;

	css_properties_loading = (async () => {
		const webref = await import('@webref/css');
		const indexed = await webref.default.index();
		css_properties = new Set(Object.keys(indexed.properties));
		return css_properties;
	})();

	return css_properties_loading;
};

/**
 * Checks if a property name is a valid CSS property.
 * Custom properties (--*) always return true.
 *
 * @param property - The CSS property name to validate
 * @returns True if valid CSS property or custom property
 */
export const is_valid_css_property = (property: string): boolean => {
	// Custom properties are always valid
	if (property.startsWith('--')) return true;

	// If properties haven't loaded yet, allow all (validation happens async)
	if (!css_properties) return true;

	return css_properties.has(property);
};

/**
 * Suggests a correct property name for a typo using Levenshtein distance.
 *
 * @param typo - The mistyped property name
 * @returns The suggested property or null if no close match
 */
export const suggest_css_property = (typo: string): string | null => {
	if (!css_properties) return null;

	let best_match: string | null = null;
	let best_distance = 3; // Only suggest if distance <= 2

	for (const prop of css_properties) {
		const distance = levenshtein_distance(typo, prop);
		if (distance < best_distance) {
			best_distance = distance;
			best_match = prop;
		}
	}

	return best_match;
};

/**
 * Calculates Levenshtein distance between two strings.
 */
const levenshtein_distance = (a: string, b: string): number => {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const matrix: Array<Array<number>> = [];

	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= a.length; j++) {
		matrix[0]![j] = j;
	}

	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i]![j] = matrix[i - 1]![j - 1]!;
			} else {
				matrix[i]![j] = Math.min(
					matrix[i - 1]![j - 1]! + 1, // substitution
					matrix[i]![j - 1]! + 1, // insertion
					matrix[i - 1]![j]! + 1, // deletion
				);
			}
		}
	}

	return matrix[b.length]![a.length]!;
};

/**
 * Suggests a correct modifier name for a typo.
 */
export const suggest_modifier = (typo: string): string | null => {
	const all_names = get_all_modifier_names();
	let best_match: string | null = null;
	let best_distance = 3;

	for (const name of all_names) {
		const distance = levenshtein_distance(typo, name);
		if (distance < best_distance) {
			best_distance = distance;
			best_match = name;
		}
	}

	return best_match;
};

// Value Formatting

/**
 * Formats a CSS-literal value for CSS output.
 * - Replaces `~` with space
 * - Ensures space before `!important`
 *
 * @param value - Raw value from class name
 * @returns Formatted CSS value
 */
export const format_css_value = (value: string): string => {
	let result = value.replace(/~/g, ' ');
	result = result.replace(/!important$/, ' !important');
	return result;
};

/**
 * Pattern to detect calc expressions possibly missing spaces around + or -.
 * CSS requires spaces around + and - in calc().
 */
const CALC_MISSING_SPACE_PATTERN = /calc\([^)]*\d+[%a-z]*[+-]\d/i;

/**
 * Checks if a value contains a possibly invalid calc expression.
 *
 * @param value - The formatted CSS value
 * @returns Warning message if suspicious, null otherwise
 */
export const check_calc_expression = (value: string): string | null => {
	if (CALC_MISSING_SPACE_PATTERN.test(value)) {
		return `Possible invalid calc expression. CSS requires spaces around + and - in calc(). Use ~ for spaces: "calc(100%~-~20px)"`;
	}
	return null;
};

// Parsing

/**
 * Checks if a class name could be a CSS-literal class.
 * Quick check before attempting full parse.
 *
 * @param class_name - The class name to check
 * @returns True if it could be CSS-literal syntax
 */
export const is_possible_css_literal = (class_name: string): boolean => {
	// Must contain at least one colon
	if (!class_name.includes(':')) return false;

	// Should not match existing class patterns (underscore-based)
	if (/^[a-z_]+_[a-z0-9_]+$/.test(class_name)) return false;

	// Basic structure check: at minimum "property:value"
	const parts = class_name.split(':');
	if (parts.length < 2) return false;

	// First part should be non-empty (property or first modifier)
	if (parts[0] === '') return false;

	// Last part should be the value, shouldn't be empty
	if (parts[parts.length - 1] === '') return false;

	return true;
};

/**
 * Extracts colon-separated segments from a class name, handling parentheses.
 * Parenthesized content (like function arguments) is kept intact.
 *
 * @example
 * extract_segments('md:hover:display:flex') → ['md', 'hover', 'display', 'flex']
 * extract_segments('nth-child(2n+1):color:red') → ['nth-child(2n+1)', 'color', 'red']
 * extract_segments('width:calc(100%-20px)') → ['width', 'calc(100%-20px)']
 */
export const extract_segments = (class_name: string): Array<string> => {
	const segments: Array<string> = [];
	let current = '';
	let paren_depth = 0;

	for (const char of class_name) {
		if (char === '(') {
			paren_depth++;
			current += char;
		} else if (char === ')') {
			paren_depth--;
			current += char;
		} else if (char === ':' && paren_depth === 0) {
			if (current) {
				segments.push(current);
				current = '';
			}
		} else {
			current += char;
		}
	}

	if (current) {
		segments.push(current);
	}

	return segments;
};

/**
 * Parses a CSS-literal class name into its components.
 *
 * @param class_name - The class name to parse
 * @returns ParseResult with parsed data or error
 */
export const parse_css_literal = (class_name: string): ParseResult => {
	const segments = extract_segments(class_name);

	if (segments.length < 2) {
		return {
			ok: false,
			error: {
				level: 'error',
				message: `Invalid CSS-literal syntax: expected "property:value" format`,
				class_name,
			},
		};
	}

	let media: ModifierDefinition | null = null;
	let ancestor: ModifierDefinition | null = null;
	const states: Array<ModifierDefinition> = [];
	let pseudo_element: ModifierDefinition | null = null;

	// Work backwards from end to find property:value
	// Everything before that is modifiers
	const value = segments[segments.length - 1]!;
	const property = segments[segments.length - 2]!;
	const modifier_segments = segments.slice(0, -2);

	const diagnostics: Array<CssLiteralDiagnostic> = [];

	// Parse modifiers in order
	for (const segment of modifier_segments) {
		const modifier = get_modifier(segment);

		if (!modifier) {
			const suggestion = suggest_modifier(segment);
			return {
				ok: false,
				error: {
					level: 'error',
					message: `Unknown modifier "${segment}"`,
					class_name,
					suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined,
				},
			};
		}

		// Validate order based on modifier type
		switch (modifier.type) {
			case 'media': {
				if (media) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Multiple media modifiers not allowed`,
							class_name,
						},
					};
				}
				if (ancestor) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Media modifier must come before ancestor modifier`,
							class_name,
							suggestion: `Move "${segment}" before "${ancestor.name}"`,
						},
					};
				}
				if (states.length > 0) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Media modifier must come before state modifiers`,
							class_name,
							suggestion: `Move "${segment}" before "${states[0]!.name}"`,
						},
					};
				}
				if (pseudo_element) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Media modifier must come before pseudo-element`,
							class_name,
							suggestion: `Move "${segment}" before "${pseudo_element.name}"`,
						},
					};
				}
				media = modifier;
				break;
			}

			case 'ancestor': {
				if (ancestor) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Modifiers "${ancestor.name}" and "${segment}" are mutually exclusive`,
							class_name,
							suggestion: `Use one or the other: "${ancestor.name}:${property}:${value}" or "${segment}:${property}:${value}"`,
						},
					};
				}
				if (states.length > 0) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Ancestor modifier must come before state modifiers`,
							class_name,
							suggestion: `Move "${segment}" before "${states[0]!.name}"`,
						},
					};
				}
				if (pseudo_element) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Ancestor modifier must come before pseudo-element`,
							class_name,
							suggestion: `Move "${segment}" before "${pseudo_element.name}"`,
						},
					};
				}
				ancestor = modifier;
				break;
			}

			case 'state': {
				if (pseudo_element) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `State modifiers must come before pseudo-element`,
							class_name,
							suggestion: `Move "${segment}" before "${pseudo_element.name}"`,
						},
					};
				}
				// Check alphabetical order (full string comparison)
				if (states.length > 0) {
					const prev = states[states.length - 1]!;
					if (segment < prev.name) {
						return {
							ok: false,
							error: {
								level: 'error',
								message: `State modifiers must be in alphabetical order`,
								class_name,
								suggestion: `"${segment}" should come before "${prev.name}". Try: "${segment}:${prev.name}:..."`,
							},
						};
					}
				}
				states.push(modifier);
				break;
			}

			case 'pseudo-element': {
				if (pseudo_element) {
					return {
						ok: false,
						error: {
							level: 'error',
							message: `Multiple pseudo-element modifiers not allowed`,
							class_name,
						},
					};
				}
				pseudo_element = modifier;
				break;
			}
		}
	}

	// Validate property
	if (!is_valid_css_property(property)) {
		const suggestion = suggest_css_property(property);
		return {
			ok: false,
			error: {
				level: 'error',
				message: `Unknown CSS property "${property}"`,
				class_name,
				suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined,
			},
		};
	}

	// Format value
	const formatted_value = format_css_value(value);

	// Check for calc warnings
	const calc_warning = check_calc_expression(formatted_value);
	if (calc_warning) {
		diagnostics.push({
			level: 'warning',
			message: calc_warning,
			class_name,
			suggestion: `Use ~ for spaces in calc expressions`,
		});
	}

	return {
		ok: true,
		parsed: {
			class_name,
			media,
			ancestor,
			states,
			pseudo_element,
			property,
			value: formatted_value,
		},
		diagnostics,
	};
};

// CSS Generation

/**
 * Generates the CSS selector for a parsed CSS-literal class.
 * Includes state pseudo-classes and pseudo-element in the selector.
 */
export const generate_selector = (escaped_class_name: string, parsed: ParsedCssLiteral): string => {
	let selector = `.${escaped_class_name}`;

	// Add state pseudo-classes
	for (const state of parsed.states) {
		selector += state.css;
	}

	// Add pseudo-element (must come last)
	if (parsed.pseudo_element) {
		selector += parsed.pseudo_element.css;
	}

	return selector;
};

/**
 * Generates the CSS declaration for a parsed CSS-literal class.
 */
export const generate_declaration = (parsed: ParsedCssLiteral): string => {
	return `${parsed.property}: ${parsed.value};`;
};

/**
 * Information needed to generate CSS output for a CSS-literal class.
 */
export interface CssLiteralOutput {
	/** The original class name */
	class_name: string;
	/** CSS declaration (property: value;) */
	declaration: string;
	/** Full CSS selector including pseudo-classes/elements */
	selector: string;
	/** Media query wrapper if any */
	media_wrapper: string | null;
	/** Ancestor wrapper if any */
	ancestor_wrapper: string | null;
	/** Any diagnostics generated during parsing */
	diagnostics: Array<CssLiteralDiagnostic>;
}

/**
 * Interprets a CSS-literal class and returns CSS generation info.
 *
 * @param class_name - The class name to interpret
 * @param escaped_class_name - The CSS-escaped version of the class name
 * @param log - Optional logger for warnings
 * @returns CssLiteralOutput or null if not a valid CSS-literal
 */
export const interpret_css_literal = (
	class_name: string,
	escaped_class_name: string,
	log?: Logger,
): CssLiteralOutput | null => {
	if (!is_possible_css_literal(class_name)) {
		return null;
	}

	const result = parse_css_literal(class_name);

	if (!result.ok) {
		log?.error(`CSS-literal error: ${result.error.message}`);
		if (result.error.suggestion) {
			log?.error(`  ${result.error.suggestion}`);
		}
		return null;
	}

	const {parsed, diagnostics} = result;

	// Log warnings
	for (const diagnostic of diagnostics) {
		if (diagnostic.level === 'warning') {
			log?.warn(`CSS-literal warning in "${class_name}": ${diagnostic.message}`);
			if (diagnostic.suggestion) {
				log?.warn(`  ${diagnostic.suggestion}`);
			}
		}
	}

	return {
		class_name,
		declaration: generate_declaration(parsed),
		selector: generate_selector(escaped_class_name, parsed),
		media_wrapper: parsed.media?.css ?? null,
		ancestor_wrapper: parsed.ancestor?.css ?? null,
		diagnostics,
	};
};

/**
 * Generates simple CSS for a CSS-literal class (without grouping).
 * Used by the interpreter for basic output.
 *
 * @param output - The CSS-literal output info
 * @returns CSS string for this class
 */
export const generate_css_literal_simple = (output: CssLiteralOutput): string => {
	let css = '';
	let indent = '';

	// Open media wrapper if present
	if (output.media_wrapper) {
		css += `${output.media_wrapper} {\n`;
		indent = '\t';
	}

	// Open ancestor wrapper if present
	if (output.ancestor_wrapper) {
		css += `${indent}${output.ancestor_wrapper} {\n`;
		indent += '\t';
	}

	// Write the rule
	css += `${indent}${output.selector} { ${output.declaration} }\n`;

	// Close ancestor wrapper
	if (output.ancestor_wrapper) {
		indent = indent.slice(0, -1);
		css += `${indent}}\n`;
	}

	// Close media wrapper
	if (output.media_wrapper) {
		css += '}\n';
	}

	return css;
};
