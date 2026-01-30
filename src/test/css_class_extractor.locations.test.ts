import {test, expect, describe} from 'vitest';

import {extract_from_svelte, SourceIndex} from '$lib/css_class_extractor.js';

import {
	loc,
	assert_class_at_line,
	assert_class_locations,
} from './css_class_extractor_test_helpers.js';

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
