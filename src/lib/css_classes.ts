/**
 * Collection management for extracted CSS classes.
 *
 * Tracks classes per-file for efficient incremental updates during watch mode.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 *
 * @internal
 *
 * @module
 */

import type { SourceLocation, ExtractionDiagnostic } from './diagnostics.ts';
import type { ExtractionData } from './css_class_extractor.ts';

/**
 * Collection of CSS classes extracted from source files.
 * Tracks classes per-file for efficient incremental updates, and explicit
 * class tracking. The `additional_classes` and `exclude_classes` options
 * apply later, in `generate_css`.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
export class CssClasses {
	#all: Set<string> = new Set();

	#all_with_locations: Map<string, Array<SourceLocation>> = new Map();

	/** Classes by file id (files with no classes are not stored) */
	#by_id: Map<string, Map<string, Array<SourceLocation>>> = new Map();

	/** Explicit classes (from `@fuz-classes`) by file id */
	#explicit_by_id: Map<string, Set<string>> = new Map();

	/** Aggregated explicit classes (from `@fuz-classes`) */
	#explicit: Set<string> | null = null;

	/** Diagnostics stored per-file so they're replaced when a file is updated */
	#diagnostics_by_id: Map<string, Array<ExtractionDiagnostic>> = new Map();

	/** HTML elements by file id */
	#elements_by_id: Map<string, Set<string>> = new Map();

	/** Aggregated elements */
	#all_elements: Set<string> = new Set();

	/** Explicit elements (from `@fuz-elements`) by file id */
	#explicit_elements_by_id: Map<string, Set<string>> = new Map();

	/** Aggregated explicit elements */
	#explicit_elements: Set<string> | null = null;

	/** Explicit variables (from `@fuz-variables`) by file id */
	#explicit_variables_by_id: Map<string, Set<string>> = new Map();

	/** Aggregated explicit variables */
	#explicit_variables: Set<string> | null = null;

	#dirty = true;

	/**
	 * Adds extraction results for a file.
	 * Replaces any previous classes and diagnostics for this file.
	 *
	 * @param id - file identifier
	 * @param data - extraction data fields to store for this file
	 */
	add(id: string, data: ExtractionData): void {
		this.#dirty = true;
		if (data.classes) {
			this.#by_id.set(id, data.classes);
		} else {
			this.#by_id.delete(id);
		}
		if (data.explicit_classes) {
			this.#explicit_by_id.set(id, data.explicit_classes);
		} else {
			this.#explicit_by_id.delete(id);
		}
		if (data.diagnostics) {
			this.#diagnostics_by_id.set(id, data.diagnostics);
		} else {
			// Clear any old diagnostics for this file
			this.#diagnostics_by_id.delete(id);
		}
		if (data.elements) {
			this.#elements_by_id.set(id, data.elements);
		} else {
			this.#elements_by_id.delete(id);
		}
		if (data.explicit_elements) {
			this.#explicit_elements_by_id.set(id, data.explicit_elements);
		} else {
			this.#explicit_elements_by_id.delete(id);
		}
		if (data.explicit_variables) {
			this.#explicit_variables_by_id.set(id, data.explicit_variables);
		} else {
			this.#explicit_variables_by_id.delete(id);
		}
	}

	delete(id: string): void {
		this.#dirty = true;
		this.#by_id.delete(id);
		this.#explicit_by_id.delete(id);
		this.#diagnostics_by_id.delete(id);
		this.#elements_by_id.delete(id);
		this.#explicit_elements_by_id.delete(id);
		this.#explicit_variables_by_id.delete(id);
	}

	/**
	 * Creates a collection holding only the given files' extractions - what
	 * one set of modules extracted, like the modules of one build environment.
	 *
	 * @param ids - the files to keep; ids with no extraction are skipped
	 * @returns a new collection sharing the per-file data, which `add` replaces rather than mutates
	 */
	subset(ids: Iterable<string>): CssClasses {
		const result = new CssClasses();
		const copy = <T>(from: Map<string, T>, to: Map<string, T>, id: string): void => {
			const value = from.get(id);
			if (value !== undefined) to.set(id, value);
		};
		for (const id of ids) {
			copy(this.#by_id, result.#by_id, id);
			copy(this.#explicit_by_id, result.#explicit_by_id, id);
			copy(this.#diagnostics_by_id, result.#diagnostics_by_id, id);
			copy(this.#elements_by_id, result.#elements_by_id, id);
			copy(this.#explicit_elements_by_id, result.#explicit_elements_by_id, id);
			copy(this.#explicit_variables_by_id, result.#explicit_variables_by_id, id);
		}
		return result;
	}

	/**
	 * Gets all classes, their locations, and the elements and variables, in a
	 * single call - the extraction inputs `generate_css` takes.
	 *
	 * The collections returned are the instance's own, not copies: the next
	 * call after an `add` or `delete` clears and refills the same `all_classes`,
	 * `all_classes_with_locations`, and `all_elements` (and replaces the
	 * explicit sets). Read them before changing the collection again - a render
	 * is synchronous and done with them before the next extraction lands -
	 * rather than holding them across a change.
	 */
	get_all(): {
		all_classes: Set<string>;
		all_classes_with_locations: Map<string, Array<SourceLocation>>;
		explicit_classes: Set<string> | null;
		all_elements: Set<string>;
		explicit_elements: Set<string> | null;
		explicit_variables: Set<string> | null;
	} {
		this.#ensure_fresh();
		return {
			all_classes: this.#all,
			all_classes_with_locations: this.#all_with_locations,
			explicit_classes: this.#explicit,
			all_elements: this.#all_elements,
			explicit_elements: this.#explicit_elements,
			explicit_variables: this.#explicit_variables
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

	#ensure_fresh(): void {
		if (!this.#dirty) return;
		this.#dirty = false;
		this.#recalculate();
	}

	#recalculate(): void {
		this.#all.clear();
		this.#all_with_locations.clear();
		this.#explicit = null;
		this.#all_elements.clear();
		this.#explicit_elements = null;
		this.#explicit_variables = null;

		// Aggregate from all files
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

		// Aggregate explicit classes from all files
		for (const explicit of this.#explicit_by_id.values()) {
			for (const cls of explicit) {
				(this.#explicit ??= new Set()).add(cls);
			}
		}

		// Aggregate elements from all files
		for (const elements of this.#elements_by_id.values()) {
			for (const element of elements) {
				this.#all_elements.add(element);
			}
		}

		// Aggregate explicit elements from all files
		for (const explicit_elements of this.#explicit_elements_by_id.values()) {
			for (const element of explicit_elements) {
				(this.#explicit_elements ??= new Set()).add(element);
			}
		}

		// Aggregate explicit variables from all files
		for (const explicit_variables of this.#explicit_variables_by_id.values()) {
			for (const variable of explicit_variables) {
				(this.#explicit_variables ??= new Set()).add(variable);
			}
		}
	}
}
