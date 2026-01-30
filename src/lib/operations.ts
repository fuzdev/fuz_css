/**
 * Operations interfaces for dependency injection.
 *
 * This is the core pattern enabling testability without mocks.
 * All file system side effects are abstracted into interfaces.
 *
 * **Design principles:**
 * - Internal functions take `ops` as a required first parameter
 * - Public APIs (plugin options) default to `default_fs_operations`
 * - All operations accept a single `options` object parameter
 * - All fallible operations return `Result` from `@fuzdev/fuz_util`
 * - Never throw `Error` in operations - return `Result` with `ok: false`
 * - Use `null` for expected "not found" cases (not errors)
 *
 * **Production usage:**
 * ```typescript
 * import {default_fs_operations} from './operations_defaults.js';
 * const content = await ops.read_text({path: '/path/to/file.json'});
 * if (!content) {
 *   // File not found
 * }
 * ```
 *
 * **Test usage:**
 * ```typescript
 * import {create_mock_fs_ops, create_mock_fs_state} from '../test/fixtures/mock_operations.js';
 * const state = create_mock_fs_state();
 * const ops = create_mock_fs_ops(state);
 * // Use ops in tests - all operations are in-memory
 * ```
 *
 * See `operations_defaults.ts` for real implementations.
 * See `test/fixtures/mock_operations.ts` for mock implementations.
 *
 * @module
 */

import type {Result} from '@fuzdev/fuz_util/result.js';

/**
 * File system operations for cache management.
 * Abstracted to enable test isolation from the actual filesystem.
 */
export interface FsOperations {
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
