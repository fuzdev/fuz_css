/**
 * Shared test fixtures and helpers for CSS unified resolution tests.
 *
 * @module
 */

import {parse_style_css} from '../lib/style_rule_parser.js';
import {build_variable_graph} from '../lib/variable_graph.js';
import {build_class_variable_index} from '../lib/class_variable_index.js';
import type {StyleVariable} from '../lib/variable.js';
import type {CssClassDefinition} from '../lib/css_class_generation.js';
import {expect_css_order} from './test_helpers.js';

// Re-export expect_css_order as assert_order for backwards compatibility
export {expect_css_order as assert_order};

/**
 * Helper to create minimal test fixtures for CSS resolution tests.
 */
export const create_test_fixtures = (
	css: string,
	variables: Array<StyleVariable>,
	class_defs: Record<string, CssClassDefinition | undefined> = {},
): {
	style_rule_index: ReturnType<typeof parse_style_css>;
	variable_graph: ReturnType<typeof build_variable_graph>;
	class_variable_index: ReturnType<typeof build_class_variable_index>;
} => {
	const style_rule_index = parse_style_css(css, 'test-hash');
	const variable_graph = build_variable_graph(variables, 'test-hash');
	const class_variable_index = build_class_variable_index(class_defs);
	return {style_rule_index, variable_graph, class_variable_index};
};

/**
 * Creates empty detection sets for resolve_css calls.
 * Reduces boilerplate in tests.
 */
export const empty_detection = (): {
	detected_elements: Set<string>;
	detected_classes: Set<string>;
	detected_css_variables: Set<string>;
	utility_variables_used: Set<string>;
} => ({
	detected_elements: new Set<string>(),
	detected_classes: new Set<string>(),
	detected_css_variables: new Set<string>(),
	utility_variables_used: new Set<string>(),
});
