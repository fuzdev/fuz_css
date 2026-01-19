/**
 * Gro generator for creating optimized utility CSS from extracted class names.
 * Scans source files, extracts CSS classes with AST-based parsing, and generates
 * only the CSS for classes actually used. Includes per-file caching with content
 * hash validation for fast incremental rebuilds.
 *
 * @module
 */

import {join} from 'node:path';
import type {Gen} from '@ryanatkn/gro/gen.js';
import {map_concurrent, each_concurrent} from '@fuzdev/fuz_util/async.js';

import {type FileFilter, filter_file_default} from './file_filter.js';
import {extract_css_classes_with_locations, type AcornPlugin} from './css_class_extractor.js';
import {
	type SourceLocation,
	type ExtractionDiagnostic,
	type Diagnostic,
	format_diagnostic,
	CssGenerationError,
} from './diagnostics.js';
import {CssClasses} from './css_classes.js';
import {
	generate_classes_css,
	type CssClassDefinition,
	type CssClassDefinitionInterpreter,
} from './css_class_generation.js';
import {css_class_definitions} from './css_class_definitions.js';
import {css_class_interpreters} from './css_class_interpreters.js';
import {load_css_properties} from './css_literal.js';
import {
	DEFAULT_CACHE_DIR,
	get_cache_path,
	load_cached_extraction,
	save_cached_extraction,
	delete_cached_extraction,
	from_cached_extraction,
	compute_hash,
} from './css_cache.js';

/**
 * Skip cache on CI (no point writing cache that won't be reused).
 * Handles CI=1, CI=true, and other truthy values.
 */
const is_ci = !!process.env.CI;

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
 * Computes cache path for a file.
 * Internal files use relative paths mirroring source tree.
 * External files (outside project root) use hashed absolute paths in `_external/`.
 */
const get_file_cache_path = async (
	file_id: string,
	cache_dir: string,
	project_root: string,
): Promise<string> => {
	const is_internal = file_id.startsWith(project_root);
	return is_internal
		? get_cache_path(file_id, cache_dir, project_root)
		: join(cache_dir, '_external', (await compute_hash(file_id)).slice(0, 16) + '.json');
};

/**
 * Result from extracting CSS classes from a single file.
 * Used internally during parallel extraction with caching.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
interface FileExtraction {
	id: string;
	/** Extracted classes, or null if none */
	classes: Map<string, Array<SourceLocation>> | null;
	/** Classes from @fuz-classes comments, or null if none */
	explicit_classes: Set<string> | null;
	/** Extraction diagnostics, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
	/** Cache path to write to, or null if no write needed (cache hit or CI) */
	cache_path: string | null;
	content_hash: string;
}

export interface GenFuzCssOptions {
	filter_file?: FileFilter;
	include_stats?: boolean;
	/**
	 * Whether to include default class definitions (token and composite classes).
	 * When `false`, `class_definitions` is required.
	 * @default true
	 */
	include_default_definitions?: boolean;
	/**
	 * Additional class definitions to merge with defaults.
	 * User definitions take precedence over defaults with the same name.
	 * Required when `include_default_definitions` is `false`.
	 */
	class_definitions?: Record<string, CssClassDefinition | undefined>;
	/**
	 * Custom interpreters for dynamic class generation.
	 * Replaces the builtin interpreters entirely if provided.
	 */
	class_interpreters?: Array<CssClassDefinitionInterpreter>;
	/**
	 * How to handle CSS-literal errors during generation.
	 * - 'log': Log errors, skip invalid classes, continue
	 * - 'throw': Throw on first error, fail the build
	 * @default 'throw' in CI, 'log' otherwise
	 */
	on_error?: 'log' | 'throw';
	/**
	 * How to handle warnings during generation.
	 * - 'log': Log warnings, continue
	 * - 'throw': Throw on first warning, fail the build
	 * - 'ignore': Suppress warnings entirely
	 * @default 'log'
	 */
	on_warning?: 'log' | 'throw' | 'ignore';
	/**
	 * Classes to always include in the output, regardless of whether they're detected in source files.
	 * Useful for dynamically generated class names that can't be statically extracted.
	 */
	include_classes?: Iterable<string>;
	/**
	 * Classes to exclude from the output, even if they're detected in source files.
	 * Useful for filtering out false positives from extraction.
	 */
	exclude_classes?: Iterable<string>;
	/**
	 * Cache directory relative to project_root.
	 * @default DEFAULT_CACHE_DIR
	 */
	cache_dir?: string;
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
	/**
	 * Additional acorn plugins to use when parsing TS/JS files.
	 * Useful for adding JSX support via `acorn-jsx` for React projects.
	 *
	 * @example
	 * ```ts
	 * import jsx from 'acorn-jsx';
	 * export const gen = gen_fuz_css({
	 *   acorn_plugins: [jsx()],
	 * });
	 * ```
	 */
	acorn_plugins?: Array<AcornPlugin>;
}

export const gen_fuz_css = (options: GenFuzCssOptions = {}): Gen => {
	const {
		filter_file = filter_file_default,
		include_stats = false,
		include_default_definitions = true,
		class_definitions: user_class_definitions,
		class_interpreters = css_class_interpreters,
		on_error = is_ci ? 'throw' : 'log',
		on_warning = 'log',
		include_classes,
		exclude_classes,
		cache_dir = DEFAULT_CACHE_DIR,
		project_root: project_root_option,
		concurrency = DEFAULT_CONCURRENCY,
		cache_io_concurrency = DEFAULT_CACHE_IO_CONCURRENCY,
		acorn_plugins,
	} = options;

	// Convert to Sets for efficient lookup
	const include_set = include_classes ? new Set(include_classes) : null;
	const exclude_set = exclude_classes ? new Set(exclude_classes) : null;

	// Instance-level state for watch mode cleanup
	let previous_paths: Set<string> | null = null;

	return {
		// Filter dependencies to skip non-extractable files.
		// Returns 'all' when an extractable file changes, null otherwise.
		dependencies: ({changed_file_id}) => {
			if (!changed_file_id) return 'all';
			if (filter_file(changed_file_id)) return 'all';
			return null; // Ignore .json, .md, etc.
		},

		generate: async ({filer, log, origin_path}) => {
			log.info('generating fuz_css classes...');

			// Load CSS properties for validation before generation
			const css_properties = await load_css_properties();

			await filer.init();

			// Normalize project root - ensure it ends with /
			const raw_project_root = project_root_option ?? process.cwd();
			const project_root = raw_project_root.endsWith('/')
				? raw_project_root
				: raw_project_root + '/';
			const resolved_cache_dir = join(project_root, cache_dir);

			const css_classes = new CssClasses(include_set, exclude_set);
			const current_paths: Set<string> = new Set();

			const stats = {
				total_files: filer.files.size,
				external_files: 0,
				internal_files: 0,
				processed_files: 0,
				files_with_content: 0,
				files_with_classes: 0,
				cache_hits: 0,
				cache_misses: 0,
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

				if (!filter_file(disknode.id)) {
					continue;
				}

				stats.processed_files++;

				if (disknode.contents !== null && disknode.content_hash !== null) {
					stats.files_with_content++;
					nodes.push({
						id: disknode.id,
						contents: disknode.contents,
						content_hash: disknode.content_hash,
					});
				}
			}

			// Parallel extraction with cache check
			const extractions: Array<FileExtraction> = await map_concurrent(
				nodes,
				async (node): Promise<FileExtraction> => {
					current_paths.add(node.id);
					const cache_path = await get_file_cache_path(node.id, resolved_cache_dir, project_root);

					// Try cache (skip on CI)
					if (!is_ci) {
						const cached = await load_cached_extraction(cache_path);
						if (cached && cached.content_hash === node.content_hash) {
							// Cache hit
							stats.cache_hits++;
							return {
								id: node.id,
								...from_cached_extraction(cached),
								cache_path: null,
								content_hash: node.content_hash,
							};
						}
					}

					// Cache miss - extract
					stats.cache_misses++;
					const result = extract_css_classes_with_locations(node.contents, {
						filename: node.id,
						acorn_plugins,
					});

					return {
						id: node.id,
						classes: result.classes,
						explicit_classes: result.explicit_classes,
						diagnostics: result.diagnostics,
						cache_path: is_ci ? null : cache_path,
						content_hash: node.content_hash,
					};
				},
				concurrency,
			);

			// Add to CssClasses (null = empty, so use truthiness check)
			for (const {id, classes, explicit_classes, diagnostics} of extractions) {
				if (classes || explicit_classes || diagnostics) {
					css_classes.add(id, classes, explicit_classes, diagnostics);
					if (classes) {
						stats.files_with_classes++;
					}
				}
			}

			// Collect cache writes (entries that need writing)
			const cache_writes = extractions.filter(
				(e): e is FileExtraction & {cache_path: string} => e.cache_path !== null,
			);

			// Parallel cache writes (await completion)
			if (cache_writes.length > 0) {
				await each_concurrent(
					cache_writes,
					async ({cache_path, content_hash, classes, explicit_classes, diagnostics}) => {
						await save_cached_extraction(cache_path, content_hash, classes, explicit_classes, diagnostics);
					},
					cache_io_concurrency,
				).catch((err) => log.warn('Cache write error:', err));
			}

			// Watch mode cleanup: delete cache files for removed source files
			// Note: Empty directories are intentionally left behind (rare case, not worth the cost)
			if (!is_ci && previous_paths) {
				const paths_to_delete = [...previous_paths].filter((p) => !current_paths.has(p));
				if (paths_to_delete.length > 0) {
					await each_concurrent(
						paths_to_delete,
						async (path) => {
							const cache_path = await get_file_cache_path(path, resolved_cache_dir, project_root);
							await delete_cached_extraction(cache_path);
						},
						cache_io_concurrency,
					).catch(() => {
						// Ignore deletion errors
					});
				}
			}
			previous_paths = current_paths;

			// Get all classes with locations (already filtered by exclude_classes)
			const {all_classes, all_classes_with_locations, explicit_classes} = css_classes.get_all();

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

			// Merge class definitions (user definitions take precedence)
			if (!include_default_definitions && !user_class_definitions) {
				throw new Error('class_definitions is required when include_default_definitions is false');
			}
			const all_class_definitions = include_default_definitions
				? user_class_definitions
					? {...css_class_definitions, ...user_class_definitions}
					: css_class_definitions
				: user_class_definitions!;

			const result = generate_classes_css({
				class_names: all_classes,
				class_definitions: all_class_definitions,
				interpreters: class_interpreters,
				css_properties,
				log,
				class_locations: all_classes_with_locations,
				explicit_classes,
			});

			// Collect all diagnostics: extraction + generation
			const all_diagnostics: Array<Diagnostic> = [
				...css_classes.get_diagnostics(),
				...result.diagnostics,
			];

			// Separate errors and warnings
			const errors = all_diagnostics.filter((d) => d.level === 'error');
			const warnings = all_diagnostics.filter((d) => d.level === 'warning');

			// Handle warnings based on on_warning setting
			if (warnings.length > 0) {
				if (on_warning === 'throw') {
					throw new CssGenerationError(warnings);
				} else if (on_warning === 'log') {
					for (const warning of warnings) {
						log.warn(format_diagnostic(warning));
					}
				}
				// 'ignore' - do nothing
			}

			// Handle errors based on on_error setting
			if (errors.length > 0) {
				if (on_error === 'throw') {
					throw new CssGenerationError(errors);
				}
				// 'log' mode - log each error with details
				for (const error of errors) {
					log.error(format_diagnostic(error));
				}
			}

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

			content_parts.push(result.css);
			content_parts.push(`/* ${banner} */`);

			return content_parts.join('\n\n');
		},
	};
};
