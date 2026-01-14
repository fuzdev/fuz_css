/**
 * Cache infrastructure for incremental CSS class extraction.
 *
 * Provides per-file caching with content hash validation to avoid
 * re-extracting classes from unchanged files.
 *
 * @module
 */

import {mkdir, readFile, writeFile, unlink, rename} from 'node:fs/promises';
import {dirname, join} from 'node:path';

import type {SourceLocation, ExtractionDiagnostic} from './diagnostics.js';

/**
 * Computes SHA-256 hash of content using Web Crypto API.
 */
export const compute_hash = async (content: string): Promise<string> => {
	const encoder = new TextEncoder();
	const buffer = encoder.encode(content);
	const digested = await crypto.subtle.digest('SHA-256', buffer);
	const bytes = Array.from(new Uint8Array(digested));
	let hex = '';
	for (const h of bytes) {
		hex += h.toString(16).padStart(2, '0');
	}
	return hex;
};

/**
 * Default cache directory relative to project root.
 */
export const DEFAULT_CACHE_DIR = '.fuz/cache/css';

/**
 * Cache version. Bump when any of these change:
 * - `CachedExtraction` schema
 * - `extract_css_classes_with_locations()` logic or output
 * - `ExtractionDiagnostic` or `SourceLocation` structure
 *
 * v2: Use null instead of empty arrays for classes/diagnostics
 */
const CACHE_VERSION = 2;

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
	/** Extraction diagnostics, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
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
 * Loads a cached extraction result from disk.
 * Returns `null` if the cache is missing, corrupted, or has a version mismatch.
 * This makes the cache self-healing: any error triggers re-extraction.
 *
 * @param cache_path - Absolute path to the cache file
 */
export const load_cached_extraction = async (
	cache_path: string,
): Promise<CachedExtraction | null> => {
	try {
		const content = await readFile(cache_path, 'utf8');
		const cached = JSON.parse(content) as CachedExtraction;

		// Invalidate if version mismatch
		if (cached.v !== CACHE_VERSION) {
			return null;
		}

		return cached;
	} catch {
		// Handles: file not found, invalid JSON, truncated file, permission errors
		// All cases: return null to trigger re-extraction (self-healing)
		return null;
	}
};

/**
 * Saves an extraction result to the cache.
 * Uses atomic write (temp file + rename) for crash safety.
 * Converts empty arrays to null to avoid allocation overhead on load.
 *
 * @param cache_path - Absolute path to the cache file
 * @param content_hash - SHA-256 hash of the source file contents
 * @param classes - Extracted classes with their locations, or null if none
 * @param diagnostics - Extraction diagnostics, or null if none
 */
export const save_cached_extraction = async (
	cache_path: string,
	content_hash: string,
	classes: Map<string, Array<SourceLocation>> | null,
	diagnostics: Array<ExtractionDiagnostic> | null,
): Promise<void> => {
	// Convert to null if empty to save allocation on load
	const classes_array = classes && classes.size > 0 ? Array.from(classes.entries()) : null;
	const diagnostics_array = diagnostics && diagnostics.length > 0 ? diagnostics : null;

	const data: CachedExtraction = {
		v: CACHE_VERSION,
		content_hash,
		classes: classes_array,
		diagnostics: diagnostics_array,
	};

	// Atomic write: temp file + rename
	// Include pid + timestamp to avoid conflicts with concurrent writes
	await mkdir(dirname(cache_path), {recursive: true});
	const temp_path = cache_path + '.tmp.' + process.pid + '.' + Date.now();
	await writeFile(temp_path, JSON.stringify(data));
	await rename(temp_path, cache_path);
};

/**
 * Deletes a cached extraction file.
 * Silently succeeds if the file doesn't exist.
 *
 * @param cache_path - Absolute path to the cache file
 */
export const delete_cached_extraction = async (cache_path: string): Promise<void> => {
	await unlink(cache_path).catch(() => {
		// Ignore if already gone
	});
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
	diagnostics: Array<ExtractionDiagnostic> | null;
} => ({
	classes: cached.classes ? new Map(cached.classes) : null,
	diagnostics: cached.diagnostics,
});
