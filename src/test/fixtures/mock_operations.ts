/**
 * Mock filesystem operations for testing.
 *
 * Provides in-memory implementations of `CacheOperations` for isolated unit tests.
 *
 * @module
 */

import type {CacheOperations} from '$lib/operations.js';

/**
 * In-memory filesystem state for mock operations.
 */
export interface MockFsState {
	/** Map of file paths to their contents */
	files: Map<string, string>;
}

/**
 * Creates a new empty mock filesystem state.
 */
export const create_mock_fs_state = (): MockFsState => ({
	files: new Map(),
});

/**
 * Creates mock filesystem operations backed by in-memory state.
 *
 * @param state - The mock filesystem state to use
 */
export const create_mock_cache_ops = (state: MockFsState): CacheOperations => ({
	read_text: async ({path}) => {
		return state.files.get(path) ?? null;
	},

	write_text_atomic: async ({path, content}) => {
		state.files.set(path, content);
		return {ok: true};
	},

	unlink: async ({path}) => {
		state.files.delete(path);
		return {ok: true};
	},
});
