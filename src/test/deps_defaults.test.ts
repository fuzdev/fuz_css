import { describe, test, assert, beforeEach, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';

import { default_fs_search_deps, fs_classify_error } from '#lib/deps_defaults.ts';

describe('fs_classify_error', () => {
	const cases = [
		['ENOENT', 'not_found'],
		['EACCES', 'permission_denied'],
		['EPERM', 'permission_denied'],
		['EEXIST', 'already_exists'],
		['EISDIR', 'io_error']
	] as const;

	for (const [code, kind] of cases) {
		test(`${code} is ${kind}`, () => {
			const error = Object.assign(new Error('the message'), { code });
			assert.deepEqual(fs_classify_error(error), { kind, message: 'the message' });
		});
	}

	test('a value with no code is io_error', () => {
		assert.strictEqual(fs_classify_error(new Error('plain')).kind, 'io_error');
		assert.strictEqual(fs_classify_error('a string').kind, 'io_error');
		assert.strictEqual(fs_classify_error(null).kind, 'io_error');
	});
});

describe('default_fs_search_deps.search_files', () => {
	let root: string;

	beforeEach(async () => {
		root = (await mkdtemp(join(tmpdir(), 'fuz_css_search_files_'))) + '/';
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	const write_files = async (paths: Array<string>): Promise<void> => {
		for (const path of paths) {
			await mkdir(join(root, path, '..'), { recursive: true });
			await writeFile(join(root, path), '');
		}
	};

	const search = async (
		dir: string,
		file_filter: (id: string) => boolean = () => true
	): Promise<Array<string>> => {
		const r = await default_fs_search_deps.search_files({ dir, file_filter });
		assert(r.ok, r.ok ? undefined : r.message);
		return r.value.map((f) => f.id).sort();
	};

	test('finds nested files as absolute ids', async () => {
		await write_files(['a.ts', 'sub/b.ts', 'sub/deep/c.ts']);
		assert.deepEqual(await search(root), [
			root + 'a.ts',
			root + 'sub/b.ts',
			root + 'sub/deep/c.ts'
		]);
	});

	test('takes a dir with or without its trailing slash', async () => {
		await write_files(['sub/b.ts']);
		assert.deepEqual(await search(root + 'sub'), [root + 'sub/b.ts']);
		assert.deepEqual(await search(root + 'sub/'), [root + 'sub/b.ts']);
	});

	test('file_filter gets absolute ids, and only files', async () => {
		await write_files(['keep.ts', 'drop.md', 'sub/keep.ts']);
		const seen: Array<string> = [];
		const found = await search(root, (id) => {
			seen.push(id);
			return id.endsWith('.ts');
		});
		assert.deepEqual(found, [root + 'keep.ts', root + 'sub/keep.ts']);
		assert.deepEqual(seen.sort(), [root + 'drop.md', root + 'keep.ts', root + 'sub/keep.ts']);
	});

	test('descends into every directory, excluding none itself', async () => {
		await write_files(['node_modules/pkg/a.ts', '.hidden/b.ts', 'dist/c.ts']);
		assert.deepEqual(await search(root), [
			root + '.hidden/b.ts',
			root + 'dist/c.ts',
			root + 'node_modules/pkg/a.ts'
		]);
	});

	test('a symlink is a file: reported, never followed', async () => {
		await write_files(['real/a.ts', 'target.ts']);
		await symlink(root + 'real', root + 'link_dir');
		await symlink(root + 'target.ts', root + 'link_file.ts');
		await symlink(root + 'gone', root + 'link_broken');
		assert.deepEqual(await search(root), [
			root + 'link_broken',
			root + 'link_dir',
			root + 'link_file.ts',
			root + 'real/a.ts',
			root + 'target.ts'
		]);
	});

	test('a missing directory is no files', async () => {
		assert.deepEqual(await search(root + 'nope'), []);
	});

	test('a file given as the directory is an error', async () => {
		await write_files(['a.ts']);
		const r = await default_fs_search_deps.search_files({
			dir: root + 'a.ts',
			file_filter: () => true
		});
		assert(!r.ok);
		assert.strictEqual(r.kind, 'io_error');
	});

	test('an unreadable directory is permission_denied', async (ctx) => {
		if (process.getuid?.() === 0) ctx.skip();
		await write_files(['locked/a.ts']);
		await chmod(root + 'locked', 0o000);
		try {
			const r = await default_fs_search_deps.search_files({ dir: root, file_filter: () => true });
			assert(!r.ok);
			assert.strictEqual(r.kind, 'permission_denied');
		} finally {
			await chmod(root + 'locked', 0o755);
		}
	});

	test('a directory removed during the search empties the whole result', async () => {
		await write_files(['f', 'z/x']);
		const r = await default_fs_search_deps.search_files({
			dir: root,
			// the file's filter call deletes its sibling directory before that directory is crawled
			file_filter: (id) => {
				if (id.endsWith('/f')) rmSync(`${root}z`, { recursive: true, force: true });
				return true;
			}
		});
		assert(r.ok, r.ok ? undefined : r.message);
		assert.deepEqual(r.value, []);
	});

	test('a throwing file_filter is an error result', async () => {
		await write_files(['a.ts']);
		const r = await default_fs_search_deps.search_files({
			dir: root,
			file_filter: () => {
				throw new Error('filter failed');
			}
		});
		assert(!r.ok);
		assert.strictEqual(r.kind, 'io_error');
		assert.strictEqual(r.message, 'filter failed');
	});

	test('a throwing file_filter leaves no crawl to reject unhandled', async () => {
		// many of each so a directory lists before the first file on any filesystem order
		const names = Array.from({ length: 20 }, (_, i) => i);
		await write_files(names.flatMap((i) => [`f${i}.ts`, `d${i}/a.ts`]));

		const unhandled: Array<unknown> = [];
		const on_unhandled = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', on_unhandled);
		try {
			const r = await default_fs_search_deps.search_files({
				dir: root,
				file_filter: () => {
					throw new Error('filter failed');
				}
			});
			assert(!r.ok);
			await new Promise((resolve) => setTimeout(resolve, 20));
			assert.deepStrictEqual(unhandled, []);
		} finally {
			process.off('unhandledRejection', on_unhandled);
		}
	});
});
