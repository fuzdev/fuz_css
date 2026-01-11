import {test, expect} from 'vitest';
import {join} from 'node:path';
import {mkdir, rm, writeFile, readFile} from 'node:fs/promises';

import {
	get_cache_path,
	load_cached_extraction,
	save_cached_extraction,
	delete_cached_extraction,
	from_cached_extraction,
	type CachedExtraction,
} from '$lib/css_cache.js';

const TEST_DIR = '/tmp/fuz_css_cache_test';
const PROJECT_ROOT = '/tmp/fuz_css_cache_test/project/';
const CACHE_DIR = '/tmp/fuz_css_cache_test/project/.fuz/cache/css';

const setup = async (): Promise<void> => {
	await rm(TEST_DIR, {recursive: true, force: true});
	await mkdir(join(PROJECT_ROOT, 'src/lib'), {recursive: true});
};

test('get_cache_path mirrors source structure', () => {
	const source = '/tmp/fuz_css_cache_test/project/src/lib/Button.svelte';
	const result = get_cache_path(source, CACHE_DIR, PROJECT_ROOT);
	expect(result).toBe(CACHE_DIR + '/src/lib/Button.svelte.json');
});

test('get_cache_path handles nested directories', () => {
	const source = '/tmp/fuz_css_cache_test/project/src/routes/docs/colors/+page.svelte';
	const result = get_cache_path(source, CACHE_DIR, PROJECT_ROOT);
	expect(result).toBe(CACHE_DIR + '/src/routes/docs/colors/+page.svelte.json');
});

test('get_cache_path throws for paths outside project root', () => {
	expect(() => get_cache_path('/other/file.ts', CACHE_DIR, PROJECT_ROOT)).toThrow(
		'Source path "/other/file.ts" is not under project root',
	);
});

test('save and load cached extraction round-trips', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'test.json');
	const classes = new Map([['box', [{file: 'test.ts', line: 1, column: 5}]]]);

	await save_cached_extraction(cache_path, 'abc123', classes, []);
	const loaded = await load_cached_extraction(cache_path);

	expect(loaded).not.toBeNull();
	expect(loaded!.content_hash).toBe('abc123');
	expect(loaded!.classes).toEqual([['box', [{file: 'test.ts', line: 1, column: 5}]]]);
	expect(loaded!.diagnostics).toEqual([]);
});

test('save and load preserves multiple classes with multiple locations', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'multi.json');
	const classes = new Map([
		[
			'box',
			[
				{file: 'test.ts', line: 1, column: 5},
				{file: 'test.ts', line: 10, column: 3},
			],
		],
		['p_md', [{file: 'test.ts', line: 5, column: 8}]],
	]);

	await save_cached_extraction(cache_path, 'hash123', classes, []);
	const loaded = await load_cached_extraction(cache_path);

	expect(loaded).not.toBeNull();
	const result = from_cached_extraction(loaded!);
	expect(result.classes.size).toBe(2);
	expect(result.classes.get('box')?.length).toBe(2);
	expect(result.classes.get('p_md')?.length).toBe(1);
});

test('save and load preserves diagnostics', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'diag.json');
	const classes: Map<string, Array<{file: string; line: number; column: number}>> = new Map();
	const diagnostics = [
		{
			phase: 'extraction' as const,
			level: 'warning' as const,
			message: '@fuz-classes: is deprecated',
			suggestion: 'Remove the colon',
			location: {file: 'test.ts', line: 3, column: 1},
		},
	];

	await save_cached_extraction(cache_path, 'hash456', classes, diagnostics);
	const loaded = await load_cached_extraction(cache_path);

	expect(loaded).not.toBeNull();
	expect(loaded!.diagnostics).toEqual(diagnostics);
});

test('load_cached_extraction returns null for missing file', async () => {
	const result = await load_cached_extraction('/nonexistent/path.json');
	expect(result).toBeNull();
});

test('load_cached_extraction returns null for corrupted JSON', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'corrupt.json');
	await mkdir(CACHE_DIR, {recursive: true});
	await writeFile(cache_path, 'not valid json{{{');

	const result = await load_cached_extraction(cache_path);
	expect(result).toBeNull();
});

test('load_cached_extraction returns null for truncated file', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'truncated.json');
	await mkdir(CACHE_DIR, {recursive: true});
	await writeFile(cache_path, '{"v": 1, "content_hash": "abc"'); // missing closing brace

	const result = await load_cached_extraction(cache_path);
	expect(result).toBeNull();
});

test('load_cached_extraction returns null for cache version mismatch', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'old_cache.json');
	await mkdir(CACHE_DIR, {recursive: true});
	await writeFile(
		cache_path,
		JSON.stringify({v: 999, content_hash: 'x', classes: [], diagnostics: []}),
	);

	const result = await load_cached_extraction(cache_path);
	expect(result).toBeNull();
});

test('delete_cached_extraction removes file', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'delete.json');
	await mkdir(CACHE_DIR, {recursive: true});
	await writeFile(cache_path, '{}');

	await delete_cached_extraction(cache_path);

	await expect(readFile(cache_path)).rejects.toThrow();
});

test('delete_cached_extraction succeeds for nonexistent file', async () => {
	// Should not throw
	await delete_cached_extraction('/nonexistent/file.json');
});

test('from_cached_extraction converts tuples to Map', () => {
	const cached: CachedExtraction = {
		v: 1,
		content_hash: 'abc',
		classes: [['box', [{file: 'f.ts', line: 1, column: 1}]]],
		diagnostics: [],
	};

	const result = from_cached_extraction(cached);
	expect(result.classes).toBeInstanceOf(Map);
	expect(result.classes.get('box')).toEqual([{file: 'f.ts', line: 1, column: 1}]);
	expect(result.diagnostics).toEqual([]);
});

test('from_cached_extraction handles empty classes', () => {
	const cached: CachedExtraction = {
		v: 1,
		content_hash: 'abc',
		classes: [],
		diagnostics: [],
	};

	const result = from_cached_extraction(cached);
	expect(result.classes.size).toBe(0);
});

test('save_cached_extraction creates nested directories', async () => {
	await setup();
	const cache_path = join(CACHE_DIR, 'deep/nested/path/file.json');
	const classes = new Map([['test', [{file: 'x.ts', line: 1, column: 1}]]]);

	await save_cached_extraction(cache_path, 'hash', classes, []);
	const loaded = await load_cached_extraction(cache_path);

	expect(loaded).not.toBeNull();
	expect(loaded!.content_hash).toBe('hash');
});
