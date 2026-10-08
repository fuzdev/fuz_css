/**
 * Cache infrastructure for incremental CSS class extraction.
 *
 * Provides per-file caching with content hash validation to avoid
 * re-extracting classes from unchanged files.
 *
 * @module
 */

import { join } from 'node:path';
import { hash_insecure } from '@fuzdev/fuz_util/hash.ts';

import type { SourceLocation, ExtractionDiagnostic } from './diagnostics.ts';
import type { AcornPlugin, ExtractionData } from './css_class_extractor.ts';
import type { CacheDeps } from './deps.ts';

/**
 * Default cache directory relative to project root.
 */
export const DEFAULT_CACHE_DIR = '.fuz/cache/css';

/**
 * Whether this is a CI run (`CI=1`, `CI=true`, or another truthy value):
 * there's no point writing a cache the next run won't reuse.
 *
 * @internal Read by the generators for their cache and `on_error` defaults.
 */
export const is_ci = !!process.env.CI;

/**
 * Creates the cache-path lookup the generators share: a file's cache path
 * under `cache_dir` in `project_root`, or `null` on CI, where nothing is
 * cached.
 *
 * @param cache_dir - the cache directory, relative to `project_root`
 * @param project_root - the project root, with or without a trailing slash
 * @returns a function from a file's absolute path to its cache path, or `null` when uncached
 *
 * @internal Shared by the Vite plugin and the Gro generator.
 */
export const create_cache_path_resolver = (
	cache_dir: string,
	project_root: string
): ((file_id: string) => string | null) => {
	const root = project_root.endsWith('/') ? project_root : project_root + '/';
	const resolved_cache_dir = join(root, cache_dir);
	return (file_id) => (is_ci ? null : get_file_cache_path(file_id, resolved_cache_dir, root));
};

/**
 * CSS cache version. Bump when any of these change:
 * - `CachedExtraction` schema
 * - `extract_css_classes_with_locations()` logic or output
 * - `ExtractionDiagnostic` or `SourceLocation` structure
 *
 * v1: Initial version with classes and diagnostics
 * v2: Use null instead of empty arrays, add `explicit_classes`, `elements`, `css_variables`.
 * v3: Add `explicit_elements`, `explicit_variables` for `@fuz-elements`/`@fuz-variables` comments.
 * v4: Filter incomplete CSS variables in dynamic templates (e.g., `var(--prefix_{expr})`).
 * v5: Remove `css_variables` and `explicit_variables` (now detected via simple regex scan).
 * v6: Re-add `explicit_variables` for `@fuz-variables` comments (regex scan misses dynamic templates).
 * v7: Add `extraction_key`, so a change to `acorn_plugins` or `cache_salt` misses.
 */
export const CSS_CACHE_VERSION = 7;

/**
 * Computes the part of the cache key that comes from configuration rather
 * than file content: a fingerprint of the configured acorn plugins (their
 * source text) and the consumer's `cache_salt`, or `null` when neither is
 * set. A plugin's options live in its closure, where the source text can't
 * see them, so a consumer who changes only a plugin's options bumps
 * `cache_salt`.
 *
 * @param acorn_plugins - the extraction's acorn plugins, if any
 * @param cache_salt - a consumer string folded into the key, if any
 * @returns the key, or `null` for the default configuration
 *
 * @internal Shared by the Vite plugin and the Gro generator.
 */
export const to_extraction_cache_key = (
	acorn_plugins: Array<AcornPlugin> | undefined,
	cache_salt: string | undefined
): string | null => {
	const parts = (acorn_plugins ?? []).map((plugin) => 'plugin:' + plugin.toString());
	if (cache_salt) parts.push('salt:' + cache_salt);
	return parts.length ? hash_insecure(parts.join('\0')) : null;
};

/**
 * Cached extraction result for a single file.
 * Uses `null` instead of empty arrays to avoid allocation overhead.
 */
export interface CachedExtraction {
	/** Cache version - invalidates cache when bumped */
	v: number;
	/** Content hash of the source file (BLAKE3 via `hash_blake3`) */
	content_hash: string;
	/** The configuration part of the key (`to_extraction_cache_key`), or null for the default */
	extraction_key: string | null;
	/** Classes as [name, locations] tuples, or null if none */
	classes: Array<[string, Array<SourceLocation>]> | null;
	/** Classes from `@fuz-classes` comments, or null if none */
	explicit_classes: Array<string> | null;
	/** Extraction diagnostics, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
	/** HTML elements found in the file, or null if none */
	elements: Array<string> | null;
	/** Elements from `@fuz-elements` comments, or null if none */
	explicit_elements: Array<string> | null;
	/** Variables from `@fuz-variables` comments, or null if none */
	explicit_variables: Array<string> | null;
}

/**
 * Computes the cache file path for a source file.
 * Cache structure mirrors source tree: `src/lib/Foo.svelte` → `.fuz/cache/css/src/lib/Foo.svelte.json`
 *
 * @param source_path - absolute path to the source file
 * @param cache_dir - absolute path to the cache directory
 * @param project_root - normalized project root (must end with `/`)
 * @internal The inside-the-root case of `get_file_cache_path`.
 */
export const get_cache_path = (
	source_path: string,
	cache_dir: string,
	project_root: string
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
 * @param file_id - absolute path to the source file
 * @param cache_dir - absolute path to the cache directory
 * @param project_root - normalized project root (must end with `/`)
 */
export const get_file_cache_path = (
	file_id: string,
	cache_dir: string,
	project_root: string
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
 * @param deps - filesystem deps for dependency injection
 * @param cache_path - absolute path to the cache file
 */
export const load_cached_extraction = async (
	deps: CacheDeps,
	cache_path: string
): Promise<CachedExtraction | null> => {
	try {
		const r = await deps.read_text({ path: cache_path });
		if (!r.ok) return null;

		const cached = JSON.parse(r.value) as CachedExtraction;

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
 * Normalizes empty collections to null to avoid allocation overhead on load.
 *
 * @param deps - filesystem deps for dependency injection
 * @param cache_path - absolute path to the cache file
 * @param content_hash - content hash of the source file contents
 * @param extraction_key - the configuration part of the key, from `to_extraction_cache_key`
 * @param extraction - extraction data to cache
 */
export const save_cached_extraction = async (
	deps: CacheDeps,
	cache_path: string,
	content_hash: string,
	extraction_key: string | null,
	extraction: ExtractionData
): Promise<void> => {
	// Convert to null if empty to save allocation on load
	const classes_array =
		extraction.classes && extraction.classes.size > 0
			? Array.from(extraction.classes.entries())
			: null;
	const explicit_array =
		extraction.explicit_classes && extraction.explicit_classes.size > 0
			? Array.from(extraction.explicit_classes)
			: null;
	const diagnostics_array =
		extraction.diagnostics && extraction.diagnostics.length > 0 ? extraction.diagnostics : null;
	const elements_array =
		extraction.elements && extraction.elements.size > 0 ? Array.from(extraction.elements) : null;
	const explicit_elements_array =
		extraction.explicit_elements && extraction.explicit_elements.size > 0
			? Array.from(extraction.explicit_elements)
			: null;
	const explicit_variables_array =
		extraction.explicit_variables && extraction.explicit_variables.size > 0
			? Array.from(extraction.explicit_variables)
			: null;

	const data: CachedExtraction = {
		v: CSS_CACHE_VERSION,
		content_hash,
		extraction_key,
		classes: classes_array,
		explicit_classes: explicit_array,
		diagnostics: diagnostics_array,
		elements: elements_array,
		explicit_elements: explicit_elements_array,
		explicit_variables: explicit_variables_array
	};

	await deps.write_text_atomic({ path: cache_path, content: JSON.stringify(data) });
};

/**
 * Deletes a cached extraction file. Best-effort: every `unlink` error is
 * swallowed, not just `not_found` - the cache is disposable and callers
 * delete fire-and-forget.
 *
 * @param deps - filesystem deps for dependency injection
 * @param cache_path - absolute path to the cache file
 */
export const delete_cached_extraction = async (
	deps: CacheDeps,
	cache_path: string
): Promise<void> => {
	await deps.unlink({ path: cache_path });
};

/**
 * Converts a cached extraction back to the runtime format.
 * Preserves null semantics (null = empty).
 *
 * @param cached - cached extraction data
 */
export const from_cached_extraction = (cached: CachedExtraction): ExtractionData => ({
	classes: cached.classes ? new Map(cached.classes) : null,
	explicit_classes: cached.explicit_classes ? new Set(cached.explicit_classes) : null,
	diagnostics: cached.diagnostics,
	elements: cached.elements ? new Set(cached.elements) : null,
	explicit_elements: cached.explicit_elements ? new Set(cached.explicit_elements) : null,
	explicit_variables: cached.explicit_variables ? new Set(cached.explicit_variables) : null
});
