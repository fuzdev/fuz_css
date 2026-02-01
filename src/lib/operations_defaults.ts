/**
 * Production implementations of operations interfaces.
 *
 * Provides real filesystem operations for production use.
 * For interface definitions and dependency injection pattern, see `operations.ts`.
 *
 * @module
 */

import {readFile, writeFile, mkdir, unlink, rename} from 'node:fs/promises';
import {dirname} from 'node:path';

import type {CacheOperations} from './operations.js';

/**
 * Wraps an async function that returns void, converting exceptions to Result.
 */
const wrap_void = async (
	fn: () => Promise<unknown>,
): Promise<{ok: true} | {ok: false; message: string}> => {
	try {
		await fn();
		return {ok: true};
	} catch (error) {
		return {ok: false, message: error instanceof Error ? error.message : String(error)};
	}
};

/**
 * Default filesystem operations using `node:fs/promises`.
 */
export const default_cache_operations: CacheOperations = {
	read_text: async ({path}) => {
		try {
			return await readFile(path, 'utf8');
		} catch {
			return null;
		}
	},

	write_text_atomic: async ({path, content}) => {
		return wrap_void(async () => {
			// Atomic write: temp file + rename
			// Include pid + timestamp to avoid conflicts with concurrent writes
			await mkdir(dirname(path), {recursive: true});
			const temp_path = path + '.tmp.' + process.pid + '.' + Date.now();
			await writeFile(temp_path, content);
			await rename(temp_path, path);
		});
	},

	unlink: async ({path}) => {
		return wrap_void(async () => {
			await unlink(path).catch(() => {
				// Ignore if already gone
			});
		});
	},
};
