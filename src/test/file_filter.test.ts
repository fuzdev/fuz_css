import {test, expect, describe} from 'vitest';

import {filter_file_default} from '$lib/file_filter.js';

describe('filter_file_default', () => {
	describe('includes valid extensions', () => {
		test('includes .svelte files', () => {
			expect(filter_file_default('src/components/Button.svelte')).toBe(true);
		});

		test('includes .html files', () => {
			expect(filter_file_default('public/index.html')).toBe(true);
		});

		test('includes .ts files', () => {
			expect(filter_file_default('src/lib/utils.ts')).toBe(true);
		});

		test('includes .js files', () => {
			expect(filter_file_default('src/lib/helpers.js')).toBe(true);
		});

		test('includes .tsx files', () => {
			expect(filter_file_default('src/components/App.tsx')).toBe(true);
		});

		test('includes .jsx files', () => {
			expect(filter_file_default('src/components/Component.jsx')).toBe(true);
		});
	});

	describe('excludes invalid extensions', () => {
		test('excludes .css files', () => {
			expect(filter_file_default('src/styles/main.css')).toBe(false);
		});

		test('excludes .json files', () => {
			expect(filter_file_default('package.json')).toBe(false);
		});

		test('excludes .md files', () => {
			expect(filter_file_default('README.md')).toBe(false);
		});

		test('excludes unknown extensions', () => {
			expect(filter_file_default('file.xyz')).toBe(false);
		});

		test('excludes .scss files', () => {
			expect(filter_file_default('styles.scss')).toBe(false);
		});
	});

	describe('excludes test files', () => {
		test('excludes .test.ts files', () => {
			expect(filter_file_default('src/lib/utils.test.ts')).toBe(false);
		});

		test('excludes .test.js files', () => {
			expect(filter_file_default('src/lib/helpers.test.js')).toBe(false);
		});

		test('excludes files in /test/ directory', () => {
			expect(filter_file_default('src/test/example.ts')).toBe(false);
		});

		test('excludes files in /tests/ directory', () => {
			expect(filter_file_default('src/tests/integration.ts')).toBe(false);
		});

		test('excludes test/ at path start', () => {
			expect(filter_file_default('test/file.ts')).toBe(false);
			expect(filter_file_default('test/unit/helpers.ts')).toBe(false);
		});

		test('excludes tests/ at path start', () => {
			expect(filter_file_default('tests/file.ts')).toBe(false);
			expect(filter_file_default('tests/integration/app.ts')).toBe(false);
		});

		test('excludes .spec.ts files', () => {
			expect(filter_file_default('src/lib/utils.spec.ts')).toBe(false);
		});

		test('excludes .spec.js files', () => {
			expect(filter_file_default('src/lib/helpers.spec.js')).toBe(false);
		});

		test('excludes files in /__tests__/ directory (Jest convention)', () => {
			expect(filter_file_default('src/__tests__/utils.ts')).toBe(false);
			expect(filter_file_default('src/lib/__tests__/helpers.ts')).toBe(false);
		});

		test('excludes __tests__/ at path start', () => {
			expect(filter_file_default('__tests__/file.ts')).toBe(false);
			expect(filter_file_default('__tests__/unit/helpers.ts')).toBe(false);
		});

		test('excludes files in /__mocks__/ directory (Jest convention)', () => {
			expect(filter_file_default('src/__mocks__/api.ts')).toBe(false);
			expect(filter_file_default('src/lib/__mocks__/fetch.ts')).toBe(false);
		});

		test('excludes __mocks__/ at path start', () => {
			expect(filter_file_default('__mocks__/fs.ts')).toBe(false);
		});
	});

	describe('excludes generated files', () => {
		test('excludes .gen.ts files', () => {
			expect(filter_file_default('src/lib/theme.gen.ts')).toBe(false);
		});

		test('excludes .gen.js files', () => {
			expect(filter_file_default('src/lib/output.gen.js')).toBe(false);
		});

		test('excludes .gen.css.ts files', () => {
			expect(filter_file_default('src/routes/fuz.gen.css.ts')).toBe(false);
		});
	});

	describe('edge cases', () => {
		test('handles empty string path', () => {
			// Empty path has no extension, returns false
			expect(filter_file_default('')).toBe(false);
		});

		test('handles paths with no extension', () => {
			expect(filter_file_default('Makefile')).toBe(false);
		});

		test('handles .test in filename but valid extension', () => {
			// The current implementation checks for `.test.` anywhere in path
			// so `my.test.component.svelte` would be excluded
			expect(filter_file_default('my.test.component.svelte')).toBe(false);
		});

		test('handles nested paths correctly', () => {
			expect(filter_file_default('src/lib/components/ui/Button.svelte')).toBe(true);
		});

		test('handles paths starting with dot', () => {
			expect(filter_file_default('.hidden.ts')).toBe(true);
		});

		test('handles test-like names that are not tests', () => {
			// 'testing' contains 'test' but not '.test.' or '/test/'
			expect(filter_file_default('src/testing-utils.ts')).toBe(true);
		});

		test('handles .d.ts declaration files', () => {
			// Note: .d.ts files are included, though they rarely contain CSS class usage
			// This is acceptable since they're typically small and won't slow extraction
			expect(filter_file_default('file.d.ts')).toBe(true);
		});

		test('handles .svelte.ts files (Svelte 5 runes)', () => {
			expect(filter_file_default('src/lib/state.svelte.ts')).toBe(true);
		});

		test('handles module extensions', () => {
			// .mjs and .cjs are valid JS that could contain class strings
			expect(filter_file_default('config.mjs')).toBe(false); // Not in allowed list
			expect(filter_file_default('config.cjs')).toBe(false); // Not in allowed list
		});

		test('handles Windows-style paths (backslashes not matched by /test/)', () => {
			// The filter uses forward slashes, so Windows paths would not match /test/
			// This is a limitation of the current implementation
			expect(filter_file_default('src\\test\\file.ts')).toBe(true); // Not excluded
		});

		test('uppercase extensions not matched (case-sensitive)', () => {
			// Bug on case-insensitive filesystems (macOS, Windows):
			// .TS files exist but won't be processed
			expect(filter_file_default('Component.TS')).toBe(false);
			expect(filter_file_default('App.TSX')).toBe(false);
			expect(filter_file_default('Page.Svelte')).toBe(false);
		});

		test('hidden file with extension-like name', () => {
			// Edge case: `.ts` is a hidden file named "ts", not a TypeScript file
			// Current behavior: incorrectly returns true
			// This is arguably a bug - hidden files without real extensions shouldn't match
			expect(filter_file_default('.ts')).toBe(true); // Potentially unexpected
			expect(filter_file_default('.svelte')).toBe(true); // Potentially unexpected
		});
	});
});
