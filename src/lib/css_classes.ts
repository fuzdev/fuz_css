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
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
export class CssClasses {
	include_classes: Set<string> | null;

	#all: Set<string> = new Set();

	#all_with_locations: Map<string, Array<SourceLocation>> = new Map();

	/** Combined map with include_classes (null locations) and extracted classes (actual locations) */
	#all_with_locations_including_includes: Map<string, Array<SourceLocation> | null> = new Map();

	/** Classes by file id (files with no classes are not stored) */
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
	 * @param classes - Map of class names to their source locations, or null if none
	 * @param diagnostics - Extraction diagnostics from this file, or null if none
	 */
	add(
		id: string,
		classes: Map<string, Array<SourceLocation>> | null,
		diagnostics?: Array<ExtractionDiagnostic> | null,
	): void {
		this.#dirty = true;
		if (classes) {
			this.#by_id.set(id, classes);
		} else {
			this.#by_id.delete(id);
		}
		if (diagnostics) {
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
		return this.#all_with_locations_including_includes;
	}

	/**
	 * Gets all classes and their locations in a single call.
	 * More efficient than calling `get()` and `get_with_locations()` separately
	 * when both are needed (avoids potential double recalculation).
	 */
	get_all(): {
		all_classes: Set<string>;
		all_classes_with_locations: Map<string, Array<SourceLocation> | null>;
	} {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		return {
			all_classes: this.#all,
			all_classes_with_locations: this.#all_with_locations_including_includes,
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

		if (this.include_classes) {
			for (const c of this.include_classes) {
				this.#all.add(c);
				this.#all_with_locations_including_includes.set(c, null);
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
				// Add to combined map only if not already from include_classes
				if (!this.#all_with_locations_including_includes.has(cls)) {
					this.#all_with_locations_including_includes.set(cls, this.#all_with_locations.get(cls)!);
				}
			}
		}
	}
}
