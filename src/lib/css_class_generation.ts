/**
 * CSS class generation utilities.
 *
 * Produces CSS output from class definitions, handles interpretation of
 * dynamic classes, and provides collection management for extracted classes.
 *
 * @module
 */

import type {Logger} from '@fuzdev/fuz_util/log.js';

import {
	type SourceLocation,
	type InterpreterDiagnostic,
	type GenerationDiagnostic,
	create_generation_diagnostic,
} from './diagnostics.js';
import {
	parse_ruleset,
	is_single_selector_ruleset,
	ruleset_contains_class,
} from './css_ruleset_parser.js';
import {resolve_class_definition} from './css_class_resolution.js';
import {get_modifier} from './modifiers.js';

//
// CSS Utilities
//

/**
 * Escapes special characters in a CSS class name for use in a selector.
 * CSS selectors require escaping of characters like `:`, `%`, `(`, `)`, etc.
 *
 * @example
 * escape_css_selector('display:flex') // 'display\\:flex'
 * escape_css_selector('opacity:80%') // 'opacity\\:80\\%'
 * escape_css_selector('nth-child(2n)') // 'nth-child\\(2n\\)'
 */
export const escape_css_selector = (name: string): string => {
	return name.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
};

//
// Class Definitions
//

export interface CssClassDefinitionBase {
	comment?: string;
}

/** Pure utility composition (classes only). */
export interface CssClassDefinitionComposition extends CssClassDefinitionBase {
	classes: Array<string>;
	declaration?: never;
	ruleset?: never;
}

/** Custom CSS declaration (optionally seeded with classes). */
export interface CssClassDefinitionDeclaration extends CssClassDefinitionBase {
	declaration: string;
	classes?: Array<string>;
	ruleset?: never;
}

/** Full ruleset with selectors. */
export interface CssClassDefinitionRuleset extends CssClassDefinitionBase {
	ruleset: string;
	classes?: never;
	declaration?: never;
}

/** Static definitions (not interpreter-based). */
export type CssClassDefinitionStatic =
	| CssClassDefinitionComposition
	| CssClassDefinitionDeclaration
	| CssClassDefinitionRuleset;

/** Full union including interpreters. */
export type CssClassDefinition = CssClassDefinitionStatic | CssClassDefinitionInterpreter;

/**
 * Context passed to CSS class interpreters.
 * Provides access to logging, diagnostics collection, and the class registry.
 */
export interface CssClassInterpreterContext {
	/** Optional logger for warnings/errors */
	log?: Logger;
	/** Diagnostics array to collect warnings and errors */
	diagnostics: Array<InterpreterDiagnostic>;
	/** All known CSS class definitions (token + composite classes) */
	class_definitions: Record<string, CssClassDefinition | undefined>;
	/** Valid CSS properties for literal validation, or null to skip validation */
	css_properties: Set<string> | null;
}

/** Interpreter for dynamic CSS class generation based on pattern matching. */
export interface CssClassDefinitionInterpreter extends CssClassDefinitionBase {
	pattern: RegExp;
	/**
	 * @mutates ctx.diagnostics - Implementations push errors/warnings to the diagnostics array
	 */
	interpret: (matched: RegExpMatchArray, ctx: CssClassInterpreterContext) => string | null;
}

//
// CSS Generation
//

/**
 * Result from CSS class generation.
 */
export interface GenerateClassesCssResult {
	css: string;
	diagnostics: Array<GenerationDiagnostic>;
}

export interface GenerateClassesCssOptions {
	class_names: Iterable<string>;
	class_definitions: Record<string, CssClassDefinition | undefined>;
	interpreters: Array<CssClassDefinitionInterpreter>;
	/** Valid CSS properties for literal validation, or null to skip validation */
	css_properties: Set<string> | null;
	log?: Logger;
	class_locations?: Map<string, Array<SourceLocation> | null>;
}

export const generate_classes_css = (
	options: GenerateClassesCssOptions,
): GenerateClassesCssResult => {
	const {class_names, class_definitions, interpreters, css_properties, log, class_locations} =
		options;
	const interpreter_diagnostics: Array<InterpreterDiagnostic> = [];
	const diagnostics: Array<GenerationDiagnostic> = [];

	// Create interpreter context with access to all class definitions
	const ctx: CssClassInterpreterContext = {
		log,
		diagnostics: interpreter_diagnostics,
		class_definitions,
		css_properties,
	};

	// Create a map that has the index of each class name as the key
	const indexes: Map<string, number> = new Map();
	const keys = Object.keys(class_definitions);
	for (let i = 0; i < keys.length; i++) {
		indexes.set(keys[i]!, i);
	}

	// Helper to get the maximum state modifier order from a class name
	// This ensures proper cascade: hover (5) comes before active (6)
	const get_state_modifier_order = (class_name: string): number => {
		const parts = class_name.split(':');
		let max_order = 0;
		for (const part of parts.slice(0, -1)) {
			// Check each potential modifier prefix
			const modifier = get_modifier(part);
			if (modifier?.type === 'state' && modifier.order !== undefined) {
				max_order = Math.max(max_order, modifier.order);
			}
		}
		return max_order;
	};

	// Sort classes: first by definition index, then by state modifier order, then alphabetically
	const sorted_classes = (Array.isArray(class_names) ? class_names : Array.from(class_names)).sort(
		(a, b) => {
			const index_a = indexes.get(a) ?? Number.MAX_VALUE;
			const index_b = indexes.get(b) ?? Number.MAX_VALUE;
			if (index_a !== index_b) return index_a - index_b;
			// For classes with modifiers, sort by state modifier order (for proper cascade)
			const order_a = get_state_modifier_order(a);
			const order_b = get_state_modifier_order(b);
			if (order_a !== order_b) return order_a - order_b;
			return a.localeCompare(b); // alphabetic tiebreaker for stable sort
		},
	);

	let css = '';
	for (const c of sorted_classes) {
		let v = class_definitions[c];

		// Track diagnostics count before this class
		const diag_count_before = interpreter_diagnostics.length;

		// If not found statically, try interpreters
		let from_interpreter = false;
		if (!v) {
			for (const interpreter of interpreters) {
				const matched = c.match(interpreter.pattern);
				if (matched) {
					const result = interpreter.interpret(matched, ctx);
					if (result) {
						// Check if the result is a full ruleset (contains braces)
						// or just a declaration
						if (result.includes('{')) {
							// Full ruleset - use as-is
							v = {ruleset: result, comment: interpreter.comment};
						} else {
							// Simple declaration
							v = {declaration: result, comment: interpreter.comment};
						}
						from_interpreter = true;
						break;
					}
				}
			}
		}

		// Convert any new interpreter diagnostics to GenerationDiagnostic with locations
		for (let i = diag_count_before; i < interpreter_diagnostics.length; i++) {
			const diag = interpreter_diagnostics[i]!;
			const locations = class_locations?.get(diag.class_name) ?? null;
			diagnostics.push(create_generation_diagnostic(diag, locations));
		}

		if (!v) {
			continue;
		}

		const {comment} = v;

		if (comment) {
			const trimmed = comment.trim();
			if (trimmed.includes('\n')) {
				// Multi-line CSS comment
				const lines = trimmed.split('\n').map((line) => line.trim());
				css += `/*\n${lines.join('\n')}\n*/\n`;
			} else {
				css += `/* ${trimmed} */\n`;
			}
		}

		// Handle classes-based or declaration-based definitions
		if ('classes' in v || 'declaration' in v) {
			const resolution_result = resolve_class_definition(v, c, class_definitions);
			if (!resolution_result.ok) {
				// Add error diagnostic and skip this class
				diagnostics.push({
					phase: 'generation',
					level: 'error',
					message: resolution_result.error.message,
					class_name: c,
					suggestion: resolution_result.error.suggestion,
					locations: class_locations?.get(c) ?? null,
				});
				continue;
			}
			// Add warnings if any
			if (resolution_result.warnings) {
				for (const warning of resolution_result.warnings) {
					diagnostics.push(create_generation_diagnostic(warning, class_locations?.get(c) ?? null));
				}
			}
			if (resolution_result.declaration) {
				css += `.${escape_css_selector(c)} { ${resolution_result.declaration} }\n`;
			}
		} else if ('ruleset' in v) {
			// Check for empty ruleset
			// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
			if (!v.ruleset || !v.ruleset.trim()) {
				diagnostics.push({
					phase: 'generation',
					level: 'warning',
					message: `Ruleset "${c}" is empty`,
					class_name: c,
					suggestion: `Add CSS rules or remove the empty ruleset definition`,
					locations: class_locations?.get(c) ?? null,
				});
				continue;
			}

			css += v.ruleset.trim() + '\n';

			// Validate ruleset and emit warnings
			try {
				const parsed = parse_ruleset(v.ruleset);
				// Use CSS-escaped class name for matching (handles special chars like colons)
				const escaped_class = escape_css_selector(c);

				// Warn if no selector contains the expected class name
				if (!ruleset_contains_class(parsed.rules, escaped_class)) {
					diagnostics.push({
						phase: 'generation',
						level: 'warning',
						message: `Ruleset "${c}" has no selectors containing ".${c}"`,
						class_name: c,
						suggestion: `Ensure at least one selector uses ".${c}" so the class works when applied`,
						locations: class_locations?.get(c) ?? null,
					});
				}

				// Warn if this ruleset could be converted to declaration format
				// Skip for interpreter-generated rulesets (e.g., CSS literals) - they intentionally use rulesets
				// Skip if ruleset has at-rules (e.g., @media) - these need the wrapper
				// Strip comments before checking (/* ... */ can precede @media)
				const ruleset_without_comments = v.ruleset.replace(/\/\*[\s\S]*?\*\//g, '').trim();
				const has_at_rules = ruleset_without_comments.startsWith('@');
				if (
					!from_interpreter &&
					!has_at_rules &&
					is_single_selector_ruleset(parsed.rules, escaped_class)
				) {
					diagnostics.push({
						phase: 'generation',
						level: 'warning',
						message: `Ruleset "${c}" has a single selector and could be converted to declaration format for modifier support`,
						class_name: c,
						suggestion: `Convert to: { declaration: '${parsed.rules[0]?.declarations.replace(/\s+/g, ' ').trim()}' }`,
						locations: class_locations?.get(c) ?? null,
					});
				}
			} catch (e) {
				// Warn about parse errors so users can investigate
				const error_message = e instanceof Error ? e.message : String(e);
				diagnostics.push({
					phase: 'generation',
					level: 'warning',
					message: `Failed to parse ruleset for "${c}": ${error_message}`,
					class_name: c,
					suggestion: 'Check for CSS syntax errors in the ruleset',
					locations: class_locations?.get(c) ?? null,
				});
			}
		}
		// Note: Interpreted types are converted to declaration above, so no else clause needed
	}

	return {css, diagnostics};
};
