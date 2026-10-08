/**
 * [Gro generator](https://github.com/fuzdev/gro) for creating optimized utility CSS from extracted class names.
 * Scans source files, extracts CSS classes with AST-based parsing, and generates
 * only the CSS for classes actually used. Includes per-file caching with content
 * hash validation for fast incremental rebuilds.
 *
 * @module
 */

import type { Gen } from '@fuzdev/gro/gen.ts';
import type { Logger } from '@fuzdev/fuz_util/log.ts';
import { resolve } from 'node:path';
import { map_concurrent, each_concurrent } from '@fuzdev/fuz_util/async.ts';

import { filter_file_default } from './file_filter.ts';
import { type ExtractionData, has_extraction_data } from './css_class_extractor.ts';
import { create_css_generator } from './css_generator.ts';
import { extract_file_cached } from './extract_file_cached.ts';
import {
	DEFAULT_CACHE_DIR,
	create_cache_path_resolver,
	save_cached_extraction,
	to_extraction_cache_key,
	delete_cached_extraction
} from './css_cache.ts';
import { default_cache_deps } from './deps_defaults.ts';
import { extract_css_variables } from './css_variable_utils.ts';
import type { CssGeneratorBaseOptions } from './css_plugin_options.ts';

/**
 * Default concurrency for main loop: cache read + extract.
 * This is NOT true CPU parallelism - Node.js JS is single-threaded.
 * The value controls I/O interleaving (overlapping cache reads with parsing)
 * and memory budget for in-flight operations. Higher values offer diminishing
 * returns since AST parsing is synchronous on the main thread.
 */
const DEFAULT_CONCURRENCY = 8;

/**
 * Default concurrency for cache writes/deletes (I/O-bound).
 * Safe to set high since Node's libuv thread pool (default 4 threads)
 * limits actual parallel I/O operations. Memory pressure from buffered
 * writes is the main constraint, but cache entries are small JSON files.
 */
const DEFAULT_CACHE_IO_CONCURRENCY = 50;

/**
 * Result from extracting CSS classes from a single file.
 * Used internally during parallel extraction with caching.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
interface FileExtraction extends ExtractionData {
	id: string;
	/** Cache path to write to, or null if no write needed (cache hit or CI) */
	cache_path: string | null;
	content_hash: string;
}

/**
 * Options for the Gro CSS generator.
 * Extends the shared base options with Gro-specific settings.
 */
export interface GenFuzCssOptions extends CssGeneratorBaseOptions {
	/**
	 * Whether to include file and resolution statistics in the output.
	 * @default false
	 */
	include_stats?: boolean;
	/**
	 * Project root directory. Source paths must be under this directory.
	 * @default process.cwd()
	 */
	project_root?: string;
	/**
	 * Max concurrent file processing (cache read + extract).
	 * Bottlenecked by CPU-bound AST parsing.
	 * @default 8
	 */
	concurrency?: number;
	/**
	 * Max concurrent cache writes and deletes (I/O-bound).
	 * @default 50
	 */
	cache_io_concurrency?: number;
}

export const gen_fuz_css = (options: GenFuzCssOptions = {}): Gen => {
	const {
		filter_file = filter_file_default,
		include_stats = false,
		cache_dir = DEFAULT_CACHE_DIR,
		project_root: project_root_option = process.cwd(),
		concurrency = DEFAULT_CONCURRENCY,
		cache_io_concurrency = DEFAULT_CACHE_IO_CONCURRENCY,
		acorn_plugins,
		cache_salt,
		deps = default_cache_deps
	} = options;
	const extraction_key = to_extraction_cache_key(acorn_plugins, cache_salt);
	// absolute, so a relative option still matches the absolute file ids the
	// filter and the cache paths are judged against
	const project_root = resolve(project_root_option);

	// the log of the generate call in progress, which diagnostics go to
	let current_log: Logger | null = null;
	// cached per generator instance, so watch-mode rebuilds don't re-parse
	// style.css or rebuild the graphs
	const generator = create_css_generator(options, {
		warn: (message) => current_log?.warn(message),
		error: (message) => current_log?.error(message)
	});
	const get_cache_path = create_cache_path_resolver(cache_dir, project_root);

	// Instance-level state for watch mode cleanup
	let previous_paths: Set<string> | null = null;

	return {
		// Filter dependencies to skip non-extractable files.
		// Returns 'all' when an extractable file changes, null otherwise.
		dependencies: ({ changed_file_id }) => {
			if (!changed_file_id) return 'all';
			if (filter_file(changed_file_id, project_root)) return 'all';
			return null; // Ignore .json, .md, etc.
		},

		generate: async ({ filer, log, origin_path }) => {
			current_log = log;
			log.info('generating fuz_css classes...');

			await Promise.all([generator.ensure_ready(), filer.init()]);

			const css_classes = generator.create_css_classes();
			const current_paths: Set<string> = new Set();

			const stats = {
				total_files: filer.files.size,
				external_files: 0,
				internal_files: 0,
				processed_files: 0,
				files_with_content: 0,
				files_with_classes: 0,
				cache_hits: 0,
				cache_misses: 0
			};

			// Collect nodes to process
			const nodes: Array<{
				id: string;
				contents: string;
				content_hash: string;
			}> = [];

			for (const disknode of filer.files.values()) {
				if (disknode.external) {
					stats.external_files++;
				} else {
					stats.internal_files++;
				}

				if (!filter_file(disknode.id, project_root)) {
					continue;
				}

				stats.processed_files++;

				if (disknode.contents !== null && disknode.content_hash !== null) {
					stats.files_with_content++;
					nodes.push({
						id: disknode.id,
						contents: disknode.contents,
						content_hash: disknode.content_hash
					});
				}
			}

			// Parallel extraction with cache check
			const extractions: Array<FileExtraction> = await map_concurrent(
				nodes,
				concurrency,
				async (node): Promise<FileExtraction> => {
					current_paths.add(node.id);
					const cache_path = get_cache_path(node.id);

					const { extraction, from_cache, cache_path_to_write } = await extract_file_cached({
						deps,
						content: node.contents,
						content_hash: node.content_hash,
						extraction_key,
						cache_path,
						filename: node.id,
						acorn_plugins
					});

					if (from_cache) {
						stats.cache_hits++;
					} else {
						stats.cache_misses++;
					}

					return {
						id: node.id,
						classes: extraction.classes,
						explicit_classes: extraction.explicit_classes,
						diagnostics: extraction.diagnostics,
						elements: extraction.elements,
						explicit_elements: extraction.explicit_elements,
						explicit_variables: extraction.explicit_variables,
						cache_path: cache_path_to_write,
						content_hash: node.content_hash
					};
				}
			);

			// Add to CssClasses (skip files with all-null extraction data)
			for (const extraction of extractions) {
				if (has_extraction_data(extraction)) {
					css_classes.add(extraction.id, extraction);
					if (extraction.classes) {
						stats.files_with_classes++;
					}
				}
			}

			// Collect cache writes (entries that need writing)
			const cache_writes = extractions.filter(
				(e): e is FileExtraction & { cache_path: string } => e.cache_path !== null
			);

			// Parallel cache writes (await completion)
			if (cache_writes.length > 0) {
				await each_concurrent(cache_writes, cache_io_concurrency, async (extraction) => {
					await save_cached_extraction(deps, {
						cache_path: extraction.cache_path,
						content_hash: extraction.content_hash,
						extraction_key,
						extraction
					});
				}).catch((err) => log.warn('Cache write error:', err));
			}

			// Watch mode cleanup: delete cache files for removed source files
			// Note: Empty directories are intentionally left behind (rare case, not worth the cost)
			if (previous_paths) {
				const paths_to_delete = [...previous_paths].filter((p) => !current_paths.has(p));
				if (paths_to_delete.length > 0) {
					await each_concurrent(paths_to_delete, cache_io_concurrency, async (path) => {
						const cache_path = get_cache_path(path);
						if (cache_path) await delete_cached_extraction(deps, cache_path);
					}).catch(() => {
						// Ignore deletion errors
					});
				}
			}
			previous_paths = current_paths;

			const all_classes = css_classes.get();

			if (include_stats) {
				log.info('File statistics:');
				log.info(`  Total files in filer: ${stats.total_files}`);
				log.info(`    External: ${stats.external_files}`);
				log.info(`    Internal: ${stats.internal_files}`);
				log.info(`  Files processed (passed filter): ${stats.processed_files}`);
				log.info(`    With content: ${stats.files_with_content}`);
				log.info(`    With CSS classes: ${stats.files_with_classes}`);
				log.info(`  Cache: ${stats.cache_hits} hits, ${stats.cache_misses} misses`);
				log.info(`  Unique CSS classes found: ${all_classes.size}`);
			}

			const final_css = generator.render({
				css_classes,
				// a simple regex scan of every file's contents; the render keeps
				// only the names the theme defines
				detected_css_variables: nodes.flatMap((node) => [...extract_css_variables(node.contents)]),
				log,
				include_stats
			});

			const banner = `generated by ${origin_path}`;

			const content_parts = [`/* ${banner} */`];

			if (include_stats) {
				const performance_note = `/* *
 * File statistics:
 * - Total files in filer: ${stats.total_files}
 * - External dependencies: ${stats.external_files}
 * - Internal project files: ${stats.internal_files}
 * - Files processed (passed filter): ${stats.processed_files}
 * - Files with CSS classes: ${stats.files_with_classes}
 * - Cache: ${stats.cache_hits} hits, ${stats.cache_misses} misses
 * - Unique classes found: ${all_classes.size}
 */`;
				content_parts.push(performance_note);
			}

			content_parts.push(final_css);
			content_parts.push(`/* ${banner} */`);

			return content_parts.join('\n\n');
		}
	};
};
