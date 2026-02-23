import {test, expect, describe} from 'vitest';

import {extract_from_svelte, SourceIndex} from '$lib/css_class_extractor.js';

import {assert_class_at_line, assert_class_locations} from './css_class_extractor_test_helpers.ts';
import {loc} from './test_helpers.ts';

describe('SourceIndex', () => {
	describe('standard LF line endings', () => {
		const source = 'abc\ndef\nghi';

		const lf_cases = [
			{offset: 0, expected: loc('f', 1, 1), desc: 'start of file'},
			{offset: 2, expected: loc('f', 1, 3), desc: 'within first line'},
			{offset: 4, expected: loc('f', 2, 1), desc: 'start of second line'},
			{offset: 6, expected: loc('f', 2, 3), desc: 'within second line'},
			{offset: 8, expected: loc('f', 3, 1), desc: 'start of third line'},
		];

		test.each(lf_cases)('$desc (offset $offset)', ({offset, expected}) => {
			const index = new SourceIndex(source);
			expect(index.get_location(offset, 'f')).toEqual(expected);
		});
	});

	describe('edge cases', () => {
		test('handles empty lines', () => {
			const source = 'abc\n\ndef';
			const index = new SourceIndex(source);

			expect(index.get_location(0, 'f')).toEqual(loc('f', 1, 1)); // First line
			expect(index.get_location(4, 'f')).toEqual(loc('f', 2, 1)); // Empty second line
			expect(index.get_location(5, 'f')).toEqual(loc('f', 3, 1)); // Third line
		});

		test('handles single line source', () => {
			const source = 'hello world';
			const index = new SourceIndex(source);
			expect(index.get_location(6, 'f')).toEqual(loc('f', 1, 7));
		});

		test('handles empty source', () => {
			const source = '';
			const index = new SourceIndex(source);
			expect(index.get_location(0, 'f')).toEqual(loc('f', 1, 1));
		});

		test('handles CRLF line endings', () => {
			const source = 'abc\r\ndef\r\nghi';
			const index = new SourceIndex(source);

			expect(index.get_location(0, 'f').line).toBe(1); // 'a'
			expect(index.get_location(3, 'f').line).toBe(1); // 'c'
			expect(index.get_location(5, 'f').line).toBe(2); // 'd'
			expect(index.get_location(8, 'f').line).toBe(2); // 'f'
			expect(index.get_location(10, 'f').line).toBe(3); // 'g'
		});

		test('includes file in location', () => {
			const source = 'abc\ndef\nghi';
			const index = new SourceIndex(source);
			expect(index.get_location(0, 'test.ts').file).toBe('test.ts');
		});
	});
});

describe('source location tracking', () => {
	test('tracks source locations for classes', () => {
		const source = `<div class="foo bar"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		assert_class_at_line(result, 'foo', 1, 'test.svelte');
	});

	test('tracks source locations for multi-line class attributes', () => {
		const source = `<div>
	<span class="line2-class"></span>
	<p class="line3-class"></p>
</div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		assert_class_at_line(result, 'line2-class', 2);
		assert_class_at_line(result, 'line3-class', 3);
	});

	test('accumulates locations for duplicate class names', () => {
		const source = `
<div class="shared"></div>
<span class="shared"></span>
<p class="shared"></p>
`;
		const result = extract_from_svelte(source, 'test.svelte');
		assert_class_locations(result, 'shared', [2, 3, 4]);
	});

	test('tracks column positions', () => {
		const source = `<div class="col-test"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		const locations = result.classes?.get('col-test');
		expect(locations).toBeDefined();
		expect(locations![0]!.line).toBe(1);
		expect(locations![0]!.column).toBeGreaterThan(0);
	});
});

describe('SourceIndex additional edge cases', () => {
	test('handles file with only newlines', () => {
		const source = '\n\n\n';
		const index = new SourceIndex(source);
		expect(index.get_location(0, 'f').line).toBe(1);
		expect(index.get_location(1, 'f').line).toBe(2);
		expect(index.get_location(2, 'f').line).toBe(3);
	});

	test('handles offset at newline character', () => {
		const source = 'abc\ndef';
		const index = new SourceIndex(source);
		// The \n itself is at offset 3, still part of line 1
		const loc_at_newline = index.get_location(3, 'f');
		expect(loc_at_newline.line).toBe(1);
		expect(loc_at_newline.column).toBe(4);
	});

	test('handles offset beyond source length', () => {
		const source = 'abc';
		const index = new SourceIndex(source);
		// Offset 3 is just after the last character
		const loc = index.get_location(3, 'f');
		expect(loc.line).toBe(1);
		expect(loc.column).toBe(4);
	});

	test('handles very long single line', () => {
		const source = 'a'.repeat(1000);
		const index = new SourceIndex(source);
		expect(index.get_location(500, 'f')).toEqual({file: 'f', line: 1, column: 501});
	});
});

describe('UTF-8 and special character location tracking', () => {
	test('handles emoji in class string', () => {
		const source = '<div class="before 🎉 after"></div>';
		const result = extract_from_svelte(source, 'test.svelte');
		// Verify classes are extracted
		expect(result.classes?.has('before')).toBe(true);
		expect(result.classes?.has('🎉')).toBe(true);
		expect(result.classes?.has('after')).toBe(true);
	});

	test('handles CJK characters in class names', () => {
		const source = '<div class="中文 english 日本語"></div>';
		const result = extract_from_svelte(source, 'test.svelte');
		expect(result.classes?.has('中文')).toBe(true);
		expect(result.classes?.has('english')).toBe(true);
		expect(result.classes?.has('日本語')).toBe(true);
	});

	test('handles mixed Unicode and ASCII with locations', () => {
		const source = `<div class="αβγ"></div>
<div class="δεζ"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		assert_class_at_line(result, 'αβγ', 1);
		assert_class_at_line(result, 'δεζ', 2);
	});

	test('handles emoji surrounded by ASCII', () => {
		const source = '<div class="icon-🔥-fire"></div>';
		const result = extract_from_svelte(source, 'test.svelte');
		expect(result.classes?.has('icon-🔥-fire')).toBe(true);
	});
});
