/**
 * CSS class generation utilities.
 *
 * Produces CSS output from class definitions, handles interpretation of
 * dynamic classes, and provides collection management for extracted classes.
 *
 * @module
 */

import type {Logger} from '@fuzdev/fuz_util/log.js';

import {type SourceLocation, type ExtractionDiagnostic} from './css_class_extractor.js';
import {parse_ruleset, is_single_selector_ruleset} from './css_ruleset_parser.js';

//
// Diagnostics
//

/**
 * Diagnostic from the generation phase.
 */
export interface GenerationDiagnostic {
	phase: 'generation';
	level: 'error' | 'warning';
	message: string;
	suggestion: string | null;
	class_name: string;
	/** Source locations where this class was used, or null if from include_classes */
	locations: Array<SourceLocation> | null;
}

/**
 * Union of all diagnostic types.
 */
export type Diagnostic = ExtractionDiagnostic | GenerationDiagnostic;

/**
 * Diagnostic from CSS class interpretation.
 * Used internally by interpreters; converted to GenerationDiagnostic with locations.
 */
export interface CssClassDiagnostic {
	level: 'error' | 'warning';
	message: string;
	class_name: string;
	suggestion: string | null;
}

/**
 * Converts a CssClassDiagnostic to a GenerationDiagnostic with locations.
 *
 * @param diagnostic - Interpreter diagnostic to convert
 * @param locations - Source locations where the class was used
 */
export const create_generation_diagnostic = (
	diagnostic: CssClassDiagnostic,
	locations: Array<SourceLocation> | null,
): GenerationDiagnostic => ({
	phase: 'generation',
	level: diagnostic.level,
	message: diagnostic.message,
	class_name: diagnostic.class_name,
	suggestion: diagnostic.suggestion ?? null,
	locations,
});

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
// Class Collection
//

/**
 * Collection of CSS classes extracted from source files.
 * Tracks classes per-file for efficient incremental updates.
 */
export class CssClasses {
	include_classes: Set<string> | null;

	#all: Set<string> = new Set();

	#all_with_locations: Map<string, Array<SourceLocation>> = new Map();

	#by_id: Map<string, Map<string, Array<SourceLocation>>> = new Map();

	/** Diagnostics stored per-file so they're replaced when a file is updated */
	#diagnostics_by_id: Map<string, Array<ExtractionDiagnostic>> = new Map();

	#dirty = true;

	constructor(include_classes: Set<string> | null = null) {
		this.include_classes = include_classes;
	}

	/**
	 * Adds extraction results for a file.
	 * Replaces any previous classes and diagnostics for this file.
	 *
	 * @param id - File identifier
	 * @param classes - Map of class names to their source locations
	 * @param diagnostics - Extraction diagnostics from this file
	 */
	add(
		id: string,
		classes: Map<string, Array<SourceLocation>>,
		diagnostics?: Array<ExtractionDiagnostic>,
	): void {
		this.#dirty = true;
		this.#by_id.set(id, classes);
		if (diagnostics && diagnostics.length > 0) {
			this.#diagnostics_by_id.set(id, diagnostics);
		} else {
			// Clear any old diagnostics for this file
			this.#diagnostics_by_id.delete(id);
		}
	}

	delete(id: string): void {
		this.#dirty = true;
		this.#by_id.delete(id);
		this.#diagnostics_by_id.delete(id);
	}

	/**
	 * Gets all unique class names as a Set.
	 * For backward compatibility.
	 */
	get(): Set<string> {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		return this.#all;
	}

	/**
	 * Gets all classes with their source locations.
	 * Locations from include_classes are null.
	 */
	get_with_locations(): Map<string, Array<SourceLocation> | null> {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		const result: Map<string, Array<SourceLocation> | null> = new Map();
		// Add include_classes with null locations
		if (this.include_classes) {
			for (const c of this.include_classes) {
				result.set(c, null);
			}
		}
		// Add extracted classes with their locations
		for (const [cls, locations] of this.#all_with_locations) {
			const existing = result.get(cls);
			if (existing === null) {
				// Was in include_classes, keep null to indicate it
				continue;
			}
			result.set(cls, locations);
		}
		return result;
	}

	/**
	 * Gets all extraction diagnostics from all files.
	 */
	get_diagnostics(): Array<ExtractionDiagnostic> {
		const result: Array<ExtractionDiagnostic> = [];
		for (const diagnostics of this.#diagnostics_by_id.values()) {
			result.push(...diagnostics);
		}
		return result;
	}

	#recalculate(): void {
		this.#all.clear();
		this.#all_with_locations.clear();

		if (this.include_classes) {
			for (const c of this.include_classes) {
				this.#all.add(c);
			}
		}

		for (const classes of this.#by_id.values()) {
			for (const [cls, locations] of classes) {
				this.#all.add(cls);
				const existing = this.#all_with_locations.get(cls);
				if (existing) {
					existing.push(...locations);
				} else {
					this.#all_with_locations.set(cls, [...locations]);
				}
			}
		}
	}
}

//
// Class Definitions
//

export type CssClassDefinition =
	| CssClassDefinitionItem
	| CssClassDefinitionGroup
	| CssClassDefinitionInterpreter;

export interface CssClassDefinitionBase {
	comment?: string;
}

export interface CssClassDefinitionItem extends CssClassDefinitionBase {
	declaration: string;
}

export interface CssClassDefinitionGroup extends CssClassDefinitionBase {
	ruleset: string;
}

/**
 * Context passed to CSS class interpreters.
 * Provides access to logging, diagnostics collection, and the class registry.
 */
export interface CssClassInterpreterContext {
	/** Optional logger for warnings/errors */
	log?: Logger;
	/** Diagnostics array to collect warnings and errors */
	diagnostics: Array<CssClassDiagnostic>;
	/** All known CSS class declarations (token + composite classes) */
	classes: Record<string, CssClassDefinition | undefined>;
}

export interface CssClassDefinitionInterpreter extends CssClassDefinitionBase {
	pattern: RegExp;
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

export const generate_classes_css = (
	classes: Iterable<string>,
	classes_by_name: Record<string, CssClassDefinition | undefined>,
	interpreters: Array<CssClassDefinitionInterpreter>,
	log?: Logger,
	class_locations?: Map<string, Array<SourceLocation> | null>,
): GenerateClassesCssResult => {
	const interpreter_diagnostics: Array<CssClassDiagnostic> = [];
	const diagnostics: Array<GenerationDiagnostic> = [];

	// Create interpreter context with access to all classes
	const ctx: CssClassInterpreterContext = {
		log,
		diagnostics: interpreter_diagnostics,
		classes: classes_by_name,
	};

	// Create a map that has the index of each class name as the key
	const indexes: Map<string, number> = new Map();
	const keys = Object.keys(classes_by_name);
	for (let i = 0; i < keys.length; i++) {
		indexes.set(keys[i]!, i);
	}

	// If any classes are unknown, just put them at the end
	const sorted_classes = (Array.isArray(classes) ? classes : Array.from(classes)).sort((a, b) => {
		const index_a = indexes.get(a) ?? Number.MAX_VALUE;
		const index_b = indexes.get(b) ?? Number.MAX_VALUE;
		if (index_a !== index_b) return index_a - index_b;
		return a.localeCompare(b); // alphabetic tiebreaker for stable sort
	});

	let css = '';
	for (const c of sorted_classes) {
		let v = classes_by_name[c];

		// Track diagnostics count before this class
		const diag_count_before = interpreter_diagnostics.length;

		// If not found statically, try interpreters
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

		if ('declaration' in v) {
			css += `.${escape_css_selector(c)} { ${v.declaration} }\n`;
		} else if ('ruleset' in v) {
			css += v.ruleset.trim() + '\n';

			// Warn if this ruleset could be converted to declaration format
			try {
				const parsed = parse_ruleset(v.ruleset);
				if (is_single_selector_ruleset(parsed.rules, c)) {
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
