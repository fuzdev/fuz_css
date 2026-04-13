import {test, assert, describe} from 'vitest';

import {CssClasses} from '$lib/css_classes.js';
import {type ExtractionDiagnostic, type SourceLocation} from '$lib/diagnostics.js';
import {make_extraction_data} from './test_helpers.js';

describe('CssClasses', () => {
	test('add and get', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		const classes: Map<string, Array<SourceLocation>> = new Map([
			['foo', [loc]],
			['bar', [loc]],
		]);
		css_classes.add('file1.svelte', make_extraction_data({classes}));

		const result = css_classes.get();
		assert.isTrue(result.has('foo'));
		assert.isTrue(result.has('bar'));
	});

	test('merges classes from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['foo', [loc1]]])}));
		css_classes.add('file2.svelte', make_extraction_data({classes: new Map([['bar', [loc2]]])}));

		const result = css_classes.get();
		assert.isTrue(result.has('foo'));
		assert.isTrue(result.has('bar'));
	});

	test('delete removes file classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['foo', [loc]]])}));
		css_classes.add('file2.svelte', make_extraction_data({classes: new Map([['bar', [loc]]])}));

		css_classes.delete('file1.svelte');

		const result = css_classes.get();
		assert.isFalse(result.has('foo'));
		assert.isTrue(result.has('bar'));
	});

	test('additional_classes always included', () => {
		const css_classes = new CssClasses(new Set(['always-included']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add(
			'file1.svelte',
			make_extraction_data({classes: new Map([['extracted', [loc]]])}),
		);

		const result = css_classes.get();
		assert.isTrue(result.has('always-included'));
		assert.isTrue(result.has('extracted'));
	});

	test('get_with_locations returns null for additional_classes', () => {
		const css_classes = new CssClasses(new Set(['included']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add(
			'file1.svelte',
			make_extraction_data({classes: new Map([['extracted', [loc]]])}),
		);

		const result = css_classes.get_with_locations();
		assert.isNull(result.get('included'));
		assert.deepEqual(result.get('extracted'), [loc]);
	});

	test('get_with_locations merges locations from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['shared', [loc1]]])}));
		css_classes.add('file2.svelte', make_extraction_data({classes: new Map([['shared', [loc2]]])}));

		const result = css_classes.get_with_locations();
		const locations = result.get('shared');
		assert.lengthOf(locations!, 2);
		assert.deepInclude(locations!, loc1);
		assert.deepInclude(locations!, loc2);
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

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map(), diagnostics}));

		const result = css_classes.get_diagnostics();
		assert.lengthOf(result, 1);
		assert.strictEqual(result[0]!.message, 'test warning');
	});

	test('dirty flag triggers recalculation', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['foo', [loc]]])}));
		const result1 = css_classes.get();
		assert.isTrue(result1.has('foo'));

		// Add more classes
		css_classes.add('file2.svelte', make_extraction_data({classes: new Map([['bar', [loc]]])}));
		const result2 = css_classes.get();
		assert.isTrue(result2.has('bar'));
	});

	test('cache returns same object when not dirty', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['foo', [loc]]])}));

		const result1 = css_classes.get();
		const result2 = css_classes.get();
		assert.strictEqual(result1, result2);
	});

	test('re-adding same file replaces classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['old', [loc]]])}));
		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['new', [loc]]])}));

		const result = css_classes.get();
		assert.isFalse(result.has('old'));
		assert.isTrue(result.has('new'));
	});

	test('explicit_classes tracks @fuz-classes annotations', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.ts', line: 1, column: 1};
		const explicit = new Set(['annotated_class']);

		css_classes.add(
			'file1.ts',
			make_extraction_data({
				classes: new Map([['regular', [loc]]]),
				explicit_classes: explicit,
			}),
		);

		const {explicit_classes} = css_classes.get_all();
		assert.isNotNull(explicit_classes);
		assert.isTrue(explicit_classes.has('annotated_class'));
		assert.isFalse(explicit_classes.has('regular'));
	});

	test('additional_classes are included in explicit_classes', () => {
		const css_classes = new CssClasses(new Set(['included_class']));

		const {explicit_classes} = css_classes.get_all();
		assert.isNotNull(explicit_classes);
		assert.isTrue(explicit_classes.has('included_class'));
	});

	test('exclude_classes filters from all_classes', () => {
		const css_classes = new CssClasses(null, new Set(['excluded']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([
					['kept', [loc]],
					['excluded', [loc]],
				]),
			}),
		);

		const {all_classes} = css_classes.get_all();
		assert.isTrue(all_classes.has('kept'));
		assert.isFalse(all_classes.has('excluded'));
	});

	test('exclude_classes filters from explicit_classes', () => {
		const include = new Set(['included_explicit']);
		const exclude = new Set(['included_explicit']);
		const css_classes = new CssClasses(include, exclude);

		const {explicit_classes} = css_classes.get_all();
		// included_explicit is in both include and exclude, so it should be excluded
		assert.isNull(explicit_classes);
	});

	test('exclude_classes suppresses @fuz-classes warnings', () => {
		const exclude = new Set(['annotated_but_excluded']);
		const css_classes = new CssClasses(null, exclude);
		const explicit = new Set(['annotated_but_excluded']);

		css_classes.add(
			'file1.ts',
			make_extraction_data({classes: new Map(), explicit_classes: explicit}),
		);

		const {explicit_classes} = css_classes.get_all();
		// Should be filtered out by exclude
		assert.isNull(explicit_classes);
	});
});

describe('elements', () => {
	test('all_elements aggregates elements from files', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				elements: new Set(['button', 'input']),
			}),
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['bar', [loc]]]),
				elements: new Set(['a', 'button']),
			}),
		);

		const {all_elements} = css_classes.get_all();
		assert.isTrue(all_elements.has('button'));
		assert.isTrue(all_elements.has('input'));
		assert.isTrue(all_elements.has('a'));
		assert.strictEqual(all_elements.size, 3);
	});

	test('all_elements is empty when no files have elements', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['foo', [loc]]])}));

		const {all_elements} = css_classes.get_all();
		assert.strictEqual(all_elements.size, 0);
	});

	test('explicit_elements aggregates from @fuz-elements annotations', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				explicit_elements: new Set(['button']),
			}),
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['bar', [loc]]]),
				explicit_elements: new Set(['input']),
			}),
		);

		const {explicit_elements} = css_classes.get_all();
		assert.isNotNull(explicit_elements);
		assert.isTrue(explicit_elements.has('button'));
		assert.isTrue(explicit_elements.has('input'));
	});

	test('explicit_elements is null when no files have them', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['foo', [loc]]])}));

		const {explicit_elements} = css_classes.get_all();
		assert.isNull(explicit_elements);
	});

	test('delete removes file elements', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				elements: new Set(['button']),
				explicit_elements: new Set(['button']),
			}),
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['bar', [loc]]]),
				elements: new Set(['input']),
			}),
		);

		css_classes.delete('file1.svelte');

		const {all_elements, explicit_elements} = css_classes.get_all();
		assert.isFalse(all_elements.has('button'));
		assert.isTrue(all_elements.has('input'));
		assert.isNull(explicit_elements);
	});
});

describe('explicit_variables (@fuz-variables)', () => {
	test('add with explicit_variables returns them from get_all', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
		const explicit_vars = new Set(['shade_40', 'text_50']);

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				explicit_variables: explicit_vars,
			}),
		);

		const {explicit_variables} = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isTrue(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('multiple files contributing explicit_variables are aggregated', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['shade_40']),
			}),
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['b', [loc]]]),
				explicit_variables: new Set(['text_50']),
			}),
		);

		const {explicit_variables} = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isTrue(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('delete removes file explicit_variables', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['shade_40']),
			}),
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['b', [loc]]]),
				explicit_variables: new Set(['text_50']),
			}),
		);

		css_classes.delete('file1.svelte');

		const {explicit_variables} = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isFalse(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('re-adding a file replaces old explicit_variables', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['shade_40']),
			}),
		);

		// Re-add with different variables
		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['text_50']),
			}),
		);

		const {explicit_variables} = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isFalse(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('explicit_variables is null when no files have them', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['a', [loc]]])}));

		const {explicit_variables} = css_classes.get_all();
		assert.isNull(explicit_variables);
	});
});

describe('additional_classes with file data (simulating cache behavior)', () => {
	test('additional_classes merged with file data', () => {
		const css_classes = new CssClasses(new Set(['additional_a', 'additional_b']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		// Simulate adding file data (could be from cache or fresh extraction)
		css_classes.add(
			'file1.svelte',
			make_extraction_data({classes: new Map([['extracted_class', [loc]]])}),
		);

		const result = css_classes.get();
		// Both additional and extracted should be present
		assert.isTrue(result.has('additional_a'));
		assert.isTrue(result.has('additional_b'));
		assert.isTrue(result.has('extracted_class'));
	});

	test('exclude_classes filters additional_classes', () => {
		const include = new Set(['keep_me', 'exclude_me']);
		const exclude = new Set(['exclude_me']);
		const css_classes = new CssClasses(include, exclude);
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({classes: new Map([['extracted', [loc]]])}),
		);

		const result = css_classes.get();
		assert.isTrue(result.has('keep_me'));
		assert.isFalse(result.has('exclude_me'));
		assert.isTrue(result.has('extracted'));
	});

	test('multiple files combined with additional_classes', () => {
		const css_classes = new CssClasses(new Set(['always_included']));
		const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
		const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

		// Add multiple files (simulating cache-restored data)
		css_classes.add(
			'file1.svelte',
			make_extraction_data({classes: new Map([['from_file1', [loc1]]])}),
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({classes: new Map([['from_file2', [loc2]]])}),
		);

		const result = css_classes.get();
		assert.isTrue(result.has('always_included'));
		assert.isTrue(result.has('from_file1'));
		assert.isTrue(result.has('from_file2'));
	});

	test('empty additional_classes has no effect on file data', () => {
		const css_classes = new CssClasses(null);
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add(
			'file1.svelte',
			make_extraction_data({classes: new Map([['extracted', [loc]]])}),
		);

		const result = css_classes.get();
		assert.strictEqual(result.size, 1);
		assert.isTrue(result.has('extracted'));
	});

	test('additional_classes appear in explicit_classes for warning tracking', () => {
		const css_classes = new CssClasses(new Set(['additional_class']));
		const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

		css_classes.add('file1.svelte', make_extraction_data({classes: new Map([['regular', [loc]]])}));

		const {explicit_classes} = css_classes.get_all();
		// additional_classes should be in explicit_classes
		assert.isTrue(explicit_classes!.has('additional_class'));
		// Regular extracted classes are not explicit unless via @fuz-classes
		assert.isFalse(explicit_classes!.has('regular'));
	});

	test('file explicit classes combined with additional_classes in explicit_classes', () => {
		const css_classes = new CssClasses(new Set(['additional']));
		const loc: SourceLocation = {file: 'test.ts', line: 1, column: 1};
		const file_explicit = new Set(['from_fuz_classes_annotation']);

		css_classes.add(
			'file1.ts',
			make_extraction_data({
				classes: new Map([['regular', [loc]]]),
				explicit_classes: file_explicit,
			}),
		);

		const {explicit_classes} = css_classes.get_all();
		assert.isTrue(explicit_classes!.has('additional'));
		assert.isTrue(explicit_classes!.has('from_fuz_classes_annotation'));
		assert.isFalse(explicit_classes!.has('regular'));
	});
});
