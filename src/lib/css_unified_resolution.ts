/**
 * CSS resolution algorithm for unified CSS generation.
 *
 * Combines theme variables, base styles, and utility classes into a single
 * unified output. Resolves which CSS rules and variables to include based
 * on what elements and classes are actually used in the project.
 *
 * @module
 */

import type {GenerationDiagnostic} from './diagnostics.js';
import {
	type StyleRuleIndex,
	get_matching_rules,
	generate_base_css,
	collect_rule_variables,
} from './style_rule_parser.js';
import {
	type VariableDependencyGraph,
	resolve_variables_transitive,
	generate_theme_css,
	get_all_variable_names,
} from './variable_graph.js';
import {type ClassVariableIndex, collect_class_variables} from './class_variable_index.js';

/**
 * Statistics from CSS resolution (only included when `include_stats` is true).
 */
export interface CssResolutionStats {
	/** Number of HTML elements included */
	element_count: number;
	/** List of HTML element names included */
	elements: Array<string>;
	/** Number of rules included from style.css */
	included_rules: number;
	/** Total number of rules in style.css */
	total_rules: number;
	/** Number of CSS variables resolved (including transitive deps) */
	variable_count: number;
}

/**
 * Result from CSS resolution.
 */
export interface CssResolutionResult {
	/** CSS for theme variables (light and dark) */
	theme_css: string;
	/** CSS for base styles (from style.css) */
	base_css: string;
	/** All resolved variable names (including transitive deps) */
	resolved_variables: Set<string>;
	/** Indices of rules included from the style index */
	included_rule_indices: Set<number>;
	/** Element names that were matched */
	included_elements: Set<string>;
	/** Diagnostics from resolution */
	diagnostics: Array<GenerationDiagnostic>;
	/** Resolution statistics (only when include_stats is true) */
	stats?: CssResolutionStats;
}

/**
 * Options for CSS resolution.
 */
export interface CssResolutionOptions {
	/** Index of style.css rules */
	style_rule_index: StyleRuleIndex;
	/** Dependency graph for theme variables */
	variable_graph: VariableDependencyGraph;
	/** Index mapping classes to variables */
	class_variable_index: ClassVariableIndex;
	/** HTML elements detected in source files */
	detected_elements: Set<string>;
	/** CSS classes detected in source files */
	detected_classes: Set<string>;
	/** CSS variables directly referenced in source files */
	detected_css_variables: Set<string>;
	/** CSS variables used by generated utility classes */
	utility_variables_used: Set<string>;
	/** Additional elements to always include */
	include_elements?: Iterable<string>;
	/** Additional variables to always include */
	include_variables?: Iterable<string>;
	/**
	 * Include all theme variables regardless of detection.
	 * Useful for debugging or when many variables are used dynamically.
	 * @default false
	 */
	include_all_variables?: boolean;
	/** Specificity multiplier for theme selector (default 1) */
	theme_specificity?: number;
	/** Whether to include resolution statistics in result */
	include_stats?: boolean;
	/** Warn when detected elements have no matching style rules (default false) */
	warn_unmatched_elements?: boolean;
}

/**
 * Resolves which CSS to include based on detected usage.
 *
 * Algorithm:
 * 1. Collect rules: core rules + element-matching + class-matching
 * 2. Collect variables: from rules, class defs, utility generation, detected vars, include_variables
 * 3. Resolve transitive variable dependencies
 * 4. Generate output: theme_css (light+dark), base_css (source order)
 */
export const resolve_css = (options: CssResolutionOptions): CssResolutionResult => {
	const {
		style_rule_index,
		variable_graph,
		class_variable_index,
		detected_elements,
		detected_classes,
		detected_css_variables,
		utility_variables_used,
		include_elements,
		include_variables,
		include_all_variables = false,
		theme_specificity = 1,
		include_stats = false,
		warn_unmatched_elements = false,
	} = options;

	const diagnostics: Array<GenerationDiagnostic> = [];
	const included_elements: Set<string> = new Set();

	// Step 1: Collect elements (detected + include_elements)
	for (const element of detected_elements) {
		included_elements.add(element);
	}
	if (include_elements) {
		for (const element of include_elements) {
			included_elements.add(element);
		}
	}

	// Step 2: Get matching rules from style.css
	const included_rule_indices = get_matching_rules(
		style_rule_index,
		included_elements,
		detected_classes,
	);

	// Step 2b: Warn about elements with no matching style rules
	if (warn_unmatched_elements) {
		for (const element of included_elements) {
			const rules = style_rule_index.by_element.get(element);
			if (!rules || rules.length === 0) {
				diagnostics.push({
					phase: 'generation',
					level: 'warning',
					message: `No style rules found for element "${element}"`,
					suggestion: 'Element will use browser defaults. Add to include_elements if intentional.',
					class_name: element,
					locations: null,
				});
			}
		}
	}

	// Step 3: Collect all variables from multiple sources
	const all_variables: Set<string> = new Set();

	// a) Variables from matched style rules
	const rule_variables = collect_rule_variables(style_rule_index, included_rule_indices);
	for (const v of rule_variables) {
		all_variables.add(v);
	}

	// b) Variables from class definitions (static classes that will be generated)
	const class_variables = collect_class_variables(class_variable_index, detected_classes);
	for (const v of class_variables) {
		all_variables.add(v);
	}

	// c) Variables from utility class generation (collected during generation)
	for (const v of utility_variables_used) {
		all_variables.add(v);
	}

	// d) Variables directly referenced in source files
	for (const v of detected_css_variables) {
		all_variables.add(v);
	}

	// e) User-specified include_variables
	if (include_variables) {
		for (const v of include_variables) {
			all_variables.add(v);
		}
	}

	// f) Include all variables if requested (for debugging)
	if (include_all_variables) {
		for (const v of get_all_variable_names(variable_graph)) {
			all_variables.add(v);
		}
	}

	// Step 4: Resolve transitive variable dependencies
	const resolution = resolve_variables_transitive(variable_graph, all_variables);
	const resolved_variables = resolution.variables;

	// Add any cycle warnings
	for (const warning of resolution.warnings) {
		diagnostics.push({
			phase: 'generation',
			level: 'warning',
			message: warning,
			suggestion: null,
			class_name: 'variable_resolution',
			locations: null,
		});
	}

	// Add missing variable warnings
	for (const name of resolution.missing) {
		diagnostics.push({
			phase: 'generation',
			level: 'warning',
			message: `CSS variable "--${name}" not found in theme variables`,
			suggestion: 'Check spelling or add to include_variables option',
			class_name: `var(--${name})`,
			locations: null,
		});
	}

	// Step 5: Generate theme CSS
	const {light_css, dark_css} = generate_theme_css(
		variable_graph,
		resolved_variables,
		theme_specificity,
	);
	const theme_css = [light_css, dark_css].filter(Boolean).join('\n\n');

	// Step 6: Generate base CSS from matched rules
	const base_css = generate_base_css(style_rule_index, included_rule_indices);

	// Build stats if requested
	const stats = include_stats
		? {
				element_count: included_elements.size,
				elements: [...included_elements],
				included_rules: included_rule_indices.size,
				total_rules: style_rule_index.rules.length,
				variable_count: resolved_variables.size,
			}
		: undefined;

	return {
		theme_css,
		base_css,
		resolved_variables,
		included_rule_indices,
		included_elements,
		diagnostics,
		stats,
	};
};

/**
 * Generates combined CSS output from resolution result.
 *
 * @param result - Resolution result from resolve_css
 * @param utility_css - Generated utility CSS (from generate_classes_css)
 * @param options - Output options
 * @returns Combined CSS string
 */
export const generate_unified_css = (
	result: CssResolutionResult,
	utility_css: string,
	options: {
		include_theme?: boolean;
		include_base?: boolean;
		include_utilities?: boolean;
	} = {},
): string => {
	const {include_theme = true, include_base = true, include_utilities = true} = options;

	const parts: Array<string> = [];

	if (include_theme && result.theme_css) {
		parts.push('/* Theme Variables */');
		parts.push(result.theme_css);
	}

	if (include_base && result.base_css) {
		parts.push('/* Base Styles */');
		parts.push(result.base_css);
	}

	if (include_utilities && utility_css) {
		parts.push('/* Utility Classes */');
		parts.push(utility_css);
	}

	return parts.join('\n\n');
};
