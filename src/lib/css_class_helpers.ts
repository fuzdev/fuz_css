import type {Logger} from '@fuzdev/fuz_util/log.js';

import {extract_css_classes, extract_css_classes_with_locations} from './css_class_extractor.js';
import {parse_ruleset, is_single_selector_ruleset} from './css_ruleset_parser.js';

// Unified Diagnostics System

/**
 * Source location for IDE/LSP integration.
 */
export interface SourceLocation {
	file: string;
	/** 1-based line number */
	line: number;
	/** 1-based column number */
	column: number;
}

/**
 * Base diagnostic with common fields.
 */
export interface BaseDiagnostic {
	level: 'error' | 'warning';
	message: string;
	suggestion: string | null;
}

/**
 * Diagnostic from the extraction phase.
 */
export interface ExtractionDiagnostic extends BaseDiagnostic {
	phase: 'extraction';
	location: SourceLocation;
}

/**
 * Diagnostic from the generation phase.
 */
export interface GenerationDiagnostic extends BaseDiagnostic {
	phase: 'generation';
	class_name: string;
	/** Source locations where this class was used, or null if from include_classes */
	locations: Array<SourceLocation> | null;
}

/**
 * Union of all diagnostic types.
 */
export type Diagnostic = ExtractionDiagnostic | GenerationDiagnostic;

/**
 * Helper class for converting character offsets to line/column positions.
 * Svelte template nodes (Comment, Text, ExpressionTag) only have char offsets,
 * so this class enables efficient conversion.
 *
 * Build: O(n) where n = source length
 * Lookup: O(log m) where m = number of lines (binary search)
 */
export class SourceIndex {
	private line_starts: Array<number>;

	constructor(source: string) {
		this.line_starts = [0];
		for (let i = 0; i < source.length; i++) {
			if (source[i] === '\n') this.line_starts.push(i + 1);
		}
	}

	/**
	 * Converts a character offset to a source location.
	 *
	 * @param offset - 0-based character offset in the source
	 * @param file - File path for the location
	 * @returns SourceLocation with 1-based line and column
	 */
	get_location(offset: number, file: string): SourceLocation {
		// Binary search for line
		let low = 0;
		let high = this.line_starts.length - 1;
		while (low < high) {
			const mid = Math.ceil((low + high) / 2);
			if (this.line_starts[mid]! <= offset) low = mid;
			else high = mid - 1;
		}
		return {file, line: low + 1, column: offset - this.line_starts[low]! + 1};
	}
}

/**
 * Extraction result with classes mapped to their source locations.
 */
export interface ExtractionResult {
	/**
	 * Map from class name to locations where it was used.
	 * Keys = unique classes, values = locations for diagnostics/IDE integration.
	 */
	classes: Map<string, Array<SourceLocation>>;
	/** Variables that were used in class contexts (for diagnostics) */
	tracked_vars: Set<string>;
	/** Diagnostics from the extraction phase */
	diagnostics: Array<ExtractionDiagnostic>;
}

/**
 * Adds a class with its location to the extraction result.
 *
 * @param classes - Map of classes to locations
 * @param class_name - Class name to add
 * @param location - Source location where the class was found
 */
export const add_class_with_location = (
	classes: Map<string, Array<SourceLocation>>,
	class_name: string,
	location: SourceLocation,
): void => {
	const existing = classes.get(class_name);
	if (existing) {
		existing.push(location);
	} else {
		classes.set(class_name, [location]);
	}
};

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

export interface CollectCssClassesOptions {
	/**
	 * File path used to determine extraction method (Svelte vs TS).
	 */
	filename?: string;
}

/**
 * Returns a Set of CSS classes from a string of HTML/Svelte/JS/TS content.
 * Uses AST parsing for accurate extraction of:
 * - `class="..."` string attributes
 * - `class={{...}}` object attributes (Svelte 5.16+)
 * - `class={[...]}` array attributes (Svelte 5.16+)
 * - `class:name` directives
 * - `clsx()`, `cn()`, `classNames()` calls
 * - Variables with class-like names
 */
export const collect_css_classes = (
	contents: string,
	options: CollectCssClassesOptions = {},
): Set<string> => {
	return extract_css_classes(contents, options.filename);
};

/**
 * Returns full extraction result with class locations and diagnostics.
 * Uses AST parsing for accurate extraction.
 */
export const collect_css_classes_with_locations = (
	contents: string,
	options: CollectCssClassesOptions = {},
): ExtractionResult => {
	return extract_css_classes_with_locations(contents, options.filename);
};

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

export type CssClassDeclaration =
	| CssClassDeclarationItem
	| CssClassDeclarationGroup
	| CssClassDeclarationInterpreter;

export interface CssClassDeclarationBase {
	comment?: string;
}

export interface CssClassDeclarationItem extends CssClassDeclarationBase {
	declaration: string;
}
export interface CssClassDeclarationGroup extends CssClassDeclarationBase {
	ruleset: string;
}
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
export const to_generation_diagnostic = (
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

/**
 * Context passed to CSS class interpreters.
 * Provides access to logging, diagnostics collection, and the class registry.
 */
export interface InterpreterContext {
	/** Optional logger for warnings/errors */
	log?: Logger;
	/** Diagnostics array to collect warnings and errors */
	diagnostics: Array<CssClassDiagnostic>;
	/** All known CSS class declarations (token + composite classes) */
	classes: Record<string, CssClassDeclaration | undefined>;
}

export interface CssClassDeclarationInterpreter extends CssClassDeclarationBase {
	pattern: RegExp;
	interpret: (matched: RegExpMatchArray, ctx: InterpreterContext) => string | null;
}

/**
 * Result from CSS class generation.
 */
export interface GenerateClassesCssResult {
	css: string;
	diagnostics: Array<GenerationDiagnostic>;
}

export const generate_classes_css = (
	classes: Iterable<string>,
	classes_by_name: Record<string, CssClassDeclaration | undefined>,
	interpreters: Array<CssClassDeclarationInterpreter>,
	log?: Logger,
	class_locations?: Map<string, Array<SourceLocation> | null>,
): GenerateClassesCssResult => {
	const interpreter_diagnostics: Array<CssClassDiagnostic> = [];
	const diagnostics: Array<GenerationDiagnostic> = [];

	// Create interpreter context with access to all classes
	const ctx: InterpreterContext = {
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
			diagnostics.push(to_generation_diagnostic(diag, locations));
		}

		if (!v) {
			continue;
		}

		const {comment} = v;

		if (comment) {
			const trimmed = comment.trim();
			if (trimmed.includes('\n')) {
				// Multi-line CSS comment
				const lines = trimmed.split('\n').map((line) => ` * ${line.trim()}`);
				css += `/*\n${lines.join('\n')}\n */\n`;
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
