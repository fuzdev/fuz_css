import {test, expect, describe} from 'vitest';

import {CssClasses} from '$lib/css_classes.js';
import {type ExtractionDiagnostic, type SourceLocation} from '$lib/diagnostics.js';

describe('CssClasses', () => {
	test('add and get', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		const classes: Map<string, Array<SourceLocation>> = new Map([
			['foo', [loc]],
			['bar', [loc]],
		]);
		css_classes.add('file1.svelte', classes);

		const result = css_classes.get();
		expect(result.has('foo')).toBe(true);
		expect(result.has('bar')).toBe(true);
	});

	test('merges classes from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		css_classes.add('file1.svelte', new Map([['foo', [loc1]]]));
		css_classes.add('file2.svelte', new Map([['bar', [loc2]]]));

		const result = css_classes.get();
		expect(result.has('foo')).toBe(true);
		expect(result.has('bar')).toBe(true);
	});

	test('delete removes file classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', new Map([['foo', [loc]]]));
		css_classes.add('file2.svelte', new Map([['bar', [loc]]]));

		css_classes.delete('file1.svelte');

		const result = css_classes.get();
		expect(result.has('foo')).toBe(false);
		expect(result.has('bar')).toBe(true);
	});

	test('include_classes always included', () => {
		const css_classes = new CssClasses(new Set(['always-included']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', new Map([['extracted', [loc]]]));

		const result = css_classes.get();
		expect(result.has('always-included')).toBe(true);
		expect(result.has('extracted')).toBe(true);
	});

	test('get_with_locations returns null for include_classes', () => {
		const css_classes = new CssClasses(new Set(['included']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', new Map([['extracted', [loc]]]));

		const result = css_classes.get_with_locations();
		expect(result.get('included')).toBeNull();
		expect(result.get('extracted')).toEqual([loc]);
	});

	test('get_with_locations merges locations from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		css_classes.add('file1.svelte', new Map([['shared', [loc1]]]));
		css_classes.add('file2.svelte', new Map([['shared', [loc2]]]));

		const result = css_classes.get_with_locations();
		const locations = result.get('shared');
		expect(locations).toHaveLength(2);
		expect(locations).toContainEqual(loc1);
		expect(locations).toContainEqual(loc2);
	});

	test('get_diagnostics returns extraction diagnostics', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		const diagnostics: Array<ExtractionDiagnostic> = [
			{
				phase: 'extraction',
				level: 'warning',
				message: 'test warning',
				suggestion: null,
				location: loc,
			},
		];

		css_classes.add('file1.svelte', new Map(), null, diagnostics);

		const result = css_classes.get_diagnostics();
		expect(result).toHaveLength(1);
		expect(result[0]!.message).toBe('test warning');
	});

	test('dirty flag triggers recalculation', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', new Map([['foo', [loc]]]));
		const result1 = css_classes.get();
		expect(result1.has('foo')).toBe(true);

		// Add more classes
		css_classes.add('file2.svelte', new Map([['bar', [loc]]]));
		const result2 = css_classes.get();
		expect(result2.has('bar')).toBe(true);
	});

	test('explicit_classes tracks @fuz-classes annotations', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.ts', line: 1, column: 1};
		const explicit = new Set(['annotated_class']);

		css_classes.add('file1.ts', new Map([['regular', [loc]]]), explicit);

		const {explicit_classes} = css_classes.get_all();
		expect(explicit_classes).not.toBeNull();
		expect(explicit_classes!.has('annotated_class')).toBe(true);
		expect(explicit_classes!.has('regular')).toBe(false);
	});

	test('include_classes are included in explicit_classes', () => {
		const css_classes = new CssClasses(new Set(['included_class']));

		const {explicit_classes} = css_classes.get_all();
		expect(explicit_classes).not.toBeNull();
		expect(explicit_classes!.has('included_class')).toBe(true);
	});

	test('exclude_classes filters from all_classes', () => {
		const css_classes = new CssClasses(null, new Set(['excluded']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			new Map([
				['kept', [loc]],
				['excluded', [loc]],
			]),
		);

		const {all_classes} = css_classes.get_all();
		expect(all_classes.has('kept')).toBe(true);
		expect(all_classes.has('excluded')).toBe(false);
	});

	test('exclude_classes filters from explicit_classes', () => {
		const include = new Set(['included_explicit']);
		const exclude = new Set(['included_explicit']);
		const css_classes = new CssClasses(include, exclude);

		const {explicit_classes} = css_classes.get_all();
		// included_explicit is in both include and exclude, so it should be excluded
		expect(explicit_classes).toBeNull();
	});

	test('exclude_classes suppresses @fuz-classes warnings', () => {
		const exclude = new Set(['annotated_but_excluded']);
		const css_classes = new CssClasses(null, exclude);
		const explicit = new Set(['annotated_but_excluded']);

		css_classes.add('file1.ts', new Map(), explicit);

		const {explicit_classes} = css_classes.get_all();
		// Should be filtered out by exclude
		expect(explicit_classes).toBeNull();
	});
});
