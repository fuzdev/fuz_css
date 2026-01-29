/**
 * Collection management for extracted CSS classes.
 *
 * Tracks classes per-file for efficient incremental updates during watch mode.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 *
 * @module
 */

import type {SourceLocation, ExtractionDiagnostic} from './diagnostics.js';

/**
 * Collection of CSS classes extracted from source files.
 * Tracks classes per-file for efficient incremental updates.
 * Handles include/exclude filtering and explicit class tracking.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
export class CssClasses {
	#include_classes: Set<string> | null;
	#exclude_classes: Set<string> | null;

	#all: Set<string> = new Set();

	#all_with_locations: Map<string, Array<SourceLocation>> = new Map();

	/** Combined map with include_classes (null locations) and extracted classes (actual locations) */
	#all_with_locations_including_includes: Map<string, Array<SourceLocation> | null> = new Map();

	/** Classes by file id (files with no classes are not stored) */
	#by_id: Map<string, Map<string, Array<SourceLocation>>> = new Map();

	/** Explicit classes (from @fuz-classes) by file id */
	#explicit_by_id: Map<string, Set<string>> = new Map();

	/** Aggregated explicit classes (from extraction + include_classes, minus exclude_classes) */
	#explicit: Set<string> | null = null;

	/** Diagnostics stored per-file so they're replaced when a file is updated */
	#diagnostics_by_id: Map<string, Array<ExtractionDiagnostic>> = new Map();

	/** HTML elements by file id */
	#elements_by_id: Map<string, Set<string>> = new Map();

	/** CSS variables by file id */
	#css_variables_by_id: Map<string, Set<string>> = new Map();

	/** Aggregated elements */
	#all_elements: Set<string> = new Set();

	/** Aggregated CSS variables */
	#all_css_variables: Set<string> = new Set();

	#dirty = true;

	/**
	 * Creates a new CssClasses collection.
	 *
	 * @param include_classes - Classes to always include (also treated as explicit for warnings)
	 * @param exclude_classes - Classes to exclude from output (also suppresses warnings)
	 */
	constructor(
		include_classes: Set<string> | null = null,
		exclude_classes: Set<string> | null = null,
	) {
		this.#include_classes = include_classes;
		this.#exclude_classes = exclude_classes;
	}

	/**
	 * Adds extraction results for a file.
	 * Replaces any previous classes and diagnostics for this file.
	 *
	 * @param id - File identifier
	 * @param classes - Map of class names to their source locations, or null if none
	 * @param explicit_classes - Classes from @fuz-classes comments, or null if none
	 * @param diagnostics - Extraction diagnostics from this file, or null if none
	 * @param elements - HTML elements found in the file, or null if none
	 * @param css_variables - CSS variables referenced (without -- prefix), or null if none
	 */
	add(
		id: string,
		classes: Map<string, Array<SourceLocation>> | null,
		explicit_classes?: Set<string> | null,
		diagnostics?: Array<ExtractionDiagnostic> | null,
		elements?: Set<string> | null,
		css_variables?: Set<string> | null,
	): void {
		this.#dirty = true;
		if (classes) {
			this.#by_id.set(id, classes);
		} else {
			this.#by_id.delete(id);
		}
		if (explicit_classes) {
			this.#explicit_by_id.set(id, explicit_classes);
		} else {
			this.#explicit_by_id.delete(id);
		}
		if (diagnostics) {
			this.#diagnostics_by_id.set(id, diagnostics);
		} else {
			// Clear any old diagnostics for this file
			this.#diagnostics_by_id.delete(id);
		}
		if (elements) {
			this.#elements_by_id.set(id, elements);
		} else {
			this.#elements_by_id.delete(id);
		}
		if (css_variables) {
			this.#css_variables_by_id.set(id, css_variables);
		} else {
			this.#css_variables_by_id.delete(id);
		}
	}

	delete(id: string): void {
		this.#dirty = true;
		this.#by_id.delete(id);
		this.#explicit_by_id.delete(id);
		this.#diagnostics_by_id.delete(id);
		this.#elements_by_id.delete(id);
		this.#css_variables_by_id.delete(id);
	}

	/**
	 * Gets all unique class names as a Set (with exclude filter applied).
	 */
	get(): Set<string> {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		return this.#all;
	}

	/**
	 * Gets all classes with their source locations (with exclude filter applied).
	 * Locations from include_classes are null.
	 */
	get_with_locations(): Map<string, Array<SourceLocation> | null> {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		return this.#all_with_locations_including_includes;
	}

	/**
	 * Gets all classes and their locations in a single call.
	 * More efficient than calling `get()` and `get_with_locations()` separately
	 * when both are needed (avoids potential double recalculation).
	 *
	 * Results have exclude filter applied and explicit_classes includes include_classes.
	 */
	get_all(): {
		all_classes: Set<string>;
		all_classes_with_locations: Map<string, Array<SourceLocation> | null>;
		explicit_classes: Set<string> | null;
		all_elements: Set<string>;
		all_css_variables: Set<string>;
	} {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		return {
			all_classes: this.#all,
			all_classes_with_locations: this.#all_with_locations_including_includes,
			explicit_classes: this.#explicit,
			all_elements: this.#all_elements,
			all_css_variables: this.#all_css_variables,
		};
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
		this.#all_with_locations_including_includes.clear();
		this.#explicit = null;
		this.#all_elements.clear();
		this.#all_css_variables.clear();

		const exclude = this.#exclude_classes;

		// Add include_classes first (with null locations - no source)
		if (this.#include_classes) {
			for (const c of this.#include_classes) {
				if (exclude?.has(c)) continue;
				this.#all.add(c);
				this.#all_with_locations_including_includes.set(c, null);
				// include_classes are also explicit (user explicitly wants them)
				(this.#explicit ??= new Set()).add(c);
			}
		}

		// Aggregate from all files
		for (const classes of this.#by_id.values()) {
			for (const [cls, locations] of classes) {
				if (exclude?.has(cls)) continue;
				this.#all.add(cls);
				const existing = this.#all_with_locations.get(cls);
				if (existing) {
					existing.push(...locations);
				} else {
					this.#all_with_locations.set(cls, [...locations]);
				}
				// Add to combined map only if not already from include_classes
				if (!this.#all_with_locations_including_includes.has(cls)) {
					this.#all_with_locations_including_includes.set(cls, this.#all_with_locations.get(cls)!);
				}
			}
		}

		// Aggregate explicit classes from all files (minus excludes)
		for (const explicit of this.#explicit_by_id.values()) {
			for (const cls of explicit) {
				if (exclude?.has(cls)) continue;
				(this.#explicit ??= new Set()).add(cls);
			}
		}

		// Aggregate elements from all files
		for (const elements of this.#elements_by_id.values()) {
			for (const element of elements) {
				this.#all_elements.add(element);
			}
		}

		// Aggregate CSS variables from all files
		for (const css_variables of this.#css_variables_by_id.values()) {
			for (const css_variable of css_variables) {
				this.#all_css_variables.add(css_variable);
			}
		}
	}
}
