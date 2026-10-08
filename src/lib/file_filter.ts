/**
 * File filtering utilities for CSS class extraction.
 *
 * @module
 */

/**
 * Filter function to determine which files to process for CSS class extraction.
 * The generators pass each file's absolute id and the project root (Vite's
 * `root`, Gro's `project_root`), so a filter can judge a path by where it sits
 * in the project rather than where the project sits on disk. A filter that
 * ignores the root keeps working.
 */
export type FileFilter = (path: string, root: string) => boolean;

const NODE_MODULES_SEGMENT = '/node_modules/';

/**
 * The part of a file id the default filter's directory checks look at: the
 * path inside its package for a dependency (after `node_modules/<pkg>/` or
 * `node_modules/@scope/pkg/`), the root-relative path for a project file, and
 * the id unchanged outside both (a linked package or a sibling workspace,
 * which a custom filter can judge on its own terms).
 *
 * @param path - an absolute file id, or an already relative path
 * @param root - the project root, with or without a trailing slash; `''` for none
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
		const prefix = root.endsWith('/') ? root : root + '/';
		if (path.startsWith(prefix)) return path.slice(prefix.length);
	}
	return path;
};

/**
 * Default file filter for CSS class extraction.
 * Includes .svelte, .html, .ts, .js, .tsx, .jsx files.
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
		scoped.includes('/test/') ||
		scoped.includes('/tests/') ||
		scoped.includes('/__tests__/') ||
		scoped.includes('/__mocks__/') ||
		scoped.startsWith('test/') ||
		scoped.startsWith('tests/') ||
		scoped.startsWith('__tests__/') ||
		scoped.startsWith('__mocks__/') ||
		scoped.includes('.gen.')
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
		ext === '.jsx'
	);
};
