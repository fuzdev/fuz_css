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

		test('does not exclude .spec.ts files (limitation)', () => {
			// Note: .spec.ts is a common test convention but not currently filtered
			expect(filter_file_default('src/lib/utils.spec.ts')).toBe(true);
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

		test('handles double extensions', () => {
			expect(filter_file_default('file.d.ts')).toBe(true);
		});

		test('handles Windows-style paths (backslashes not matched by /test/)', () => {
			// The filter uses forward slashes, so Windows paths would not match /test/
			// This is a limitation of the current implementation
			expect(filter_file_default('src\\test\\file.ts')).toBe(true); // Not excluded
		});
	});
});
