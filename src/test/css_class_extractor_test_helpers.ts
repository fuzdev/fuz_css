import {expect} from 'vitest';

import {
	type ExtractionResult,
	type AcornPlugin,
	extract_from_ts,
} from '$lib/css_class_extractor.js';
import {loc} from './test_helpers.js';

// Re-export loc for consumers that import from this file
export {loc};

/**
 * Cached JSX plugin to avoid repeated async imports.
 * Initialized lazily on first use via `create_jsx_extractor()`.
 */
let cached_jsx_plugin: AcornPlugin | null = null;

/**
 * Creates an extractor function pre-configured with acorn-jsx plugin.
 * Caches the plugin import for efficiency across tests.
 *
 * @example
 * ```ts
 * const extract_jsx = await create_jsx_extractor();
 * const result = extract_jsx('const App = () => <div className="foo" />');
 * ```
 */
export const create_jsx_extractor = async (): Promise<
	(source: string, file?: string) => ExtractionResult
> => {
	if (!cached_jsx_plugin) {
		const jsx_module = await import('acorn-jsx');
		cached_jsx_plugin = jsx_module.default();
	}
	const plugin = cached_jsx_plugin;
	return (source: string, file = 'test.tsx') => extract_from_ts(source, file, [plugin]);
};

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
	file?: string,
): void => {
	expect(result.diagnostics, 'Expected diagnostics array').not.toBeNull();
	const match = result.diagnostics!.find((d) => d.level === level && d.message.includes(contains));
	expect(match, `Expected ${level} containing "${contains}"`).toBeDefined();
	if (file) {
		expect(match!.location.file).toBe(file);
	}
};

/**
 * Assert no diagnostics were emitted.
 */
export const assert_no_diagnostics = (result: ExtractionResult): void => {
	expect(result.diagnostics).toBeNull();
};

/**
 * Assert exact number of diagnostics.
 */
export const assert_diagnostic_count = (result: ExtractionResult, count: number): void => {
	if (count === 0) {
		expect(result.diagnostics).toBeNull();
	} else {
		expect(result.diagnostics?.length, `Expected ${count} diagnostics`).toBe(count);
	}
};

/**
 * Assert a variable is tracked.
 */
export const assert_tracked_var = (result: ExtractionResult, name: string): void => {
	expect(result.tracked_vars?.has(name), `Expected "${name}" to be tracked`).toBe(true);
};

/**
 * Assert a variable is not tracked.
 */
export const assert_not_tracked_var = (result: ExtractionResult, name: string): void => {
	expect(result.tracked_vars?.has(name) ?? false, `Expected "${name}" to not be tracked`).toBe(
		false,
	);
};

/**
 * Assert class location at specific line (first occurrence).
 */
export const assert_class_at_line = (
	result: ExtractionResult,
	class_name: string,
	line: number,
	file?: string,
): void => {
	const locations = result.classes?.get(class_name);
	expect(locations, `Expected class "${class_name}" to exist`).toBeDefined();
	expect(locations![0]!.line).toBe(line);
	if (file) {
		expect(locations![0]!.file).toBe(file);
	}
};

/**
 * Assert all locations for a class (for duplicates).
 */
export const assert_class_locations = (
	result: ExtractionResult,
	class_name: string,
	expected_lines: Array<number>,
): void => {
	const locations = result.classes?.get(class_name);
	expect(locations, `Expected class "${class_name}" to exist`).toBeDefined();
	expect(locations!.length).toBe(expected_lines.length);
	for (let i = 0; i < expected_lines.length; i++) {
		expect(locations![i]!.line).toBe(expected_lines[i]);
	}
};

/**
 * Assert explicit classes present.
 */
export const assert_explicit_classes = (
	result: ExtractionResult,
	expected: Array<string>,
): void => {
	expect(result.explicit_classes, 'Expected explicit_classes to be present').not.toBeNull();
	const actual = [...result.explicit_classes!].sort();
	expect(actual).toEqual([...expected].sort());
};

/**
 * Assert explicit elements present.
 */
export const assert_explicit_elements = (
	result: ExtractionResult,
	expected: Array<string>,
): void => {
	expect(result.explicit_elements, 'Expected explicit_elements to be present').not.toBeNull();
	const actual = [...result.explicit_elements!].sort();
	expect(actual).toEqual([...expected].sort());
};

/**
 * Assert no explicit elements.
 */
export const assert_no_explicit_elements = (result: ExtractionResult): void => {
	expect(result.explicit_elements).toBeNull();
};

/**
 * Assert explicit variables present.
 */
export const assert_explicit_variables = (
	result: ExtractionResult,
	expected: Array<string>,
): void => {
	expect(result.explicit_variables, 'Expected explicit_variables to be present').not.toBeNull();
	const actual = [...result.explicit_variables!].sort();
	expect(actual).toEqual([...expected].sort());
};

/**
 * Assert no explicit variables.
 */
export const assert_no_explicit_variables = (result: ExtractionResult): void => {
	expect(result.explicit_variables).toBeNull();
};
