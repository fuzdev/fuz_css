/**
 * The generator core the Vite plugin and the Gro generator share: the
 * options both read with their defaults, the resources a render needs, and
 * the render itself - from a collection of extracted classes to
 * banner-free CSS, with its diagnostics dispatched per `on_error` and
 * `on_warning`. Each generator owns only how it collects the classes and
 * where the CSS goes.
 *
 * @module
 */

import type { Logger } from '@fuzdev/fuz_util/log.ts';

import { generate_css } from './generate_css.ts';
import { create_bundled_resources, type BundledCssResources } from './bundled_resources.ts';
import { merge_class_definitions } from './css_class_definitions.ts';
import { css_class_interpreters } from './css_class_interpreters.ts';
import { load_css_properties } from './css_literal.ts';
import { is_ci } from './css_cache.ts';
import { default_cache_deps } from './deps_defaults.ts';
import { CssClasses } from './css_classes.ts';
import { create_diagnostic_dispatcher, type DiagnosticSink } from './diagnostics.ts';
import type { CssGeneratorBaseOptions } from './css_plugin_options.ts';

/**
 * What one render reads: the classes extracted so far and the `var()` names
 * scanned from source.
 *
 * @internal The core both generators render through - not stable API.
 */
export interface CssRenderInput {
	css_classes: CssClasses;
	/**
	 * The `var(--*)` names referenced in source, unfiltered - names that
	 * aren't theme variables are ignored.
	 */
	detected_css_variables: Iterable<string>;
	/** A logger for resolution stats and custom interpreters. */
	log?: Logger;
	/** Whether to compute and log resolution statistics. */
	include_stats?: boolean;
}

/**
 * A generator's shared core - see `create_css_generator`.
 *
 * @internal The core both generators render through - not stable API.
 */
export interface CssGenerator {
	/** Whether base styles are emitted (`base_css` isn't `null`). */
	readonly include_base: boolean;
	/** Whether theme variables are emitted (`variables` isn't `null`). */
	readonly include_theme: boolean;
	/** Whether `ensure_ready` has loaded everything a render needs. */
	readonly ready: boolean;
	/** Creates an empty class collection with the configured include and exclude classes. */
	create_css_classes: () => CssClasses;
	/**
	 * Loads what a render needs - the CSS properties literal classes are
	 * validated against, and the bundled resources unless both base styles
	 * and theme variables are off. Loads once; safe to call any number of
	 * times.
	 */
	ensure_ready: () => Promise<void>;
	/**
	 * Renders CSS without banners and dispatches its diagnostics. Before
	 * `ensure_ready` resolves it renders utility classes only.
	 *
	 * @throws CssGenerationError - for a diagnostic level set to `'throw'`
	 */
	render: (input: CssRenderInput) => string;
}

/**
 * Creates the core a generator renders through.
 *
 * @param options - the generator's options
 * @param sink - where logged diagnostics go
 *
 * @internal The core both generators render through - not stable API.
 */
export const create_css_generator = (
	options: CssGeneratorBaseOptions,
	sink: DiagnosticSink
): CssGenerator => {
	const {
		class_definitions: user_class_definitions,
		include_default_classes = true,
		class_interpreters = css_class_interpreters,
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
		deps = default_cache_deps
	} = options;

	const include_base = base_css !== null;
	const include_theme = variables !== null;

	// merged up front, so a missing definition set fails at creation
	const class_definitions = merge_class_definitions(
		user_class_definitions,
		include_default_classes
	);

	const include_set = additional_classes ? new Set(additional_classes) : null;
	const exclude_set = exclude_classes ? new Set(exclude_classes) : null;

	const dispatch = create_diagnostic_dispatcher({ on_error, on_warning }, sink);

	let css_properties: Set<string> | null = null;
	let resources: BundledCssResources | null = null;
	let ready_promise: Promise<void> | null = null;
	let ready = false;

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
			ready = true;
		})());

	const render = (input: CssRenderInput): string => {
		const { css_classes, detected_css_variables, log, include_stats } = input;
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
			additional_elements,
			additional_variables,
			exclude_elements,
			exclude_variables,
			log,
			include_stats
		});
		dispatch(diagnostics);
		return css;
	};

	return {
		include_base,
		include_theme,
		get ready() {
			return ready;
		},
		create_css_classes: () => new CssClasses(include_set, exclude_set),
		ensure_ready,
		render
	};
};
