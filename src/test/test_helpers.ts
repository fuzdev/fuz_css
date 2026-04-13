/**
 * Shared test helpers for fuz_css test suite.
 *
 * This module provides reusable factories, assertion helpers, and utilities
 * to reduce duplication and improve test readability.
 */

import {assert} from 'vitest';

import type {SourceLocation, ExtractionDiagnostic, GenerationDiagnostic} from '$lib/diagnostics.js';
import type {ExtractionData} from '$lib/css_class_extractor.js';

//
// Factory Helpers
//

/**
 * Creates a SourceLocation object with sensible defaults.
 */
export const loc = (file = 'test.ts', line = 1, column = 1): SourceLocation => ({
	file,
	line,
	column,
});

/**
 * An `ExtractionData` with all fields set to `null`.
 */
export const EMPTY_EXTRACTION: ExtractionData = {
	classes: null,
	explicit_classes: null,
	diagnostics: null,
	elements: null,
	explicit_elements: null,
	explicit_variables: null,
};

/**
 * Creates an `ExtractionData` with null defaults, overridden by the provided fields.
 */
export const make_extraction_data = (overrides: Partial<ExtractionData> = {}): ExtractionData => ({
	...EMPTY_EXTRACTION,
	...overrides,
});

/**
 * Creates a Map of class names to source locations from tuple entries.
 */
export const make_classes = (
	entries: Array<[string, Array<SourceLocation>]>,
): Map<string, Array<SourceLocation>> => new Map(entries);

/**
 * Creates an ExtractionDiagnostic with sensible defaults.
 */
export const make_extraction_diagnostic = (
	overrides: Partial<ExtractionDiagnostic> = {},
): ExtractionDiagnostic => ({
	phase: 'extraction',
	level: 'warning',
	message: 'test message',
	suggestion: null,
	location: loc(),
	...overrides,
});

//
// CSS Output Helpers
//

/**
 * Asserts that a CSS string contains all specified patterns.
 */
export const assert_css_contains = (css: string, ...patterns: Array<string>): void => {
	for (const pattern of patterns) {
		assert.include(css, pattern, `Expected CSS to contain "${pattern}"`);
	}
};

/**
 * Asserts that a CSS string does not contain any of the specified patterns.
 */
export const assert_css_not_contains = (css: string, ...patterns: Array<string>): void => {
	for (const pattern of patterns) {
		assert.notInclude(css, pattern, `Expected CSS NOT to contain "${pattern}"`);
	}
};

/**
 * Asserts that patterns appear in a specific order in the string.
 * Useful for testing cascade/specificity ordering in CSS.
 *
 * @example
 * assert_css_order(result.css, '.aaa', '.zzz', '.mmm');
 * assert_css_order(result.base_css, 'color: blue', 'color: darkblue');
 */
export const assert_css_order = (css: string, ...patterns: Array<string>): void => {
	const indices = patterns.map((p) => ({pattern: p, idx: css.indexOf(p)}));

	// First, check all patterns exist
	for (const {pattern, idx} of indices) {
		assert.isAbove(idx, -1, `Expected string to contain "${pattern}"`);
	}

	// Then check ordering
	for (let i = 0; i < indices.length - 1; i++) {
		const current = indices[i]!;
		const next = indices[i + 1]!;
		assert.isBelow(
			current.idx,
			next.idx,
			`Expected "${current.pattern}" to appear before "${next.pattern}"`,
		);
	}
};

/**
 * Counts occurrences of a pattern in CSS string.
 */
export const count_css_occurrences = (css: string, pattern: string): number => {
	const matches = css.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
	return matches?.length ?? 0;
};

//
// Diagnostic Helpers
//

/**
 * Asserts that diagnostics array contains a diagnostic matching the criteria.
 */
export const assert_diagnostic = (
	diagnostics: Array<GenerationDiagnostic> | Array<ExtractionDiagnostic> | null,
	level: 'error' | 'warning',
	messageContains: string,
): void => {
	assert.isNotNull(diagnostics, 'Expected diagnostics array to exist');
	const match = diagnostics.find((d) => d.level === level && d.message.includes(messageContains));
	assert.isDefined(match, `Expected ${level} diagnostic containing "${messageContains}"`);
};

/**
 * Asserts that no diagnostics match the criteria.
 */
export const assert_no_diagnostic = (
	diagnostics: Array<GenerationDiagnostic> | Array<ExtractionDiagnostic> | null,
	level: 'error' | 'warning',
	messageContains: string,
): void => {
	if (!diagnostics) return;
	const match = diagnostics.find((d) => d.level === level && d.message.includes(messageContains));
	assert.isUndefined(match, `Expected no ${level} diagnostic containing "${messageContains}"`);
};

/**
 * Filters diagnostics by level.
 */
export const filter_diagnostics_by_level = <T extends GenerationDiagnostic | ExtractionDiagnostic>(
	diagnostics: Array<T> | null,
	level: 'error' | 'warning',
): Array<T> => {
	if (!diagnostics) return [];
	return diagnostics.filter((d) => d.level === level);
};

/**
 * Filters diagnostics by message content.
 */
export const filter_diagnostics_by_message = <
	T extends GenerationDiagnostic | ExtractionDiagnostic,
>(
	diagnostics: Array<T> | null,
	messageContains: string,
): Array<T> => {
	if (!diagnostics) return [];
	return diagnostics.filter((d) => d.message.includes(messageContains));
};

//
// CSS Class Resolution Helpers
//

/**
 * Asserts resolution result is ok and has expected declaration.
 */
export const assert_resolved_declaration = (
	result: {ok: boolean; declaration?: string},
	expected: string,
): void => {
	assert.isTrue(result.ok, 'Expected resolution to succeed');
	assert.strictEqual(result.declaration, expected);
};

/**
 * Asserts resolution result is error with message containing text.
 */
export const assert_resolution_error = (
	result: {ok: boolean; error?: {message: string}},
	messageContains: string,
): void => {
	assert.isFalse(result.ok, 'Expected resolution to fail');
	assert.isDefined(result.error);
	assert.include(
		result.error.message,
		messageContains,
		`Expected error message to contain "${messageContains}"`,
	);
};
