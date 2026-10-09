/**
 * File filtering utilities for CSS class extraction.
 *
 * @module
 */

import { ensure_end } from '@fuzdev/fuz_util/string.ts';

/**
 * Filter function to determine which files to process for CSS class extraction.
 * The generators pass each file's absolute id and the project root (Vite's
 * `root`, Gro's `project_root`), so a filter can judge a path by where it sits
 * in the project rather than where the project sits on disk. A filter that
 * ignores the root keeps working.
 */
export type FileFilter = (path: string, root: string) => boolean;

const NODE_MODULES_SEGMENT = '/node_modules/';

// a test directory as a path segment, at the start of the scoped path or after a slash
const TEST_DIRECTORY_MATCHER = /(?:^|\/)(?:test|tests|__tests__|__mocks__)\//u;

/**
 * The part of a file id the default filter's directory checks look at: the
 * path inside its package for a dependency (after `node_modules/<pkg>/` or
 * `node_modules/@scope/pkg/`), the root-relative path for a project file, and
 * the id unchanged outside both (a linked package or a sibling workspace,
 * which a custom filter can judge on its own terms).
 *
 * @param path - an absolute file id, or an already relative path
 * @param root - the project root, with or without a trailing slash; `''` for none
 * @returns the package-relative, root-relative, or unchanged path
 */
export const to_filter_scope = (path: string, root: string): string => {
	const nm = path.lastIndexOf(NODE_MODULES_SEGMENT);
	if (nm !== -1) {
		const rest = path.slice(nm + NODE_MODULES_SEGMENT.length);
		// skip the package name, scoped or not
		const segments = rest.split('/');
		const name_length = segments[0]?.startsWith('@') ? 2 : 1;
		return segments.slice(name_length).join('/');
	}
	if (root) {
		const prefix = ensure_end(root, '/');
		if (path.startsWith(prefix)) return path.slice(prefix.length);
	}
	return path;
};

/**
 * Whether a file is CSS, which is scanned for the `var(--*)` references it
 * makes but has no classes or elements to extract.
 *
 * @param path - a file id or path
 */
export const is_css_file = (path: string): boolean => path.endsWith('.css');

/**
 * Default file filter for CSS class extraction.
 * Includes .svelte, .html, .ts, .js, .tsx, .jsx files, and .css files for
 * their variable references (see `is_css_file`) - except a CSS id with a
 * query, like the `Foo.svelte?svelte&type=style&lang.css` id of a Svelte
 * component's styles, which its `.svelte` file already covers.
 * Excludes test files (.test.ts, .spec.ts) and generated files (.gen.ts).
 * Excludes files in test directories (`test/`, `tests/`, `__tests__/`,
 * `__mocks__/`), judged inside the project or the dependency's package (see
 * `to_filter_scope`), so a project checked out under a `test/` directory
 * still extracts.
 */
export const filter_file_default: FileFilter = (path, root) => {
	const scoped = to_filter_scope(path, root);
	if (
		scoped.includes('.test.') ||
		scoped.includes('.spec.') ||
		scoped.includes('.gen.') ||
		TEST_DIRECTORY_MATCHER.test(scoped)
	) {
		return false;
	}
	const ext = path.slice(path.lastIndexOf('.'));
	return (
		ext === '.svelte' ||
		ext === '.html' ||
		ext === '.ts' ||
		ext === '.js' ||
		ext === '.tsx' ||
		ext === '.jsx' ||
		(ext === '.css' && !path.includes('?'))
	);
};
