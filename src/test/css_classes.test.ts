import { test, assert, describe } from 'vitest';

import { CssClasses } from '#lib/css_classes.ts';
import { type ExtractionDiagnostic, type SourceLocation } from '#lib/diagnostics.ts';
import { make_extraction_data } from './test_helpers.ts';

describe('CssClasses', () => {
	test('add and get_all', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		const classes: Map<string, Array<SourceLocation>> = new Map([
			['foo', [loc]],
			['bar', [loc]]
		]);
		css_classes.add('file1.svelte', make_extraction_data({ classes }));

		const result = css_classes.get_all().all_classes;
		assert.isTrue(result.has('foo'));
		assert.isTrue(result.has('bar'));
	});

	test('merges classes from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = { file: 'file1.svelte', line: 1, column: 1 };
		const loc2: SourceLocation = { file: 'file2.svelte', line: 5, column: 10 };

		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['foo', [loc1]]]) }));
		css_classes.add('file2.svelte', make_extraction_data({ classes: new Map([['bar', [loc2]]]) }));

		const result = css_classes.get_all().all_classes;
		assert.isTrue(result.has('foo'));
		assert.isTrue(result.has('bar'));
	});

	test('delete removes file classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['foo', [loc]]]) }));
		css_classes.add('file2.svelte', make_extraction_data({ classes: new Map([['bar', [loc]]]) }));

		css_classes.delete('file1.svelte');

		const result = css_classes.get_all().all_classes;
		assert.isFalse(result.has('foo'));
		assert.isTrue(result.has('bar'));
	});

	test('locations merge from multiple files', () => {
		const css_classes = new CssClasses();
		const loc1: SourceLocation = { file: 'file1.svelte', line: 1, column: 1 };
		const loc2: SourceLocation = { file: 'file2.svelte', line: 5, column: 10 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({ classes: new Map([['shared', [loc1]]]) })
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({ classes: new Map([['shared', [loc2]]]) })
		);

		const result = css_classes.get_all().all_classes_with_locations;
		const locations = result.get('shared');
		assert.lengthOf(locations!, 2);
		assert.deepInclude(locations!, loc1);
		assert.deepInclude(locations!, loc2);
	});

	test('get_diagnostics returns extraction diagnostics', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		const diagnostics: Array<ExtractionDiagnostic> = [
			{
				phase: 'extraction',
				code: 'hint_colon',
				level: 'warning',
				message: 'test warning',
				suggestion: null,
				location: loc
			}
		];

		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map(), diagnostics }));

		const result = css_classes.get_diagnostics();
		assert.lengthOf(result, 1);
		assert.strictEqual(result[0]!.message, 'test warning');
	});

	test('dirty flag triggers recalculation', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['foo', [loc]]]) }));
		const result1 = css_classes.get_all().all_classes;
		assert.isTrue(result1.has('foo'));

		// Add more classes
		css_classes.add('file2.svelte', make_extraction_data({ classes: new Map([['bar', [loc]]]) }));
		const result2 = css_classes.get_all().all_classes;
		assert.isTrue(result2.has('bar'));
	});

	test('cache returns same object when not dirty', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['foo', [loc]]]) }));

		const result1 = css_classes.get_all().all_classes;
		const result2 = css_classes.get_all().all_classes;
		assert.strictEqual(result1, result2);
	});

	test('re-adding same file replaces classes', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['old', [loc]]]) }));
		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['new', [loc]]]) }));

		const result = css_classes.get_all().all_classes;
		assert.isFalse(result.has('old'));
		assert.isTrue(result.has('new'));
	});

	test('explicit_classes tracks @fuz-classes annotations', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.ts', line: 1, column: 1 };
		const explicit = new Set(['annotated_class']);

		css_classes.add(
			'file1.ts',
			make_extraction_data({
				classes: new Map([['regular', [loc]]]),
				explicit_classes: explicit
			})
		);

		const { explicit_classes } = css_classes.get_all();
		assert.isNotNull(explicit_classes);
		assert.isTrue(explicit_classes.has('annotated_class'));
		assert.isFalse(explicit_classes.has('regular'));
	});
});

describe('elements', () => {
	test('all_elements aggregates elements from files', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				elements: new Set(['button', 'input'])
			})
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['bar', [loc]]]),
				elements: new Set(['a', 'button'])
			})
		);

		const { all_elements } = css_classes.get_all();
		assert.isTrue(all_elements.has('button'));
		assert.isTrue(all_elements.has('input'));
		assert.isTrue(all_elements.has('a'));
		assert.strictEqual(all_elements.size, 3);
	});

	test('all_elements is empty when no files have elements', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['foo', [loc]]]) }));

		const { all_elements } = css_classes.get_all();
		assert.strictEqual(all_elements.size, 0);
	});

	test('explicit_elements aggregates from @fuz-elements annotations', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				explicit_elements: new Set(['button'])
			})
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['bar', [loc]]]),
				explicit_elements: new Set(['input'])
			})
		);

		const { explicit_elements } = css_classes.get_all();
		assert.isNotNull(explicit_elements);
		assert.isTrue(explicit_elements.has('button'));
		assert.isTrue(explicit_elements.has('input'));
	});

	test('explicit_elements is null when no files have them', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['foo', [loc]]]) }));

		const { explicit_elements } = css_classes.get_all();
		assert.isNull(explicit_elements);
	});

	test('delete removes file elements', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				elements: new Set(['button']),
				explicit_elements: new Set(['button'])
			})
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['bar', [loc]]]),
				elements: new Set(['input'])
			})
		);

		css_classes.delete('file1.svelte');

		const { all_elements, explicit_elements } = css_classes.get_all();
		assert.isFalse(all_elements.has('button'));
		assert.isTrue(all_elements.has('input'));
		assert.isNull(explicit_elements);
	});
});

describe('explicit_variables (@fuz-variables)', () => {
	test('add with explicit_variables returns them from get_all', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };
		const explicit_vars = new Set(['shade_40', 'text_50']);

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['foo', [loc]]]),
				explicit_variables: explicit_vars
			})
		);

		const { explicit_variables } = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isTrue(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('multiple files contributing explicit_variables are aggregated', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['shade_40'])
			})
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['b', [loc]]]),
				explicit_variables: new Set(['text_50'])
			})
		);

		const { explicit_variables } = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isTrue(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('delete removes file explicit_variables', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['shade_40'])
			})
		);
		css_classes.add(
			'file2.svelte',
			make_extraction_data({
				classes: new Map([['b', [loc]]]),
				explicit_variables: new Set(['text_50'])
			})
		);

		css_classes.delete('file1.svelte');

		const { explicit_variables } = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isFalse(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('re-adding a file replaces old explicit_variables', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['shade_40'])
			})
		);

		// Re-add with different variables
		css_classes.add(
			'file1.svelte',
			make_extraction_data({
				classes: new Map([['a', [loc]]]),
				explicit_variables: new Set(['text_50'])
			})
		);

		const { explicit_variables } = css_classes.get_all();
		assert.isNotNull(explicit_variables);
		assert.isFalse(explicit_variables.has('shade_40'));
		assert.isTrue(explicit_variables.has('text_50'));
	});

	test('explicit_variables is null when no files have them', () => {
		const css_classes = new CssClasses();
		const loc: SourceLocation = { file: 'test.svelte', line: 1, column: 1 };

		css_classes.add('file1.svelte', make_extraction_data({ classes: new Map([['a', [loc]]]) }));

		const { explicit_variables } = css_classes.get_all();
		assert.isNull(explicit_variables);
	});
});
