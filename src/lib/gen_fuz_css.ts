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
import type {FileFilter} from '@fuzdev/fuz_util/path.js';
import {map_concurrent, each_concurrent} from '@fuzdev/fuz_util/async.js';

import {
	extract_css_classes_with_locations,
	type SourceLocation,
	type ExtractionDiagnostic,
} from './css_class_extractor.js';
import {
	CssClasses,
	generate_classes_css,
	type CssClassDefinition,
	type CssClassDefinitionInterpreter,
	type Diagnostic,
} from './css_class_generation.js';
import {token_classes} from './css_classes.js';
import {css_class_composites} from './css_class_composites.js';
import {css_class_interpreters} from './css_class_interpreters.js';
import {load_css_properties} from './css_literal.js';
import {
	get_cache_path,
	load_cached_extraction,
	save_cached_extraction,
	delete_cached_extraction,
	from_cached_extraction,
} from './css_cache.js';

/**
 * Skip cache on CI (no point writing cache that won't be reused).
 * Handles CI=1, CI=true, and other truthy values.
 */
const is_ci = !!process.env.CI;

/** Default concurrency for main loop: cache read + extract (CPU-bound) */
const DEFAULT_CONCURRENCY = 8;

/** Default concurrency for cache writes/deletes (I/O-bound) */
const DEFAULT_CACHE_IO_CONCURRENCY = 20;

/**
 * Result from extracting CSS classes from a single file.
 * Used internally during parallel extraction with caching.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
interface FileExtraction {
	id: string;
	/** Extracted classes, or null if none */
	classes: Map<string, Array<SourceLocation>> | null;
	/** Extraction diagnostics, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
	/** Cache path to write to, or null if no write needed (cache hit or CI) */
	cache_path: string | null;
	content_hash: string;
}

export interface GenFuzCssOptions {
	filter_file?: FileFilter | null;
	include_stats?: boolean;
	class_definitions?: Record<string, CssClassDefinition | undefined>;
	class_interpreters?: Array<CssClassDefinitionInterpreter>;
	/**
	 * How to handle CSS-literal errors during generation.
	 * - 'log' (default): Log errors, skip invalid classes, continue
	 * - 'throw': Throw on first error, fail the build
	 */
	on_error?: 'log' | 'throw';
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
	 * @default '.fuz/cache/css'
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
	 * @default 20
	 */
	cache_io_concurrency?: number;
}

/**
 * Formats a diagnostic for display.
 */
const format_diagnostic = (d: Diagnostic): string => {
	const suggestion = d.suggestion ? ` (${d.suggestion})` : '';
	if (d.phase === 'extraction') {
		return `  - ${d.location.file}:${d.location.line}:${d.location.column}: ${d.message}${suggestion}`;
	}
	const loc = d.locations?.[0];
	const location_str = loc ? `${loc.file}:${loc.line}:${loc.column}: ` : '';
	return `  - ${location_str}${d.class_name}: ${d.message}${suggestion}`;
};

/**
 * Error thrown when CSS-literal generation encounters errors and `on_error: 'throw'` is set.
 */
export class CssGenerationError extends Error {
	diagnostics: Array<Diagnostic>;

	constructor(diagnostics: Array<Diagnostic>) {
		const error_count = diagnostics.filter((d) => d.level === 'error').length;
		const message = `CSS generation failed with ${error_count} error${error_count === 1 ? '' : 's'}:\n${diagnostics
			.filter((d) => d.level === 'error')
			.map(format_diagnostic)
			.join('\n')}`;
		super(message);
		this.name = 'CssGenerationError';
		this.diagnostics = diagnostics;
	}
}

const filter_file_default: FileFilter = (path) => {
	if (path.includes('.test.') || path.includes('/test/') || path.includes('.gen.')) {
		return false;
	}
	const ext = path.slice(path.lastIndexOf('.'));
	return ext === '.svelte' || ext === '.ts' || ext === '.js';
};

export const gen_fuz_css = (options: GenFuzCssOptions = {}): Gen => {
	const {
		filter_file = filter_file_default,
		include_stats = false,
		class_definitions = token_classes,
		class_interpreters = css_class_interpreters,
		on_error = 'log',
		include_classes,
		exclude_classes,
		cache_dir = '.fuz/cache/css',
		project_root: project_root_option,
		concurrency = DEFAULT_CONCURRENCY,
		cache_io_concurrency = DEFAULT_CACHE_IO_CONCURRENCY,
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
			if (!filter_file || filter_file(changed_file_id)) return 'all';
			return null; // Ignore .json, .md, etc.
		},

		generate: async ({filer, log, origin_path}) => {
			log.info('generating Fuz CSS classes...');

			// Load CSS properties for validation before generation
			const css_properties = await load_css_properties();

			await filer.init();

			// Normalize project root - ensure it ends with /
			const raw_project_root = project_root_option ?? process.cwd();
			const project_root = raw_project_root.endsWith('/')
				? raw_project_root
				: raw_project_root + '/';
			const resolved_cache_dir = join(project_root, cache_dir);

			const css_classes = new CssClasses(include_set);
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

				if (filter_file && !filter_file(disknode.id)) {
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
					const cache_path = get_cache_path(node.id, resolved_cache_dir, project_root);

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
					});

					return {
						id: node.id,
						classes: result.classes,
						diagnostics: result.diagnostics,
						cache_path: is_ci ? null : cache_path,
						content_hash: node.content_hash,
					};
				},
				concurrency,
			);

			// Add to CssClasses (null = empty, so use truthiness check)
			for (const {id, classes, diagnostics} of extractions) {
				if (classes || diagnostics) {
					css_classes.add(id, classes, diagnostics);
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
					async ({cache_path, content_hash, classes, diagnostics}) => {
						await save_cached_extraction(cache_path, content_hash, classes, diagnostics);
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
							const cache_path = get_cache_path(path, resolved_cache_dir, project_root);
							await delete_cached_extraction(cache_path);
						},
						cache_io_concurrency,
					).catch(() => {
						// Ignore deletion errors
					});
				}
			}
			previous_paths = current_paths;

			// Get all classes with locations (single recalculation)
			let {all_classes, all_classes_with_locations} = css_classes.get_all();

			// Apply exclude filter if configured
			if (exclude_set) {
				const filtered: Set<string> = new Set();
				const filtered_with_locations: Map<string, Array<SourceLocation> | null> = new Map();
				for (const cls of all_classes) {
					if (!exclude_set.has(cls)) {
						filtered.add(cls);
						filtered_with_locations.set(cls, all_classes_with_locations.get(cls) ?? null);
					}
				}
				all_classes = filtered;
				all_classes_with_locations = filtered_with_locations;
			}

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

			// Merge token classes with composites for interpreter access
			const all_class_definitions = {...class_definitions, ...css_class_composites};

			const result = generate_classes_css({
				class_names: all_classes,
				class_definitions: all_class_definitions,
				interpreters: class_interpreters,
				css_properties,
				log,
				class_locations: all_classes_with_locations,
			});

			// Collect all diagnostics: extraction + generation
			const all_diagnostics: Array<Diagnostic> = [
				...css_classes.get_diagnostics(),
				...result.diagnostics,
			];

			// Separate errors and warnings
			const errors = all_diagnostics.filter((d) => d.level === 'error');
			const warnings = all_diagnostics.filter((d) => d.level === 'warning');

			// Log all warnings using consistent format
			for (const warning of warnings) {
				log.warn(format_diagnostic(warning));
			}

			// Handle errors based on on_error setting
			if (errors.length > 0) {
				if (on_error === 'throw') {
					throw new CssGenerationError(all_diagnostics);
				}
				// 'log' mode - errors are already logged by interpret_css_literal
				log.warn(
					`CSS generation completed with ${errors.length} error${errors.length === 1 ? '' : 's'} (invalid classes skipped)`,
				);
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
