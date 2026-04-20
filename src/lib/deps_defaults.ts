/**
 * Production implementations of deps interfaces.
 *
 * Provides real filesystem deps for production use.
 * For interface definitions and dependency injection pattern, see `deps.ts`.
 *
 * @module
 */

import {readFile, writeFile, mkdir, unlink, rename} from 'node:fs/promises';
import {dirname} from 'node:path';

import type {Result} from '@fuzdev/fuz_util/result.js';
import {classify_fs_error, type FsError} from '@fuzdev/fuz_util/fs.js';

import type {CacheDeps} from './deps.js';

/**
 * Wraps an async void-returning function, converting thrown errors to typed `FsError`.
 */
const wrap_void = async (fn: () => Promise<unknown>): Promise<Result<object, FsError>> => {
	try {
		await fn();
		return {ok: true};
	} catch (error) {
		return {ok: false, ...classify_fs_error(error)};
	}
};

/**
 * Default filesystem deps using `node:fs/promises`.
 */
export const default_cache_deps: CacheDeps = {
	read_text: async ({path}) => {
		try {
			return {ok: true, value: await readFile(path, 'utf8')};
		} catch (error) {
			return {ok: false, ...classify_fs_error(error)};
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

	unlink: async ({path}) => wrap_void(() => unlink(path)),
};
