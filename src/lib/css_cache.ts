/**
 * Cache infrastructure for incremental CSS class extraction.
 *
 * Provides per-file caching with content hash validation to avoid
 * re-extracting classes from unchanged files.
 *
 * @module
 */

import {join} from 'node:path';
import {hash_insecure} from '@fuzdev/fuz_util/hash.js';

import type {SourceLocation, ExtractionDiagnostic} from './diagnostics.js';
import type {CacheOperations} from './operations.js';

/**
 * Default cache directory relative to project root.
 */
export const DEFAULT_CACHE_DIR = '.fuz/cache/css';

/**
 * CSS cache version. Bump when any of these change:
 * - `CachedExtraction` schema
 * - `extract_css_classes_with_locations()` logic or output
 * - `ExtractionDiagnostic` or `SourceLocation` structure
 *
 * v1: Initial version with classes and diagnostics
 * v2: Use null instead of empty arrays, add explicit_classes, elements, css_variables
 * v3: Add explicit_elements, explicit_variables for @fuz-elements/@fuz-variables comments
 * v4: Filter incomplete CSS variables in dynamic templates (e.g., `var(--prefix_{expr})`)
 */
export const CSS_CACHE_VERSION = 4;

/**
 * Cached extraction result for a single file.
 * Uses `null` instead of empty arrays to avoid allocation overhead.
 */
export interface CachedExtraction {
	/** Cache version - invalidates cache when bumped */
	v: number;
	/** SHA-256 hash of the source file contents */
	content_hash: string;
	/** Classes as [name, locations] tuples, or null if none */
	classes: Array<[string, Array<SourceLocation>]> | null;
	/** Classes from @fuz-classes comments, or null if none */
	explicit_classes: Array<string> | null;
	/** Extraction diagnostics, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
	/** HTML elements found in the file, or null if none */
	elements: Array<string> | null;
	/** CSS variables referenced (without -- prefix), or null if none */
	css_variables: Array<string> | null;
	/** Elements from @fuz-elements comments, or null if none */
	explicit_elements: Array<string> | null;
	/** CSS variables from @fuz-variables comments (without -- prefix), or null if none */
	explicit_variables: Array<string> | null;
}

/**
 * Computes the cache file path for a source file.
 * Cache structure mirrors source tree: `src/lib/Foo.svelte` → `.fuz/cache/css/src/lib/Foo.svelte.json`
 *
 * @param source_path - Absolute path to the source file
 * @param cache_dir - Absolute path to the cache directory
 * @param project_root - Normalized project root (must end with `/`)
 */
export const get_cache_path = (
	source_path: string,
	cache_dir: string,
	project_root: string,
): string => {
	if (!source_path.startsWith(project_root)) {
		throw new Error(`Source path "${source_path}" is not under project root "${project_root}"`);
	}
	const relative = source_path.slice(project_root.length);
	return join(cache_dir, relative + '.json');
};

/**
 * Computes cache path for a file, handling both internal and external paths.
 * Internal files use relative paths mirroring source tree.
 * External files (outside project root) use hashed absolute paths in `_external/`.
 *
 * @param file_id - Absolute path to the source file
 * @param cache_dir - Absolute path to the cache directory
 * @param project_root - Normalized project root (must end with `/`)
 */
export const get_file_cache_path = (
	file_id: string,
	cache_dir: string,
	project_root: string,
): string => {
	const is_internal = file_id.startsWith(project_root);
	return is_internal
		? get_cache_path(file_id, cache_dir, project_root)
		: join(cache_dir, '_external', hash_insecure(file_id).slice(0, 16) + '.json');
};

/**
 * Loads a cached extraction result from disk.
 * Returns `null` if the cache is missing, corrupted, or has a version mismatch.
 * This makes the cache self-healing: any error triggers re-extraction.
 *
 * @param ops - Filesystem operations for dependency injection
 * @param cache_path - Absolute path to the cache file
 */
export const load_cached_extraction = async (
	ops: CacheOperations,
	cache_path: string,
): Promise<CachedExtraction | null> => {
	try {
		const content = await ops.read_text({path: cache_path});
		if (!content) return null;

		const cached = JSON.parse(content) as CachedExtraction;

		// Invalidate if version mismatch
		if (cached.v !== CSS_CACHE_VERSION) {
			return null;
		}

		return cached;
	} catch {
		// Handles: invalid JSON, truncated file
		// All cases: return null to trigger re-extraction (self-healing)
		return null;
	}
};

/**
 * Saves an extraction result to the cache.
 * Uses atomic write (temp file + rename) for crash safety.
 * Converts empty arrays to null to avoid allocation overhead on load.
 *
 * @param ops - Filesystem operations for dependency injection
 * @param cache_path - Absolute path to the cache file
 * @param content_hash - SHA-256 hash of the source file contents
 * @param classes - Extracted classes with their locations, or null if none
 * @param explicit_classes - Classes from @fuz-classes comments, or null if none
 * @param diagnostics - Extraction diagnostics, or null if none
 * @param elements - HTML elements found in the file, or null if none
 * @param css_variables - CSS variables referenced (without -- prefix), or null if none
 * @param explicit_elements - Elements from @fuz-elements comments, or null if none
 * @param explicit_variables - CSS variables from @fuz-variables comments (without -- prefix), or null if none
 */
export const save_cached_extraction = async (
	ops: CacheOperations,
	cache_path: string,
	content_hash: string,
	classes: Map<string, Array<SourceLocation>> | null,
	explicit_classes: Set<string> | null,
	diagnostics: Array<ExtractionDiagnostic> | null,
	elements: Set<string> | null,
	css_variables: Set<string> | null,
	explicit_elements: Set<string> | null,
	explicit_variables: Set<string> | null,
): Promise<void> => {
	// Convert to null if empty to save allocation on load
	const classes_array = classes && classes.size > 0 ? Array.from(classes.entries()) : null;
	const explicit_array =
		explicit_classes && explicit_classes.size > 0 ? Array.from(explicit_classes) : null;
	const diagnostics_array = diagnostics && diagnostics.length > 0 ? diagnostics : null;
	const elements_array = elements && elements.size > 0 ? Array.from(elements) : null;
	const css_variables_array =
		css_variables && css_variables.size > 0 ? Array.from(css_variables) : null;
	const explicit_elements_array =
		explicit_elements && explicit_elements.size > 0 ? Array.from(explicit_elements) : null;
	const explicit_variables_array =
		explicit_variables && explicit_variables.size > 0 ? Array.from(explicit_variables) : null;

	const data: CachedExtraction = {
		v: CSS_CACHE_VERSION,
		content_hash,
		classes: classes_array,
		explicit_classes: explicit_array,
		diagnostics: diagnostics_array,
		elements: elements_array,
		css_variables: css_variables_array,
		explicit_elements: explicit_elements_array,
		explicit_variables: explicit_variables_array,
	};

	await ops.write_text_atomic({path: cache_path, content: JSON.stringify(data)});
};

/**
 * Deletes a cached extraction file.
 * Silently succeeds if the file doesn't exist.
 *
 * @param ops - Filesystem operations for dependency injection
 * @param cache_path - Absolute path to the cache file
 */
export const delete_cached_extraction = async (
	ops: CacheOperations,
	cache_path: string,
): Promise<void> => {
	await ops.unlink({path: cache_path});
};

/**
 * Converts a cached extraction back to the runtime format.
 * Preserves null semantics (null = empty).
 *
 * @param cached - Cached extraction data
 */
export const from_cached_extraction = (
	cached: CachedExtraction,
): {
	classes: Map<string, Array<SourceLocation>> | null;
	explicit_classes: Set<string> | null;
	diagnostics: Array<ExtractionDiagnostic> | null;
	elements: Set<string> | null;
	css_variables: Set<string> | null;
	explicit_elements: Set<string> | null;
	explicit_variables: Set<string> | null;
} => ({
	classes: cached.classes ? new Map(cached.classes) : null,
	explicit_classes: cached.explicit_classes ? new Set(cached.explicit_classes) : null,
	diagnostics: cached.diagnostics,
	elements: cached.elements ? new Set(cached.elements) : null,
	css_variables: cached.css_variables ? new Set(cached.css_variables) : null,
	explicit_elements: cached.explicit_elements ? new Set(cached.explicit_elements) : null,
	explicit_variables: cached.explicit_variables ? new Set(cached.explicit_variables) : null,
});
