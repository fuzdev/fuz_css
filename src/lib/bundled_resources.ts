/**
 * Construction of the bundled CSS resources (style-rule index and variable
 * graph) shared by the Gro generator and the Vite plugin.
 *
 * The two generators consume these differently - the Gro generator caches one
 * bundle per instance, the Vite plugin loads eagerly at dev-server startup and
 * on first virtual-module access in a build - but build them identically from
 * the same options. This keeps that construction in one place.
 *
 * @module
 */

import {
	type StyleRuleIndex,
	load_style_rule_index,
	create_style_rule_index,
	load_default_style_css
} from './style_rule_parser.ts';
import {
	type VariableDependencyGraph,
	build_variable_graph_from_options
} from './variable_graph.ts';
import type { BaseCssOption, VariablesOption } from './css_plugin_options.ts';
import type { Theme } from './variable.ts';
import type { CacheDeps } from './deps.ts';

/**
 * Bundled CSS resources needed to emit base styles and theme variables.
 * Build via `create_bundled_resources`; pass `null` for utility-only output.
 */
export interface BundledCssResources {
	style_rule_index: StyleRuleIndex;
	variable_graph: VariableDependencyGraph;
}

export interface CreateBundledResourcesOptions {
	/** Base CSS source: custom string, callback over the default, or default. */
	base_css: BaseCssOption;
	/** Theme variables source. */
	variables: VariablesOption;
	/** Optional theme baked into the variables, overlaid last-wins by name. */
	theme?: Theme | null;
	/** Filesystem deps for loading the default `style.css`. */
	deps: CacheDeps;
}

/**
 * Builds the bundled CSS resources from generator options. The style-rule
 * index is always built, even when only theme output is enabled - from the
 * default `style.css` unless `base_css` supplies a stylesheet.
 *
 * @throws if `base_css` supplies something that isn't parseable CSS, including a callback that returns a non-string
 */
export const create_bundled_resources = async (
	options: CreateBundledResourcesOptions
): Promise<BundledCssResources> => {
	const { base_css, variables, theme, deps } = options;

	let style_rule_index: StyleRuleIndex;
	if (typeof base_css === 'string') {
		// custom CSS string (replacement)
		style_rule_index = create_style_rule_index(base_css);
	} else if (typeof base_css === 'function') {
		// callback to modify the default CSS
		const result: unknown = base_css(await load_default_style_css(deps));
		if (typeof result !== 'string') {
			throw new Error(
				`The base_css callback must return a CSS string, got ${
					result === null ? 'null' : typeof result
				}`
			);
		}
		style_rule_index = create_style_rule_index(result);
	} else {
		// default style.css (undefined or null)
		style_rule_index = await load_style_rule_index(deps);
	}

	return {
		style_rule_index,
		variable_graph: build_variable_graph_from_options(variables, theme)
	};
};
