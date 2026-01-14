import {test, expect, describe} from 'vitest';

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
		expect(result).toBe('  - src/lib/Button.svelte:10:5: test warning message');
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
		expect(result).toBe('  - app.ts:1:1: deprecated syntax (use the new syntax instead)');
	});

	test('formats generation diagnostic with location', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'error',
			message: 'unknown CSS property',
			suggestion: null,
			class_name: 'invalid:value',
			locations: [{file: 'src/App.svelte', line: 5, column: 12}],
		};

		const result = format_diagnostic(diagnostic);
		expect(result).toBe('  - src/App.svelte:5:12: invalid:value: unknown CSS property');
	});

	test('formats generation diagnostic without location (from include_classes)', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'error',
			message: 'invalid class',
			suggestion: null,
			class_name: 'bad_class',
			locations: null,
		};

		const result = format_diagnostic(diagnostic);
		expect(result).toBe('  - bad_class: invalid class');
	});

	test('formats generation diagnostic with suggestion', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'warning',
			message: 'unknown property',
			suggestion: 'did you mean "color"?',
			class_name: 'colour:red',
			locations: [{file: 'test.ts', line: 1, column: 1}],
		};

		const result = format_diagnostic(diagnostic);
		expect(result).toBe(`  - test.ts:1:1: colour:red: unknown property (did you mean "color"?)`);
	});

	test('formats generation diagnostic with empty locations array', () => {
		const diagnostic: GenerationDiagnostic = {
			phase: 'generation',
			level: 'error',
			message: 'test error',
			suggestion: null,
			class_name: 'test_class',
			locations: [],
		};

		const result = format_diagnostic(diagnostic);
		expect(result).toBe('  - test_class: test error');
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
				class_name: 'bad:class',
				locations: [{file: 'app.ts', line: 1, column: 1}],
			},
		];

		const error = new CssGenerationError(diagnostics);

		expect(error.name).toBe('CssGenerationError');
		expect(error.diagnostics).toBe(diagnostics);
		expect(error.message).toContain('CSS generation failed with 1 error');
		expect(error.message).toContain('bad:class');
	});

	test('creates error with multiple error diagnostics', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'error',
				message: 'error one',
				suggestion: null,
				class_name: 'class_a',
				locations: null,
			},
			{
				phase: 'generation',
				level: 'error',
				message: 'error two',
				suggestion: null,
				class_name: 'class_b',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		expect(error.message).toContain('CSS generation failed with 2 errors');
		expect(error.message).toContain('class_a');
		expect(error.message).toContain('class_b');
	});

	test('excludes warnings from error message', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'error',
				message: 'this is an error',
				suggestion: null,
				class_name: 'error_class',
				locations: null,
			},
			{
				phase: 'generation',
				level: 'warning',
				message: 'this is a warning',
				suggestion: null,
				class_name: 'warning_class',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		expect(error.message).toContain('1 error');
		expect(error.message).toContain('error_class');
		expect(error.message).not.toContain('warning_class');
		// But diagnostics array still contains both
		expect(error.diagnostics).toHaveLength(2);
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
				class_name: 'gen_class',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		expect(error.message).toContain('2 errors');
		expect(error.message).toContain('extraction error');
		expect(error.message).toContain('gen_class');
	});

	test('is instanceof Error', () => {
		const error = new CssGenerationError([]);
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(CssGenerationError);
	});

	test('handles zero errors gracefully', () => {
		const diagnostics: Array<GenerationDiagnostic> = [
			{
				phase: 'generation',
				level: 'warning',
				message: 'just a warning',
				suggestion: null,
				class_name: 'warn_class',
				locations: null,
			},
		];

		const error = new CssGenerationError(diagnostics);

		expect(error.message).toContain('0 errors');
		expect(error.diagnostics).toHaveLength(1);
	});
});
