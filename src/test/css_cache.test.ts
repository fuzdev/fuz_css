import {test, expect, describe} from 'vitest';
import {join} from 'node:path';
import {mkdir, rm, writeFile, readFile} from 'node:fs/promises';

import {
	get_cache_path,
	load_cached_extraction,
	save_cached_extraction,
	delete_cached_extraction,
	from_cached_extraction,
	CSS_CACHE_VERSION,
	type CachedExtraction,
} from '$lib/css_cache.js';
import type {SourceLocation, ExtractionDiagnostic} from '$lib/diagnostics.js';
import {default_cache_operations} from '$lib/operations_defaults.js';
import {create_mock_fs_state, create_mock_cache_ops} from './fixtures/mock_operations.js';
import {
	loc,
	make_classes,
	make_extraction_diagnostic as make_diagnostic,
	EMPTY_EXTRACTION,
} from './test_helpers.js';

const ops = default_cache_operations;

const TEST_DIR = '/tmp/fuz_css_cache_test';
const PROJECT_ROOT = '/tmp/fuz_css_cache_test/project/';
const CACHE_DIR = '/tmp/fuz_css_cache_test/project/.fuz/cache/css';

//
// Test data factories
//

const make_cached = (overrides: Partial<CachedExtraction> = {}): CachedExtraction => ({
	v: CSS_CACHE_VERSION,
	content_hash: 'test-hash',
	classes: null,
	explicit_classes: null,
	diagnostics: null,
	elements: null,
	explicit_elements: null,
	explicit_variables: null,
	...overrides,
});

//
// Test helpers
//

interface SaveAndLoadOptions {
	classes?: Map<string, Array<SourceLocation>> | null;
	explicit_classes?: Set<string> | null;
	diagnostics?: Array<ExtractionDiagnostic> | null;
	elements?: Set<string> | null;
	explicit_elements?: Set<string> | null;
	explicit_variables?: Set<string> | null;
	content_hash?: string;
}

/** Save → load → assert valid → return typed result */
const save_and_load = async (
	cache_path: string,
	options: SaveAndLoadOptions = {},
): Promise<CachedExtraction> => {
	const {
		classes = null,
		explicit_classes = null,
		diagnostics = null,
		elements = null,
		explicit_elements = null,
		explicit_variables = null,
		content_hash = 'test-hash',
	} = options;

	await save_cached_extraction(ops, cache_path, content_hash, {
		classes,
		explicit_classes,
		diagnostics,
		elements,
		explicit_elements,
		explicit_variables,
	});
	const loaded = await load_cached_extraction(ops, cache_path);
	expect(loaded).not.toBeNull();
	expect(loaded!.v).toBe(CSS_CACHE_VERSION);
	return loaded!;
};

const setup = async (): Promise<void> => {
	await rm(TEST_DIR, {recursive: true, force: true});
	await mkdir(join(PROJECT_ROOT, 'src/lib'), {recursive: true});
};

//
// get_cache_path
//

describe('get_cache_path', () => {
	const cases = [
		{
			name: 'mirrors source structure',
			source: '/tmp/fuz_css_cache_test/project/src/lib/Button.svelte',
			expected: CACHE_DIR + '/src/lib/Button.svelte.json',
		},
		{
			name: 'handles nested directories',
			source: '/tmp/fuz_css_cache_test/project/src/routes/docs/colors/+page.svelte',
			expected: CACHE_DIR + '/src/routes/docs/colors/+page.svelte.json',
		},
		{
			name: 'handles source path at project root',
			source: '/tmp/fuz_css_cache_test/project/file.ts',
			expected: CACHE_DIR + '/file.ts.json',
		},
	];

	test.each(cases)('$name', ({source, expected}) => {
		expect(get_cache_path(source, CACHE_DIR, PROJECT_ROOT)).toBe(expected);
	});

	test('throws for paths outside project root', () => {
		expect(() => get_cache_path('/other/file.ts', CACHE_DIR, PROJECT_ROOT)).toThrow(
			'Source path "/other/file.ts" is not under project root',
		);
	});

	test('handles project root without trailing slash', () => {
		const source = '/tmp/fuz_css_cache_test/project/src/lib/Button.svelte';
		const root_no_slash = '/tmp/fuz_css_cache_test/project';
		expect(get_cache_path(source, CACHE_DIR, root_no_slash)).toBe(
			CACHE_DIR + '/src/lib/Button.svelte.json',
		);
	});

	test('produces same result with/without trailing slash', () => {
		const source = '/tmp/fuz_css_cache_test/project/src/file.ts';
		const with_slash = get_cache_path(source, CACHE_DIR, '/tmp/fuz_css_cache_test/project/');
		const without_slash = get_cache_path(source, CACHE_DIR, '/tmp/fuz_css_cache_test/project');
		expect(with_slash).toBe(without_slash);
	});

	test('handles deeply nested paths', () => {
		const source = '/tmp/fuz_css_cache_test/project/a/b/c/d/e/file.svelte';
		const expected = CACHE_DIR + '/a/b/c/d/e/file.svelte.json';
		expect(get_cache_path(source, CACHE_DIR, PROJECT_ROOT)).toBe(expected);
	});
});

//
// save_cached_extraction round-trips
//

describe('save_cached_extraction', () => {
	test('round-trips basic classes', async () => {
		await setup();
		const classes = make_classes([['box', [loc('test.ts', 1, 5)]]]);

		const loaded = await save_and_load(join(CACHE_DIR, 'test.json'), {
			classes,
			content_hash: 'abc123',
		});

		expect(loaded.content_hash).toBe('abc123');
		expect(loaded.classes).toEqual([['box', [loc('test.ts', 1, 5)]]]);
		expect(loaded.diagnostics).toBeNull();
	});

	test('preserves multiple classes with multiple locations', async () => {
		await setup();
		const classes = make_classes([
			['box', [loc('test.ts', 1, 5), loc('test.ts', 10, 3)]],
			['p_md', [loc('test.ts', 5, 8)]],
		]);

		const loaded = await save_and_load(join(CACHE_DIR, 'multi.json'), {classes});
		const result = from_cached_extraction(loaded);

		expect(result.classes?.size).toBe(2);
		expect(result.classes?.get('box')).toEqual([loc('test.ts', 1, 5), loc('test.ts', 10, 3)]);
		expect(result.classes?.get('p_md')).toEqual([loc('test.ts', 5, 8)]);
	});

	test('preserves diagnostics', async () => {
		await setup();
		const diagnostics = [
			make_diagnostic({
				message: '@fuz-classes: is deprecated',
				suggestion: 'Remove the colon',
				location: loc('test.ts', 3, 1),
			}),
		];

		const loaded = await save_and_load(join(CACHE_DIR, 'diag.json'), {diagnostics});

		expect(loaded.classes).toBeNull();
		expect(loaded.diagnostics).toEqual(diagnostics);
	});

	test('creates nested directories', async () => {
		await setup();
		const classes = make_classes([['test', [loc('x.ts')]]]);

		const loaded = await save_and_load(join(CACHE_DIR, 'deep/nested/path/file.json'), {classes});

		expect(loaded.classes).toEqual([['test', [loc('x.ts')]]]);
	});

	// Null/empty handling
	const null_handling_cases = [
		{name: 'stores empty classes Map as null', input: {classes: new Map()}, field: 'classes'},
		{
			name: 'stores empty diagnostics array as null',
			input: {diagnostics: [] as Array<ExtractionDiagnostic>},
			field: 'diagnostics',
		},
		{
			name: 'stores empty elements Set as null',
			input: {elements: new Set<string>()},
			field: 'elements',
		},
	] as const;

	test.each(null_handling_cases)('$name', async ({input, field}) => {
		await setup();
		const loaded = await save_and_load(join(CACHE_DIR, `${field}_empty.json`), input);
		expect(loaded[field]).toBeNull();
	});

	test('overwrites existing file', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'overwrite.json');

		await save_and_load(cache_path, {
			classes: make_classes([['old', [loc('a.ts')]]]),
			content_hash: 'hash1',
		});
		const loaded = await save_and_load(cache_path, {
			classes: make_classes([['new', [loc('b.ts', 2, 2)]]]),
			content_hash: 'hash2',
		});

		expect(loaded.content_hash).toBe('hash2');
		expect(loaded.classes).toEqual([['new', [loc('b.ts', 2, 2)]]]);
	});

	// Special character preservation
	const special_char_cases = [
		{
			name: 'preserves unicode in class names and file paths',
			classes: make_classes([
				['émoji-class', [loc('src/компонент.svelte')]],
				['日本語', [loc('src/中文.ts', 5, 10)]],
			]),
			expected_keys: ['émoji-class', '日本語'],
		},
		{
			name: 'preserves CSS literal syntax in class names',
			classes: make_classes([
				['display:flex', [loc()]],
				['hover:opacity:80%', [loc('test.ts', 2)]],
			]),
			expected_keys: ['display:flex', 'hover:opacity:80%'],
		},
	];

	test.each(special_char_cases)('$name', async ({classes, expected_keys}) => {
		await setup();
		const loaded = await save_and_load(join(CACHE_DIR, 'special.json'), {classes});
		const result = from_cached_extraction(loaded);

		expect(new Set(result.classes?.keys())).toEqual(new Set(expected_keys));
	});

	test('preserves multiple diagnostics with different levels', async () => {
		await setup();
		const diagnostics = [
			make_diagnostic({level: 'warning', message: 'first warning'}),
			make_diagnostic({level: 'error', message: 'an error'}),
		];

		const loaded = await save_and_load(join(CACHE_DIR, 'multi_diag.json'), {diagnostics});

		expect(loaded.diagnostics).toHaveLength(2);
		expect(loaded.diagnostics![0]!.level).toBe('warning');
		expect(loaded.diagnostics![1]!.level).toBe('error');
	});
});

//
// load_cached_extraction error handling
//

describe('load_cached_extraction', () => {
	const invalid_cache_cases = [
		{name: 'corrupted JSON', content: 'not valid json{{{'},
		{name: 'truncated file', content: '{"v": 1, "content_hash": "abc"'},
		{name: 'empty file', content: ''},
		{name: 'JSON null', content: 'null'},
		{name: 'wrong structure', content: JSON.stringify({foo: 'bar'})},
		{name: 'version mismatch', content: JSON.stringify({v: 999, content_hash: 'x', classes: null})},
		{
			name: 'version as string',
			content: JSON.stringify({v: '2', content_hash: 'x', classes: null}),
		},
	];

	test('returns null for missing file', async () => {
		expect(await load_cached_extraction(ops, '/nonexistent/path.json')).toBeNull();
	});

	test.each(invalid_cache_cases)('returns null for $name', async ({content}) => {
		await setup();
		const cache_path = join(CACHE_DIR, 'invalid.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, content);

		expect(await load_cached_extraction(ops, cache_path)).toBeNull();
	});

	// Additional corruption recovery tests - all return null gracefully
	const corruption_cases = [
		{name: 'binary garbage', content: '\x00\x01\x02\x03'},
		{name: 'partial JSON with valid start', content: '{"v": 2, "content_hash": "x",'},
		{name: 'array instead of object', content: '[1, 2, 3]'},
		{name: 'number instead of object', content: '42'},
		{name: 'NUL bytes in hash', content: '{"v": 2, "content_hash": "abc\x00123"}'},
		{name: 'UTF-8 BOM prefix', content: '\ufeff{"v": 2, "content_hash": "hash", "classes": null}'},
	];

	test.each(corruption_cases)('gracefully handles $name', async ({content}) => {
		await setup();
		const cache_path = join(CACHE_DIR, 'corrupted.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, content);

		// Should return null rather than throw
		const result = await load_cached_extraction(ops, cache_path);
		expect(result).toBeNull();
	});

	// Some minimal content is valid - documenting current behavior
	test('parses minimal valid cache (missing content_hash)', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'minimal.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, `{"v": ${CSS_CACHE_VERSION}}`);

		// Lenient parsing accepts missing content_hash
		const result = await load_cached_extraction(ops, cache_path);
		expect(result).not.toBeNull();
		expect(result!.v).toBe(CSS_CACHE_VERSION);
	});
});

//
// delete_cached_extraction
//

describe('delete_cached_extraction', () => {
	test('removes file', async () => {
		await setup();
		const cache_path = join(CACHE_DIR, 'delete.json');
		await mkdir(CACHE_DIR, {recursive: true});
		await writeFile(cache_path, '{}');

		await expect(readFile(cache_path, 'utf8')).resolves.toBe('{}');
		await delete_cached_extraction(ops, cache_path);
		await expect(readFile(cache_path)).rejects.toThrow();
	});

	test('succeeds for nonexistent file', async () => {
		await expect(delete_cached_extraction(ops, '/nonexistent/file.json')).resolves.toBeUndefined();
	});
});

//
// from_cached_extraction conversions
//

describe('from_cached_extraction', () => {
	// Table-driven: input cached data → expected converted result
	const conversion_cases = [
		{
			name: 'converts class tuples to Map',
			input: make_cached({classes: [['box', [loc()]]]}),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.classes).toBeInstanceOf(Map);
				expect(r.classes?.size).toBe(1);
				expect(r.classes?.get('box')).toEqual([loc()]);
			},
		},
		{
			name: 'preserves null classes',
			input: make_cached({classes: null}),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.classes).toBeNull();
			},
		},
		{
			name: 'converts empty classes array to empty Map',
			input: make_cached({classes: []}),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.classes).toBeInstanceOf(Map);
				expect(r.classes?.size).toBe(0);
			},
		},
		{
			name: 'preserves diagnostics reference',
			input: (() => {
				const diagnostics = [make_diagnostic()];
				return {cached: make_cached({diagnostics}), diagnostics};
			})(),
			check: (
				r: ReturnType<typeof from_cached_extraction>,
				input: {diagnostics: Array<ExtractionDiagnostic>},
			) => {
				expect(r.diagnostics).toBe(input.diagnostics);
			},
		},
		{
			name: 'converts elements array to Set',
			input: make_cached({elements: ['button', 'div']}),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.elements).toEqual(new Set(['button', 'div']));
			},
		},
		{
			name: 'preserves null elements',
			input: make_cached(),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.elements).toBeNull();
			},
		},
		{
			name: 'converts explicit_variables array to Set',
			input: make_cached({explicit_variables: ['shade_40', 'text_50']}),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.explicit_variables).toEqual(new Set(['shade_40', 'text_50']));
			},
		},
		{
			name: 'preserves null explicit_variables',
			input: make_cached(),
			check: (r: ReturnType<typeof from_cached_extraction>) => {
				expect(r.explicit_variables).toBeNull();
			},
		},
	];

	test.each(conversion_cases)('$name', ({input, check}) => {
		// Handle the special case where input contains extra data for the check
		const cached = 'cached' in input ? input.cached : input;
		const result = from_cached_extraction(cached);
		check(result, input as any);
	});
});

//
// v2 fields round-trip
//

describe('cache fields round-trip', () => {
	test('saves and loads all fields together', async () => {
		await setup();
		const classes = make_classes([['box', [loc('test.ts', 1, 5)]]]);
		const explicit_classes = new Set(['explicit_class']);
		const elements = new Set(['button', 'div']);

		const loaded = await save_and_load(join(CACHE_DIR, 'all_fields.json'), {
			classes,
			explicit_classes,
			elements,
			content_hash: 'hash123',
		});
		const result = from_cached_extraction(loaded);

		expect(result.classes?.has('box')).toBe(true);
		expect(result.explicit_classes).toEqual(explicit_classes);
		expect(result.elements).toEqual(elements);
	});

	// Individual field round-trips
	const field_cases = [
		{
			name: 'elements',
			input: {elements: new Set(['button', 'input', 'svg'])},
			check: (r: ReturnType<typeof from_cached_extraction>) =>
				expect(r.elements).toEqual(new Set(['button', 'input', 'svg'])),
		},
		{
			name: 'explicit_classes',
			input: {explicit_classes: new Set(['force_include'])},
			check: (r: ReturnType<typeof from_cached_extraction>) =>
				expect(r.explicit_classes).toEqual(new Set(['force_include'])),
		},
		{
			name: 'explicit_variables',
			input: {explicit_variables: new Set(['shade_40', 'text_50'])},
			check: (r: ReturnType<typeof from_cached_extraction>) =>
				expect(r.explicit_variables).toEqual(new Set(['shade_40', 'text_50'])),
		},
	];

	test.each(field_cases)('saves and loads $name field', async ({name, input, check}) => {
		await setup();
		const loaded = await save_and_load(join(CACHE_DIR, `${name}_test.json`), input);
		check(from_cached_extraction(loaded));
	});
});

//
// Mock ops integration
//

describe('cache functions with mock ops', () => {
	test('round-trips with in-memory mock', async () => {
		const state = create_mock_fs_state();
		const mock_ops = create_mock_cache_ops(state);
		const cache_path = '/mock/cache/test.json';
		const classes = make_classes([['box', [loc('test.ts', 1, 5)]]]);

		await save_cached_extraction(mock_ops, cache_path, 'abc123', {
			...EMPTY_EXTRACTION,
			classes,
		});
		const loaded = await load_cached_extraction(mock_ops, cache_path);

		expect(loaded).not.toBeNull();
		expect(loaded!.v).toBe(CSS_CACHE_VERSION);
		expect(loaded!.content_hash).toBe('abc123');
	});

	test('load returns null for missing file', async () => {
		const state = create_mock_fs_state();
		const mock_ops = create_mock_cache_ops(state);

		expect(await load_cached_extraction(mock_ops, '/nonexistent.json')).toBeNull();
	});

	test('delete removes file from state', async () => {
		const state = create_mock_fs_state();
		const mock_ops = create_mock_cache_ops(state);
		const cache_path = '/mock/cache/delete.json';

		await save_cached_extraction(mock_ops, cache_path, 'hash', EMPTY_EXTRACTION);
		expect(state.files.has(cache_path)).toBe(true);

		await delete_cached_extraction(mock_ops, cache_path);
		expect(state.files.has(cache_path)).toBe(false);
	});

	test('can inspect raw state for testing', async () => {
		const state = create_mock_fs_state();
		const mock_ops = create_mock_cache_ops(state);

		await save_cached_extraction(mock_ops, '/test.json', 'hash', EMPTY_EXTRACTION);

		const parsed = JSON.parse(state.files.get('/test.json')!);
		expect(parsed).toMatchObject({v: CSS_CACHE_VERSION, content_hash: 'hash'});
	});
});
