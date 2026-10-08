/**
 * The Vite plugin's extraction state: what each source file extracted, kept
 * current as files are transformed, re-read, and deleted, with a version
 * that moves whenever the extracted set changes.
 *
 * @module
 */

import { hash_blake3 } from '@fuzdev/fuz_util/hash_blake3.ts';

import type { CssClasses } from './css_classes.ts';
import { extract_file_cached } from './extract_file_cached.ts';
import {
	save_cached_extraction,
	delete_cached_extraction,
	to_extraction_cache_key
} from './css_cache.ts';
import { extract_css_variables } from './css_variable_utils.ts';
import type { AcornPlugin } from './css_class_extractor.ts';
import type { CacheDeps } from './deps.ts';

/** @nodocs */
export interface CssExtractionStateOptions {
	/** The collection extractions are recorded in. */
	css_classes: CssClasses;
	/** A file's cache path, or `null` when it isn't cached. */
	get_cache_path: (id: string) => string | null;
	deps: CacheDeps;
	acorn_plugins?: Array<AcornPlugin>;
	/** Folded into the cache key - see `CssExtractionOptions.cache_salt`. */
	cache_salt?: string;
}

/**
 * Per-file extraction state with race-safe ingestion.
 *
 * Each ingest awaits a cache read, so a deletion or a newer ingest of the
 * same file can land while one is in flight. A per-file epoch guards that:
 * an ingest claims one before it awaits and drops its result if the file's
 * epoch moved meanwhile, so a deleted file isn't resurrected and an older
 * version of a file doesn't overwrite a newer one.
 *
 * @nodocs
 */
export class CssExtractionState {
	readonly css_classes: CssClasses;
	/** Increments each time the extracted set changes - a cache key for renders. */
	version = 0;

	readonly #get_cache_path: (id: string) => string | null;
	readonly #deps: CacheDeps;
	readonly #acorn_plugins: Array<AcornPlugin> | undefined;
	readonly #extraction_key: string | null;
	readonly #hashes: Map<string, string> = new Map();
	/**
	 * The `var(--*)` names each file references, unfiltered: a reference is
	 * kept whether or not the theme defines it, since the variable graph may
	 * not be loaded when the file is ingested - the render narrows them.
	 */
	readonly #variables_by_id: Map<string, Set<string>> = new Map();
	readonly #epochs: Map<string, number> = new Map();
	#epoch_seq = 0;

	constructor(options: CssExtractionStateOptions) {
		this.css_classes = options.css_classes;
		this.#get_cache_path = options.get_cache_path;
		this.#deps = options.deps;
		this.#acorn_plugins = options.acorn_plugins;
		this.#extraction_key = to_extraction_cache_key(options.acorn_plugins, options.cache_salt);
	}

	/**
	 * Claims a new epoch for `id`, superseding any ingest of it in flight. A
	 * caller that awaits before ingesting (a disk read) claims first and
	 * passes the epoch to `ingest`, extending the guard over its own await.
	 */
	claim_epoch(id: string): number {
		const epoch = ++this.#epoch_seq;
		this.#epochs.set(id, epoch);
		return epoch;
	}

	/**
	 * Ingests one file's code: skipped when the content is unchanged, else
	 * extracted (from the cache when it holds this content) and recorded,
	 * with the cache written on a miss.
	 *
	 * The cache write is fire-and-forget unless `await_cache_write` is set,
	 * so a caller bounding its concurrency can cover the writes too.
	 *
	 * @param id - the file's extraction id
	 * @param code - the file's code
	 * @param options - `epoch` claimed by the caller before its own await, and whether to await the cache write
	 * @returns whether the extracted set changed
	 */
	async ingest(
		id: string,
		code: string,
		options?: { epoch?: number; await_cache_write?: boolean }
	): Promise<boolean> {
		const { epoch: claimed_epoch, await_cache_write = false } = options ?? {};
		// claimed ahead of the unchanged-content check: an edit undone while
		// the edit's own ingest awaits its cache read matches the recorded
		// hash, and still has to supersede that ingest. A caller-claimed epoch
		// that was superseded already means this ingest is stale
		if (claimed_epoch !== undefined && this.#epochs.get(id) !== claimed_epoch) return false;
		const epoch = claimed_epoch ?? this.claim_epoch(id);

		const hash = hash_blake3(code);
		if (this.#hashes.get(id) === hash) return false;

		const { extraction, cache_path_to_write } = await extract_file_cached({
			deps: this.#deps,
			content: code,
			content_hash: hash,
			extraction_key: this.#extraction_key,
			cache_path: this.#get_cache_path(id),
			filename: id,
			acorn_plugins: this.#acorn_plugins
		});

		// deleted or re-ingested during the cache read - recording this result
		// would resurrect a deleted entry or overwrite a newer one
		if (this.#epochs.get(id) !== epoch) return false;

		this.css_classes.add(id, extraction);
		const variables = extract_css_variables(code);
		if (variables.size > 0) this.#variables_by_id.set(id, variables);
		else this.#variables_by_id.delete(id);
		this.#hashes.set(id, hash);
		this.version++;

		if (cache_path_to_write) {
			const cache_write = save_cached_extraction(this.#deps, {
				cache_path: cache_path_to_write,
				content_hash: hash,
				extraction_key: this.#extraction_key,
				extraction
			}).catch(() => {
				// a failed cache write only costs a re-extraction later
			});
			if (await_cache_write) await cache_write;
		}
		return true;
	}

	/**
	 * Removes a deleted file's extraction and its cache entry, and supersedes
	 * any ingest of it in flight.
	 *
	 * @returns whether the extracted set changed
	 */
	remove(id: string): boolean {
		this.#epochs.delete(id);
		if (!this.#hashes.has(id)) return false;
		this.css_classes.delete(id);
		this.#hashes.delete(id);
		this.#variables_by_id.delete(id);
		this.version++;
		const cache_path = this.#get_cache_path(id);
		if (cache_path) {
			delete_cached_extraction(this.#deps, cache_path).catch(() => {
				// a stale cache entry is only read for this content, which is gone
			});
		}
		return true;
	}

	/**
	 * The `var(--*)` names the ingested files reference, unfiltered.
	 *
	 * @param ids - only these files, when given
	 */
	*detected_css_variables(ids?: ReadonlySet<string>): Generator<string> {
		for (const [id, variables] of this.#variables_by_id) {
			if (!ids || ids.has(id)) yield* variables;
		}
	}
}
