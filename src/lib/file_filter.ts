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
 * Excludes test files (.test.ts, .spec.ts) and generated files (.gen.ts).
 * Excludes files in test directories (/test/, /tests/, /__tests__/, /__mocks__/).
 */
export const filter_file_default: FileFilter = (path) => {
	if (
		path.includes('.test.') ||
		path.includes('.spec.') ||
		path.includes('/test/') ||
		path.includes('/tests/') ||
		path.includes('/__tests__/') ||
		path.includes('/__mocks__/') ||
		path.startsWith('test/') ||
		path.startsWith('tests/') ||
		path.startsWith('__tests__/') ||
		path.startsWith('__mocks__/') ||
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
