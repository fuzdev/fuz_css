/**
 * Build output of the Vite plugin: the generated CSS replaces the placeholder
 * in the stylesheet Vite emits, and that stylesheet's filename tracks the
 * generated CSS.
 *
 * Every build runs in memory (`build.write: false`) against a fixture whose
 * entry imports `virtual:fuz.css` and then its own stylesheet. The generated
 * CSS is varied through `additional_classes`, which changes it without
 * touching a source file - the JS a build emits is then byte-identical, so a
 * renamed chunk can only be following the stylesheet.
 *
 * @module
 */

import { describe, test, assert } from 'vitest';
import { build, createBuilder, type InlineConfig, type Plugin, type Rollup } from 'vite';
import { join } from 'node:path';

import {
	FUZ_CSS_BANNER,
	vite_plugin_fuz_css,
	type VitePluginFuzCssOptions
} from '$lib/vite_plugin_fuz_css.ts';
import { FUZ_CSS_PLACEHOLDER, parse_css_placeholder_hash } from '$lib/css_placeholder_splice.ts';
import { css_class_interpreters } from '$lib/css_class_interpreters.ts';
import type { CssClassDefinitionInterpreter } from '$lib/css_class_generation.ts';
import {
	vite_build_fixture_root as fixture_root,
	filter_build_fixture_module as filter_fixture_file,
	use_suite_cache_dir,
	create_capturing_logger,
	type CapturedLogs as FixtureLogs
} from './vite_plugin_test_helpers.ts';

const entry_path = join(fixture_root, 'src/main.ts');
const variant_path = join(fixture_root, 'src/variant.ts');

const cache_dir = use_suite_cache_dir(fixture_root, '.fuz/build_test');

/** A rule of the fixture's own stylesheet, imported after `virtual:fuz.css`. */
const APP_RULE = '.build-fixture';

interface FixtureOptions {
	plugin_options?: VitePluginFuzCssOptions;
	/** Plugins added after the fuz_css plugin. */
	plugins?: Array<Plugin>;
	build?: InlineConfig['build'];
	css?: InlineConfig['css'];
}

interface FixtureBuild extends FixtureLogs {
	css: Array<Rollup.OutputAsset & { source: string }>;
	chunks: Array<Rollup.OutputChunk>;
}

const create_fixture_config = (options: FixtureOptions, logs: FixtureLogs): InlineConfig => ({
	root: fixture_root,
	configFile: false,
	publicDir: false,
	customLogger: create_capturing_logger(logs),
	plugins: [
		vite_plugin_fuz_css({
			filter_file: filter_fixture_file,
			cache_dir,
			...options.plugin_options
		}),
		...(options.plugins ?? [])
	],
	css: options.css,
	build: {
		write: false,
		// a script entry rather than an html page; lib builds name their own
		...(options.build?.lib ? null : { rollupOptions: { input: entry_path } }),
		...options.build
	}
});

const to_fixture_build = (
	outputs: Rollup.RollupOutput | Array<Rollup.RollupOutput>,
	logs: FixtureLogs
): FixtureBuild => {
	const files = [outputs].flat().flatMap((o) => o.output);
	return {
		...logs,
		css: files.filter(
			(f): f is Rollup.OutputAsset & { source: string } =>
				f.type === 'asset' && f.fileName.endsWith('.css') && typeof f.source === 'string'
		),
		chunks: files.filter((f) => f.type === 'chunk')
	};
};

/** Builds the fixture in memory and collects its stylesheets, chunks, and logs. */
const build_fixture = async (options: FixtureOptions = {}): Promise<FixtureBuild> => {
	const logs: FixtureLogs = { warnings: [], errors: [] };
	const outputs = await build(create_fixture_config(options, logs));
	assert(!('close' in outputs), 'a one-shot build, not a watcher');
	return to_fixture_build(outputs, logs);
};

/** Builds the fixture with `additional_classes`, the lever that varies the generated CSS. */
const build_with_classes = (
	classes: Array<string>,
	options: FixtureOptions = {}
): Promise<FixtureBuild> =>
	build_fixture({
		...options,
		plugin_options: { ...options.plugin_options, additional_classes: classes }
	});

/** Asserts a build emitted exactly one stylesheet and returns it. */
const assert_single_css = (result: FixtureBuild): FixtureBuild['css'][number] => {
	assert.strictEqual(result.css.length, 1, 'exactly one CSS asset');
	return result.css[0]!;
};

/** Asserts neither form of the placeholder is left anywhere in a build's output. */
const assert_no_placeholder = (result: FixtureBuild): void => {
	for (const asset of result.css) {
		assert.notInclude(asset.source, FUZ_CSS_PLACEHOLDER, `${asset.fileName} holds no placeholder`);
	}
	for (const chunk of result.chunks) {
		assert.notInclude(chunk.code, FUZ_CSS_PLACEHOLDER, `${chunk.fileName} holds no placeholder`);
	}
};

/** Asserts a stylesheet holds the generated CSS, placed ahead of the fixture's own rule. */
const assert_generated_css = (source: string, class_name: string): void => {
	assert.include(source, FUZ_CSS_BANNER);
	assert.include(source, `.${class_name}`);
	assert.include(source, APP_RULE);
	assert.ok(
		source.indexOf(`.${class_name}`) < source.indexOf(APP_RULE),
		'the generated CSS sits where `virtual:fuz.css` was imported, before the later stylesheet'
	);
};

/**
 * Serves the fixture's `variant.ts` from memory, so a test can change what
 * the plugin extracts between builds without writing to the fixture.
 */
const create_variant_plugin = (get_source: () => string): Plugin => ({
	name: 'test-variant',
	load(id) {
		return id === variant_path ? get_source() : undefined;
	}
});

type PostcssPlugin = NonNullable<
	Exclude<NonNullable<InlineConfig['css']>['postcss'], string | undefined>['plugins']
>[number];

/** The slice of a PostCSS root the test plugins use. */
interface PostcssRoot {
	nodes: Array<{ clone: () => unknown }>;
	append: (...nodes: Array<unknown>) => unknown;
	removeAll: () => unknown;
	walkDecls: (prop: string, callback: (decl: { remove: () => unknown }) => void) => unknown;
}

/** The slice of PostCSS's helpers the test plugins use. */
interface PostcssHelpers {
	AtRule: new (defaults: { name: string; params: string }) => {
		append: (...nodes: Array<unknown>) => unknown;
	};
}

/**
 * Builds a `css` config running one PostCSS plugin over every stylesheet,
 * the virtual module's placeholder included - a stand-in for what a real
 * pipeline does to the placeholder before the build restates it.
 */
const create_postcss_config = (
	name: string,
	once: (root: PostcssRoot, helpers: PostcssHelpers) => void
): InlineConfig['css'] => ({
	postcss: { plugins: [{ postcssPlugin: name, Once: once } as unknown as PostcssPlugin] }
});

/** Wraps each stylesheet in `@layer app`. */
const postcss_wrap_in_layer = create_postcss_config('test-wrap-in-layer', (root, { AtRule }) => {
	const layer = new AtRule({ name: 'layer', params: 'app' });
	layer.append(root.nodes);
	root.removeAll();
	root.append(layer);
});

/** Repeats each stylesheet's rules, leaving two placeholders. */
const postcss_repeat_rules = create_postcss_config('test-repeat-rules', (root) => {
	for (const node of [...root.nodes]) root.append(node.clone());
});

/** Removes the placeholder declaration. */
const postcss_drop_placeholder = create_postcss_config('test-drop-placeholder', (root) => {
	root.walkDecls(FUZ_CSS_PLACEHOLDER, (decl) => decl.remove());
});

type CssModuleHandler = (this: unknown, css: string, id: string) => unknown;

/**
 * Interferes with `vite:css-post`, the Vite plugin the placeholder is
 * restated through, to stand in for a Vite version whose internals differ:
 *
 * - `'throw'` - its transform throws for the restated placeholder
 * - `'ignore'` - its transform accepts the restated placeholder and drops it
 * - `'rename'` - the plugin is there under another name, so it isn't found
 * - `'function'` - its transform hook is a bare function, not `{handler}`
 */
const create_css_post_interference = (
	mode: 'throw' | 'ignore' | 'rename' | 'function'
): Plugin => ({
	name: 'test-css-post-interference',
	configResolved(config) {
		const css_post = config.plugins.find((p) => p.name === 'vite:css-post') as
			{ name: string; transform: { handler: CssModuleHandler } | CssModuleHandler } | undefined;
		assert(css_post, 'vite:css-post exists');
		assert(typeof css_post.transform === 'object', 'vite:css-post transform is an object hook');
		const { handler } = css_post.transform;
		switch (mode) {
			case 'throw':
				css_post.transform.handler = function (css, id) {
					if (parse_css_placeholder_hash(css) !== null) throw new Error('synthetic failure');
					return handler.call(this, css, id);
				};
				break;
			case 'ignore':
				css_post.transform.handler = function (css, id) {
					if (parse_css_placeholder_hash(css) !== null) return null;
					return handler.call(this, css, id);
				};
				break;
			case 'rename':
				css_post.name = 'vite:css-post-renamed';
				break;
			case 'function':
				// a bare function has no hook filter, so apply the one that matters
				css_post.transform = function (css, id) {
					return id.endsWith('.css') ? handler.call(this, css, id) : null;
				};
				break;
		}
	}
});

describe('vite_plugin_fuz_css build filenames', () => {
	test('the CSS filename changes with the generated CSS and is stable without it', async () => {
		const a = await build_with_classes(['p_md']);
		const b = await build_with_classes(['p_lg']);
		const a_again = await build_with_classes(['p_md']);
		const css_a = assert_single_css(a);
		const css_b = assert_single_css(b);
		const css_a_again = assert_single_css(a_again);

		assert.notStrictEqual(css_a.source, css_b.source, 'the two builds emit different CSS');
		assert.notStrictEqual(
			css_a.fileName,
			css_b.fileName,
			'different CSS must not ship under one filename'
		);
		assert.strictEqual(css_a.source, css_a_again.source, 'the same input emits the same CSS');
		assert.strictEqual(css_a.fileName, css_a_again.fileName, 'and the same filename');
		for (const result of [a, b, a_again]) {
			assert.deepEqual(result.warnings, []);
			assert.deepEqual(result.errors, []);
		}
	});

	test('a chunk that loads the stylesheet is renamed along with it', async () => {
		const a = await build_with_classes(['p_md']);
		const b = await build_with_classes(['p_lg']);
		assert.strictEqual(a.chunks.length, 1);
		assert.strictEqual(b.chunks.length, 1);
		assert.strictEqual(a.chunks[0]!.code, b.chunks[0]!.code, 'the JS itself is identical');
		assert.notStrictEqual(
			a.chunks[0]!.fileName,
			b.chunks[0]!.fileName,
			'a chunk naming the stylesheet it loads follows its filename'
		);
	});

	test('each output of a multi-output build gets the content-hashed stylesheet', async () => {
		const output: Array<Rollup.OutputOptions> = [{ format: 'es' }, { format: 'cjs' }];
		const a = await build_with_classes(['p_md'], {
			build: { rollupOptions: { input: entry_path, output } }
		});
		const b = await build_with_classes(['p_lg'], {
			build: { rollupOptions: { input: entry_path, output } }
		});
		assert.strictEqual(a.css.length, 2, 'one stylesheet per output');
		assert.strictEqual(b.css.length, 2);
		for (let i = 0; i < 2; i++) {
			assert_generated_css(a.css[i]!.source, 'p_md');
			assert_generated_css(b.css[i]!.source, 'p_lg');
			assert.notStrictEqual(a.css[i]!.fileName, b.css[i]!.fileName);
		}
		assert_no_placeholder(a);
		assert_no_placeholder(b);
	});
});

describe('vite_plugin_fuz_css build output', () => {
	test('writes the generated CSS at the placeholder and leaves no marker', async () => {
		const result = await build_with_classes(['p_md']);
		const css = assert_single_css(result);
		assert_generated_css(css.source, 'p_md');
		assert.include(css.source, '.box', 'classes extracted from the fixture are generated too');
		assert_no_placeholder(result);
		assert.deepEqual(result.warnings, []);
		assert.deepEqual(result.errors, []);
	});

	test('builds with cssCodeSplit: false, hashing the single stylesheet by content', async () => {
		const a = await build_with_classes(['p_md'], { build: { cssCodeSplit: false } });
		const b = await build_with_classes(['p_lg'], { build: { cssCodeSplit: false } });
		const css_a = assert_single_css(a);
		const css_b = assert_single_css(b);
		assert_generated_css(css_a.source, 'p_md');
		assert_generated_css(css_b.source, 'p_lg');
		assert.notStrictEqual(css_a.fileName, css_b.fileName);
		assert_no_placeholder(a);
		assert_no_placeholder(b);
		assert.deepEqual(a.errors, []);
		assert.deepEqual(a.warnings, []);
	});

	test('builds in library mode', async () => {
		const result = await build_with_classes(['p_md'], {
			build: { lib: { entry: entry_path, formats: ['es'], fileName: 'lib' } }
		});
		const css = assert_single_css(result);
		assert_generated_css(css.source, 'p_md');
		assert_no_placeholder(result);
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.warnings, []);
	});

	test('a plain SSR build succeeds silently with no stylesheet', async () => {
		const result = await build_with_classes(['p_md'], { build: { ssr: entry_path } });
		assert.strictEqual(result.css.length, 0, 'an SSR build discards its assets');
		assert.ok(result.chunks.length > 0);
		assert_no_placeholder(result);
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.warnings, []);
	});

	test('an SSR build that emits assets gets the generated CSS', async () => {
		const result = await build_with_classes(['p_md'], {
			build: { ssr: entry_path, ssrEmitAssets: true }
		});
		const css = assert_single_css(result);
		assert_generated_css(css.source, 'p_md');
		assert_no_placeholder(result);
		assert.deepEqual(result.errors, []);
	});

	test('still fails the build when the CSS is inlined into JS', async () => {
		// an iife output has no stylesheet: Vite injects the CSS from the chunk
		let error: unknown;
		try {
			await build_with_classes(['p_md'], {
				build: { rollupOptions: { input: entry_path, output: { format: 'iife' } } }
			});
		} catch (err) {
			error = err;
		}
		assert(error instanceof Error, 'the build throws');
		assert.include(error.message, 'no CSS asset exists');
	});

	test('a plain SSR build with cssCodeSplit: false succeeds silently', async () => {
		// the single stylesheet is never emitted for an environment without assets
		const result = await build_with_classes(['p_md'], {
			build: { ssr: entry_path, cssCodeSplit: false }
		});
		assert.strictEqual(result.css.length, 0);
		assert.ok(result.chunks.length > 0);
		assert_no_placeholder(result);
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.warnings, []);
	});
});

describe('vite_plugin_fuz_css build with other plugins', () => {
	/** Collects each CSS asset a default-order `generateBundle` hook is shown. */
	const create_css_reader = (seen: Array<string>, remove = false): Plugin => ({
		name: 'test-css-reader',
		generateBundle(_options, bundle) {
			for (const [file_name, file] of Object.entries(bundle)) {
				if (file.type === 'asset' && file_name.endsWith('.css')) {
					seen.push(String(file.source));
					if (remove) delete bundle[file_name];
				}
			}
		}
	});

	test("another plugin's generateBundle reads the generated CSS, not the placeholder", async () => {
		const seen: Array<string> = [];
		const result = await build_with_classes(['p_md'], { plugins: [create_css_reader(seen)] });
		const css = assert_single_css(result);
		assert.strictEqual(seen.length, 1);
		assert.notInclude(seen[0], FUZ_CSS_PLACEHOLDER);
		assert.ok(
			seen[0]!.startsWith(css.source.trimEnd()),
			'it reads the stylesheet that ships (ahead of Vite removing its own trailing marker)'
		);
		assert_generated_css(seen[0]!, 'p_md');
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.warnings, []);
	});

	test('a plugin that inlines the stylesheet and removes the asset still builds', async () => {
		const seen: Array<string> = [];
		const result = await build_with_classes(['p_md'], {
			plugins: [create_css_reader(seen, true)]
		});
		assert.strictEqual(result.css.length, 0, 'the asset was taken out of the bundle');
		assert.strictEqual(seen.length, 1);
		assert_generated_css(seen[0]!, 'p_md');
		assert.notInclude(seen[0], FUZ_CSS_PLACEHOLDER);
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.warnings, []);
	});
});

describe('vite_plugin_fuz_css build through a CSS pipeline', () => {
	test('the generated CSS lands inside a wrapper PostCSS put around the placeholder', async () => {
		const options: FixtureOptions = { css: postcss_wrap_in_layer };
		const a = await build_with_classes(['p_md'], options);
		const b = await build_with_classes(['p_lg'], options);
		const css_a = assert_single_css(a);
		const css_b = assert_single_css(b);

		assert.ok(
			css_a.source.startsWith(`@layer app{${FUZ_CSS_BANNER}`),
			'the generated CSS opens the layer the placeholder was wrapped in'
		);
		assert_generated_css(css_a.source, 'p_md');
		assert_no_placeholder(a);
		assert.notStrictEqual(css_a.fileName, css_b.fileName, 'and the filename still tracks it');
		assert.deepEqual(a.warnings, []);
		assert.deepEqual(a.errors, []);

		// the bytes are what splicing the unhashed placeholder gives
		const unhashed = await build_with_classes(['p_md'], {
			...options,
			plugins: [create_css_post_interference('throw')]
		});
		assert.strictEqual(unhashed.warnings.length, 1, 'the comparison build really is unhashed');
		assert.strictEqual(css_a.source, assert_single_css(unhashed).source);
	});

	test('a placeholder the pipeline copied is hashed and stripped everywhere', async () => {
		const options: FixtureOptions = { css: postcss_repeat_rules };
		const a = await build_with_classes(['p_md'], options);
		const b = await build_with_classes(['p_lg'], options);
		const css_a = assert_single_css(a);
		assert_generated_css(css_a.source, 'p_md');
		assert.strictEqual(
			css_a.source.split(FUZ_CSS_BANNER).length - 1,
			2,
			'the generated CSS (one banner pair) is placed once'
		);
		assert_no_placeholder(a);
		assert.notStrictEqual(css_a.fileName, assert_single_css(b).fileName);
		assert.deepEqual(a.warnings, []);
		assert.deepEqual(a.errors, []);
	});

	test('a placeholder the pipeline removed falls back to appending, with a warning', async () => {
		const result = await build_with_classes(['p_md'], { css: postcss_drop_placeholder });
		const css = assert_single_css(result);
		assert.include(css.source, FUZ_CSS_BANNER);
		assert.include(css.source, '.p_md');
		assert_no_placeholder(result);
		assert.strictEqual(result.warnings.length, 1);
		assert.include(result.warnings[0], 'holds no placeholder');
		assert.include(result.warnings[0], 'stale across deploys');
		assert.strictEqual(result.errors.length, 1);
		assert.include(result.errors[0], 'placeholder marker not found');
	});
});

describe('vite_plugin_fuz_css build render lifetime', () => {
	/** A module whose comment hint names a class nothing defines - one error diagnostic per render. */
	const UNRESOLVED_SOURCE =
		"// @fuz-classes not_a_real_fuz_class\nexport const variant_class = 'box';\n";

	/**
	 * Plugin options that count renders: an interpreter for one always-included
	 * class runs once per render, which the diagnostic dedup can't hide.
	 */
	const create_render_counter = (): {
		plugin_options: VitePluginFuzCssOptions;
		count: () => number;
	} => {
		let renders = 0;
		const probe: CssClassDefinitionInterpreter = {
			pattern: /^render_probe$/,
			interpret: () => {
				renders++;
				return null;
			}
		};
		return {
			plugin_options: {
				additional_classes: ['render_probe'],
				class_interpreters: [probe, ...css_class_interpreters]
			},
			count: () => renders
		};
	};

	test('one render serves both hooks', async () => {
		const counter = create_render_counter();
		const result = await build_fixture({ plugin_options: counter.plugin_options });
		assert_single_css(result);
		assert.strictEqual(counter.count(), 1);
	});

	test('one render serves every output', async () => {
		const counter = create_render_counter();
		const result = await build_fixture({
			plugin_options: counter.plugin_options,
			build: {
				rollupOptions: { input: entry_path, output: [{ format: 'es' }, { format: 'cjs' }] }
			}
		});
		assert.strictEqual(result.css.length, 2);
		assert.strictEqual(counter.count(), 1);
	});

	test('an error thrown by the render fails the build', async () => {
		let error: unknown;
		try {
			await build_fixture({
				plugin_options: { on_error: 'throw' },
				plugins: [create_variant_plugin(() => UNRESOLVED_SOURCE)]
			});
		} catch (err) {
			error = err;
		}
		assert(error instanceof Error, 'the build throws');
		assert.include(error.message, 'not_a_real_fuz_class');
	});

	test('rebuilding one environment renders again instead of reusing the last build', async () => {
		// the lifecycle of a watch rebuild - the same environment and plugin
		// instance, a new build whose transforms changed the classes - without
		// the filesystem timing
		let variant_class = 'p_md';
		const logs: FixtureLogs = { warnings: [], errors: [] };
		const builder = await createBuilder(
			create_fixture_config(
				{
					plugins: [
						create_variant_plugin(() => `export const variant_class = '${variant_class}';\n`)
					]
				},
				logs
			)
		);
		const environment = Object.values(builder.environments)[0]!;
		const build_environment = async (): Promise<FixtureBuild> => {
			const outputs = await builder.build(environment);
			assert(!('close' in outputs));
			return to_fixture_build(outputs, logs);
		};

		const first = assert_single_css(await build_environment());
		variant_class = 'p_lg';
		const second = assert_single_css(await build_environment());

		assert.include(first.source, '.p_md');
		assert.include(second.source, '.p_lg', 'the rebuild has the class its transform added');
		assert.notInclude(second.source, '.p_md', 'and not the one it removed');
		assert.notStrictEqual(first.fileName, second.fileName);
		assert.deepEqual(logs.errors, []);
		assert.deepEqual(logs.warnings, []);
	});

	test('environments building at the same time each keep their own render', async () => {
		// the client build runs to completion while the SSR build is held at
		// a module whose class differs per environment - so the SSR build
		// starts before the client renders and transforms after it
		let release_ssr!: () => void;
		const client_built = new Promise<void>((resolve) => {
			release_ssr = resolve;
		});
		const logs: FixtureLogs = { warnings: [], errors: [] };
		const config = create_fixture_config(
			{
				plugins: [
					{
						name: 'test-environment-variant',
						async load(id) {
							if (id !== variant_path) return undefined;
							const is_ssr = this.environment.name === 'ssr';
							if (is_ssr) await client_built;
							return `export const variant_class = '${is_ssr ? 'p_lg' : 'p_md'}';\n`;
						}
					}
				]
			},
			logs
		);
		const builder = await createBuilder({
			...config,
			builder: {},
			environments: {
				client: { build: config.build },
				ssr: { build: { ...config.build, ssr: true, emitAssets: true } }
			}
		});
		const [client_outputs, ssr_outputs] = await Promise.all([
			builder.build(builder.environments.client!).finally(release_ssr),
			builder.build(builder.environments.ssr!)
		]);
		assert(!('close' in client_outputs));
		assert(!('close' in ssr_outputs));
		const client_css = assert_single_css(to_fixture_build(client_outputs, logs));
		const ssr_css = assert_single_css(to_fixture_build(ssr_outputs, logs));

		assert.include(client_css.source, '.p_md');
		assert.notInclude(client_css.source, '.p_lg');
		assert.include(ssr_css.source, '.p_lg', "the SSR build renders its own transform's class");
		assert.notStrictEqual(client_css.fileName, ssr_css.fileName);
		assert.notInclude(client_css.source, FUZ_CSS_PLACEHOLDER);
		assert.notInclude(ssr_css.source, FUZ_CSS_PLACEHOLDER);
		assert.deepEqual(logs.errors, []);
		assert.deepEqual(logs.warnings, []);
	});

	test('one plugin instance serves a client and an SSR environment', async () => {
		const build_app = async (class_name: string): Promise<Record<string, FixtureBuild>> => {
			const logs: FixtureLogs = { warnings: [], errors: [] };
			const config = create_fixture_config(
				{ plugin_options: { additional_classes: [class_name] } },
				logs
			);
			const builder = await createBuilder({
				...config,
				builder: {},
				environments: {
					client: { build: config.build },
					ssr: { build: { ...config.build, ssr: true } }
				}
			});
			const results: Record<string, FixtureBuild> = {};
			for (const environment of Object.values(builder.environments)) {
				const outputs = await builder.build(environment);
				assert(!('close' in outputs));
				results[environment.name] = to_fixture_build(outputs, logs);
			}
			return results;
		};

		const a = await build_app('p_md');
		const b = await build_app('p_lg');
		const css_a = assert_single_css(a.client!);
		const css_b = assert_single_css(b.client!);
		assert_generated_css(css_a.source, 'p_md');
		assert_generated_css(css_b.source, 'p_lg');
		assert.notStrictEqual(
			css_a.fileName,
			css_b.fileName,
			"the placeholder is restated through the building environment's own CSS plugin"
		);
		assert.strictEqual(a.ssr!.css.length, 0);
		for (const result of [a.client!, a.ssr!, b.client!, b.ssr!]) {
			assert_no_placeholder(result);
			assert.deepEqual(result.errors, []);
			assert.deepEqual(result.warnings, []);
		}
	});

	test("each environment's CSS holds only the classes of its own modules", async () => {
		const ssr_entry_path = join(fixture_root, 'src/ssr_entry.ts');
		const logs: FixtureLogs = { warnings: [], errors: [] };
		const config = create_fixture_config({}, logs);
		const builder = await createBuilder({
			...config,
			builder: {},
			environments: {
				client: { build: config.build },
				ssr: {
					build: {
						...config.build,
						ssr: true,
						emitAssets: true,
						rollupOptions: { input: ssr_entry_path }
					}
				}
			}
		});
		const results: Record<string, FixtureBuild> = {};
		for (const environment of Object.values(builder.environments)) {
			const outputs = await builder.build(environment);
			assert(!('close' in outputs));
			results[environment.name] = to_fixture_build(outputs, logs);
		}
		const client_css = assert_single_css(results.client!).source;
		const ssr_css = assert_single_css(results.ssr!).source;
		assert.include(client_css, '.box');
		assert.notInclude(client_css, '.pt_xl7', 'the SSR-only class stays out of the client CSS');
		assert.include(ssr_css, '.pt_xl7');
		assert.notInclude(ssr_css, '.box', "the client's classes stay out of the SSR CSS");
		assert.deepEqual(logs.errors, []);
	});

	test('an environment that never imports the virtual module is left alone', async () => {
		// the client imports `virtual:fuz.css` and builds first; the SSR build
		// emits assets but its entry never imports it, so it has nothing to place
		const logs: FixtureLogs = { warnings: [], errors: [] };
		const config = create_fixture_config({}, logs);
		const builder = await createBuilder({
			...config,
			builder: {},
			environments: {
				client: { build: config.build },
				ssr: {
					build: {
						...config.build,
						ssr: true,
						emitAssets: true,
						rollupOptions: { input: variant_path }
					}
				}
			}
		});
		const results: Record<string, FixtureBuild> = {};
		for (const environment of Object.values(builder.environments)) {
			const outputs = await builder.build(environment);
			assert(!('close' in outputs));
			results[environment.name] = to_fixture_build(outputs, logs);
		}
		assert_generated_css(assert_single_css(results.client!).source, 'box');
		assert.strictEqual(results.ssr!.css.length, 0);
		assert.deepEqual(logs.errors, []);
		assert.deepEqual(logs.warnings, []);
	});
});

describe('vite_plugin_fuz_css build base_css and variables diagnostics', () => {
	const LAYERED_BASE_CSS = '@layer mine { a { color: red; } }\n:root { tab-size: 3; }';

	const build_rejection = async (plugin_options: VitePluginFuzCssOptions): Promise<Error> => {
		let error: unknown;
		try {
			await build_fixture({ plugin_options });
		} catch (err) {
			error = err;
		}
		assert(error instanceof Error, 'the build throws');
		return error;
	};

	test('a layer in base_css logs its error once and ships with the rest', async () => {
		const result = await build_fixture({
			plugin_options: { on_error: 'log', base_css: LAYERED_BASE_CSS, variables: [] }
		});
		const css = assert_single_css(result);
		assert.strictEqual(result.errors.length, 1);
		assert.include(result.errors[0]!, 'base_css_layer');
		assert.include(result.errors[0]!, '@layer mine');
		assert.match(css.source, /tab-size:\s*3/);
		assert.match(css.source, /@layer mine\s*\{/);
	});

	test('the same error fails the build under on_error: throw', async () => {
		const error = await build_rejection({
			on_error: 'throw',
			base_css: LAYERED_BASE_CSS,
			variables: []
		});
		assert.include(error.message, 'base_css_layer');
	});

	test('base styles missing their theme variables log undefined_theme_variables', async () => {
		for (const variables of [null, []]) {
			const result = await build_fixture({ plugin_options: { on_error: 'log', variables } });
			assert.strictEqual(result.errors.length, 1);
			assert.include(result.errors[0]!, 'undefined_theme_variables');
		}
	});

	test('utility-only mode logs nothing', async () => {
		const result = await build_fixture({
			plugin_options: { on_error: 'log', base_css: null, variables: null }
		});
		assert.deepEqual(result.errors, []);
		assert.deepEqual(result.warnings, []);
	});

	test('a base_css that is not valid CSS fails the build whatever on_error says', async () => {
		const error = await build_rejection({ on_error: 'log', base_css: 'a { color: red;' });
		assert.include(error.message, 'base_css is not valid CSS');
	});

	test('a base_css callback returning a non-string fails the build naming the callback', async () => {
		const error = await build_rejection({
			on_error: 'log',
			base_css: (() => undefined) as unknown as VitePluginFuzCssOptions['base_css']
		});
		assert.include(error.message, 'The base_css callback must return a CSS string');
	});
});

describe('vite_plugin_fuz_css build without the restated placeholder', () => {
	/** Asserts the single warning that names what an unhashed filename costs. */
	const assert_unhashed_warning = (result: FixtureBuild, reason: string): void => {
		assert.strictEqual(result.warnings.length, 1, 'warned exactly once');
		assert.include(result.warnings[0], reason);
		assert.include(result.warnings[0], 'stale across deploys', 'the warning names the consequence');
		assert.deepEqual(result.errors, []);
	};

	for (const [mode, reason] of [
		['throw', 'synthetic failure'],
		['ignore', "didn't reach"],
		['rename', 'no callable']
	] as const) {
		test(`falls back to the unhashed placeholder and warns once (${mode})`, async () => {
			const options: FixtureOptions = { plugins: [create_css_post_interference(mode)] };
			const a = await build_with_classes(['p_md'], options);
			const b = await build_with_classes(['p_lg'], options);
			const css_a = assert_single_css(a);
			const css_b = assert_single_css(b);

			// the output is as correct as with the hash
			assert_generated_css(css_a.source, 'p_md');
			assert_generated_css(css_b.source, 'p_lg');
			assert_no_placeholder(a);
			assert_no_placeholder(b);
			// only the filename loses its tie to the content
			assert.strictEqual(css_a.fileName, css_b.fileName);
			assert_unhashed_warning(a, reason);
			assert_unhashed_warning(b, reason);
		});
	}

	test('warns once across the outputs of a build', async () => {
		const result = await build_with_classes(['p_md'], {
			plugins: [create_css_post_interference('throw')],
			build: {
				rollupOptions: { input: entry_path, output: [{ format: 'es' }, { format: 'cjs' }] }
			}
		});
		assert.strictEqual(result.css.length, 2);
		assert_unhashed_warning(result, 'synthetic failure');
		assert_no_placeholder(result);
	});

	test('restates through a transform hook that is a bare function', async () => {
		const options: FixtureOptions = { plugins: [create_css_post_interference('function')] };
		const a = await build_with_classes(['p_md'], options);
		const b = await build_with_classes(['p_lg'], options);
		const css_a = assert_single_css(a);
		const css_b = assert_single_css(b);
		assert_generated_css(css_a.source, 'p_md');
		assert.notStrictEqual(css_a.fileName, css_b.fileName);
		assert_no_placeholder(a);
		assert.deepEqual(a.warnings, []);
		assert.deepEqual(a.errors, []);
	});
});
