import {expect} from 'vitest';

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
 * For use with `extract_css_classes` which returns a Set directly.
 */
export const class_set_equal = (result: Set<string>, expected: Array<string>): void => {
	expect([...result]).toEqual(expected);
};
