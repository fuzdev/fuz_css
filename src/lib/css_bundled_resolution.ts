/**
 * CSS resolution algorithm for bundled CSS generation.
 *
 * Combines theme variables, base styles, and utility classes into a single
 * bundled output. Resolves which CSS rules and variables to include based
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
	find_similar_variable,
} from './variable_graph.js';
import {type CssClassVariableIndex, collect_class_variables} from './class_variable_index.js';

/**
 * Threshold for string similarity to suggest typo corrections.
 */
const TYPO_SIMILARITY_THRESHOLD = 0.6;

/**
 * Calculates string similarity using Dice coefficient on bigrams.
 */
const string_similarity = (a: string, b: string): number => {
	if (a === b) return 1;
	if (a.length < 2 || b.length < 2) return 0;

	const bigrams_a: Set<string> = new Set();
	for (let i = 0; i < a.length - 1; i++) {
		bigrams_a.add(a.slice(i, i + 2));
	}

	let matches = 0;
	for (let i = 0; i < b.length - 1; i++) {
		if (bigrams_a.has(b.slice(i, i + 2))) matches++;
	}

	return (2 * matches) / (a.length - 1 + b.length - 1);
};

/**
 * Finds the most similar name from a set of known names.
 *
 * @param name - The name to find similar matches for
 * @param known_names - Set of known valid names
 * @returns The most similar name, or null if none are similar enough
 */
const find_similar_name = (name: string, known_names: Set<string>): string | null => {
	let best_match: string | null = null;
	let best_similarity = TYPO_SIMILARITY_THRESHOLD;

	for (const known of known_names) {
		const similarity = string_similarity(name, known);
		if (similarity > best_similarity) {
			best_similarity = similarity;
			best_match = known;
		}
	}

	return best_match;
};

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
	class_variable_index: CssClassVariableIndex;
	/** HTML elements detected in source files */
	detected_elements: Set<string>;
	/** CSS classes detected in source files */
	detected_classes: Set<string>;
	/** CSS variables directly referenced in source files */
	detected_css_variables: Set<string>;
	/** CSS variables used by generated utility classes */
	utility_variables_used: Set<string>;
	/** Additional elements to always include */
	additional_elements?: Iterable<string>;
	/** Additional variables to always include */
	additional_variables?: Iterable<string>;
	/** Specificity multiplier for theme selector (default 1) */
	theme_specificity?: number;
	/** Whether to include resolution statistics in result */
	include_stats?: boolean;
	/** Warn when detected elements have no matching style rules (default false) */
	warn_unmatched_elements?: boolean;
	/**
	 * Whether to include all base styles regardless of detection.
	 * When false (default), only rules for detected elements are included.
	 * When true, includes all rules from the style index.
	 * @default false
	 */
	include_all_base_css?: boolean;
	/**
	 * Whether to include all theme variables regardless of detection.
	 * When false (default), only referenced variables are included.
	 * When true, includes all variables from the variable graph.
	 * @default false
	 */
	include_all_variables?: boolean;
	/**
	 * Elements to exclude from base CSS output, even if detected.
	 */
	exclude_elements?: Iterable<string>;
	/**
	 * CSS variables to exclude from theme output, even if referenced.
	 */
	exclude_variables?: Iterable<string>;
	/**
	 * Elements explicitly annotated via @fuz-elements comments.
	 * These produce errors (not warnings) if they have no matching style rules.
	 */
	explicit_elements?: Set<string> | null;
	/**
	 * CSS variables explicitly annotated via @fuz-variables comments.
	 * These produce errors (not warnings) if they can't be resolved in the theme.
	 */
	explicit_variables?: Set<string> | null;
}

/**
 * Resolves which CSS to include based on detected usage.
 *
 * Algorithm:
 * 1. Collect rules: core rules + element-matching + class-matching
 * 2. Collect variables: from rules, class defs, utility generation, detected vars, additional_variables
 * 3. Resolve transitive variable dependencies
 * 4. Generate output: theme_css (light+dark), base_css (source order)
 *
 * @param options - Resolution options including indexes, detected usage, and config
 * @returns Resolution result with theme CSS, base CSS, and diagnostics
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
		additional_elements,
		additional_variables,
		theme_specificity = 1,
		include_stats = false,
		warn_unmatched_elements = false,
		include_all_base_css = false,
		include_all_variables = false,
		exclude_elements,
		exclude_variables,
		explicit_elements,
		explicit_variables,
	} = options;

	const diagnostics: Array<GenerationDiagnostic> = [];
	const included_elements: Set<string> = new Set();

	// Step 1: Collect elements (detected + additional_elements - exclude_elements)
	for (const element of detected_elements) {
		included_elements.add(element);
	}
	if (additional_elements) {
		for (const element of additional_elements) {
			included_elements.add(element);
		}
	}
	if (exclude_elements) {
		for (const element of exclude_elements) {
			included_elements.delete(element);
		}
	}

	// Step 2: Get matching rules from style.css
	let included_rule_indices: Set<number>;
	if (include_all_base_css) {
		// Include ALL rules (no tree-shaking)
		included_rule_indices = new Set(style_rule_index.rules.map((_, i) => i));
	} else {
		// Only include rules matching detected elements and classes
		included_rule_indices = get_matching_rules(
			style_rule_index,
			included_elements,
			detected_classes,
		);
	}

	// Step 2b: Warn about elements with no matching style rules
	if (warn_unmatched_elements) {
		for (const element of included_elements) {
			const rules = style_rule_index.by_element.get(element);
			if (!rules || rules.length === 0) {
				diagnostics.push({
					phase: 'generation',
					level: 'warning',
					message: `No style rules found for element "${element}"`,
					suggestion:
						'Element will use browser defaults. Add to additional_elements if intentional.',
					class_name: element,
					locations: null,
				});
			}
		}
	}

	// Step 2c: Error for explicit elements (@fuz-elements) with no matching rules
	if (explicit_elements) {
		const known_elements = new Set(style_rule_index.by_element.keys());
		for (const element of explicit_elements) {
			const rules = style_rule_index.by_element.get(element);
			if (!rules || rules.length === 0) {
				const similar = find_similar_name(element, known_elements);
				diagnostics.push({
					phase: 'generation',
					level: 'error',
					message: `@fuz-elements: No style rules found for element "${element}"${similar ? ` - did you mean "${similar}"?` : ''}`,
					suggestion: similar
						? `Check spelling. Similar element: ${similar}`
						: 'Element has no fuz_css styles. Remove from @fuz-elements or add custom styles.',
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

	// e) User-specified additional_variables
	if (additional_variables) {
		for (const v of additional_variables) {
			all_variables.add(v);
		}
	}

	// f) Include all variables if include_all_variables is enabled
	if (include_all_variables) {
		for (const v of get_all_variable_names(variable_graph)) {
			all_variables.add(v);
		}
	}

	// g) Remove excluded variables
	if (exclude_variables) {
		for (const v of exclude_variables) {
			all_variables.delete(v);
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

	// Add typo warnings for missing variables that look like misspelled theme variables
	// User-defined variables (not similar to any theme variable) are silently ignored
	// Skip explicit variables - they'll get errors instead (see below)
	for (const name of resolution.missing) {
		// Skip explicit variables - they get errors, not warnings
		if (explicit_variables?.has(name)) continue;

		const similar = find_similar_variable(variable_graph, name);
		if (similar) {
			diagnostics.push({
				phase: 'generation',
				level: 'warning',
				message: `CSS variable "--${name}" not found - did you mean "--${similar}"?`,
				suggestion: `Check spelling. Similar theme variable: --${similar}`,
				class_name: `var(--${name})`,
				locations: null,
			});
		}
		// Variables not similar to any theme variable are assumed to be user-defined
	}

	// Error for explicit variables (@fuz-variables) that can't be resolved
	if (explicit_variables) {
		for (const name of explicit_variables) {
			// Check if in resolution.missing (not resolved)
			if (resolution.missing.has(name)) {
				const similar = find_similar_variable(variable_graph, name);
				diagnostics.push({
					phase: 'generation',
					level: 'error',
					message: `@fuz-variables: CSS variable "--${name}" not found${similar ? ` - did you mean "--${similar}"?` : ''}`,
					suggestion: similar
						? `Check spelling. Similar theme variable: --${similar}`
						: 'Variable is not defined in the theme. Remove from @fuz-variables or define the variable.',
					class_name: `var(--${name})`,
					locations: null,
				});
			}
		}
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
 * Options for bundled CSS output generation.
 */
export interface GenerateBundledCssOptions {
	/** Include theme variables section. @default true */
	include_theme?: boolean;
	/** Include base styles section. @default true */
	include_base?: boolean;
	/** Include utility classes section. @default true */
	include_utilities?: boolean;
}

/**
 * Generates combined CSS output from resolution result.
 *
 * @param result - Resolution result from resolve_css
 * @param utility_css - Generated utility CSS (from generate_classes_css)
 * @param options - Output options
 * @returns Combined CSS string
 */
export const generate_bundled_css = (
	result: CssResolutionResult,
	utility_css: string,
	options: GenerateBundledCssOptions = {},
): string => {
	const {include_theme = true, include_base = true, include_utilities = true} = options;

	const parts: Array<string> = [];

	// Theme section
	if (include_theme && result.theme_css) {
		parts.push('/* Theme Variables */');
		parts.push(result.theme_css);
	}

	// Base styles section
	if (include_base && result.base_css) {
		parts.push('/* Base Styles */');
		parts.push(result.base_css);
	}

	// Utility classes section
	if (include_utilities && utility_css) {
		parts.push('/* Utility Classes */');
		parts.push(utility_css);
	}

	return parts.join('\n\n');
};
