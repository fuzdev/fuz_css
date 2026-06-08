/**
 * Shared CSS-generation pipeline for the Gro generator and the Vite plugin.
 *
 * Both consumers extract classes from source files their own way (batch via the
 * Gro filer, incrementally via Vite's transform hook), then funnel the
 * aggregated result through this single function so their CSS output stays
 * identical. Callers own banner wrapping and error/warning dispatch (those
 * differ by logger), this owns the generate → resolve → bundle pipeline.
 *
 * @module
 */

import type {Logger} from '@fuzdev/fuz_util/log.js';

import type {Diagnostic, SourceLocation} from './diagnostics.js';
import {
	generate_classes_css,
	type CssClassDefinition,
	type CssClassDefinitionInterpreter,
} from './css_class_generation.js';
import {resolve_css, generate_bundled_css} from './css_bundled_resolution.js';
import {get_all_variable_names} from './variable_graph.js';
import type {BundledCssResources} from './bundled_resources.js';

/**
 * Inputs to `generate_css`. The first group mirrors the shape returned by
 * `CssClasses.get_all()` plus its diagnostics, so callers can forward it
 * directly.
 */
export interface GenerateCssOptions {
	/** All detected class names, already exclude-filtered. */
	all_classes: Set<string>;
	/** Source locations per class, for diagnostics. */
	all_classes_with_locations: Map<string, Array<SourceLocation> | null>;
	/** Classes from `@fuz-classes`/`additional_classes`; unresolved ones error. */
	explicit_classes: Set<string> | null;
	/** All detected HTML element names. */
	all_elements: Set<string>;
	/** Elements from `@fuz-elements`; unresolved ones error. */
	explicit_elements: Set<string> | null;
	/** Variables from `@fuz-variables`; unresolved ones error. */
	explicit_variables: Set<string> | null;
	/** Diagnostics accumulated during extraction. */
	extraction_diagnostics: Array<Diagnostic>;
	/**
	 * CSS variables referenced in source, already filtered to known theme
	 * variables by the caller. `@fuz-variables` are merged in here automatically.
	 */
	detected_css_variables: Set<string>;

	class_definitions: Record<string, CssClassDefinition | undefined>;
	interpreters: Array<CssClassDefinitionInterpreter>;
	/** Valid CSS properties for literal validation, or null to skip. */
	css_properties: Set<string> | null;

	include_base: boolean;
	include_theme: boolean;
	/** Bundled resources, or null for utility-only mode. */
	resources: BundledCssResources | null;

	additional_elements?: Iterable<string> | 'all';
	additional_variables?: Iterable<string> | 'all';
	exclude_elements?: Iterable<string>;
	exclude_variables?: Iterable<string>;
	theme_specificity?: number;

	/** Optional logger; only used to emit resolution stats when `include_stats`. */
	log?: Logger;
	/** Whether to compute and log resolution statistics. */
	include_stats?: boolean;
}

export interface GenerateCssResult {
	/** Final CSS without banner comments — callers add their own. */
	css: string;
	/** Extraction + generation + resolution diagnostics, unfiltered. */
	diagnostics: Array<Diagnostic>;
}

/**
 * Runs the full CSS-generation pipeline: utility classes via
 * `generate_classes_css`, then — when base or theme output is enabled and
 * bundled `resources` are available — base styles and theme variables via
 * `resolve_css` + `generate_bundled_css`. Returns the combined CSS and every
 * diagnostic produced along the way.
 */
export const generate_css = (options: GenerateCssOptions): GenerateCssResult => {
	const {
		all_classes,
		all_classes_with_locations,
		explicit_classes,
		all_elements,
		explicit_elements,
		explicit_variables,
		extraction_diagnostics,
		detected_css_variables,
		class_definitions,
		interpreters,
		css_properties,
		include_base,
		include_theme,
		resources,
		additional_elements,
		additional_variables,
		exclude_elements,
		exclude_variables,
		theme_specificity = 1,
		log,
		include_stats = false,
	} = options;

	const utility_result = generate_classes_css({
		class_names: all_classes,
		class_definitions,
		interpreters,
		css_properties,
		log,
		class_locations: all_classes_with_locations,
		explicit_classes,
	});

	const diagnostics: Array<Diagnostic> = [...extraction_diagnostics, ...utility_result.diagnostics];

	let css: string;
	if ((include_base || include_theme) && resources) {
		// `@fuz-variables` are included in output and checked for typos by resolve_css.
		// Copy so the caller's set isn't mutated.
		const detected = new Set(detected_css_variables);
		if (explicit_variables) {
			for (const v of explicit_variables) {
				detected.add(v);
			}
		}

		const resolution = resolve_css({
			style_rule_index: resources.style_rule_index,
			variable_graph: resources.variable_graph,
			class_variable_index: resources.class_variable_index,
			detected_elements: all_elements,
			detected_classes: all_classes,
			detected_css_variables: detected,
			utility_variables_used: utility_result.variables_used,
			additional_elements,
			additional_variables,
			theme_specificity,
			include_stats,
			exclude_elements,
			exclude_variables,
			explicit_elements,
			explicit_variables,
		});

		if (include_stats && resolution.stats && log) {
			log.info(
				`[css_resolution] Elements: ${resolution.stats.element_count} (${resolution.stats.elements.join(', ')})`,
			);
			log.info(
				`[css_resolution] Rules: ${resolution.stats.included_rules} of ${resolution.stats.total_rules}`,
			);
			log.info(`[css_resolution] Variables: ${resolution.stats.variable_count} resolved`);
		}

		diagnostics.push(...resolution.diagnostics);

		// Footgun guard: base styles on, theme off (`variables: null`). The kept base rules and
		// utility classes still reference fuz_css theme variables, but the disabled theme output
		// won't define them — every such `var()` dangles. Utility-only mode (both off) never reaches
		// this branch; the legitimate escape is importing `theme.css` separately.
		if (include_base && !include_theme) {
			const theme_var_names = get_all_variable_names(resources.variable_graph);
			const references_theme_var = [...resolution.resolved_variables].some((v) =>
				theme_var_names.has(v),
			);
			if (references_theme_var) {
				diagnostics.push({
					phase: 'generation',
					level: 'warning',
					message:
						'Base styles are enabled but theme variables are disabled (variables: null); emitted styles reference theme variables that will be undefined',
					suggestion: 'Import theme.css separately, or set base_css: null for utility-only mode.',
					identifier: 'theme_variables_disabled',
					locations: null,
				});
			}
		}

		css = generate_bundled_css(resolution, utility_result.css, {
			include_theme,
			include_base,
			include_utilities: true,
		});
	} else {
		// utility-only mode
		css = utility_result.css;
	}

	return {css, diagnostics};
};
