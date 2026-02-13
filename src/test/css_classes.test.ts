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
		css_classes.add('file1.svelte', {classes});

		const result = css_classes.get();
		expect(result.has('foo')).toBe(true);
		expect(result.has('bar')).toBe(true);
	});

	test('merges classes from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		css_classes.add('file1.svelte', {classes: new Map([['foo', [loc1]]])});
		css_classes.add('file2.svelte', {classes: new Map([['bar', [loc2]]])});

		const result = css_classes.get();
		expect(result.has('foo')).toBe(true);
		expect(result.has('bar')).toBe(true);
	});

	test('delete removes file classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {classes: new Map([['foo', [loc]]])});
		css_classes.add('file2.svelte', {classes: new Map([['bar', [loc]]])});

		css_classes.delete('file1.svelte');

		const result = css_classes.get();
		expect(result.has('foo')).toBe(false);
		expect(result.has('bar')).toBe(true);
	});

	test('additional_classes always included', () => {
		const css_classes = new CssClasses(new Set(['always-included']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', {classes: new Map([['extracted', [loc]]])});

		const result = css_classes.get();
		expect(result.has('always-included')).toBe(true);
		expect(result.has('extracted')).toBe(true);
	});

	test('get_with_locations returns null for additional_classes', () => {
		const css_classes = new CssClasses(new Set(['included']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', {classes: new Map([['extracted', [loc]]])});

		const result = css_classes.get_with_locations();
		expect(result.get('included')).toBeNull();
		expect(result.get('extracted')).toEqual([loc]);
	});

	test('get_with_locations merges locations from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		css_classes.add('file1.svelte', {classes: new Map([['shared', [loc1]]])});
		css_classes.add('file2.svelte', {classes: new Map([['shared', [loc2]]])});

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

		css_classes.add('file1.svelte', {classes: new Map(), diagnostics});

		const result = css_classes.get_diagnostics();
		expect(result).toHaveLength(1);
		expect(result[0]!.message).toBe('test warning');
	});

	test('dirty flag triggers recalculation', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {classes: new Map([['foo', [loc]]])});
		const result1 = css_classes.get();
		expect(result1.has('foo')).toBe(true);

		// Add more classes
		css_classes.add('file2.svelte', {classes: new Map([['bar', [loc]]])});
		const result2 = css_classes.get();
		expect(result2.has('bar')).toBe(true);
	});

	test('explicit_classes tracks @fuz-classes annotations', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.ts', line: 1, column: 1};
		const explicit = new Set(['annotated_class']);

		css_classes.add('file1.ts', {classes: new Map([['regular', [loc]]]), explicit_classes: explicit});

		const {explicit_classes} = css_classes.get_all();
		expect(explicit_classes).not.toBeNull();
		expect(explicit_classes!.has('annotated_class')).toBe(true);
		expect(explicit_classes!.has('regular')).toBe(false);
	});

	test('additional_classes are included in explicit_classes', () => {
		const css_classes = new CssClasses(new Set(['included_class']));

		const {explicit_classes} = css_classes.get_all();
		expect(explicit_classes).not.toBeNull();
		expect(explicit_classes!.has('included_class')).toBe(true);
	});

	test('exclude_classes filters from all_classes', () => {
		const css_classes = new CssClasses(null, new Set(['excluded']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {
			classes: new Map([
				['kept', [loc]],
				['excluded', [loc]],
			]),
		});

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

		css_classes.add('file1.ts', {classes: new Map(), explicit_classes: explicit});

		const {explicit_classes} = css_classes.get_all();
		// Should be filtered out by exclude
		expect(explicit_classes).toBeNull();
	});
});

describe('explicit_variables (@fuz-variables)', () => {
	test('add with explicit_variables returns them from get_all', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		const explicit_vars = new Set(['shade_40', 'text_50']);

		css_classes.add('file1.svelte', {
			classes: new Map([['foo', [loc]]]),
			explicit_variables: explicit_vars,
		});

		const {explicit_variables} = css_classes.get_all();
		expect(explicit_variables).not.toBeNull();
		expect(explicit_variables!.has('shade_40')).toBe(true);
		expect(explicit_variables!.has('text_50')).toBe(true);
	});

	test('multiple files contributing explicit_variables are aggregated', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {
			classes: new Map([['a', [loc]]]),
			explicit_variables: new Set(['shade_40']),
		});
		css_classes.add('file2.svelte', {
			classes: new Map([['b', [loc]]]),
			explicit_variables: new Set(['text_50']),
		});

		const {explicit_variables} = css_classes.get_all();
		expect(explicit_variables).not.toBeNull();
		expect(explicit_variables!.has('shade_40')).toBe(true);
		expect(explicit_variables!.has('text_50')).toBe(true);
	});

	test('delete removes file explicit_variables', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {
			classes: new Map([['a', [loc]]]),
			explicit_variables: new Set(['shade_40']),
		});
		css_classes.add('file2.svelte', {
			classes: new Map([['b', [loc]]]),
			explicit_variables: new Set(['text_50']),
		});

		css_classes.delete('file1.svelte');

		const {explicit_variables} = css_classes.get_all();
		expect(explicit_variables).not.toBeNull();
		expect(explicit_variables!.has('shade_40')).toBe(false);
		expect(explicit_variables!.has('text_50')).toBe(true);
	});

	test('re-adding a file replaces old explicit_variables', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {
			classes: new Map([['a', [loc]]]),
			explicit_variables: new Set(['shade_40']),
		});

		// Re-add with different variables
		css_classes.add('file1.svelte', {
			classes: new Map([['a', [loc]]]),
			explicit_variables: new Set(['text_50']),
		});

		const {explicit_variables} = css_classes.get_all();
		expect(explicit_variables).not.toBeNull();
		expect(explicit_variables!.has('shade_40')).toBe(false);
		expect(explicit_variables!.has('text_50')).toBe(true);
	});

	test('explicit_variables is null when no files have them', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {classes: new Map([['a', [loc]]])});

		const {explicit_variables} = css_classes.get_all();
		expect(explicit_variables).toBeNull();
	});
});

describe('additional_classes with file data (simulating cache behavior)', () => {
	test('additional_classes merged with file data', () => {
		const css_classes = new CssClasses(new Set(['additional_a', 'additional_b']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		// Simulate adding file data (could be from cache or fresh extraction)
		css_classes.add('file1.svelte', {classes: new Map([['extracted_class', [loc]]])});

		const result = css_classes.get();
		// Both additional and extracted should be present
		expect(result.has('additional_a')).toBe(true);
		expect(result.has('additional_b')).toBe(true);
		expect(result.has('extracted_class')).toBe(true);
	});

	test('exclude_classes filters additional_classes', () => {
		const include = new Set(['keep_me', 'exclude_me']);
		const exclude = new Set(['exclude_me']);
		const css_classes = new CssClasses(include, exclude);
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {classes: new Map([['extracted', [loc]]])});

		const result = css_classes.get();
		expect(result.has('keep_me')).toBe(true);
		expect(result.has('exclude_me')).toBe(false);
		expect(result.has('extracted')).toBe(true);
	});

	test('multiple files combined with additional_classes', () => {
		const css_classes = new CssClasses(new Set(['always_included']));
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		// Add multiple files (simulating cache-restored data)
		css_classes.add('file1.svelte', {classes: new Map([['from_file1', [loc1]]])});
		css_classes.add('file2.svelte', {classes: new Map([['from_file2', [loc2]]])});

		const result = css_classes.get();
		expect(result.has('always_included')).toBe(true);
		expect(result.has('from_file1')).toBe(true);
		expect(result.has('from_file2')).toBe(true);
	});

	test('empty additional_classes has no effect on file data', () => {
		const css_classes = new CssClasses(null);
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {classes: new Map([['extracted', [loc]]])});

		const result = css_classes.get();
		expect(result.size).toBe(1);
		expect(result.has('extracted')).toBe(true);
	});

	test('additional_classes appear in explicit_classes for warning tracking', () => {
		const css_classes = new CssClasses(new Set(['additional_class']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', {classes: new Map([['regular', [loc]]])});

		const {explicit_classes} = css_classes.get_all();
		// additional_classes should be in explicit_classes
		expect(explicit_classes?.has('additional_class')).toBe(true);
		// Regular extracted classes are not explicit unless via @fuz-classes
		expect(explicit_classes?.has('regular')).toBe(false);
	});

	test('file explicit classes combined with additional_classes in explicit_classes', () => {
		const css_classes = new CssClasses(new Set(['additional']));
		const loc: SourceLocation = {file: 'test.ts', line: 1, column: 1};
		const file_explicit = new Set(['from_fuz_classes_annotation']);

		css_classes.add('file1.ts', {
			classes: new Map([['regular', [loc]]]),
			explicit_classes: file_explicit,
		});

		const {explicit_classes} = css_classes.get_all();
		expect(explicit_classes?.has('additional')).toBe(true);
		expect(explicit_classes?.has('from_fuz_classes_annotation')).toBe(true);
		expect(explicit_classes?.has('regular')).toBe(false);
	});
});
