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
 * - All fallible deps return `Result<{value: T}, FsError>` from `@fuzdev/fuz_util`
 * - Errors carry a discriminated `kind` so callers branch without string matching
 *
 * **Production usage:**
 * ```typescript
 * import {default_cache_deps} from './deps_defaults.js';
 * const r = await deps.read_text({path: '/path/to/file.json'});
 * if (!r.ok) {
 *   if (r.kind === 'not_found') {
 *     // file missing
 *   }
 *   return;
 * }
 * const content = r.value;
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
import type {FsError} from '@fuzdev/fuz_util/fs.js';

export type {FsError};

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
	 * Returns a `not_found` error if the file doesn't exist.
	 */
	read_text: (options: {path: string}) => Promise<Result<{value: string}, FsError>>;

	/**
	 * Writes a text file atomically (temp file + rename for crash safety).
	 * Creates parent directories if they don't exist.
	 */
	write_text_atomic: (options: {path: string; content: string}) => Promise<Result<object, FsError>>;

	/**
	 * Removes a file. Returns a `not_found` error if the file doesn't exist —
	 * callers that want `rm -f` semantics should ignore that kind explicitly.
	 */
	unlink: (options: {path: string}) => Promise<Result<object, FsError>>;
}
