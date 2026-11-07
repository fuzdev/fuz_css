/**
 * The generator core the Vite plugin renders through: the options it reads
 * with their defaults, the resources a render needs, and the render itself -
 * from a collection of extracted classes to CSS, with its diagnostics
 * dispatched per `on_error` and `on_warning`. The plugin owns only how it
 * collects the classes and where the CSS goes, so the seam stays open for
 * another integration.
 *
 * @internal
 *
 * @module
 */

import { generate_css } from './generate_css.ts';
import { create_bundled_resources, type BundledCssResources } from './bundled_resources.ts';
import { resolve_class_definitions } from './css_class_definitions.ts';
import { resolve_class_interpreters } from './css_class_interpreters.ts';
import { load_css_properties } from './css_literal.ts';
import { is_ci } from './ci.ts';
import { default_fs_deps } from './deps_defaults.ts';
import { CssClasses } from './css_classes.ts';
import { create_diagnostic_dispatcher, type DiagnosticSink } from './diagnostics.ts';
import type { CssGeneratorBaseOptions } from './css_plugin_options.ts';

/**
 * What one render reads: the classes extracted so far and the `var()` names
 * scanned from source.
 */
export interface CssRenderInput {
	css_classes: CssClasses;
	/**
	 * The `var(--*)` names referenced in source, unfiltered - names that
	 * aren't theme variables are ignored.
	 */
	detected_css_variables: Iterable<string>;
}

/**
 * A generator's shared core - see `create_css_generator`.
 */
export interface CssGenerator {
	/** Creates an empty class collection. */
	create_css_classes: () => CssClasses;
	/**
	 * Loads what a render needs - the CSS properties literal classes are
	 * validated against, and the bundled resources unless both base styles
	 * and theme variables are off. Loads once; safe to call any number of
	 * times, and a failed load is retried on the next call.
	 */
	ensure_ready: () => Promise<void>;
	/**
	 * Renders CSS and dispatches its diagnostics. Before
	 * `ensure_ready` resolves it renders utility classes only.
	 *
	 * @throws CssGenerationError - for a diagnostic level set to `'throw'`
	 */
	render: (input: CssRenderInput) => string;
}

/** Collects an include option into a set, keeping `'all'` as is. */
const to_option_set = (
	option: Iterable<string> | 'all' | undefined
): Set<string> | 'all' | undefined => {
	if (option === undefined) return undefined;
	if (option === 'all') return 'all';
	return new Set(option);
};

/**
 * Creates the core a generator renders through.
 *
 * @param options - the generator's options
 * @param sink - where logged diagnostics go
 */
export const create_css_generator = (
	options: CssGeneratorBaseOptions,
	sink: DiagnosticSink
): CssGenerator => {
	const {
		class_definitions: class_definitions_option,
		class_interpreters: class_interpreters_option,
		additional_classes,
		exclude_classes,
		on_error = is_ci ? 'throw' : 'log',
		on_warning = 'log',
		base_css,
		variables,
		theme,
		additional_elements,
		additional_variables,
		exclude_elements,
		exclude_variables,
		deps = default_fs_deps
	} = options;

	const include_base = base_css !== null;
	const include_theme = variables !== null;

	// resolved up front, so a callback returning the wrong shape fails at creation
	const class_definitions = resolve_class_definitions(class_definitions_option);
	const class_interpreters = resolve_class_interpreters(class_interpreters_option);

	// collected once, so an option given as a one-shot iterable serves every render
	const additional_class_set = additional_classes ? new Set(additional_classes) : undefined;
	const exclude_class_set = exclude_classes ? new Set(exclude_classes) : undefined;
	const additional_element_set = to_option_set(additional_elements);
	const additional_variable_set = to_option_set(additional_variables);
	const exclude_element_set = exclude_elements ? new Set(exclude_elements) : undefined;
	const exclude_variable_set = exclude_variables ? new Set(exclude_variables) : undefined;

	const dispatch = create_diagnostic_dispatcher({ on_error, on_warning }, sink);

	let css_properties: Set<string> | null = null;
	let resources: BundledCssResources | null = null;
	let ready_promise: Promise<void> | null = null;

	const ensure_ready = (): Promise<void> =>
		(ready_promise ??= (async () => {
			const [properties, loaded] = await Promise.all([
				load_css_properties(),
				include_base || include_theme
					? create_bundled_resources({ base_css, variables, theme, deps })
					: null
			]);
			css_properties = properties;
			resources = loaded;
		})().catch((error: unknown) => {
			// a failed load isn't kept, so the next call retries it
			ready_promise = null;
			throw error;
		}));

	const render = (input: CssRenderInput): string => {
		const { css_classes, detected_css_variables } = input;
		const {
			all_classes,
			all_classes_with_locations,
			explicit_classes,
			all_elements,
			explicit_elements,
			explicit_variables
		} = css_classes.get_all();
		const { css, diagnostics } = generate_css({
			all_classes,
			all_classes_with_locations,
			explicit_classes,
			all_elements,
			explicit_elements,
			explicit_variables,
			extraction_diagnostics: css_classes.get_diagnostics(),
			detected_css_variables,
			class_definitions,
			interpreters: class_interpreters,
			css_properties,
			include_base,
			include_theme,
			theme,
			resources,
			additional_classes: additional_class_set,
			additional_elements: additional_element_set,
			additional_variables: additional_variable_set,
			exclude_classes: exclude_class_set,
			exclude_elements: exclude_element_set,
			exclude_variables: exclude_variable_set
		});
		dispatch(diagnostics);
		return css;
	};

	return {
		create_css_classes: () => new CssClasses(),
		ensure_ready,
		render
	};
};
