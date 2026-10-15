/**
 * Cache infrastructure for incremental CSS class extraction.
 *
 * Provides per-file caching with content hash validation to avoid
 * re-extracting classes from unchanged files.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash_insecure } from '@fuzdev/fuz_util/hash.ts';
import { ensure_end } from '@fuzdev/fuz_util/string.ts';

import type { SourceLocation, ExtractionDiagnostic } from './diagnostics.ts';
import type { AcornPlugin, ExtractionData } from './css_class_extractor.ts';
import type { CacheDeps } from './deps.ts';

/**
 * Default cache directory relative to project root.
 */
export const DEFAULT_CACHE_DIR = '.fuz/cache/css';

/**
 * Parses a `CI` environment variable value. Any value is CI except unset,
 * empty, `false`, and `0` (case-insensitive, surrounding whitespace
 * ignored), so `CI=false` turns CI behavior off rather than on.
 *
 * @param value - the `CI` environment variable, if set
 * @returns whether the value marks a CI run
 */
export const parse_ci_value = (value: string | undefined): boolean => {
	if (value === undefined) return false;
	const normalized = value.trim().toLowerCase();
	return normalized !== '' && normalized !== 'false' && normalized !== '0';
};

/**
 * Whether this is a CI run, per `parse_ci_value` on `process.env.CI`:
 * there's no point writing a cache the next run won't reuse.
 *
 * @internal Read by the generator for its cache and `on_error` defaults.
 */
export const is_ci = parse_ci_value(process.env.CI);

/**
 * Creates the extraction cache-path lookup: a file's cache path
 * under `cache_dir` in `project_root`, or `null` on CI, where nothing is
 * cached.
 *
 * @param cache_dir - the cache directory, relative to `project_root`
 * @param project_root - the project root, with or without a trailing slash
 * @returns a function from a file's absolute path to its cache path, or `null` when uncached
 *
 * @internal Used by the Vite plugin.
 */
export const create_cache_path_resolver = (
	cache_dir: string,
	project_root: string
): ((file_id: string) => string | null) => {
	const root = ensure_end(project_root, '/');
	const resolved_cache_dir = join(root, cache_dir);
	return (file_id) => (is_ci ? null : get_file_cache_path(file_id, resolved_cache_dir, root));
};

/**
 * The packages whose versions decide what an extraction produces: fuz_css,
 * whose extractor and cache format they cover, and the parsers it runs.
 */
const EXTRACTION_PACKAGES = ['@fuzdev/fuz_css', 'svelte', 'acorn', '@sveltejs/acorn-typescript'];

/**
 * Reads a package's version from the nearest `package.json` named `name`
 * at or above `from`. A `package.json` with another name is passed over, so a
 * nested one (a `"type"` marker in a subdirectory) or a bundling consumer's
 * doesn't stand in for the package.
 *
 * @param name - the package name
 * @param from - the directory to start from
 * @returns the version, or `null` when no `package.json` above `from` names the package
 *
 * @internal Exported for testing.
 */
export const find_package_version = (name: string, from: string): string | null => {
	let dir = from;
	for (;;) {
		try {
			const package_json: unknown = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
			if (
				typeof package_json === 'object' &&
				package_json !== null &&
				'name' in package_json &&
				package_json.name === name &&
				'version' in package_json &&
				typeof package_json.version === 'string'
			) {
				return package_json.version;
			}
		} catch {
			// no readable package.json here, keep climbing
		}
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
};

/**
 * Where a package's version lookup starts: fuz_css's own module directory
 * for fuz_css, and a dependency's resolved entry point otherwise, resolved
 * from here so it's the copy the extractor imports.
 */
const to_package_dir = (name: string): string | null => {
	try {
		return name === '@fuzdev/fuz_css'
			? dirname(fileURLToPath(import.meta.url))
			: dirname(createRequire(import.meta.url).resolve(name));
	} catch {
		return null;
	}
};

let extraction_versions: Record<string, string> | null = null;

/**
 * Reads the installed versions of fuz_css and its parsers, once per
 * process. A version that can't be found reads as `'unknown'`, which still
 * keys the cache - it never fails generation.
 *
 * @returns the versions by package name
 *
 * @internal Read by the cache for `to_cache_version`.
 */
export const load_extraction_versions = (): Record<string, string> => {
	if (extraction_versions) return extraction_versions;
	const versions: Record<string, string> = {};
	for (const name of EXTRACTION_PACKAGES) {
		const dir = to_package_dir(name);
		versions[name] = (dir && find_package_version(name, dir)) ?? 'unknown';
	}
	return (extraction_versions = versions);
};

/**
 * Computes the cache version every entry is written with and checked
 * against: the versions of fuz_css and the parsers its extractor runs, so
 * an upgrade of any of them invalidates the cache with no manual bump. In a
 * checkout of fuz_css itself the version doesn't move between commits, so
 * clear `.fuz/cache/css` and each example's own `.fuz` directory (or set
 * `cache_salt`) after changing what extraction produces.
 *
 * @param versions - the versions by package name
 * @returns the version string, like `@fuzdev/fuz_css@1.2.3 svelte@5.0.0 ...`
 *
 * @internal Shared by the cache's load and save.
 */
export const to_cache_version = (
	versions: Record<string, string> = load_extraction_versions()
): string =>
	Object.entries(versions)
		.map(([name, version]) => `${name}@${version}`)
		.join(' ');

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
 * @internal Used by the Vite plugin.
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
	/** The `to_cache_version` the entry was written with - any other misses */
	v: string;
	/** Content hash of the source file */
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
 * Returns `null` if the cache is missing, corrupted, or was written by
 * other versions of fuz_css or its parsers (`to_cache_version`).
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
		if (cached.v !== to_cache_version()) {
			return null;
		}

		return cached;
	} catch {
		// Handles: invalid JSON, truncated file
		// All cases: return null to trigger re-extraction (self-healing)
		return null;
	}
};

export interface SaveCachedExtractionOptions {
	/** Absolute path to the cache file. */
	cache_path: string;
	/** Content hash of the source file contents. */
	content_hash: string;
	/** The configuration part of the key, from `to_extraction_cache_key`. */
	extraction_key: string | null;
	/** Extraction data to cache. */
	extraction: ExtractionData;
}

/**
 * Saves an extraction result to the cache.
 * Uses atomic write (temp file + rename) for crash safety.
 * Normalizes empty collections to null to avoid allocation overhead on load.
 *
 * @param deps - filesystem deps for dependency injection
 * @param options - the cache file, its key parts, and the extraction to write
 */
export const save_cached_extraction = async (
	deps: CacheDeps,
	options: SaveCachedExtractionOptions
): Promise<void> => {
	const { cache_path, content_hash, extraction_key, extraction } = options;
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
		v: to_cache_version(),
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
