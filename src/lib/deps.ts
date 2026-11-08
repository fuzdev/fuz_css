/**
 * Deps interfaces for dependency injection.
 *
 * This is the core pattern enabling testability without mocks.
 * All file system side effects are abstracted into interfaces.
 *
 * **Design principles:**
 * - Internal functions take `deps` as a required first parameter
 * - Public APIs (plugin options) default to `default_fs_deps` (the Vite plugin adds `default_fs_search_deps`)
 * - All deps accept a single `options` object parameter
 * - All fallible deps return `Result<{value: T}, FsError>`
 * - Errors carry a discriminated `kind` so callers branch without string matching
 *
 * **Production usage:**
 * ```typescript
 * import {default_fs_deps} from './deps_defaults.ts';
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
 * import {create_mock_fs_deps, create_mock_fs_state} from '../test/fixtures/mock_deps.ts';
 * const state = create_mock_fs_state();
 * const deps = create_mock_fs_deps(state);
 * // Use deps in tests - all operations are in-memory
 * ```
 *
 * See `deps_defaults.ts` for real implementations.
 * See `test/fixtures/mock_deps.ts` for mock implementations.
 *
 * @internal
 *
 * @module
 */

import type { Result } from '@fuzdev/fuz_util/result.ts';

/**
 * Discriminated filesystem error kinds, so callers branch on `kind` instead of
 * matching `message`.
 */
export type FsError =
	| { kind: 'not_found'; message: string }
	| { kind: 'permission_denied'; message: string }
	| { kind: 'already_exists'; message: string }
	| { kind: 'io_error'; message: string };

/**
 * The filesystem deps the generator reads and writes through: the extraction
 * cache's reads, atomic writes, and removals, and the load of the default
 * `style.css`. Abstracted to enable test isolation from the actual
 * filesystem.
 */
export interface FsDeps {
	/**
	 * Reads a text file.
	 * Returns a `not_found` error if the file doesn't exist.
	 */
	read_text: (options: { path: string }) => Promise<Result<{ value: string }, FsError>>;

	/**
	 * Writes a text file atomically (temp file + rename for crash safety).
	 * Creates parent directories if they don't exist.
	 */
	write_text_atomic: (options: {
		path: string;
		content: string;
	}) => Promise<Result<object, FsError>>;

	/**
	 * Removes a file. Returns a `not_found` error if the file doesn't exist -
	 * callers that want `rm -f` semantics should ignore that kind explicitly.
	 */
	unlink: (options: { path: string }) => Promise<Result<object, FsError>>;
}

/**
 * The file search the Vite plugin's dev pre-scan goes through, apart from
 * `FsDeps` because nothing else searches.
 */
export interface FsSearchDeps {
	/**
	 * Recursively finds the files under a directory, in no particular order.
	 * Every directory is descended into, and excluding files is left to
	 * `file_filter`. A symlink isn't followed: it counts as a file, whatever
	 * it points to. A missing directory, including a subdirectory removed
	 * during the search, makes the whole result empty rather than an error.
	 * A throwing `file_filter` comes back as an error result classified by its
	 * `code` (`io_error` with none), and one with `ENOENT` reads as a missing
	 * directory.
	 *
	 * @param options.dir - the absolute directory to search, its trailing slash optional
	 * @param options.file_filter - receives each file's absolute `id`, which is included when it returns `true`
	 * @returns each included file's absolute path as `id`
	 */
	search_files: (options: {
		dir: string;
		file_filter: (id: string) => boolean;
	}) => Promise<Result<{ value: Array<{ id: string }> }, FsError>>;
}
