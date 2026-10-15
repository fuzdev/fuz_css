/**
 * Variable dependency graph for bundled CSS generation.
 *
 * Builds a dependency graph from style variables to enable transitive
 * resolution of CSS custom properties. When a variable is needed,
 * all variables it depends on are also included.
 *
 * @module
 */

import { levenshtein_distance } from '@fuzdev/fuz_util/string.ts';

import { default_variables } from './variables.ts';
import { resolve_theme_stance } from './theme_stance.ts';
import { overlay_style_variable, render_color_scheme_rules } from './theme.ts';
import type { StyleVariable, Theme } from './variable.ts';
import { extract_css_variables } from './css_variable_utils.ts';
import {
	css_custom_property_name_is_contained,
	css_value_is_contained
} from './css_containment.ts';
import type { GenerationDiagnostic } from './diagnostics.ts';

import type { VariablesOption } from './css_plugin_options.ts';

/**
 * Information about a single style variable and its dependencies.
 */
export interface StyleVariableInfo {
	/** Variable name (without -- prefix) */
	name: string;
	/** Variables referenced in the base value */
	base_deps: Set<string>;
	/** Variables referenced in the dark value */
	dark_deps: Set<string>;
	/** The base value, rendered on `:root` in both schemes, or undefined if not defined */
	base_value: string | undefined;
	/** The dark value, rendered under the dark scheme over the base, or undefined if not defined */
	dark_value: string | undefined;
}

/**
 * Dependency graph for style variables.
 */
export interface VariableDependencyGraph {
	/** Map from variable name to its info */
	variables: Map<string, StyleVariableInfo>;
	/**
	 * The `uncontained_theme_value` errors for the slots left out of the
	 * graph, which `resolve_css` forwards with every resolution.
	 */
	diagnostics: Array<GenerationDiagnostic>;
}

// the slots of `v` a stylesheet can hold, or null when none can - reporting
// the rest as `uncontained_theme_value` errors to `diagnostics` when given
const contain_variable = (
	v: StyleVariable,
	diagnostics?: Array<GenerationDiagnostic>
): StyleVariable | null => {
	const report = (detail: string, left_out: string): void => {
		diagnostics?.push({
			phase: 'generation',
			level: 'error',
			message: `Theme variable "${v.name}" ${detail}, so ${left_out} is left out of the generated CSS`,
			suggestion:
				'A value must stay inside its declaration - quote a URL that needs braces, quotes, or semicolons.',
			identifier: 'uncontained_theme_value',
			locations: null
		});
	};
	const contained_slot = (slot: 'base' | 'dark', value: unknown): string | undefined => {
		if (value === undefined) return undefined;
		if (!css_value_is_contained(value)) {
			report(`has a ${slot} value that can't be contained in a declaration`, 'that value');
		} else if (!(value as string).trim()) {
			report(`has a blank ${slot} value`, 'that value');
		} else {
			return value as string;
		}
		return undefined;
	};
	if (!css_custom_property_name_is_contained(v.name)) {
		report('has a name that is not a plain identifier', 'it');
		return null;
	}
	const base = contained_slot('base', v.base);
	const dark = contained_slot('dark', v.dark);
	if (base === undefined && dark === undefined) return null;
	if (base === v.base && dark === v.dark) return v;
	return {
		name: v.name,
		...(base !== undefined && { base }),
		...(dark !== undefined && { dark })
	};
};

/**
 * Builds a dependency graph from an array of style variables.
 *
 * The graph is what the bundled theme CSS renders from, verbatim, so it
 * applies the containment checks `render_theme_style` does: a slot whose
 * value could end its own declaration (or is blank), or a variable whose
 * name isn't a plain identifier, is left out and reported as an
 * `uncontained_theme_value` error rather than written into the stylesheet.
 *
 * @param variables - array of `StyleVariable` objects
 * @returns `VariableDependencyGraph`
 */
export const build_variable_graph = (variables: Array<StyleVariable>): VariableDependencyGraph => {
	const graph: Map<string, StyleVariableInfo> = new Map();
	const diagnostics: Array<GenerationDiagnostic> = [];

	for (const v of variables) {
		const contained = contain_variable(v, diagnostics);
		if (!contained) continue;
		const { base: base_value, dark: dark_value } = contained;
		graph.set(v.name, {
			name: v.name,
			base_deps: base_value ? extract_css_variables(base_value) : new Set(),
			dark_deps: dark_value ? extract_css_variables(dark_value) : new Set(),
			base_value,
			dark_value
		});
	}

	return { variables: graph, diagnostics };
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
	/** Excluded variable names a resolved variable depends on */
	excluded: Set<string>;
}

/**
 * Resolves variables transitively using DFS with cycle detection.
 * When a variable is requested, all variables it depends on are included.
 * Both base and dark dependencies are always resolved together.
 *
 * An excluded variable is left out along with the dependencies only it
 * pulls in - whatever defines it in its place defines those too.
 *
 * @param graph - the variable dependency graph
 * @param initial_variables - initial set of variable names to resolve
 * @param excluded - variable names to leave out, and not resolve through
 * @returns `ResolveVariablesResult` with all transitive dependencies
 */
export const resolve_variables_transitive = (
	graph: VariableDependencyGraph,
	initial_variables: Iterable<string>,
	excluded?: ReadonlySet<string>
): ResolveVariablesResult => {
	const resolved: Set<string> = new Set();
	const warnings: Array<string> = [];
	const missing: Set<string> = new Set();
	const excluded_reached: Set<string> = new Set();
	const reported_cycles: Set<string> = new Set();

	// DFS with path tracking for cycle detection
	// `path` tracks the current call stack to detect back-edges (cycles)
	const resolve = (name: string, path: Set<string>): void => {
		if (excluded?.has(name)) {
			// a request for one is dropped silently - only a dependency dangles
			if (path.size > 0) excluded_reached.add(name);
			return;
		}

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
			for (const dep of info.base_deps) {
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

	return { variables: resolved, warnings, missing, excluded: excluded_reached };
};

/**
 * Generates theme CSS for the resolved variables.
 *
 * @param graph - the variable dependency graph
 * @param resolved_variables - set of variable names to include
 * @returns object with the `:root` block as `root_css` and the dark-scheme rules as `dark_css`
 */
export const generate_theme_css = (
	graph: VariableDependencyGraph,
	resolved_variables: Set<string>
): { root_css: string; dark_css: string } => {
	const base_declarations: Array<string> = [];
	const dark_declarations: Array<string> = [];

	// Process variables in a consistent order (alphabetical by name)
	const sorted_names = Array.from(resolved_variables).sort();

	for (const name of sorted_names) {
		const info = graph.variables.get(name);
		if (!info) continue;

		if (info.base_value !== undefined) {
			base_declarations.push(`\t--${name}: ${info.base_value};`);
		}
		if (info.dark_value !== undefined) {
			dark_declarations.push(`\t--${name}: ${info.dark_value};`);
		}
	}

	let root_css = '';
	let dark_css = '';

	if (base_declarations.length > 0) {
		root_css = `:root {\n${base_declarations.join('\n')}\n}`;
	}

	if (dark_declarations.length > 0) {
		const declarations = dark_declarations.join('\n');
		dark_css = render_color_scheme_rules('dark', (root) => `${root} {\n${declarations}\n}`);
	}

	return { root_css, dark_css };
};

/**
 * Gets all variable names from the graph.
 *
 * @param graph - the variable dependency graph
 * @returns set of all variable names in the graph
 */
export const get_all_variable_names = (graph: VariableDependencyGraph): Set<string> => {
	return new Set(graph.variables.keys());
};

/**
 * Computes normalized string similarity (0-1, where 1 = identical).
 *
 * Uses Levenshtein distance (rather than Dice coefficient in `css_bundled_resolution.ts`)
 * because variable names are longer and follow consistent naming patterns
 * (e.g., "palette_a_50", "border_radius_md"). Levenshtein is better at detecting
 * single-character insertions/deletions in these longer, structured names.
 *
 * See `css_bundled_resolution.ts` for the Dice-based approach used for elements.
 */
const string_similarity = (a: string, b: string): number => {
	const max_len = Math.max(a.length, b.length);
	if (max_len === 0) return 1;
	return 1 - levenshtein_distance(a, b) / max_len;
};

/**
 * Minimum similarity threshold to consider a variable name a likely typo.
 *
 * Set to 0.85 (higher than `css_bundled_resolution.ts`'s 0.6) because:
 * - Variable names are longer, so small edit distances are more significant
 * - Many variables share prefixes (palette_a_10, palette_a_20, etc.) so a lower
 *   threshold would suggest unrelated variables
 * - User-defined variables shouldn't trigger false "did you mean?" suggestions
 */
const TYPO_SIMILARITY_THRESHOLD = 0.85;

/**
 * Finds the most similar variable in the graph to the given name.
 * Returns null if no variable exceeds the similarity threshold.
 *
 * @param graph - the variable dependency graph
 * @param name - the variable name to find similar matches for
 * @returns the most similar variable name, or null if none are similar enough
 */
export const find_similar_variable = (
	graph: VariableDependencyGraph,
	name: string
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
 * @param variables - the variables option (undefined, null, array, or callback)
 * @returns resolved array of style variables, or empty array if null
 */
const resolve_variables_option = (variables: VariablesOption): Array<StyleVariable> => {
	if (variables === null) return [];
	return typeof variables === 'function'
		? variables(default_variables)
		: (variables ?? default_variables);
};

/**
 * Overlays a theme's variables onto a resolved variable set, last-wins by name.
 *
 * This is how a theme is baked in at build time: the overlaid values flow
 * through the dependency graph like any other, so the variables a theme
 * references are pulled in transitively and the output stays tree-shaken. A
 * stanced theme's `scheme_mirror` applies first, matching the renderer's order
 * - and a stanced theme arriving without its mirror computed is resolved
 * through `resolve_theme_stance` here, so a hand-rolled theme bakes the same
 * as the shipped exemplars (build time has no bundle-weight concern). A
 * theme slot the stylesheet can't hold is dropped before it overlays, as
 * `render_theme_style` drops it, so the value beneath it stays.
 *
 * @param variables - the resolved default or custom variables
 * @param theme - the theme to overlay, or null/undefined for none
 * @returns the composed variables, or `variables` unchanged when there's no theme
 */
export const apply_theme_variables = (
	variables: Array<StyleVariable>,
	theme: Theme | null | undefined
): Array<StyleVariable> => {
	if (!theme) return variables;
	const resolved = resolve_theme_stance(theme);
	const by_name = new Map(variables.map((v) => [v.name, v]));
	// Replacement mirrors the runtime cascade: a base-slot theme value beats
	// the base default's dark slot by layer order, so it replaces wholesale,
	// while a dark-only value keeps the default's base slot.
	// a slot the stylesheet can't hold is dropped before the overlay, as the
	// runtime renderer drops it, so the default beneath it survives
	const overlay = (v: StyleVariable): void => {
		const contained = contain_variable(v);
		if (contained) by_name.set(v.name, overlay_style_variable(by_name.get(v.name), contained));
	};
	// mirror first, then the theme's own, so authored values win
	for (const v of resolved.scheme_mirror ?? []) overlay(v);
	for (const v of resolved.variables) overlay(v);
	return [...by_name.values()];
};

/**
 * Builds a variable dependency graph from a variables option.
 * Handles all option forms: undefined (defaults), null (disabled), array, or callback.
 *
 * @param variables - the variables option from generator config
 * @param theme - an optional theme to overlay onto the resolved variables
 * @returns `VariableDependencyGraph` built from the resolved variables
 */
export const build_variable_graph_from_options = (
	variables: VariablesOption,
	theme?: Theme | null
): VariableDependencyGraph => {
	const graph = build_variable_graph(
		apply_theme_variables(resolve_variables_option(variables), theme)
	);
	// the theme's own uncontained slots never reach the graph, so they're
	// reported here - once, when the configured variables carry the same one
	if (theme) {
		const reported = new Set(graph.diagnostics.map((d) => d.message));
		const theme_diagnostics: Array<GenerationDiagnostic> = [];
		for (const v of theme.variables) contain_variable(v, theme_diagnostics);
		for (const d of theme_diagnostics) {
			if (reported.has(d.message)) continue;
			reported.add(d.message);
			graph.diagnostics.push(d);
		}
	}
	return graph;
};
