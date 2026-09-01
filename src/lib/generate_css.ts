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

import type { Logger } from '@fuzdev/fuz_util/log.ts';

import type { Diagnostic, SourceLocation } from './diagnostics.ts';
import {
	generate_classes_css,
	type CssClassDefinition,
	type CssClassDefinitionInterpreter
} from './css_class_generation.ts';
import { FUZ_LAYER_ORDER_STATEMENT, render_theme_style } from './theme.ts';
import type { StyleVariable, Theme } from './variable.ts';
import { resolve_theme_stance } from './theme_stance.ts';
import { resolve_css, generate_bundled_css } from './css_bundled_resolution.ts';
import type { BundledCssResources } from './bundled_resources.ts';

// the theme's own overlay for the fuz.theme layer, filtered to the variables
// the resolution kept so it stays as tree-shaken as the fuz.base block it
// re-declares (a stance's scheme_mirror alone carries every scheme-adaptive
// default); the color-scheme pin for a stance renders regardless
const render_theme_overlay = (theme: Theme, resolved_variables: Set<string>): string => {
	const resolved = theme.scheme_mirror === undefined ? resolve_theme_stance(theme) : theme;
	const keep = (v: StyleVariable): boolean => resolved_variables.has(v.name);
	return render_theme_style(
		{
			...resolved,
			variables: resolved.variables.filter(keep),
			scheme_mirror: resolved.scheme_mirror?.filter(keep)
		},
		{ layer: null }
	);
};

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
	/**
	 * The configured `theme` option, if any - its variables were already
	 * overlaid into `resources`' variable graph by the caller. Carried here so
	 * the theme's own overlay can also render into the `fuz.theme` cascade
	 * layer (above the `fuz.preferences` OS mappings, with a stance's
	 * `color-scheme` pin), matching how the same theme behaves at runtime -
	 * and so the footgun guard can flag a theme silently discarded by
	 * `variables: null`.
	 */
	theme?: Theme | null;
	/** Bundled resources, or null for utility-only mode. */
	resources: BundledCssResources | null;

	additional_elements?: Iterable<string> | 'all';
	additional_variables?: Iterable<string> | 'all';
	exclude_elements?: Iterable<string>;
	exclude_variables?: Iterable<string>;

	/** Optional logger; only used to emit resolution stats when `include_stats`. */
	log?: Logger;
	/** Whether to compute and log resolution statistics. */
	include_stats?: boolean;
}

export interface GenerateCssResult {
	/** Final CSS without banner comments - callers add their own. */
	css: string;
	/** Extraction + generation + resolution diagnostics, unfiltered. */
	diagnostics: Array<Diagnostic>;
}

/**
 * Runs the full CSS-generation pipeline: utility classes via
 * `generate_classes_css`, then - when base or theme output is enabled and
 * bundled `resources` are available - base styles and theme variables via
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
		theme = null,
		resources,
		additional_elements,
		additional_variables,
		exclude_elements,
		exclude_variables,
		log,
		include_stats = false
	} = options;

	const utility_result = generate_classes_css({
		class_names: all_classes,
		class_definitions,
		interpreters,
		css_properties,
		log,
		class_locations: all_classes_with_locations,
		explicit_classes
	});

	const diagnostics: Array<Diagnostic> = [...extraction_diagnostics, ...utility_result.diagnostics];

	// Config error: base styles on, theme off (`variables: null`). The kept base
	// rules and utility classes reference theme variables the disabled theme
	// output won't define, so every such `var()` dangles. Utility-only mode
	// (both off) is the way to bring your own; to ship the full variable set
	// bundled, keep `variables` and set `additional_variables: 'all'`.
	if (include_base && !include_theme) {
		diagnostics.push({
			phase: 'generation',
			level: 'error',
			message:
				'Base styles are enabled but theme variables are disabled (variables: null); the emitted base styles reference theme variables nothing defines',
			suggestion:
				"Set base_css: null too for utility-only mode, or keep variables and set additional_variables: 'all' to bundle the full theme.",
			identifier: 'theme_variables_disabled',
			locations: null
		});
	}

	// Footgun guard: a configured `theme` with theme output disabled
	// (`variables: null`) is silently discarded - the theme flows into the
	// variable graph but the graph never renders.
	if (theme != null && !include_theme) {
		diagnostics.push({
			phase: 'generation',
			level: 'warning',
			message:
				'A theme is configured but theme variables are disabled (variables: null); the theme will not be emitted',
			suggestion: 'Remove the theme option, or enable variables so the theme can render.',
			identifier: 'theme_discarded',
			locations: null
		});
	}

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
			include_stats,
			exclude_elements,
			exclude_variables,
			explicit_elements,
			explicit_variables
		});

		if (include_stats && resolution.stats && log) {
			log.info(
				`[css_resolution] Elements: ${
					resolution.stats.element_count
				} (${resolution.stats.elements.join(', ')})`
			);
			log.info(
				`[css_resolution] Rules: ${resolution.stats.included_rules} of ${
					resolution.stats.total_rules
				}`
			);
			log.info(`[css_resolution] Variables: ${resolution.stats.variable_count} resolved`);
		}

		diagnostics.push(...resolution.diagnostics);

		css = generate_bundled_css(resolution, utility_result.css, {
			include_theme,
			include_base,
			include_utilities: true,
			// the theme's own overlay re-renders into fuz.theme so it outranks
			// the fuz.preferences OS mappings and pins color-scheme for a
			// stance, exactly like the runtime path renders the same theme
			theme_overlay_css:
				include_theme && theme ? render_theme_overlay(theme, resolution.resolved_variables) : null
		});
	} else {
		// utility-only mode - still layered, so the separately imported package
		// style.css/theme.css slot beneath the generated classes and consumers'
		// unlayered styles beat everything, same as bundled mode
		css = utility_result.css
			? `${FUZ_LAYER_ORDER_STATEMENT}\n\n/* Utility Classes */\n@layer fuz.utilities {\n${utility_result.css}\n}`
			: '';
	}

	return { css, diagnostics };
};
