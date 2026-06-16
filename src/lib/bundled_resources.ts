/**
 * Construction of the bundled CSS resources (style-rule index, variable graph,
 * class→variable index) shared by the Gro generator and the Vite plugin.
 *
 * The two generators consume these differently — the Gro generator caches one
 * bundle per instance, the Vite plugin loads lazily on first virtual-module
 * access — but build them identically from the same options. This keeps that
 * construction in one place.
 *
 * @module
 */

import {
	type StyleRuleIndex,
	load_style_rule_index,
	create_style_rule_index,
	load_default_style_css,
} from './style_rule_parser.ts';
import {type VariableDependencyGraph, build_variable_graph_from_options} from './variable_graph.ts';
import {type CssClassVariableIndex, build_class_variable_index} from './class_variable_index.ts';
import type {CssClassDefinition} from './css_class_generation.ts';
import type {BaseCssOption, VariablesOption} from './css_plugin_options.ts';
import type {CacheDeps} from './deps.ts';

/**
 * Bundled CSS resources needed to emit base styles and theme variables.
 * Build via `create_bundled_resources`; pass `null` for utility-only output.
 */
export interface BundledCssResources {
	style_rule_index: StyleRuleIndex;
	variable_graph: VariableDependencyGraph;
	class_variable_index: CssClassVariableIndex;
}

export interface CreateBundledResourcesOptions {
	/** Base CSS source: custom string, callback over the default, or default. */
	base_css: BaseCssOption;
	/** Theme variables source. */
	variables: VariablesOption;
	/** Merged class definitions, indexed to their referenced variables. */
	class_definitions: Record<string, CssClassDefinition | undefined>;
	/** Filesystem deps for loading the default `style.css`. */
	deps: CacheDeps;
}

/**
 * Builds the bundled CSS resources from generator options. The `style.css`
 * index is always built (even when only theme output is enabled), matching the
 * generators' prior behavior.
 */
export const create_bundled_resources = async (
	options: CreateBundledResourcesOptions,
): Promise<BundledCssResources> => {
	const {base_css, variables, class_definitions, deps} = options;

	let style_rule_index: StyleRuleIndex;
	if (typeof base_css === 'string') {
		// custom CSS string (replacement)
		style_rule_index = create_style_rule_index(base_css);
	} else if (typeof base_css === 'function') {
		// callback to modify the default CSS
		const default_css = await load_default_style_css(deps);
		style_rule_index = create_style_rule_index(base_css(default_css));
	} else {
		// default style.css (undefined or null)
		style_rule_index = await load_style_rule_index(deps);
	}

	return {
		style_rule_index,
		variable_graph: build_variable_graph_from_options(variables),
		class_variable_index: build_class_variable_index(class_definitions),
	};
};
