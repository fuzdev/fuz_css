import {test, assert, describe} from 'vitest';

import {
	format_diagnostic,
	CssGenerationError,
	type ExtractionDiagnostic,
	type GenerationDiagnostic,
} from '$lib/diagnostics.js';

describe('format_diagnostic', () => {
	test('formats extraction diagnostic with location', () => {
		const diagnostic: ExtractionDiagnostic = {
			phase: 'extraction',
			level: 'warning',
			message: 'test warning message',
			suggestion: null,
			location: {file: 'src/lib/Button.svelte', line: 10, column: 5},
		};

		const result = format_diagnostic(diagnostic);
		assert.strictEqual(result, '  - src/lib/Button.svelte:10:5: test warning message');
	});

	test('formats extraction diagnostic with suggestion', () => {
		const diagnostic: ExtractionDiagnostic = {
			phase: 'extraction',
			level: 'error',
			message: 'deprecated syntax',
			suggestion: 'use the new syntax instead',
			location: {file: 'app.ts', line: 1, column: 1},
		};

		const result = format_diagnostic(diagnostic);
		assert.strictEqual(result, '  - app.ts:1:1: deprecated syntax (use the new syntax instead)');
	});

	test('formats generation diagnostic with location', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'error',
			message: 'unknown CSS property',
			suggestion: null,
			identifier: 'invalid:value',
			locations: [{file: 'src/App.svelte', line: 5, column: 12}],
		};

		const result = format_diagnostic(diagnostic);
		assert.strictEqual(result, '  - src/App.svelte:5:12: invalid:value: unknown CSS property');
	});

	test('formats generation diagnostic without location (from additional_classes)', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'error',
			message: 'invalid class',
			suggestion: null,
			identifier: 'bad_class',
			locations: null,
		};

		const result = format_diagnostic(diagnostic);
		assert.strictEqual(result, '  - bad_class: invalid class');
	});

	test('formats generation diagnostic with suggestion', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'warning',
			message: 'unknown property',
			suggestion: 'did you mean "color"?',
			identifier: 'colour:red',
			locations: [{file: 'test.ts', line: 1, column: 1}],
		};

		const result = format_diagnostic(diagnostic);
		assert.strictEqual(
			result,
			`  - test.ts:1:1: colour:red: unknown property (did you mean "color"?)`,
		);
	});

	test('formats generation diagnostic with empty locations array', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'error',
			message: 'test error',
			suggestion: null,
			identifier: 'test_class',
			locations: [],
		};

		const result = format_diagnostic(diagnostic);
		assert.strictEqual(result, '  - test_class: test error');
	});
});

describe('CssGenerationError', () => {
	test('creates error with single error diagnostic', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'error',
				message: 'unknown property',
				suggestion: null,
				identifier: 'bad:class',
				locations: [{file: 'app.ts', line: 1, column: 1}],
			},
		];

		const error = new CssGenerationError(diagnostics);

		assert.strictEqual(error.name, 'CssGenerationError');
		assert.strictEqual(error.diagnostics, diagnostics);
		assert.include(error.message, 'CSS generation failed with 1 error');
		assert.include(error.message, 'bad:class');
	});

	test('creates error with multiple error diagnostics', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'error',
				message: 'error one',
				suggestion: null,
				identifier: 'class_a',
				locations: null,
			},
			{
				phase: 'generation',
				level: 'error',
				message: 'error two',
				suggestion: null,
				identifier: 'class_b',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		assert.include(error.message, 'CSS generation failed with 2 errors');
		assert.include(error.message, 'class_a');
		assert.include(error.message, 'class_b');
	});

	test('includes both errors and warnings in message', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'error',
				message: 'this is an error',
				suggestion: null,
				identifier: 'error_class',
				locations: null,
			},
			{
				phase: 'generation',
				level: 'warning',
				message: 'this is a warning',
				suggestion: null,
				identifier: 'warning_class',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		assert.include(error.message, '1 error');
		assert.include(error.message, '1 warning');
		assert.include(error.message, 'error_class');
		assert.include(error.message, 'warning_class');
		assert.lengthOf(error.diagnostics, 2);
	});

	test('handles mixed extraction and generation diagnostics', () => {
		const diagnostics = [
			{
				phase: 'extraction' as const,
				level: 'error' as const,
				message: 'extraction error',
				suggestion: null,
				location: {file: 'test.ts', line: 1, column: 1},
			},
			{
				phase: 'generation' as const,
				level: 'error' as const,
				message: 'generation error',
				suggestion: null,
				identifier: 'gen_class',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		assert.include(error.message, '2 errors');
		assert.include(error.message, 'extraction error');
		assert.include(error.message, 'gen_class');
	});

	test('is instanceof Error', () => {
		const error = new CssGenerationError([]);
		assert.instanceOf(error, Error);
		assert.instanceOf(error, CssGenerationError);
	});

	test('handles warnings-only (for on_warning throw)', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'warning',
				message: 'just a warning',
				suggestion: null,
				identifier: 'warn_class',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		assert.include(error.message, '1 warning');
		assert.notInclude(error.message, 'error');
		assert.include(error.message, 'warn_class');
		assert.lengthOf(error.diagnostics, 1);
	});

	test('handles empty diagnostics', () => {
		const error = new CssGenerationError([]);

		assert.include(error.message, '0 issues');
		assert.lengthOf(error.diagnostics, 0);
	});
});
