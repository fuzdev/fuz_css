/**
 * Shared test helpers for fuz_css test suite.
 *
 * This module provides reusable factories, assertion helpers, and utilities
 * to reduce duplication and improve test readability.
 */

import {expect} from 'vitest';

import type {SourceLocation, ExtractionDiagnostic, GenerationDiagnostic} from '$lib/diagnostics.js';
import type {CssClassDefinition} from '$lib/css_class_generation.js';

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
 * Creates a basic CssClassDefinition with just a declaration.
 */
export const make_declaration_def = (declaration: string): CssClassDefinition => ({
	declaration,
});

/**
 * Creates a CssClassDefinition with composes array (no declaration).
 */
export const make_composes_def = (composes: Array<string>): CssClassDefinition => ({
	composes,
});

/**
 * Creates a CssClassDefinition with composes array and declaration.
 */
export const make_composes_with_declaration_def = (
	composes: Array<string>,
	declaration: string,
): CssClassDefinition => ({
	composes,
	declaration,
});

/**
 * Creates a CssClassDefinition with a ruleset.
 */
export const make_ruleset_def = (ruleset: string): CssClassDefinition => ({
	ruleset,
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
// Result Assertion Helpers
//

/**
 * Asserts that a result with an `ok` property is successful.
 * Provides a clear failure message.
 */
export const expect_ok = <T extends {ok: boolean}>(result: T, msg?: string): void => {
	expect(result.ok, msg ?? 'Expected result.ok to be true').toBe(true);
};

/**
 * Asserts that a result with an `ok` property failed.
 * Provides a clear failure message.
 */
export const expect_error = <T extends {ok: boolean}>(result: T, msg?: string): void => {
	expect(result.ok, msg ?? 'Expected result.ok to be false').toBe(false);
};

/**
 * Asserts a result is ok and returns the narrowed type.
 * Useful for tests that need to access properties only available on success.
 */
export const assert_result_ok = <TOk, TErr>(
	result: ({ok: true} & TOk) | ({ok: false} & TErr),
	msg?: string,
): TOk & {ok: true} => {
	expect(result.ok, msg ?? 'Expected result.ok to be true').toBe(true);
	return result as TOk & {ok: true};
};

/**
 * Asserts a result is error and returns the narrowed type.
 */
export const assert_result_error = <TOk, TErr>(
	result: ({ok: true} & TOk) | ({ok: false} & TErr),
	msg?: string,
): TErr & {ok: false} => {
	expect(result.ok, msg ?? 'Expected result.ok to be false').toBe(false);
	return result as TErr & {ok: false};
};

//
// Set Membership Helpers
//

/**
 * Asserts that a Set contains a specific value.
 */
export const expect_has = <T>(set: Set<T>, value: T, label?: string): void => {
	const name = label ?? String(value);
	expect(set.has(value), `Expected set to contain "${name}"`).toBe(true);
};

/**
 * Asserts that a Set does not contain a specific value.
 */
export const expect_not_has = <T>(set: Set<T>, value: T, label?: string): void => {
	const name = label ?? String(value);
	expect(set.has(value), `Expected set NOT to contain "${name}"`).toBe(false);
};

/**
 * Asserts that a Map has a specific key.
 */
export const expect_map_has = <K, V>(map: Map<K, V>, key: K, label?: string): void => {
	const name = label ?? String(key);
	expect(map.has(key), `Expected map to have key "${name}"`).toBe(true);
};

/**
 * Asserts that a Map does not have a specific key.
 */
export const expect_map_not_has = <K, V>(map: Map<K, V>, key: K, label?: string): void => {
	const name = label ?? String(key);
	expect(map.has(key), `Expected map NOT to have key "${name}"`).toBe(false);
};

//
// CSS Output Helpers
//

/**
 * Asserts that a CSS string contains all specified patterns.
 */
export const expect_css_contains = (css: string, ...patterns: Array<string>): void => {
	for (const pattern of patterns) {
		expect(css, `Expected CSS to contain "${pattern}"`).toContain(pattern);
	}
};

/**
 * Asserts that a CSS string does not contain any of the specified patterns.
 */
export const expect_css_not_contains = (css: string, ...patterns: Array<string>): void => {
	for (const pattern of patterns) {
		expect(css, `Expected CSS NOT to contain "${pattern}"`).not.toContain(pattern);
	}
};

/**
 * Asserts that patterns appear in a specific order in the string.
 * Useful for testing cascade/specificity ordering in CSS.
 *
 * @example
 * expect_css_order(result.css, '.aaa', '.zzz', '.mmm');
 * expect_css_order(result.base_css, 'color: blue', 'color: darkblue');
 */
export const expect_css_order = (css: string, ...patterns: Array<string>): void => {
	const indices = patterns.map((p) => ({pattern: p, idx: css.indexOf(p)}));

	// First, check all patterns exist
	for (const {pattern, idx} of indices) {
		expect(idx, `Expected string to contain "${pattern}"`).toBeGreaterThan(-1);
	}

	// Then check ordering
	for (let i = 0; i < indices.length - 1; i++) {
		const current = indices[i]!;
		const next = indices[i + 1]!;
		expect(
			current.idx,
			`Expected "${current.pattern}" to appear before "${next.pattern}"`,
		).toBeLessThan(next.idx);
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
export const expect_diagnostic = (
	diagnostics: Array<GenerationDiagnostic> | Array<ExtractionDiagnostic> | null,
	level: 'error' | 'warning',
	messageContains: string,
): void => {
	expect(diagnostics, 'Expected diagnostics array to exist').not.toBeNull();
	const match = diagnostics!.find((d) => d.level === level && d.message.includes(messageContains));
	expect(match, `Expected ${level} diagnostic containing "${messageContains}"`).toBeDefined();
};

/**
 * Asserts that no diagnostics match the criteria.
 */
export const expect_no_diagnostic = (
	diagnostics: Array<GenerationDiagnostic> | Array<ExtractionDiagnostic> | null,
	level: 'error' | 'warning',
	messageContains: string,
): void => {
	if (!diagnostics) return;
	const match = diagnostics.find((d) => d.level === level && d.message.includes(messageContains));
	expect(match, `Expected no ${level} diagnostic containing "${messageContains}"`).toBeUndefined();
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
// Variable/Graph Helpers
//

/**
 * Asserts that a variable exists in a graph's variable set.
 */
export const expect_variable_exists = (
	variables: Map<string, unknown> | Set<string>,
	varName: string,
): void => {
	const exists = variables instanceof Set ? variables.has(varName) : variables.has(varName);
	expect(exists, `Expected variable "${varName}" to exist`).toBe(true);
};

/**
 * Asserts that a warning array contains a cyclic dependency warning.
 */
export const expect_cyclic_warning = (warnings: Array<string>): void => {
	expect(warnings.length, 'Expected at least one warning').toBeGreaterThan(0);
	const hasCyclic = warnings.some((w) => w.includes('Circular dependency'));
	expect(hasCyclic, 'Expected a "Circular dependency" warning').toBe(true);
};

//
// CSS Class Resolution Helpers
//

/**
 * Asserts resolution result is ok and has expected declaration.
 */
export const expect_resolved_declaration = (
	result: {ok: boolean; declaration?: string},
	expected: string,
): void => {
	expect(result.ok, 'Expected resolution to succeed').toBe(true);
	if (result.ok) {
		expect(result.declaration).toBe(expected);
	}
};

/**
 * Asserts resolution result is error with message containing text.
 */
export const expect_resolution_error = (
	result: {ok: boolean; error?: {message: string}},
	messageContains: string,
): void => {
	expect(result.ok, 'Expected resolution to fail').toBe(false);
	if (!result.ok && result.error) {
		expect(
			result.error.message,
			`Expected error message to contain "${messageContains}"`,
		).toContain(messageContains);
	}
};

//
// Style Rule Parser Helpers
//

/**
 * Asserts that a parsed rule's variables_used set contains the variable.
 */
export const expect_variable_used = (
	rule: {variables_used: Set<string>},
	varName: string,
): void => {
	expect(rule.variables_used.has(varName), `Expected rule to use variable "${varName}"`).toBe(true);
};

/**
 * Asserts that a parsed rule is a core rule with a specific reason.
 */
export const expect_core_rule = (
	rule: {is_core: boolean; core_reason?: string},
	reason: string,
): void => {
	expect(rule.is_core, 'Expected rule to be a core rule').toBe(true);
	expect(rule.core_reason).toBe(reason);
};

/**
 * Asserts that a parsed rule extracts specific elements.
 */
export const expect_rule_elements = (
	rule: {elements: Set<string>},
	...elements: Array<string>
): void => {
	for (const element of elements) {
		expect(rule.elements.has(element), `Expected rule to target element "${element}"`).toBe(true);
	}
};

/**
 * Asserts that a parsed rule extracts specific classes.
 */
export const expect_rule_classes = (
	rule: {classes: Set<string>},
	...classes: Array<string>
): void => {
	for (const cls of classes) {
		expect(rule.classes.has(cls), `Expected rule to reference class "${cls}"`).toBe(true);
	}
};
