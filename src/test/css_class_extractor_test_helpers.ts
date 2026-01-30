import {expect} from 'vitest';

import type {ExtractionResult} from '$lib/css_class_extractor.js';
import type {SourceLocation} from '$lib/diagnostics.js';

/**
 * Helper to assert extracted class names match expected values.
 * Compares as arrays to also verify extraction order.
 */
export const class_names_equal = (
	result: {classes: Map<string, unknown> | null},
	expected: Array<string>,
): void => {
	const actual = result.classes ? [...result.classes.keys()] : [];
	expect(actual).toEqual(expected);
};

/**
 * Helper to assert a Set of class names matches expected values.
 * For use with `extract_css_classes` which returns a Set or null.
 */
export const class_set_equal = (result: Set<string> | null, expected: Array<string>): void => {
	const actual = result ? [...result] : [];
	expect(actual).toEqual(expected);
};

/**
 * Factory for SourceLocation.
 */
export const loc = (file = 'test.ts', line = 1, column = 1): SourceLocation => ({
	file,
	line,
	column,
});

/**
 * Wrap script content in Svelte template.
 */
export const svelte_script = (script: string, template = '<div></div>'): string =>
	`<script>\n${script}\n</script>\n${template}`;

/**
 * Assert no classes extracted.
 */
export const assert_no_classes = (result: {classes: Map<string, unknown> | null}): void => {
	expect(result.classes).toBeNull();
};

/**
 * Assert elements present/absent.
 */
export const assert_elements = (
	result: ExtractionResult,
	present: Array<string>,
	absent: Array<string> = [],
): void => {
	for (const el of present) {
		expect(result.elements?.has(el), `Expected "${el}" present`).toBe(true);
	}
	for (const el of absent) {
		expect(result.elements?.has(el), `Expected "${el}" absent`).toBe(false);
	}
};

/**
 * Assert diagnostic exists with level and message substring.
 */
export const assert_diagnostic = (
	result: ExtractionResult,
	level: 'warning' | 'error',
	contains: string,
): void => {
	expect(result.diagnostics).not.toBeNull();
	const match = result.diagnostics!.find((d) => d.level === level && d.message.includes(contains));
	expect(match, `Expected ${level} containing "${contains}"`).toBeDefined();
};
