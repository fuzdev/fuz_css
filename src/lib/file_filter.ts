/**
 * File filtering utilities for CSS class extraction.
 *
 * @module
 */

/**
 * Filter function to determine which files to process for CSS class extraction.
 */
export type FileFilter = (path: string) => boolean;

/**
 * Default file filter for CSS class extraction.
 * Includes .svelte, .html, .ts, .js, .tsx, .jsx files.
 * Excludes test files and generated files.
 */
export const filter_file_default: FileFilter = (path) => {
	if (
		path.includes('.test.') ||
		path.includes('/test/') ||
		path.includes('/tests/') ||
		path.includes('.gen.')
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
