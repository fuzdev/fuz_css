/**
 * Deps interfaces for dependency injection.
 *
 * This is the core pattern enabling testability without mocks.
 * All file system side effects are abstracted into interfaces.
 *
 * **Design principles:**
 * - Internal functions take `deps` as a required first parameter
 * - Public APIs (plugin options) default to `default_cache_deps`
 * - All deps accept a single `options` object parameter
 * - All fallible deps return `Result` from `@fuzdev/fuz_util`
 * - Never throw `Error` in deps - return `Result` with `ok: false`
 * - Use `null` for expected "not found" cases (not errors)
 *
 * **Production usage:**
 * ```typescript
 * import {default_cache_deps} from './deps_defaults.js';
 * const content = await deps.read_text({path: '/path/to/file.json'});
 * if (!content) {
 *   // File not found
 * }
 * ```
 *
 * **Test usage:**
 * ```typescript
 * import {create_mock_cache_deps, create_mock_fs_state} from '../test/fixtures/mock_deps.js';
 * const state = create_mock_fs_state();
 * const deps = create_mock_cache_deps(state);
 * // Use deps in tests - all operations are in-memory
 * ```
 *
 * See `deps_defaults.ts` for real implementations.
 * See `test/fixtures/mock_deps.ts` for mock implementations.
 *
 * @module
 */

import type {Result} from '@fuzdev/fuz_util/result.js';

/**
 * Cache-related file system deps.
 * Abstracted to enable test isolation from the actual filesystem.
 *
 * Named `CacheDeps` (not `FsDeps`) because it only covers
 * the specific deps needed for cache management, not general
 * filesystem access.
 */
export interface CacheDeps {
	/**
	 * Reads a text file.
	 * Returns `null` if file doesn't exist.
	 */
	read_text: (options: {path: string}) => Promise<string | null>;

	/**
	 * Writes a text file atomically (temp file + rename for crash safety).
	 * Creates parent directories if they don't exist.
	 */
	write_text_atomic: (options: {
		path: string;
		content: string;
	}) => Promise<Result<object, {message: string}>>;

	/**
	 * Removes a file. Succeeds silently if file doesn't exist.
	 */
	unlink: (options: {path: string}) => Promise<Result<object, {message: string}>>;
}
