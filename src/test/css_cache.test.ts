import {test, expect, describe} from 'vitest';
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

describe('get_cache_path', () => {
	test('mirrors source structure', () => {
		const source = '/tmp/fuz_css_cache_test/project/src/lib/Button.svelte';
		const result = get_cache_path(source, CACHE_DIR, PROJECT_ROOT);
		expect(result).toBe(CACHE_DIR + '/src/lib/Button.svelte.json');
	});

	test('handles nested directories', () => {
		const source = '/tmp/fuz_css_cache_test/project/src/routes/docs/colors/+page.svelte';
		const result = get_cache_path(source, CACHE_DIR, PROJECT_ROOT);
		expect(result).toBe(CACHE_DIR + '/src/routes/docs/colors/+page.svelte.json');
	});

	test('throws for paths outside project root', () => {
		expect(() => get_cache_path('/other/file.ts', CACHE_DIR, PROJECT_ROOT)).toThrow(
			'Source path "/other/file.ts" is not under project root',
		);
	});

	test('handles project root without trailing slash', () => {
		const source = '/tmp/fuz_css_cache_test/project/src/lib/Button.svelte';
		const root_no_slash = '/tmp/fuz_css_cache_test/project';
		const cache_dir = '/tmp/fuz_css_cache_test/project/.fuz/cache/css';
		const result = get_cache_path(source, cache_dir, root_no_slash);
		// Without trailing slash, relative path starts with /
		expect(result).toBe(cache_dir + '/src/lib/Button.svelte.json');
	});

	test('handles source path at project root', () => {
		const source = '/tmp/fuz_css_cache_test/project/file.ts';
		const result = get_cache_path(source, CACHE_DIR, PROJECT_ROOT);
		expect(result).toBe(CACHE_DIR + '/file.ts.json');
	});
});

describe('save_cached_extraction', () => {
	test('round-trips with load_cached_extraction', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'test.json');
		const classes = new Map([['box', [{file: 'test.ts', line: 1, column: 5}]]]);

		await save_cached_extraction(cache_path, 'abc123', classes, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.v).toBe(2);
		expect(loaded!.content_hash).toBe('abc123');
		expect(loaded!.classes).toEqual([['box', [{file: 'test.ts', line: 1, column: 5}]]]);
		expect(loaded!.diagnostics).toBeNull();
	});

	test('preserves multiple classes with multiple locations', async () => {
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

		await save_cached_extraction(cache_path, 'hash123', classes, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.content_hash).toBe('hash123');
		const result = from_cached_extraction(loaded!);
		expect(result.classes?.size).toBe(2);
		expect(result.classes?.get('box')).toEqual([
			{file: 'test.ts', line: 1, column: 5},
			{file: 'test.ts', line: 10, column: 3},
		]);
		expect(result.classes?.get('p_md')).toEqual([{file: 'test.ts', line: 5, column: 8}]);
	});

	test('preserves diagnostics', async () => {
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
		expect(loaded!.classes).toBeNull();
		expect(loaded!.diagnostics).toEqual(diagnostics);
	});

	test('creates nested directories', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'deep/nested/path/file.json');
		const classes = new Map([['test', [{file: 'x.ts', line: 1, column: 1}]]]);

		await save_cached_extraction(cache_path, 'hash', classes, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.content_hash).toBe('hash');
		expect(loaded!.classes).toEqual([['test', [{file: 'x.ts', line: 1, column: 1}]]]);
	});

	test('stores empty classes as null', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'empty.json');
		const classes: Map<string, Array<{file: string; line: number; column: number}>> = new Map();

		await save_cached_extraction(cache_path, 'hash', classes, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.classes).toBeNull();
		expect(loaded!.diagnostics).toBeNull();
	});

	test('stores empty diagnostics array as null', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'empty_diag.json');
		const classes = new Map([['box', [{file: 'test.ts', line: 1, column: 1}]]]);

		await save_cached_extraction(cache_path, 'hash', classes, []);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.diagnostics).toBeNull();
	});

	test('handles null classes parameter', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'null_classes.json');

		await save_cached_extraction(cache_path, 'hash', null, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.v).toBe(2);
		expect(loaded!.content_hash).toBe('hash');
		expect(loaded!.classes).toBeNull();
		expect(loaded!.diagnostics).toBeNull();
	});

	test('overwrites existing file', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'overwrite.json');
		const classes1 = new Map([['old', [{file: 'a.ts', line: 1, column: 1}]]]);
		const classes2 = new Map([['new', [{file: 'b.ts', line: 2, column: 2}]]]);

		await save_cached_extraction(cache_path, 'hash1', classes1, null);
		await save_cached_extraction(cache_path, 'hash2', classes2, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.content_hash).toBe('hash2');
		expect(loaded!.classes).toEqual([['new', [{file: 'b.ts', line: 2, column: 2}]]]);
	});

	test('preserves unicode in class names and file paths', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'unicode.json');
		const classes = new Map([
			['émoji-class', [{file: 'src/компонент.svelte', line: 1, column: 1}]],
			['日本語', [{file: 'src/中文.ts', line: 5, column: 10}]],
		]);

		await save_cached_extraction(cache_path, 'hash', classes, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		const result = from_cached_extraction(loaded!);
		expect(result.classes?.get('émoji-class')).toEqual([
			{file: 'src/компонент.svelte', line: 1, column: 1},
		]);
		expect(result.classes?.get('日本語')).toEqual([{file: 'src/中文.ts', line: 5, column: 10}]);
	});

	test('preserves special characters in class names', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'special.json');
		// CSS literal classes contain colons
		const classes = new Map([
			['display:flex', [{file: 'test.ts', line: 1, column: 1}]],
			['hover:opacity:80%', [{file: 'test.ts', line: 2, column: 1}]],
		]);

		await save_cached_extraction(cache_path, 'hash', classes, null);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		const result = from_cached_extraction(loaded!);
		expect(result.classes?.has('display:flex')).toBe(true);
		expect(result.classes?.has('hover:opacity:80%')).toBe(true);
	});

	test('preserves multiple diagnostics', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'multi_diag.json');
		const diagnostics = [
			{
				phase: 'extraction' as const,
				level: 'warning' as const,
				message: 'first warning',
				suggestion: 'fix it',
				location: {file: 'a.ts', line: 1, column: 1},
			},
			{
				phase: 'extraction' as const,
				level: 'error' as const,
				message: 'an error',
				suggestion: null,
				location: {file: 'b.ts', line: 5, column: 10},
			},
		];

		await save_cached_extraction(cache_path, 'hash', null, diagnostics);
		const loaded = await load_cached_extraction(cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.diagnostics).toHaveLength(2);
		expect(loaded!.diagnostics![0]!.message).toBe('first warning');
		expect(loaded!.diagnostics![1]!.level).toBe('error');
	});
});

describe('load_cached_extraction', () => {
	test('returns null for missing file', async () => {
		const result = await load_cached_extraction('/nonexistent/path.json');
		expect(result).toBeNull();
	});

	test('returns null for corrupted JSON', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'corrupt.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, 'not valid json{{{');

		const result = await load_cached_extraction(cache_path);
		expect(result).toBeNull();
	});

	test('returns null for truncated file', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'truncated.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, '{"v": 1, "content_hash": "abc"'); // missing closing brace

		const result = await load_cached_extraction(cache_path);
		expect(result).toBeNull();
	});

	test('returns null for cache version mismatch', async () => {
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

	test('returns null for empty file', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'empty.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, '');

		const result = await load_cached_extraction(cache_path);
		expect(result).toBeNull();
	});

	test('returns null for valid JSON with wrong structure', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'wrong_structure.json');
		await mkdir(CACHE_DIR, {recursive: true});
		// Valid JSON but missing required fields
		await writeFile(cache_path, JSON.stringify({foo: 'bar'}));

		const result = await load_cached_extraction(cache_path);
		// Returns null because v field is undefined, not equal to CACHE_VERSION
		expect(result).toBeNull();
	});

	test('returns null for JSON null value', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'null.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, 'null');

		const result = await load_cached_extraction(cache_path);
		// null.v is undefined, not equal to CACHE_VERSION
		expect(result).toBeNull();
	});

	test('returns null for version as string instead of number', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'string_version.json');
		await mkdir(CACHE_DIR, {recursive: true});
		// Version is string "2" instead of number 2
		await writeFile(
			cache_path,
			JSON.stringify({v: '2', content_hash: 'x', classes: null, diagnostics: null}),
		);

		const result = await load_cached_extraction(cache_path);
		// Strict equality check: "2" !== 2
		expect(result).toBeNull();
	});
});

describe('delete_cached_extraction', () => {
	test('removes file', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'delete.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, '{}');

		// Verify file exists before deletion
		await expect(readFile(cache_path, 'utf8')).resolves.toBe('{}');

		await delete_cached_extraction(cache_path);

		await expect(readFile(cache_path)).rejects.toThrow();
	});

	test('succeeds for nonexistent file', async () => {
		// Should not throw - this is the assertion
		await expect(delete_cached_extraction('/nonexistent/file.json')).resolves.toBeUndefined();
	});
});

describe('from_cached_extraction', () => {
	test('converts tuples to Map', () => {
		const cached: CachedExtraction = {
			v: 2,
			content_hash: 'abc',
			classes: [['box', [{file: 'f.ts', line: 1, column: 1}]]],
			diagnostics: null,
		};

		const result = from_cached_extraction(cached);
		expect(result.classes).toBeInstanceOf(Map);
		expect(result.classes?.size).toBe(1);
		expect(result.classes?.get('box')).toEqual([{file: 'f.ts', line: 1, column: 1}]);
		expect(result.diagnostics).toBeNull();
	});

	test('handles null classes', () => {
		const cached: CachedExtraction = {
			v: 2,
			content_hash: 'abc',
			classes: null,
			diagnostics: null,
		};

		const result = from_cached_extraction(cached);
		expect(result.classes).toBeNull();
		expect(result.diagnostics).toBeNull();
	});

	test('handles empty classes array', () => {
		// Edge case: empty array instead of null (shouldn't happen in normal operation)
		const cached: CachedExtraction = {
			v: 2,
			content_hash: 'abc',
			classes: [],
			diagnostics: null,
		};

		const result = from_cached_extraction(cached);
		expect(result.classes).toBeInstanceOf(Map);
		expect(result.classes?.size).toBe(0);
	});

	test('preserves non-null diagnostics', () => {
		const diagnostics = [
			{
				phase: 'extraction' as const,
				level: 'warning' as const,
				message: 'test warning',
				suggestion: null,
				location: {file: 'f.ts', line: 1, column: 1},
			},
		];
		const cached: CachedExtraction = {
			v: 2,
			content_hash: 'abc',
			classes: null,
			diagnostics,
		};

		const result = from_cached_extraction(cached);
		expect(result.diagnostics).toBe(diagnostics); // Same reference
	});

	test('handles empty diagnostics array', () => {
		// Edge case: empty array instead of null (shouldn't happen in normal operation)
		const cached: CachedExtraction = {
			v: 2,
			content_hash: 'abc',
			classes: null,
			diagnostics: [],
		};

		const result = from_cached_extraction(cached);
		expect(result.diagnostics).toEqual([]);
	});
});
