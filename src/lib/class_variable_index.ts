/**
 * Class-to-variable index for bundled CSS generation.
 *
 * Builds an index mapping CSS class names to the CSS variables they use.
 * This enables the bundled generator to include theme variables needed
 * by the utility classes actually used in the project.
 *
 * @module
 */

import type {CssClassDefinition} from './css_class_generation.js';
import {extract_css_variables} from './css_variable_utils.js';

/**
 * Index mapping class names to their CSS variable dependencies.
 */
export interface CssClassVariableIndex {
	/** Map from class name to set of variable names (without -- prefix) */
	by_class: Map<string, Set<string>>;
}

/**
 * Builds an index of CSS variables used by each class definition.
 *
 * @param definitions - CSS class definitions to index
 * @returns `CssClassVariableIndex` with variable lookups
 */
export const build_class_variable_index = (
	definitions: Record<string, CssClassDefinition | undefined>,
): CssClassVariableIndex => {
	const by_class: Map<string, Set<string>> = new Map();

	for (const [class_name, definition] of Object.entries(definitions)) {
		if (!definition) continue;

		const variables = extract_variables_from_definition(definition);
		if (variables.size > 0) {
			by_class.set(class_name, variables);
		}
	}

	return {by_class};
};

/**
 * Extracts CSS variables from a class definition.
 * Handles declaration, ruleset, and composes formats.
 */
const extract_variables_from_definition = (definition: CssClassDefinition): Set<string> => {
	const variables: Set<string> = new Set();

	// Handle declaration format
	if ('declaration' in definition && definition.declaration) {
		for (const v of extract_css_variables(definition.declaration)) {
			variables.add(v);
		}
	}

	// Handle ruleset format
	if ('ruleset' in definition && definition.ruleset) {
		for (const v of extract_css_variables(definition.ruleset)) {
			variables.add(v);
		}
	}

	// Note: 'composes' is handled at generation time by resolving
	// the composed class definitions. We don't need to trace composes
	// here because the generator will include composed classes and
	// their variables will be collected from those definitions.

	return variables;
};

/**
 * Gets variables used by a specific class.
 *
 * @param index - the class variable index
 * @param class_name - name of the class to lookup
 * @returns set of variable names (without -- prefix), or null if class not found
 */
export const get_class_variables = (
	index: CssClassVariableIndex,
	class_name: string,
): Set<string> | null => index.by_class.get(class_name) ?? null;

/**
 * Collects all variables used by a set of classes.
 *
 * @param index - the class variable index
 * @param class_names - class names to collect variables from
 * @returns set of all variable names used by the classes
 */
export const collect_class_variables = (
	index: CssClassVariableIndex,
	class_names: Iterable<string>,
): Set<string> => {
	const variables: Set<string> = new Set();

	for (const class_name of class_names) {
		const class_vars = index.by_class.get(class_name);
		if (class_vars) {
			for (const v of class_vars) {
				variables.add(v);
			}
		}
	}

	return variables;
};

/**
 * Gets all class names that use a specific variable.
 *
 * @param index - the class variable index
 * @param variable_name - variable name to search for (without -- prefix)
 * @returns array of class names that use this variable
 */
export const get_classes_using_variable = (
	index: CssClassVariableIndex,
	variable_name: string,
): Array<string> => {
	const classes: Array<string> = [];

	for (const [class_name, variables] of index.by_class) {
		if (variables.has(variable_name)) {
			classes.push(class_name);
		}
	}

	return classes;
};
