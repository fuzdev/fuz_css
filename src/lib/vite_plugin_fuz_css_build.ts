/**
 * The build half of `vite_plugin_fuz_css`: the passes that turn the virtual
 * module's placeholder into the generated CSS once every module has been
 * transformed.
 *
 * `renderChunk` renders the CSS, runs it through Vite's CSS pipeline
 * (`preprocessCSS` - PostCSS or lightningcss, as configured), and restates
 * the virtual module's text with the result, ahead of Vite's own CSS
 * rendering. The stylesheet Vite emits then holds the generated CSS from the
 * start: minified like the rest, named from its content, and in the position
 * import order gave it, for code-split and single-stylesheet builds alike.
 *
 * When the restatement can't run - it calls the `transform` of Vite's
 * `vite:css-post` plugin, a reach into Vite's internals - the build falls back
 * to splicing the CSS in at the placeholder's position in `generateBundle`
 * (see `css_placeholder_splice.ts`), in whichever of two passes the
 * stylesheets exist for, with a one-time warning.
 *
 * @module
 */

import { preprocessCSS, type Environment, type Plugin, type Rollup } from 'vite';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';

import { FUZ_CSS_PLACEHOLDER, splice_css_into_asset } from './css_placeholder_splice.ts';

/**
 * Name of the Vite core plugin that holds each CSS module's build-time text
 * and emits the stylesheets. Its `transform` is how a CSS module's text is
 * set, which the generated CSS is restated through.
 */
const VITE_CSS_POST_PLUGIN_NAME = 'vite:css-post';

/** The part of `vite:css-post`'s `transform` handler the restatement calls. */
type CssModuleTransform = (this: Rollup.PluginContext, css: string, id: string) => unknown;

/**
 * One build's generated CSS, rendered once and shared by the hooks that
 * need it.
 */
interface BuildRender extends BuildCss {
	/**
	 * Whether the virtual module's text was restated with the generated CSS -
	 * false when the module is in no rendered chunk, or the restatement failed
	 * and the splice must place the CSS instead.
	 */
	restated: boolean;
}

/**
 * One environment's generated CSS for a build, as the plugin renders it.
 *
 * @nodocs
 */
export interface BuildCss {
	/** The generated CSS, banners included. */
	css: string;
	/** Whether the CSS holds nothing but its banners. */
	empty: boolean;
}

/** @nodocs */
export interface FuzCssBuildPassesOptions {
	/** The virtual module's resolved id, whose text the placeholder lives in. */
	virtual_id: string;
	/** Every id of the virtual module `load()` served - the bare id and its query variants. */
	loaded_virtual_ids: ReadonlySet<string>;
	/** Renders the generated CSS for the environment building in `context`. */
	render: (context: Rollup.PluginContext) => BuildCss;
	log_warn: (message: string) => void;
	log_error: (message: string) => void;
}

/**
 * The build passes, as hooks the main plugin calls and the build-only plugin
 * object positioned after Vite's CSS processing.
 *
 * @nodocs
 */
export interface FuzCssBuildPasses {
	/** Called from `buildStart`: forgets the environment's previous render. */
	build_start: (environment: Environment) => void;
	/** Called from the `enforce: 'pre'` plugin's `renderChunk`. */
	render_chunk: (context: Rollup.PluginContext, chunk: Rollup.RenderedChunk) => Promise<void>;
	/** Called from the `enforce: 'pre'` plugin's `generateBundle`: the first pass. */
	generate_bundle: (context: Rollup.PluginContext, bundle: Rollup.OutputBundle) => void;
	/** The build-only plugin object, holding the second pass. */
	plugin: Plugin;
}

/**
 * Creates the build passes over a plugin's render.
 *
 * @nodocs
 */
export const create_build_passes = (options: FuzCssBuildPassesOptions): FuzCssBuildPasses => {
	const { virtual_id, loaded_virtual_ids, render, log_warn, log_error } = options;

	/**
	 * The build's rendered CSS per environment, so `renderChunk` restates the
	 * same text a fallback `generateBundle` splices and diagnostics dispatch
	 * once per output. An
	 * entry lives from the first hook that needs it to that environment's next
	 * `buildStart` - across every output of a Rollup build, which runs the
	 * build phase once, but one output at a time under Rolldown (Vite 8+),
	 * which reruns `buildStart` and the transforms for each output - and never
	 * into a watch rebuild, whose transforms may have changed the classes. Keyed by
	 * environment because one plugin instance can serve several whose builds
	 * overlap.
	 */
	const build_renders: WeakMap<Environment, BuildRender> = new WeakMap();
	/**
	 * Whether the warning that the restatement fell back to the splice was
	 * logged. The cause is a mismatch with the installed Vite, so without this
	 * it would repeat for every output and every watch rebuild.
	 */
	let warned_fallback = false;

	/**
	 * Returns the build's generated CSS for the environment building in
	 * `context`, rendering it on first use. Only build hooks that run after
	 * every transform call this (`renderChunk`, `generateBundle`), so the first
	 * render already sees the full set of used classes.
	 */
	const render_build_css = (context: Rollup.PluginContext): BuildRender => {
		let build_render = build_renders.get(context.environment);
		if (!build_render) {
			build_render = { ...render(context), restated: false };
			build_renders.set(context.environment, build_render);
		}
		return build_render;
	};

	/**
	 * Logs, once, that the generated CSS couldn't go through Vite's CSS
	 * pipeline, so it's spliced in afterwards. The build output is still
	 * complete - what's lost is the pipeline's processing (minification,
	 * PostCSS, lightningcss) and the filename tracking the content.
	 */
	const warn_fallback = (reason: string): void => {
		if (warned_fallback) return;
		warned_fallback = true;
		log_warn(
			`[fuz_css] could not restate virtual:fuz.css through Vite's CSS pipeline (${reason}).` +
				` The generated CSS is spliced in after bundling instead: complete, but unminified and` +
				` untouched by PostCSS or lightningcss, and its filename hash won't change when the` +
				` generated CSS does, so a stylesheet cached by filename can go stale across deploys.`
		);
	};

	/**
	 * Restates the virtual module's build-time text with the generated CSS,
	 * processed by Vite's CSS pipeline, so the stylesheet Vite renders from
	 * it holds the real CSS - minified, named from its content, and at the
	 * position import order gave the module.
	 *
	 * Vite's CSS plugin keeps each CSS module's text from its `transform` and
	 * reads it back when it renders the chunk holding the module, so running
	 * that `transform` again for the virtual module replaces the text. That
	 * reaches into Vite's internals, so every way it can fail is contained:
	 * the placeholder stays in place for the splice, and `finish_bundle`
	 * checks that the placeholder is actually gone from the output. The
	 * pipeline itself runs outside that containment, so an error from the
	 * project's own PostCSS or lightningcss setup fails the build, as it
	 * would for any other stylesheet.
	 *
	 * @returns whether the text was restated
	 * @throws Error - when Vite's CSS pipeline rejects the generated CSS
	 */
	const restate_css = async (context: Rollup.PluginContext, css: string): Promise<boolean> => {
		let handler: unknown;
		try {
			const hook = context.environment.plugins.find((p) => p.name === VITE_CSS_POST_PLUGIN_NAME)
				?.transform as unknown;
			// a hook is either the handler or an object holding it
			handler =
				typeof hook === 'object' && hook !== null ? (hook as { handler?: unknown }).handler : hook;
		} catch (error) {
			warn_fallback(`finding its transform threw: ${to_error_message(error)}`);
			return false;
		}
		if (typeof handler !== 'function') {
			warn_fallback(`no callable ${VITE_CSS_POST_PLUGIN_NAME} transform`);
			return false;
		}
		let processed: Awaited<ReturnType<typeof preprocessCSS>>;
		try {
			processed = await preprocessCSS(css, virtual_id, context.environment.config);
		} catch (error) {
			// name the generated CSS, since the error points at the virtual module,
			// and carry its position so the bundler prints it
			const wrapped: Error & { loc?: unknown; frame?: unknown } = new Error(
				`[fuz_css] Vite's CSS pipeline rejected the generated CSS: ${to_error_message(error)}`,
				{ cause: error }
			);
			if (typeof error === 'object' && error !== null) {
				const { loc, frame } = error as { loc?: unknown; frame?: unknown };
				if (loc !== undefined) wrapped.loc = loc;
				if (frame !== undefined) wrapped.frame = frame;
			}
			throw wrapped;
		}
		try {
			// The handler's build path never touches its context; the render
			// context stands in for the transform one it's typed against, and
			// anything it comes to need from the real one throws into the catch.
			await (handler as CssModuleTransform).call(context, processed.code, virtual_id);
			return true;
		} catch (error) {
			warn_fallback(`restating it threw: ${to_error_message(error)}`);
			return false;
		}
	};

	/**
	 * Finishes a bundle's stylesheets: confirms the restated CSS replaced the
	 * placeholder, or else splices the build's generated CSS into the CSS asset
	 * that holds it, and surfaces every way that can go wrong. Called from the
	 * `generateBundle` pass that sees the stylesheets - see
	 * `emits_css_in_render`.
	 *
	 * @param context - the hook's context
	 * @param bundle - the output bundle, as the hook received it
	 * @mutates bundle - rewrites the `source` of CSS assets
	 * @throws Error - when `virtual:fuz.css` was imported and there's no CSS asset to hold its output
	 */
	const finish_bundle = (context: Rollup.PluginContext, bundle: Rollup.OutputBundle): void => {
		// Nothing to place for an environment whose graph doesn't hold the
		// virtual module (plugin installed but never imported, or an SSR build
		// beside a client that imports it) - and no render, so its diagnostics
		// don't fail a build that never asked for the CSS. Read per environment
		// because `loaded_virtual_ids` is shared by every build the instance serves.
		let imported = false;
		for (const id of loaded_virtual_ids) {
			if (context.getModuleInfo(id)) {
				imported = true;
				break;
			}
		}
		if (!imported) return;

		// The render `renderChunk` restated, or a first render when the virtual
		// module is in no chunk.
		const { css: generated_css, empty, restated } = render_build_css(context);
		const css_assets = Object.values(bundle).filter(
			(chunk): chunk is Rollup.OutputAsset & { source: string } =>
				chunk.type === 'asset' &&
				typeof chunk.source === 'string' &&
				chunk.fileName.endsWith('.css')
		);

		// The normal path: the restated CSS went through Vite's pipeline and
		// replaced the placeholder before any stylesheet was rendered.
		const placeholder_remains = css_assets.some((chunk) =>
			chunk.source.includes(FUZ_CSS_PLACEHOLDER)
		);
		if (restated && !placeholder_remains) return;
		// A restatement that ran without error but didn't arrive - Vite keeping a
		// CSS module's text somewhere its `transform` no longer writes - would
		// otherwise lose the generated CSS.
		if (restated) warn_fallback(`the restated CSS didn't reach the emitted stylesheet`);

		// Splice the generated CSS into the asset that holds the virtual module's
		// placeholder marker, at the marker's own position. Vite places that
		// marker in the CSS of whatever imported `virtual:fuz.css` (typically the
		// root layout/entry), which is loaded on every page, at the offset import
		// order gives it - so writing there keeps the source's ordering, and an
		// app stylesheet imported after `virtual:fuz.css` can still override a
		// theme token at equal specificity. Appending to an arbitrary "first" CSS
		// asset instead breaks code-split builds (e.g. SvelteKit's per-route CSS):
		// pages that don't load that chunk render completely unstyled.
		let spliced_count = 0;
		for (const chunk of css_assets) {
			const spliced = splice_css_into_asset(chunk.source, generated_css);
			if (spliced === null) continue;
			spliced_count++;
			chunk.source = spliced;
		}

		// Normal path: exactly one marked asset, loaded on every page.
		if (spliced_count === 1) return;

		// Marker landed in more than one asset - the full CSS is now duplicated
		// across them. Functional but bloated; surface it rather than ship silently.
		if (spliced_count > 1) {
			log_error(
				`[fuz_css] placeholder marker found in ${spliced_count} CSS assets; generated CSS is` +
					` duplicated across them. Expected a single globally-loaded asset.`
			);
			return;
		}

		// spliced_count === 0 below: the marker is gone. Only act when there's
		// real CSS to deliver - a fully empty generation is only banners.
		if (empty) return;

		// An environment that doesn't emit assets (a plain `build.ssr`) never
		// gets the single stylesheet of a `build.cssCodeSplit: false` build -
		// there's nothing to place, by design.
		if (!context.environment.config.build.emitAssets) return;

		// `virtual:fuz.css` was imported but there's nowhere to place its output -
		// every page would render completely unstyled. Fail the build rather than
		// ship a broken artifact (e.g. an output format whose CSS Vite inlines
		// into JS chunks, where the marker rides in a chunk these asset checks
		// skip).
		if (css_assets.length === 0) {
			throw new Error(
				'[fuz_css] virtual:fuz.css was imported but no CSS asset exists to hold the generated' +
					' styles - every page would be unstyled. Check the build config (CSS inlined into' +
					' JS chunks leaves no stylesheet to write to).'
			);
		}

		// Marker stripped but CSS assets exist (e.g. a minifier pruned the unused
		// custom property): append to every one so styles are present on every
		// page. Output may be duplicated; this is a degraded path, so surface it.
		log_error(
			`[fuz_css] placeholder marker not found in any CSS asset (likely stripped by a CSS` +
				` minifier); appending generated CSS to all ${css_assets.length} CSS assets as a` +
				` fallback. Output may be duplicated.`
		);
		for (const chunk of css_assets) {
			chunk.source = chunk.source + '\n' + generated_css;
		}
	};

	/**
	 * Whether Vite emits an environment's stylesheets while rendering chunks,
	 * so they all exist by the first `generateBundle` hook. That's a
	 * code-split build; with `build.cssCodeSplit: false` Vite collects the CSS
	 * and emits one stylesheet from its own `generateBundle` instead. Decides
	 * which of the plugin's two `generateBundle` passes finishes the bundle -
	 * a setting, not state carried between the passes, because a bundler need
	 * not hand both hooks the same bundle object to key that state by.
	 */
	const emits_css_in_render = (environment: Environment): boolean =>
		environment.config.build.cssCodeSplit;

	return {
		build_start: (environment) => {
			// a new build (or watch rebuild) for this environment: drop the
			// previous build's render so the next one reflects its transforms
			build_renders.delete(environment);
		},

		render_chunk: async (context, chunk) => {
			// Only the chunk holding the virtual module matters. The main plugin is
			// `enforce: 'pre'`, so for that chunk this runs before Vite's CSS
			// plugin reads the module's text to build the stylesheet it names by
			// content hash.
			if (!(virtual_id in chunk.modules)) return;
			// Every transform has run, so the full set of used classes is available.
			const build_render = render_build_css(context);
			build_render.restated = await restate_css(context, build_render.css);
		},

		generate_bundle: (context, bundle) => {
			// First pass, ahead of every other plugin's `generateBundle`: a
			// code-split build's stylesheets all exist by now, so finish them
			// here and those hooks read the generated CSS, not the placeholder.
			if (emits_css_in_render(context.environment)) finish_bundle(context, bundle);
		},

		/**
		 * The build-only half, holding the fallback splice's second pass.
		 */
		plugin: {
			name: 'vite-plugin-fuz-css:build',
			apply: 'build',

			generateBundle: {
				// Second pass, after Vite's CSS plugin: with `build.cssCodeSplit: false`
				// (so also `build.lib`) it emits the single stylesheet in its own
				// `generateBundle`, later than the first pass could see.
				order: 'post',
				handler(_options, bundle) {
					if (!emits_css_in_render(this.environment)) finish_bundle(this, bundle);
				}
			}
		}
	};
};
