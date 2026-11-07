/**
 * The CSS-generation pipeline the generator core (`css_generator.ts`) renders
 * through. The Vite plugin extracts classes from source files incrementally,
 * through its transform hook and dev pre-scan, then funnels the aggregated
 * result through this single function. Callers own where the CSS goes and
 * error/warning dispatch; this owns the generate → resolve → bundle pipeline.
 *
 * @internal
 *
 * @module
 */

import type { Diagnostic, GenerationDiagnostic, SourceLocation } from './diagnostics.ts';
import { generate_classes_css } from './css_class_generation.ts';
import type { CssClassDefinition, CssClassDefinitionInterpreter } from './css_class_definitions.ts';
import { FUZ_LAYER_ORDER_STATEMENT, render_theme_style, type ResolvedTheme } from './theme.ts';
import type { StyleVariable, Theme } from './variable.ts';
import { resolve_css, render_bundled_css } from './css_bundled_resolution.ts';
import type { BundledCssResources } from './bundled_resources.ts';
import { extract_required_css_variables } from './css_variable_utils.ts';
import { default_variables } from './variables.ts';

/**
 * The names fuz_css's defaults define - what tells a theme variable the
 * configured set lacks apart from a custom property of the consumer's own,
 * which is theirs to define.
 */
const default_variable_names: ReadonlySet<string> = new Set(default_variables.map((v) => v.name));

// the configured theme's name, or 'theme' when junk data has none - the
// option is untyped at runtime, so this stays total over any value
const to_theme_label = (theme: unknown): string => {
	const name: unknown =
		theme !== null && typeof theme === 'object' && 'name' in theme ? theme.name : undefined;
	return typeof name === 'string' ? name : 'theme';
};

/**
 * Checks the emitted base styles for references to theme variables that
 * nothing defines - directly, or through the value of a variable the
 * configured `variables` do define. Covers `variables: null`, an empty array,
 * and a set missing some of the defaults alike.
 *
 * Only a reference with no fallback counts, since `var(--x, fallback)` can't
 * resolve to nothing. A name counts as defined when the configured set has
 * it, when the rule referencing it declares it too, when a shipped top-level
 * rule declares it for the whole document (a selector that is exactly
 * `:root`, `:host`, `html`, `body`, or `*`), or when `exclude_variables`
 * lists it - excluding a variable says something else defines it. A
 * declaration scoped to any other selector is not taken as defining the name
 * for other rules.
 */
const check_base_css_variables_undefined = (
	resources: BundledCssResources,
	included_rule_indices: Set<number>,
	exclude_variables: Set<string> | null,
	include_theme: boolean
): GenerationDiagnostic | null => {
	const { style_rule_index, variable_graph } = resources;

	const required: Set<string> = new Set();
	const declared: Set<string> = new Set();
	for (const index of included_rule_indices) {
		const rule = style_rule_index.rules[index]!;
		for (const v of rule.variables_required) required.add(v);
		for (const v of rule.variables_defined) declared.add(v);
	}

	const undefined_variables: Set<string> = new Set();
	const visited: Set<string> = new Set();
	const visit = (name: string): void => {
		if (visited.has(name) || declared.has(name) || exclude_variables?.has(name)) return;
		visited.add(name);
		// with theme output disabled nothing in the graph is emitted (a
		// configured `theme` still populates it), so nothing in it counts
		const info = include_theme ? variable_graph.variables.get(name) : undefined;
		if (!info) {
			if (default_variable_names.has(name)) undefined_variables.add(name);
			return;
		}
		for (const value of [info.base_value, info.dark_value]) {
			if (value === undefined) continue;
			for (const dependency of extract_required_css_variables(value)) visit(dependency);
		}
	};
	for (const name of required) visit(name);
	if (undefined_variables.size === 0) return null;

	const list = [...undefined_variables]
		.sort()
		.map((v) => `--${v}`)
		.join(', ');
	return {
		phase: 'generation',
		code: 'base_css_variables_undefined',
		level: 'error',
		message: include_theme
			? `Base styles reference theme variables that the configured variables do not define: ${list}`
			: `Base styles reference theme variables, but theme output is disabled (variables: null): ${
					list
				}`,
		suggestion: include_theme
			? 'Define them in variables - a callback can adjust the defaults instead of replacing them. For ones something else defines - another stylesheet, or base_css under a qualified selector like :root.dark - list them in exclude_variables.'
			: "Keep variables and set additional_variables: 'all' to bundle the full theme, or set base_css: null too for utility-only mode. To pair these base styles with a separately imported theme stylesheet, set exclude_variables: default_variables.map((v) => v.name).",
		identifier: 'base_css',
		locations: null
	};
};

// the baked theme's own overlay for the baked theme sublayer, filtered to the
// variables the resolution kept so it stays as tree-shaken as the fuz.base
// block it re-declares (a stance's mirror alone carries every scheme-adaptive
// default); the color-scheme pin for a stance renders regardless
const render_theme_overlay = (baked: ResolvedTheme, resolved_variables: Set<string>): string => {
	const keep = (v: StyleVariable): boolean => resolved_variables.has(v.name);
	return render_theme_style(
		{ ...baked.theme, variables: baked.theme.variables.filter(keep) },
		{
			layer: null,
			scheme_mirror: baked.scheme_mirror?.filter(keep),
			caps: baked.caps?.filter(keep)
		}
	);
};

/**
 * Inputs to `generate_css`. The first group mirrors the shape returned by
 * `CssClasses.get_all()` plus its diagnostics, so callers can forward it
 * directly; the include and exclude options at the end apply over it.
 */
export interface GenerateCssOptions {
	/** All detected class names. */
	all_classes: Set<string>;
	/** Source locations per detected class, for diagnostics, or null for none. */
	all_classes_with_locations: Map<string, Array<SourceLocation> | null>;
	/** Classes from `@fuz-classes`; unresolved ones error. */
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
	 * The `var(--*)` names referenced in source, unfiltered: names the theme
	 * doesn't define are ignored, since they may be the project's own.
	 * `@fuz-variables` are merged in here automatically.
	 */
	detected_css_variables: Iterable<string>;

	class_definitions: Record<string, CssClassDefinition | undefined>;
	interpreters: Array<CssClassDefinitionInterpreter>;
	/** Valid CSS properties for literal validation, or null to skip. */
	css_properties: Set<string> | null;

	include_base: boolean;
	include_theme: boolean;
	/**
	 * The configured `theme` option, if any, carried so the footgun guard can
	 * flag a theme silently discarded by `variables: null`. The theme itself
	 * was already baked into `resources`' variable graph, which carries it with
	 * its derived mirror and caps, and that baked theme is what re-renders
	 * into the `fuz.theme` cascade layer (above the `fuz.preferences` OS
	 * mappings, with a stance's `color-scheme` pin), matching how the same
	 * theme behaves at runtime.
	 */
	theme?: Theme | null;
	/** Bundled resources, or null for utility-only mode. */
	resources: BundledCssResources | null;

	/**
	 * Classes to include whether or not they're detected. Each counts as
	 * explicit, so an unresolvable one errors, and has no source locations.
	 */
	additional_classes?: Iterable<string>;
	additional_elements?: Iterable<string> | 'all';
	additional_variables?: Iterable<string> | 'all';
	/** Classes to leave out, detected, explicit, or additional alike. */
	exclude_classes?: Iterable<string>;
	exclude_elements?: Iterable<string>;
	exclude_variables?: Iterable<string>;
}

/**
 * The class inputs `generate_css` renders: the detected classes with
 * `additional_classes` added ahead of them - explicit, with null locations -
 * and `exclude_classes` removed from all three, or the inputs as given when
 * neither option is set.
 *
 * @param options - the class inputs and the two class options
 * @returns the classes, their locations, and the explicit classes to render
 */
export const to_class_inputs = (
	options: Pick<
		GenerateCssOptions,
		| 'all_classes'
		| 'all_classes_with_locations'
		| 'explicit_classes'
		| 'additional_classes'
		| 'exclude_classes'
	>
): {
	all_classes: Set<string>;
	all_classes_with_locations: Map<string, Array<SourceLocation> | null>;
	explicit_classes: Set<string> | null;
} => {
	const { all_classes, all_classes_with_locations, explicit_classes } = options;
	const { additional_classes, exclude_classes } = options;
	if (!additional_classes && !exclude_classes) {
		return { all_classes, all_classes_with_locations, explicit_classes };
	}
	const exclude = exclude_classes ? new Set(exclude_classes) : null;
	const all: Set<string> = new Set();
	const with_locations: Map<string, Array<SourceLocation> | null> = new Map();
	let explicit: Set<string> | null = null;
	if (additional_classes) {
		for (const c of additional_classes) {
			if (exclude?.has(c)) continue;
			all.add(c);
			with_locations.set(c, null);
			(explicit ??= new Set()).add(c);
		}
	}
	for (const c of all_classes) {
		if (exclude?.has(c)) continue;
		all.add(c);
		if (!with_locations.has(c)) with_locations.set(c, all_classes_with_locations.get(c) ?? null);
	}
	if (explicit_classes) {
		for (const c of explicit_classes) {
			if (exclude?.has(c)) continue;
			(explicit ??= new Set()).add(c);
		}
	}
	return {
		all_classes: all,
		all_classes_with_locations: with_locations,
		explicit_classes: explicit
	};
};

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
 * `resolve_css` + `render_bundled_css`. Returns the combined CSS and every
 * diagnostic produced along the way.
 */
export const generate_css = (options: GenerateCssOptions): GenerateCssResult => {
	const {
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
		exclude_variables: raw_exclude_variables
	} = options;

	const { all_classes, all_classes_with_locations, explicit_classes } = to_class_inputs(options);

	// a Set, for the lookups here and so the iterable is consumed once
	const exclude_variables = raw_exclude_variables ? new Set(raw_exclude_variables) : null;

	const utility_result = generate_classes_css({
		class_names: all_classes,
		class_definitions,
		interpreters,
		css_properties,
		class_locations: all_classes_with_locations,
		explicit_classes,
		// an explicit class the bundled base styles target resolves to their rules
		is_base_style_class:
			include_base && resources
				? (class_name) => resources.style_rule_index.by_class.has(class_name)
				: null
	});

	const diagnostics: Array<Diagnostic> = [...extraction_diagnostics, ...utility_result.diagnostics];

	// Footgun guard: a configured `theme` with theme output disabled
	// (`variables: null`) is silently discarded - the theme flows into the
	// variable graph but the graph never renders.
	if (theme != null && !include_theme) {
		diagnostics.push({
			phase: 'generation',
			code: 'theme_discarded',
			level: 'warning',
			message:
				'A theme is configured but theme variables are disabled (variables: null); the theme will not be emitted',
			suggestion: 'Remove the theme option, or enable variables so the theme can render.',
			identifier: to_theme_label(theme),
			locations: null
		});
	}

	let css: string;
	if ((include_base || include_theme) && resources) {
		// a source reference counts only when the theme defines the name, while
		// `@fuz-variables` are all kept so resolve_css checks them for typos
		const detected: Set<string> = new Set();
		for (const v of detected_css_variables) {
			if (resources.variable_graph.variables.has(v)) detected.add(v);
		}
		if (explicit_variables) {
			for (const v of explicit_variables) {
				detected.add(v);
			}
		}

		const resolution = resolve_css({
			style_rule_index: resources.style_rule_index,
			variable_graph: resources.variable_graph,
			detected_elements: all_elements,
			detected_classes: all_classes,
			detected_css_variables: detected,
			utility_variables_used: utility_result.variables_used,
			additional_elements,
			additional_variables,
			exclude_elements,
			exclude_variables: exclude_variables ?? undefined,
			explicit_elements,
			explicit_variables
		});

		diagnostics.push(...resolution.diagnostics);

		// the base styles that ship must find their theme variables defined
		if (include_base) {
			const undefined_variables = check_base_css_variables_undefined(
				resources,
				resolution.included_rule_indices,
				exclude_variables,
				include_theme
			);
			if (undefined_variables) diagnostics.push(undefined_variables);
		}

		css = render_bundled_css(resolution, utility_result.css, {
			include_theme,
			include_base,
			// the theme's own overlay re-renders into the baked sublayer of
			// fuz.theme so it outranks the fuz.preferences OS mappings and pins
			// color-scheme for a stance, like the runtime path renders the same
			// theme, while a runtime theme still wins over it
			theme_overlay_css:
				include_theme && resources.variable_graph.theme
					? render_theme_overlay(resources.variable_graph.theme, resolution.resolved_variables)
					: null
		});
	} else {
		// utility-only mode - still layered, so the separately imported package
		// style.css/theme.css slot beneath the generated classes and consumers'
		// unlayered styles beat everything, same as bundled mode
		css = utility_result.css
			? `${FUZ_LAYER_ORDER_STATEMENT}\n\n/* Utility Classes */\n${utility_result.css.trimEnd()}`
			: '';
	}

	return { css, diagnostics };
};
