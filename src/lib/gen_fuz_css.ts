import type {Gen} from '@ryanatkn/gro/gen.js';
import type {FileFilter} from '@fuzdev/fuz_util/path.js';

import {
	collect_css_classes_with_locations,
	CssClasses,
	generate_classes_css,
	type CssClassDeclaration,
	type CssClassDeclarationInterpreter,
	type Diagnostic,
	type SourceLocation,
} from './css_class_helpers.js';
import {css_classes_by_name} from './css_classes.js';
import {css_class_interpreters} from './css_class_interpreters.js';

export interface GenFuzCssOptions {
	filter_file?: FileFilter | null;
	include_stats?: boolean;
	classes_by_name?: Record<string, CssClassDeclaration | undefined>;
	class_interpreters?: Array<CssClassDeclarationInterpreter>;
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
		classes_by_name = css_classes_by_name,
		class_interpreters = css_class_interpreters,
		on_error = 'log',
		include_classes,
		exclude_classes,
	} = options;

	// Convert to Sets for efficient lookup
	const include_set = include_classes ? new Set(include_classes) : null;
	const exclude_set = exclude_classes ? new Set(exclude_classes) : null;

	return {
		dependencies: 'all',
		// TODO optimize, do we need to handle deleted files or removed classes though?
		// This isn't as much a problem in watch mode but isn't clean.
		// dependencies: ({changed_file_id, filer}) => {
		// 	if (!changed_file_id) return 'all';
		// 	const disknode = filer.get_by_id(changed_file_id);
		// 	if (disknode?.contents && collect_css_classes(disknode.contents).size) {
		// 		return 'all';
		// 	}
		// 	return null;
		// },
		generate: async ({filer, log, origin_path}) => {
			log.info('generating Fuz CSS classes...');

			await filer.init();

			const css_classes = new CssClasses(include_set);

			const stats = {
				total_files: filer.files.size,
				external_files: 0,
				internal_files: 0,
				processed_files: 0,
				files_with_content: 0,
				files_with_classes: 0,
			};

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

				if (disknode.contents !== null) {
					stats.files_with_content++;
					const extraction = collect_css_classes_with_locations(disknode.contents, {
						filename: disknode.id,
					});
					if (extraction.classes.size > 0) {
						css_classes.add(disknode.id, extraction.classes, extraction.diagnostics);
						stats.files_with_classes++;
					} else if (extraction.diagnostics.length > 0) {
						// File has no classes but has extraction diagnostics (e.g., @fuz-classes: warning)
						css_classes.add(disknode.id, extraction.classes, extraction.diagnostics);
					}
				}
			}

			// Get all classes with locations and apply exclude filter
			let all_classes = css_classes.get();
			let all_classes_with_locations = css_classes.get_with_locations();
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
				log.info(`  Unique CSS classes found: ${all_classes.size}`);
			}

			const result = generate_classes_css(
				all_classes,
				classes_by_name,
				class_interpreters,
				log,
				all_classes_with_locations,
			);

			// Collect all diagnostics: extraction + generation
			const all_diagnostics: Array<Diagnostic> = [
				...css_classes.get_diagnostics(),
				...result.diagnostics,
			];

			// Check for errors and handle based on on_error setting
			const errors = all_diagnostics.filter((d) => d.level === 'error');
			if (errors.length > 0) {
				if (on_error === 'throw') {
					throw new CssGenerationError(all_diagnostics);
				}
				// 'log' mode - errors are already logged by interpret_css_literal
				log.warn(
					`CSS generation completed with ${errors.length} error${errors.length === 1 ? '' : 's'} (invalid classes skipped)`,
				);
			}

			// Log extraction warnings
			const extraction_warnings = css_classes
				.get_diagnostics()
				.filter((d) => d.level === 'warning');
			for (const warning of extraction_warnings) {
				log.warn(`${warning.location.file}:${warning.location.line}: ${warning.message}`);
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
