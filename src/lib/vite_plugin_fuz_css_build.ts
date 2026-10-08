/**
 * The build half of `vite_plugin_fuz_css`: the passes that turn the virtual
 * module's placeholder into the generated CSS once every module has been
 * transformed.
 *
 * `renderChunk` renders the CSS and restates the placeholder with a hash of
 * it, so the stylesheet Vite emits - and each chunk whose name depends on
 * that stylesheet's - gets a filename that changes when the generated CSS
 * does. `generateBundle` then splices the CSS in at the placeholder's
 * position (see `css_placeholder_splice.ts`), in whichever of two passes the
 * stylesheets exist for.
 *
 * @module
 */

import type { Environment, Plugin, Rollup } from 'vite';
import { hash_blake3 } from '@fuzdev/fuz_util/hash_blake3.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';

import {
	parse_css_placeholder_hash,
	splice_css_into_asset,
	to_hashed_css_placeholder
} from './css_placeholder_splice.ts';

/**
 * Name of the Vite core plugin that holds each CSS module's build-time text
 * and emits the stylesheets. Its `transform` is how a CSS module's text is
 * set, which the build placeholder is restated through.
 */
const VITE_CSS_POST_PLUGIN_NAME = 'vite:css-post';

/**
 * Hex characters of the generated CSS's hash that the restated placeholder
 * carries - 64 bits, far past what a filename hash keeps of it.
 */
const PLACEHOLDER_HASH_LENGTH = 16;

/** The part of `vite:css-post`'s `transform` handler the placeholder restatement calls. */
type CssModuleTransform = (this: Rollup.PluginContext, css: string, id: string) => unknown;

/**
 * One build's generated CSS, rendered once and shared by the hooks that
 * need it.
 */
interface BuildRender extends BuildCss {
	/**
	 * The hash the placeholder was restated with, or `null` when it wasn't
	 * restated - the virtual module is in no rendered chunk, or the
	 * restatement failed.
	 */
	placeholder_hash: string | null;
}

/**
 * One environment's generated CSS for a build, as the plugin renders it.
 *
 * @nodocs
 */
export interface BuildCss {
	/** The CSS to splice in, banners included. */
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
	 * The build's rendered CSS per environment, so `renderChunk` hashes the
	 * same text `generateBundle` splices and diagnostics dispatch once. An
	 * entry lives from the first hook that needs it to that environment's next
	 * `buildStart` - across every output of one build, and never into a watch
	 * rebuild, whose transforms may have changed the classes. Keyed by
	 * environment because one plugin instance can serve several whose builds
	 * overlap.
	 */
	const build_renders: WeakMap<Environment, BuildRender> = new WeakMap();
	/**
	 * The virtual module's build-time text per environment as Vite's CSS
	 * pipeline left it - the placeholder rule after PostCSS or another
	 * transformer has wrapped, reformatted, or copied it. Restating the
	 * placeholder edits this text, so the hashed form keeps what the pipeline
	 * did. Kept across builds: a watch rebuild reuses the module's cached
	 * transform and doesn't run the capture again.
	 */
	const placeholder_sources: WeakMap<Environment, string> = new WeakMap();
	/**
	 * Whether the warning that the stylesheet's filename doesn't track the
	 * generated CSS was logged. The cause is a mismatch with the installed
	 * Vite, so without this it would repeat for every output and every watch
	 * rebuild.
	 */
	let warned_unhashed = false;

	/**
	 * Returns the build's generated CSS for the environment building in
	 * `context`, rendering it on first use. Only build hooks that run after
	 * every transform call this (`renderChunk`, `generateBundle`), so the first
	 * render already sees the full set of used classes.
	 */
	const render_build_css = (context: Rollup.PluginContext): BuildRender => {
		let build_render = build_renders.get(context.environment);
		if (!build_render) {
			build_render = { ...render(context), placeholder_hash: null };
			build_renders.set(context.environment, build_render);
		}
		return build_render;
	};

	/**
	 * Logs, once, that the placeholder couldn't be restated with the generated
	 * CSS's hash. The build output is still correct - what's lost is the
	 * filename tracking the content.
	 */
	const warn_unhashed = (reason: string): void => {
		if (warned_unhashed) return;
		warned_unhashed = true;
		log_warn(
			`[fuz_css] could not restate the virtual:fuz.css placeholder through Vite's CSS pipeline` +
				` (${reason}). The emitted CSS is unaffected, but its filename hash won't change when` +
				` the generated CSS does, so a stylesheet cached by filename can go stale across deploys.`
		);
	};

	/**
	 * Restates the virtual module's build-time text with the generated CSS's
	 * hash in its placeholder, so the filename Vite derives from the
	 * stylesheet's content tracks CSS that's spliced in only afterwards.
	 *
	 * Vite's CSS plugin keeps each CSS module's text from its `transform` and
	 * reads it back when it renders the chunk holding the module, so running
	 * that `transform` again for the virtual module replaces the text. The
	 * text given is the one Vite's pipeline produced for the module with only
	 * the placeholder's value changed, so the stylesheet comes out as if the
	 * hash had been there from `load()`. This reaches into Vite's internals,
	 * so every way it can fail is contained: the build falls back to the
	 * unhashed placeholder already in place, and the splice checks that the
	 * hash actually arrived in the emitted stylesheet.
	 *
	 * @returns the hash the placeholder now carries, or `null` if it wasn't restated
	 */
	const restate_placeholder = async (
		context: Rollup.PluginContext,
		css: string
	): Promise<string | null> => {
		try {
			const placeholder_source = placeholder_sources.get(context.environment);
			if (placeholder_source === undefined) {
				warn_unhashed(`the module's CSS wasn't seen after Vite processed it`);
				return null;
			}
			const placeholder_hash = hash_blake3(css).slice(0, PLACEHOLDER_HASH_LENGTH);
			const restated = to_hashed_css_placeholder(placeholder_source, placeholder_hash);
			if (restated === null) {
				warn_unhashed(`the module's CSS holds no placeholder after Vite processed it`);
				return null;
			}
			const hook = context.environment.plugins.find((p) => p.name === VITE_CSS_POST_PLUGIN_NAME)
				?.transform as unknown;
			// a hook is either the handler or an object holding it
			const handler =
				typeof hook === 'object' && hook !== null ? (hook as { handler?: unknown }).handler : hook;
			if (typeof handler !== 'function') {
				warn_unhashed(`no callable ${VITE_CSS_POST_PLUGIN_NAME} transform`);
				return null;
			}
			// The handler's build path never touches its context; the render
			// context stands in for the transform one it's typed against, and
			// anything it comes to need from the real one throws into the catch.
			await (handler as CssModuleTransform).call(context, restated, virtual_id);
			return placeholder_hash;
		} catch (error) {
			warn_unhashed(`${VITE_CSS_POST_PLUGIN_NAME} transform threw: ${to_error_message(error)}`);
			return null;
		}
	};

	/**
	 * Finishes a bundle's stylesheets: splices the build's generated CSS into
	 * the CSS asset that holds the placeholder, and surfaces every way that
	 * can go wrong. Called from the `generateBundle` pass that sees the
	 * stylesheets - see `emits_css_in_render`.
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

		// The render `renderChunk` hashed, or a first render when the virtual
		// module is in no chunk.
		const { css: generated_css, empty, placeholder_hash } = render_build_css(context);
		const css_assets = Object.values(bundle).filter(
			(chunk): chunk is Rollup.OutputAsset & { source: string } =>
				chunk.type === 'asset' &&
				typeof chunk.source === 'string' &&
				chunk.fileName.endsWith('.css')
		);

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
			// The asset was named from the marker it holds. A restatement that
			// ran without error but didn't arrive here - Vite keeping a CSS
			// module's text somewhere its `transform` no longer writes - would
			// otherwise lose the content hash silently.
			if (
				placeholder_hash !== null &&
				parse_css_placeholder_hash(chunk.source) !== placeholder_hash
			) {
				warn_unhashed(`the restated placeholder didn't reach ${chunk.fileName}`);
			}
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
			build_render.placeholder_hash = await restate_placeholder(context, build_render.css);
		},

		generate_bundle: (context, bundle) => {
			// First pass, ahead of every other plugin's `generateBundle`: a
			// code-split build's stylesheets all exist by now, so finish them
			// here and those hooks read the generated CSS, not the placeholder.
			if (emits_css_in_render(context.environment)) finish_bundle(context, bundle);
		},

		/**
		 * The build-only half, at the default `enforce` so its hooks sit between
		 * Vite's CSS processing and the Vite plugin that emits stylesheets.
		 */
		plugin: {
			name: 'vite-plugin-fuz-css:build',
			apply: 'build',

			transform(code, id) {
				// The virtual module's text after `vite:css` (PostCSS, a CSS
				// transformer) and before `vite:css-post` takes it - what
				// `renderChunk` restates with the hash.
				if (id === virtual_id) placeholder_sources.set(this.environment, code);
				return null;
			},

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
