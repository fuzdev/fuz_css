/**
 * Cache-aware single-file class extraction shared by the Gro generator and the
 * Vite plugin. Returns extraction sourced from cache when the content hash
 * matches, else freshly parsed, plus the cache path to write on a miss.
 *
 * Callers own everything around this — in-memory hash short-circuits, the Vite
 * deletion-race guard, diagnostic logging, stats counting, and how/when to
 * write the cache (fire-and-forget vs. batched).
 *
 * @module
 */

import {
	extract_css_classes_with_locations,
	type ExtractionData,
	type AcornPlugin,
} from './css_class_extractor.js';
import {load_cached_extraction, from_cached_extraction} from './css_cache.js';
import type {CacheDeps} from './deps.js';

export interface ExtractFileCachedOptions {
	deps: CacheDeps;
	/** Source file contents. */
	content: string;
	/** Content hash to validate the cache against. */
	content_hash: string;
	/** Cache file path, or null to skip the cache (CI or caching disabled). */
	cache_path: string | null;
	/** File path, for parser selection and diagnostic locations. */
	filename: string;
	acorn_plugins?: Array<AcornPlugin>;
}

export interface ExtractFileCachedResult {
	extraction: ExtractionData;
	/** Whether the extraction came from cache. */
	from_cache: boolean;
	/** Cache file to write (miss with caching enabled), or null. */
	cache_path_to_write: string | null;
}

/**
 * Loads the cached extraction when its content hash matches, otherwise extracts
 * fresh. On a miss with caching enabled, `cache_path_to_write` carries the path
 * the caller should write.
 */
export const extract_file_cached = async (
	options: ExtractFileCachedOptions,
): Promise<ExtractFileCachedResult> => {
	const {deps, content, content_hash, cache_path, filename, acorn_plugins} = options;

	if (cache_path) {
		const cached = await load_cached_extraction(deps, cache_path);
		if (cached?.content_hash === content_hash) {
			return {
				extraction: from_cached_extraction(cached),
				from_cache: true,
				cache_path_to_write: null,
			};
		}
	}

	const extraction = extract_css_classes_with_locations(content, {filename, acorn_plugins});
	return {extraction, from_cache: false, cache_path_to_write: cache_path};
};
