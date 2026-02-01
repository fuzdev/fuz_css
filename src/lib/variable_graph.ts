/**
 * Variable dependency graph for bundled CSS generation.
 *
 * Builds a dependency graph from style variables to enable transitive
 * resolution of CSS custom properties. When a variable is needed,
 * all variables it depends on are also included.
 *
 * @module
 */

import {levenshtein_distance} from '@fuzdev/fuz_util/string.js';
import {hash_insecure} from '@fuzdev/fuz_util/hash.js';

import {default_variables} from './variables.js';
import type {StyleVariable} from './variable.js';
import {extract_css_variables} from './css_variable_utils.js';

import type {VariablesOption} from './css_plugin_options.js';

/**
 * Information about a single style variable and its dependencies.
 */
export interface StyleVariableInfo {
	/** Variable name (without -- prefix) */
	name: string;
	/** Variables referenced in the light value */
	light_deps: Set<string>;
	/** Variables referenced in the dark value */
	dark_deps: Set<string>;
	/** The CSS value for light mode, or undefined if not defined */
	light_css: string | undefined;
	/** The CSS value for dark mode, or undefined if not defined */
	dark_css: string | undefined;
}

/**
 * Dependency graph for style variables.
 */
export interface VariableDependencyGraph {
	/** Map from variable name to its info */
	variables: Map<string, StyleVariableInfo>;
	/** Content hash for cache invalidation */
	content_hash: string;
}

/**
 * Builds a dependency graph from an array of style variables.
 *
 * @param variables - Array of StyleVariable objects
 * @param content_hash - Hash of the source for cache invalidation
 * @returns VariableDependencyGraph
 */
export const build_variable_graph = (
	variables: Array<StyleVariable>,
	content_hash: string,
): VariableDependencyGraph => {
	const graph: Map<string, StyleVariableInfo> = new Map();

	for (const v of variables) {
		const light_deps = v.light ? extract_css_variables(v.light) : new Set<string>();
		const dark_deps = v.dark ? extract_css_variables(v.dark) : new Set<string>();

		graph.set(v.name, {
			name: v.name,
			light_deps,
			dark_deps,
			light_css: v.light,
			dark_css: v.dark,
		});
	}

	return {
		variables: graph,
		content_hash,
	};
};

/**
 * Result from transitive variable resolution.
 */
export interface ResolveVariablesResult {
	/** All resolved variable names */
	variables: Set<string>;
	/** Warning messages for cycles */
	warnings: Array<string>;
	/** Variable names that were requested but not found in the graph */
	missing: Set<string>;
}

/**
 * Resolves variables transitively using DFS with cycle detection.
 * When a variable is requested, all variables it depends on are included.
 * Both light and dark dependencies are always resolved together.
 *
 * @param graph - The variable dependency graph
 * @param initial_variables - Initial set of variable names to resolve
 * @returns ResolveVariablesResult with all transitive dependencies
 */
export const resolve_variables_transitive = (
	graph: VariableDependencyGraph,
	initial_variables: Iterable<string>,
): ResolveVariablesResult => {
	const resolved: Set<string> = new Set();
	const warnings: Array<string> = [];
	const missing: Set<string> = new Set();
	const reported_cycles: Set<string> = new Set();

	// DFS with path tracking for cycle detection
	// `path` tracks the current call stack to detect back-edges (cycles)
	const resolve = (name: string, path: Set<string>): void => {
		// Check for cycles FIRST - if we're revisiting a node in the current path, it's a cycle
		if (path.has(name)) {
			// Only report each cycle once
			if (!reported_cycles.has(name)) {
				warnings.push(`Circular dependency detected for variable: ${name}`);
				reported_cycles.add(name);
			}
			return;
		}

		// Skip if already fully resolved (from a different path)
		if (resolved.has(name)) {
			return;
		}

		// Add to path (current traversal stack)
		path.add(name);

		const info = graph.variables.get(name);
		if (info) {
			// Recursively resolve all dependencies BEFORE marking as resolved
			for (const dep of info.light_deps) {
				resolve(dep, path);
			}
			for (const dep of info.dark_deps) {
				resolve(dep, path);
			}
		} else {
			// Variable not found in graph - track as missing
			missing.add(name);
		}

		// Mark as resolved AFTER processing dependencies
		resolved.add(name);

		// Remove from path (backtrack)
		path.delete(name);
	};

	// Start resolution from each initial variable
	for (const name of initial_variables) {
		resolve(name, new Set());
	}

	return {variables: resolved, warnings, missing};
};

/**
 * Generates theme CSS for the resolved variables.
 *
 * @param graph - The variable dependency graph
 * @param resolved_variables - Set of variable names to include
 * @param specificity - Number of times to repeat the selector (default 1)
 * @returns Object with light_css and dark_css strings
 */
export const generate_theme_css = (
	graph: VariableDependencyGraph,
	resolved_variables: Set<string>,
	specificity = 1,
): {light_css: string; dark_css: string} => {
	const light_declarations: Array<string> = [];
	const dark_declarations: Array<string> = [];

	// Process variables in a consistent order (alphabetical by name)
	const sorted_names = Array.from(resolved_variables).sort();

	for (const name of sorted_names) {
		const info = graph.variables.get(name);
		if (!info) continue;

		if (info.light_css !== undefined) {
			light_declarations.push(`\t--${name}: ${info.light_css};`);
		}
		if (info.dark_css !== undefined) {
			dark_declarations.push(`\t--${name}: ${info.dark_css};`);
		}
	}

	const scope = ':root'.repeat(specificity);
	const dark_scope = `${scope}.dark`;

	let light_css = '';
	let dark_css = '';

	if (light_declarations.length > 0) {
		light_css = `${scope} {\n${light_declarations.join('\n')}\n}`;
	}

	if (dark_declarations.length > 0) {
		dark_css = `${dark_scope} {\n${dark_declarations.join('\n')}\n}`;
	}

	return {light_css, dark_css};
};

/**
 * Gets all variable names from the graph.
 *
 * @param graph - The variable dependency graph
 * @returns Set of all variable names in the graph
 */
export const get_all_variable_names = (graph: VariableDependencyGraph): Set<string> => {
	return new Set(graph.variables.keys());
};

/**
 * Checks if a variable exists in the graph.
 *
 * @param graph - The variable dependency graph
 * @param name - Variable name to check (without -- prefix)
 * @returns True if the variable exists in the graph
 */
export const has_variable = (graph: VariableDependencyGraph, name: string): boolean => {
	return graph.variables.has(name);
};

/**
 * Computes normalized string similarity (0-1, where 1 = identical).
 *
 * Uses Levenshtein distance (rather than Dice coefficient in css_bundled_resolution.ts)
 * because variable names are longer and follow consistent naming patterns
 * (e.g., "color_a_50", "border_radius_md"). Levenshtein is better at detecting
 * single-character insertions/deletions in these longer, structured names.
 *
 * See css_bundled_resolution.ts for the Dice-based approach used for elements.
 */
const string_similarity = (a: string, b: string): number => {
	const max_len = Math.max(a.length, b.length);
	if (max_len === 0) return 1;
	return 1 - levenshtein_distance(a, b) / max_len;
};

/**
 * Minimum similarity threshold to consider a variable name a likely typo.
 *
 * Set to 0.85 (higher than css_bundled_resolution.ts's 0.6) because:
 * - Variable names are longer, so small edit distances are more significant
 * - Many variables share prefixes (color_a_1, color_a_2, etc.) so a lower
 *   threshold would suggest unrelated variables
 * - User-defined variables shouldn't trigger false "did you mean?" suggestions
 */
const TYPO_SIMILARITY_THRESHOLD = 0.85;

/**
 * Finds the most similar variable in the graph to the given name.
 * Returns null if no variable exceeds the similarity threshold.
 *
 * @param graph - The variable dependency graph
 * @param name - The variable name to find similar matches for
 * @returns The most similar variable name, or null if none are similar enough
 */
export const find_similar_variable = (
	graph: VariableDependencyGraph,
	name: string,
): string | null => {
	let best_match: string | null = null;
	let best_similarity = TYPO_SIMILARITY_THRESHOLD;

	for (const known of graph.variables.keys()) {
		const similarity = string_similarity(name, known);
		if (similarity > best_similarity) {
			best_similarity = similarity;
			best_match = known;
		}
	}

	return best_match;
};

/**
 * Resolves a variables option to a concrete array of style variables.
 *
 * @param variables - The variables option (undefined, null, array, or callback)
 * @returns Resolved array of style variables, or empty array if null
 */
export const resolve_variables_option = (variables: VariablesOption): Array<StyleVariable> => {
	if (variables === null) return [];
	return typeof variables === 'function'
		? variables(default_variables)
		: (variables ?? default_variables);
};

/**
 * Builds a variable dependency graph from a variables option.
 * Handles all option forms: undefined (defaults), null (disabled), array, or callback.
 *
 * @param variables - The variables option from generator config
 * @returns VariableDependencyGraph built from the resolved variables
 */
export const build_variable_graph_from_options = (
	variables: VariablesOption,
): VariableDependencyGraph => {
	const resolved = resolve_variables_option(variables);
	const content = resolved.map((v) => `${v.name}:${v.light ?? ''}:${v.dark ?? ''}`).join('|');
	return build_variable_graph(resolved, hash_insecure(content));
};
