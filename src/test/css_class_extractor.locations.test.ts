import {test, expect, describe} from 'vitest';

import {extract_from_svelte, SourceIndex} from '$lib/css_class_extractor.js';

describe('SourceIndex', () => {
	describe('standard LF line endings', () => {
		const source = 'abc\ndef\nghi';

		const lf_cases = [
			{offset: 0, line: 1, column: 1, desc: 'start of file'},
			{offset: 2, line: 1, column: 3, desc: 'within first line'},
			{offset: 4, line: 2, column: 1, desc: 'start of second line'},
			{offset: 6, line: 2, column: 3, desc: 'within second line'},
			{offset: 8, line: 3, column: 1, desc: 'start of third line'},
		];

		test.each(lf_cases)('$desc (offset $offset)', ({offset, line, column}) => {
			const index = new SourceIndex(source);
			expect(index.get_location(offset, 'f')).toMatchObject({line, column});
		});
	});

	test('handles empty lines', () => {
		const source = 'abc\n\ndef';
		const index = new SourceIndex(source);

		// First line
		expect(index.get_location(0, 'f').line).toBe(1);

		// Empty second line (offset 4 is the start of the empty line)
		expect(index.get_location(4, 'f').line).toBe(2);
		expect(index.get_location(4, 'f').column).toBe(1);

		// Third line
		expect(index.get_location(5, 'f').line).toBe(3);
	});

	test('handles single line source', () => {
		const source = 'hello world';
		const index = new SourceIndex(source);
		const loc = index.get_location(6, 'f');
		expect(loc.line).toBe(1);
		expect(loc.column).toBe(7);
	});

	test('handles empty source', () => {
		const source = '';
		const index = new SourceIndex(source);
		const loc = index.get_location(0, 'f');
		expect(loc.line).toBe(1);
		expect(loc.column).toBe(1);
	});

	test('handles CRLF line endings', () => {
		const source = 'abc\r\ndef\r\nghi';
		const index = new SourceIndex(source);
		// Line 1: 'abc\r' (4 chars, newline at position 4)
		expect(index.get_location(0, 'f').line).toBe(1);
		expect(index.get_location(3, 'f').line).toBe(1); // 'c'
		// After \r\n we're at line 2
		expect(index.get_location(5, 'f').line).toBe(2); // 'd'
		expect(index.get_location(8, 'f').line).toBe(2); // 'f'
		// Line 3
		expect(index.get_location(10, 'f').line).toBe(3); // 'g'
	});

	test('includes file in location', () => {
		const source = 'abc\ndef\nghi';
		const index = new SourceIndex(source);
		const loc = index.get_location(0, 'test.ts');
		expect(loc.file).toBe('test.ts');
	});
});

describe('source location tracking', () => {
	test('tracks source locations for classes', () => {
		const source = `<div class="foo bar"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		expect(result.classes?.get('foo')).toBeDefined();
		expect(result.classes?.get('foo')![0]!.file).toBe('test.svelte');
		expect(result.classes?.get('foo')![0]!.line).toBe(1);
	});

	test('tracks source locations for multi-line class attributes', () => {
		const source = `<div>
	<span class="line2-class"></span>
	<p class="line3-class"></p>
</div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		expect(result.classes?.get('line2-class')![0]!.line).toBe(2);
		expect(result.classes?.get('line3-class')![0]!.line).toBe(3);
	});

	test('accumulates locations for duplicate class names', () => {
		const source = `
<div class="shared"></div>
<span class="shared"></span>
<p class="shared"></p>
`;
		const result = extract_from_svelte(source, 'test.svelte');
		const locations = result.classes?.get('shared');
		expect(locations).toBeDefined();
		expect(locations!.length).toBe(3);
		expect(locations![0]!.line).toBe(2);
		expect(locations![1]!.line).toBe(3);
		expect(locations![2]!.line).toBe(4);
	});

	test('tracks column positions', () => {
		const source = `<div class="col-test"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		const location = result.classes?.get('col-test')?.[0];
		expect(location).toBeDefined();
		expect(location!.line).toBe(1);
		// Column should be somewhere after the opening tag
		expect(location!.column).toBeGreaterThan(0);
	});
});
