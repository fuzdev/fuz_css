import {test, assert, describe} from 'vitest';

import {filter_file_default} from '$lib/file_filter.js';

describe('filter_file_default', () => {
	describe('includes valid extensions', () => {
		test('includes .svelte files', () => {
			assert.isTrue(filter_file_default('src/components/Button.svelte'));
		});

		test('includes .html files', () => {
			assert.isTrue(filter_file_default('public/index.html'));
		});

		test('includes .ts files', () => {
			assert.isTrue(filter_file_default('src/lib/utils.ts'));
		});

		test('includes .js files', () => {
			assert.isTrue(filter_file_default('src/lib/helpers.js'));
		});

		test('includes .tsx files', () => {
			assert.isTrue(filter_file_default('src/components/App.tsx'));
		});

		test('includes .jsx files', () => {
			assert.isTrue(filter_file_default('src/components/Component.jsx'));
		});
	});

	describe('excludes invalid extensions', () => {
		test('excludes .css files', () => {
			assert.isFalse(filter_file_default('src/styles/main.css'));
		});

		test('excludes .json files', () => {
			assert.isFalse(filter_file_default('package.json'));
		});

		test('excludes .md files', () => {
			assert.isFalse(filter_file_default('README.md'));
		});

		test('excludes unknown extensions', () => {
			assert.isFalse(filter_file_default('file.xyz'));
		});

		test('excludes .scss files', () => {
			assert.isFalse(filter_file_default('styles.scss'));
		});
	});

	describe('excludes test files', () => {
		test('excludes .test.ts files', () => {
			assert.isFalse(filter_file_default('src/lib/utils.test.ts'));
		});

		test('excludes .test.js files', () => {
			assert.isFalse(filter_file_default('src/lib/helpers.test.js'));
		});

		test('excludes files in /test/ directory', () => {
			assert.isFalse(filter_file_default('src/test/example.ts'));
		});

		test('excludes files in /tests/ directory', () => {
			assert.isFalse(filter_file_default('src/tests/integration.ts'));
		});

		test('excludes test/ at path start', () => {
			assert.isFalse(filter_file_default('test/file.ts'));
			assert.isFalse(filter_file_default('test/unit/helpers.ts'));
		});

		test('excludes tests/ at path start', () => {
			assert.isFalse(filter_file_default('tests/file.ts'));
			assert.isFalse(filter_file_default('tests/integration/app.ts'));
		});

		test('excludes .spec.ts files', () => {
			assert.isFalse(filter_file_default('src/lib/utils.spec.ts'));
		});

		test('excludes .spec.js files', () => {
			assert.isFalse(filter_file_default('src/lib/helpers.spec.js'));
		});

		test('excludes files in /__tests__/ directory (Jest convention)', () => {
			assert.isFalse(filter_file_default('src/__tests__/utils.ts'));
			assert.isFalse(filter_file_default('src/lib/__tests__/helpers.ts'));
		});

		test('excludes __tests__/ at path start', () => {
			assert.isFalse(filter_file_default('__tests__/file.ts'));
			assert.isFalse(filter_file_default('__tests__/unit/helpers.ts'));
		});

		test('excludes files in /__mocks__/ directory (Jest convention)', () => {
			assert.isFalse(filter_file_default('src/__mocks__/api.ts'));
			assert.isFalse(filter_file_default('src/lib/__mocks__/fetch.ts'));
		});

		test('excludes __mocks__/ at path start', () => {
			assert.isFalse(filter_file_default('__mocks__/fs.ts'));
		});
	});

	describe('excludes generated files', () => {
		test('excludes .gen.ts files', () => {
			assert.isFalse(filter_file_default('src/lib/theme.gen.ts'));
		});

		test('excludes .gen.js files', () => {
			assert.isFalse(filter_file_default('src/lib/output.gen.js'));
		});

		test('excludes .gen.css.ts files', () => {
			assert.isFalse(filter_file_default('src/routes/fuz.gen.css.ts'));
		});
	});

	describe('edge cases', () => {
		test('handles empty string path', () => {
			// Empty path has no extension, returns false
			assert.isFalse(filter_file_default(''));
		});

		test('handles paths with no extension', () => {
			assert.isFalse(filter_file_default('Makefile'));
		});

		test('handles .test in filename but valid extension', () => {
			// The current implementation checks for `.test.` anywhere in path
			// so `my.test.component.svelte` would be excluded
			assert.isFalse(filter_file_default('my.test.component.svelte'));
		});

		test('handles nested paths correctly', () => {
			assert.isTrue(filter_file_default('src/lib/components/ui/Button.svelte'));
		});

		test('handles paths starting with dot', () => {
			assert.isTrue(filter_file_default('.hidden.ts'));
		});

		test('handles test-like names that are not tests', () => {
			// 'testing' contains 'test' but not '.test.' or '/test/'
			assert.isTrue(filter_file_default('src/testing-utils.ts'));
		});

		test('handles .d.ts declaration files', () => {
			// Note: .d.ts files are included, though they rarely contain CSS class usage
			// This is acceptable since they're typically small and won't slow extraction
			assert.isTrue(filter_file_default('file.d.ts'));
		});

		test('handles .svelte.ts files (Svelte 5 runes)', () => {
			assert.isTrue(filter_file_default('src/lib/state.svelte.ts'));
		});

		test('handles module extensions', () => {
			// .mjs and .cjs are valid JS that could contain class strings
			assert.isFalse(filter_file_default('config.mjs')); // Not in allowed list
			assert.isFalse(filter_file_default('config.cjs')); // Not in allowed list
		});

		test('handles Windows-style paths (backslashes not matched by /test/)', () => {
			// The filter uses forward slashes, so Windows paths would not match /test/
			// This is a limitation of the current implementation
			assert.isTrue(filter_file_default('src\\test\\file.ts')); // Not excluded
		});

		test('uppercase extensions not matched (case-sensitive)', () => {
			// Bug on case-insensitive filesystems (macOS, Windows):
			// .TS files exist but won't be processed
			assert.isFalse(filter_file_default('Component.TS'));
			assert.isFalse(filter_file_default('App.TSX'));
			assert.isFalse(filter_file_default('Page.Svelte'));
		});

		test('hidden file with extension-like name', () => {
			// Edge case: `.ts` is a hidden file named "ts", not a TypeScript file
			// Current behavior: incorrectly returns true
			// This is arguably a bug - hidden files without real extensions shouldn't match
			assert.isTrue(filter_file_default('.ts')); // Potentially unexpected
			assert.isTrue(filter_file_default('.svelte')); // Potentially unexpected
		});
	});
});
