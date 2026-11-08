/**
 * Production implementations of deps interfaces.
 *
 * Provides real filesystem deps for production use.
 * For interface definitions and dependency injection pattern, see `deps.ts`.
 *
 * @internal
 *
 * @module
 */

import { readFile, readdir, writeFile, mkdir, unlink, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Result } from '@fuzdev/fuz_util/result.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';
import { ensure_end } from '@fuzdev/fuz_util/string.ts';

import type { FsDeps, FsError, FsSearchDeps } from './deps.ts';

/**
 * Classifies a thrown filesystem error into a discriminated `FsError` by its
 * Node `code`. Unknown codes fall through to `io_error`.
 */
export const fs_classify_error = (error: unknown): FsError => {
	const message = to_error_message(error);
	if (error && typeof error === 'object' && 'code' in error) {
		switch (error.code) {
			case 'ENOENT':
				return { kind: 'not_found', message };
			case 'EACCES':
			case 'EPERM':
				return { kind: 'permission_denied', message };
			case 'EEXIST':
				return { kind: 'already_exists', message };
		}
	}
	return { kind: 'io_error', message };
};

/**
 * Wraps an async void-returning function, converting thrown errors to typed `FsError`.
 */
const wrap_void = async (fn: () => Promise<unknown>): Promise<Result<object, FsError>> => {
	try {
		await fn();
		return { ok: true };
	} catch (error) {
		return { ok: false, ...fs_classify_error(error) };
	}
};

/**
 * Collects the files under a directory into `ids`.
 *
 * @param dir - the directory, with a trailing slash
 * @param file_filter - receives each file's absolute id
 * @param ids - the included files' ids
 * @mutates ids - appends each included file
 */
const crawl_files = async (
	dir: string,
	file_filter: (id: string) => boolean,
	ids: Array<{ id: string }>
): Promise<void> => {
	let subdirs: Array<string> | undefined;
	for (const dirent of await readdir(dir, { withFileTypes: true })) {
		const id = dir + dirent.name;
		if (dirent.isDirectory()) {
			(subdirs ??= []).push(id + '/');
		} else if (file_filter(id)) {
			ids.push({ id });
		}
	}
	// started after the loop so a throwing `file_filter` can't orphan a crawl
	// whose rejection nothing awaits
	if (subdirs) await Promise.all(subdirs.map((d) => crawl_files(d, file_filter, ids)));
};

/**
 * Default filesystem deps using `node:fs/promises`.
 */
export const default_fs_deps: FsDeps = {
	read_text: async ({ path }) => {
		try {
			return { ok: true, value: await readFile(path, 'utf8') };
		} catch (error) {
			return { ok: false, ...fs_classify_error(error) };
		}
	},

	write_text_atomic: async ({ path, content }) => {
		return wrap_void(async () => {
			// Atomic write: temp file + rename
			// Include pid + timestamp to avoid conflicts with concurrent writes
			await mkdir(dirname(path), { recursive: true });
			const temp_path = path + '.tmp.' + process.pid + '.' + Date.now();
			await writeFile(temp_path, content);
			await rename(temp_path, path);
		});
	},

	unlink: async ({ path }) => wrap_void(() => unlink(path))
};

/**
 * Default file search using `node:fs/promises`.
 */
export const default_fs_search_deps: FsSearchDeps = {
	search_files: async ({ dir, file_filter }) => {
		const value: Array<{ id: string }> = [];
		try {
			await crawl_files(ensure_end(dir, '/'), file_filter, value);
		} catch (error) {
			const classified = fs_classify_error(error);
			if (classified.kind === 'not_found') return { ok: true, value: [] };
			return { ok: false, ...classified };
		}
		return { ok: true, value };
	}
};
