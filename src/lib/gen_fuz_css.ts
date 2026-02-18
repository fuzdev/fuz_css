/**
 * [Gro generator](https://github.com/fuzdev/gro) for creating optimized utility CSS from extracted class names.
 * Scans source files, extracts CSS classes with AST-based parsing, and generates
 * only the CSS for classes actually used. Includes per-file caching with content
 * hash validation for fast incremental rebuilds.
 *
 * @module
 */

import {join} from 'node:path';
import type {Gen} from '@fuzdev/gro/gen.js';
import {map_concurrent, each_concurrent} from '@fuzdev/fuz_util/async.js';

import {filter_file_default} from './file_filter.js';
import {
	type ExtractionData,
	has_extraction_data,
	extract_css_classes_with_locations,
} from './css_class_extractor.js';
import {type Diagnostic, format_diagnostic, CssGenerationError} from './diagnostics.js';
import {CssClasses} from './css_classes.js';
import {generate_classes_css} from './css_class_generation.js';
import {merge_class_definitions} from './css_class_definitions.js';
import {css_class_interpreters} from './css_class_interpreters.js';
import {load_css_properties} from './css_literal.js';
import {
	DEFAULT_CACHE_DIR,
	get_file_cache_path,
	load_cached_extraction,
	save_cached_extraction,
	delete_cached_extraction,
	from_cached_extraction,
} from './css_cache.js';
import {default_cache_operations} from './operations_defaults.js';
import {
	type StyleRuleIndex,
	load_style_rule_index,
	create_style_rule_index,
	load_default_style_css,
} from './style_rule_parser.js';
import {
	type VariableDependencyGraph,
	build_variable_graph_from_options,
	get_all_variable_names,
} from './variable_graph.js';
import {extract_css_variables} from './css_variable_utils.js';
import {type CssClassVariableIndex, build_class_variable_index} from './class_variable_index.js';
import {resolve_css, generate_bundled_css} from './css_bundled_resolution.js';
import type {CssGeneratorBaseOptions} from './css_plugin_options.js';

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
		class_definitions: user_class_definitions,
		include_default_classes = true,
		class_interpreters = css_class_interpreters,
		on_error = is_ci ? 'throw' : 'log',
		on_warning = 'log',
		additional_classes,
		exclude_classes,
		cache_dir = DEFAULT_CACHE_DIR,
		project_root: project_root_option,
		concurrency = DEFAULT_CONCURRENCY,
		cache_io_concurrency = DEFAULT_CACHE_IO_CONCURRENCY,
		acorn_plugins,
		base_css,
		variables,
		theme_specificity = 1,
		additional_elements,
		additional_variables,
		exclude_elements,
		exclude_variables,
		ops = default_cache_operations,
	} = options;

	// Derive include flags from null check
	const include_base = base_css !== null;
	const include_theme = variables !== null;

	// Convert to Sets for efficient lookup
	const include_set = additional_classes ? new Set(additional_classes) : null;
	const exclude_set = exclude_classes ? new Set(exclude_classes) : null;

	// Merge class definitions upfront (validates that definitions exist when needed)
	const all_class_definitions = merge_class_definitions(
		user_class_definitions,
		include_default_classes,
	);

	// Lazy-load expensive resources (cached per generator instance)
	let css_properties: Set<string> | null = null;
	let style_rule_index: StyleRuleIndex | null = null;
	let variable_graph: VariableDependencyGraph | null = null;
	let class_variable_index: CssClassVariableIndex | null = null;

	const get_css_properties = async (): Promise<Set<string>> => {
		if (!css_properties) {
			css_properties = await load_css_properties();
		}
		return css_properties;
	};

	const get_style_index = async (): Promise<StyleRuleIndex> => {
		if (!style_rule_index) {
			if (typeof base_css === 'string') {
				// Custom CSS string provided (replacement)
				style_rule_index = await create_style_rule_index(base_css);
			} else if (typeof base_css === 'function') {
				// Callback to modify default CSS
				const default_css = await load_default_style_css(ops);
				const modified_css = base_css(default_css);
				style_rule_index = await create_style_rule_index(modified_css);
			} else {
				// Use default style.css (undefined or null - null handled by include_base flag)
				style_rule_index = await load_style_rule_index(ops);
			}
		}
		return style_rule_index;
	};

	const get_variable_graph = (): VariableDependencyGraph => {
		if (!variable_graph) {
			variable_graph = build_variable_graph_from_options(variables);
		}
		return variable_graph;
	};

	const get_class_variable_index = (): CssClassVariableIndex => {
		if (!class_variable_index) {
			class_variable_index = build_class_variable_index(all_class_definitions);
		}
		return class_variable_index;
	};

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

			// Load CSS properties for validation (cached per instance)
			const cached_css_properties = await get_css_properties();

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
				concurrency,
				async (node): Promise<FileExtraction> => {
					current_paths.add(node.id);
					const cache_path = get_file_cache_path(node.id, resolved_cache_dir, project_root);

					// Try cache (skip on CI)
					if (!is_ci) {
						const cached = await load_cached_extraction(ops, cache_path);
						if (cached && cached.content_hash === node.content_hash) {
							// Cache hit
							stats.cache_hits++;
							const cached_data = from_cached_extraction(cached);
							return {
								id: node.id,
								classes: cached_data.classes,
								explicit_classes: cached_data.explicit_classes,
								diagnostics: cached_data.diagnostics,
								elements: cached_data.elements,
								explicit_elements: cached_data.explicit_elements,
								explicit_variables: cached_data.explicit_variables,
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
						elements: result.elements,
						explicit_elements: result.explicit_elements,
						explicit_variables: result.explicit_variables,
						cache_path: is_ci ? null : cache_path,
						content_hash: node.content_hash,
					};
				},
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
				(e): e is FileExtraction & {cache_path: string} => e.cache_path !== null,
			);

			// Parallel cache writes (await completion)
			if (cache_writes.length > 0) {
				await each_concurrent(cache_writes, cache_io_concurrency, async (extraction) => {
					await save_cached_extraction(
						ops,
						extraction.cache_path,
						extraction.content_hash,
						extraction,
					);
				}).catch((err) => log.warn('Cache write error:', err));
			}

			// Watch mode cleanup: delete cache files for removed source files
			// Note: Empty directories are intentionally left behind (rare case, not worth the cost)
			if (!is_ci && previous_paths) {
				const paths_to_delete = [...previous_paths].filter((p) => !current_paths.has(p));
				if (paths_to_delete.length > 0) {
					await each_concurrent(paths_to_delete, cache_io_concurrency, async (path) => {
						const cache_path = get_file_cache_path(path, resolved_cache_dir, project_root);
						await delete_cached_extraction(ops, cache_path);
					}).catch(() => {
						// Ignore deletion errors
					});
				}
			}
			previous_paths = current_paths;

			// Get all classes with locations (already filtered by exclude_classes)
			const {
				all_classes,
				all_classes_with_locations,
				explicit_classes,
				all_elements,
				explicit_elements,
				explicit_variables,
			} = css_classes.get_all();

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

			const utility_result = generate_classes_css({
				class_names: all_classes,
				class_definitions: all_class_definitions,
				interpreters: class_interpreters,
				css_properties: cached_css_properties,
				log,
				class_locations: all_classes_with_locations,
				explicit_classes,
			});

			// Collect all diagnostics: extraction + generation
			const all_diagnostics: Array<Diagnostic> = [
				...css_classes.get_diagnostics(),
				...utility_result.diagnostics,
			];

			// Generate bundled CSS if base or theme are enabled
			let final_css: string;
			if (include_base || include_theme) {
				// Detect CSS variables via simple regex scan of all file contents
				// Filter against theme variables - only include known theme vars
				const theme_var_names = get_all_variable_names(get_variable_graph());
				const detected_css_variables: Set<string> = new Set();
				for (const node of nodes) {
					for (const name of extract_css_variables(node.contents)) {
						if (theme_var_names.has(name)) {
							detected_css_variables.add(name);
						}
					}
				}

				// Add explicit variables from @fuz-variables comments to detected set for inclusion,
				// and pass as explicit_variables to resolve_css for error reporting on typos
				if (explicit_variables) {
					for (const v of explicit_variables) {
						detected_css_variables.add(v);
					}
				}

				const resolution = resolve_css({
					style_rule_index: await get_style_index(),
					variable_graph: get_variable_graph(),
					class_variable_index: get_class_variable_index(),
					detected_elements: all_elements,
					detected_classes: all_classes,
					detected_css_variables,
					utility_variables_used: utility_result.variables_used,
					additional_elements,
					additional_variables,
					theme_specificity,
					include_stats,
					exclude_elements,
					exclude_variables,
					explicit_elements,
					explicit_variables,
				});

				// Log resolution stats if requested
				if (include_stats && resolution.stats) {
					log.info(
						`[css_resolution] Elements: ${resolution.stats.element_count} (${resolution.stats.elements.join(', ')})`,
					);
					log.info(
						`[css_resolution] Rules: ${resolution.stats.included_rules} of ${resolution.stats.total_rules}`,
					);
					log.info(`[css_resolution] Variables: ${resolution.stats.variable_count} resolved`);
				}

				// Add resolution diagnostics
				all_diagnostics.push(...resolution.diagnostics);

				final_css = generate_bundled_css(resolution, utility_result.css, {
					include_theme,
					include_base,
					include_utilities: true,
				});
			} else {
				// utility-only mode (legacy behavior)
				final_css = utility_result.css;
			}

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

			content_parts.push(final_css);
			content_parts.push(`/* ${banner} */`);

			return content_parts.join('\n\n');
		},
	};
};
