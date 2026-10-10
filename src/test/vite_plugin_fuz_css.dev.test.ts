import { describe, test, assert } from 'vitest';
import { createServer, normalizePath, type ViteDevServer } from 'vite';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import {
	to_extraction_id,
	vite_plugin_fuz_css,
	type VitePluginFuzCssOptions
} from '#lib/vite_plugin_fuz_css.ts';
import { default_cache_deps } from '#lib/deps_defaults.ts';
import { scheme_adaptive_variables } from '#lib/scheme_adaptive_variables.ts';
import {
	vite_dev_fixture_root as fixture_root,
	filter_dev_fixture_html as filter_fixture_file,
	filter_dev_fixture_html_and_late_module as filter_fixture_file_and_late_module,
	use_suite_cache_dir,
	wait_for,
	create_capturing_logger,
	type CapturedLogs
} from './vite_plugin_test_helpers.ts';

const cache_dir = use_suite_cache_dir(fixture_root, '.fuz/dev_test');

const create_dev_server = (
	options?: VitePluginFuzCssOptions,
	root = fixture_root
): Promise<ViteDevServer> =>
	createServer({
		root,
		configFile: false,
		logLevel: 'silent',
		// middlewareMode avoids binding an http port; `ws: false` avoids the
		// standalone HMR websocket server (the plugin's evaluation-report
		// listener registers against Vite's noop hot channel).
		server: { middlewareMode: true, ws: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [vite_plugin_fuz_css({ filter_file: filter_fixture_file, cache_dir, ...options })]
	});

// Room for the tests that poll a server for a debounced update, on a loaded
// machine - `wait_for` bounds the polling itself.
const POLLING_TEST_TIMEOUT = 20_000;

/** Whether the virtual module's current CSS has a rule for `class_name`. */
const serves_class = async (server: ViteDevServer, class_name: string): Promise<boolean> => {
	const result = await server.transformRequest('/__fuz.css');
	assert(result);
	return result.code.includes(`.${class_name}`);
};

/**
 * Runs a dev server over a root of its own outside the shared fixture, for
 * tests that write files.
 */
const with_temp_root = async (
	files: Record<string, string>,
	fn: (server: ViteDevServer, root: string) => Promise<void>,
	options?: VitePluginFuzCssOptions
): Promise<void> => {
	const root = normalizePath(await mkdtemp(join(tmpdir(), 'fuz_css_dev_')));
	let server: ViteDevServer | null = null;
	try {
		for (const [path, content] of Object.entries(files)) {
			await mkdir(dirname(join(root, path)), { recursive: true });
			await writeFile(join(root, path), content);
		}
		server = await create_dev_server(options, root);
		await fn(server, root);
	} finally {
		await server?.close();
		await rm(root, { recursive: true, force: true });
	}
};

describe('to_extraction_id', () => {
	const cases: Array<[id: string, expected: string]> = [
		// no query
		['/app/src/Foo.svelte', '/app/src/Foo.svelte'],
		// the dev server's dep version hash
		['/app/node_modules/pkg/index.js?v=1d2e7c62', '/app/node_modules/pkg/index.js'],
		['/app/node_modules/pkg/Foo.svelte?v=1d2e7c62', '/app/node_modules/pkg/Foo.svelte'],
		['/app/node_modules/.vite/deps/pkg.js?v=53cdb23c', '/app/node_modules/.vite/deps/pkg.js'],
		// the HMR timestamp, alone and with the version hash
		['/app/src/main.ts?t=1791232897199', '/app/src/main.ts'],
		['/app/node_modules/pkg/index.js?v=1d2e7c62&t=1791232897199', '/app/node_modules/pkg/index.js'],
		['/app/node_modules/pkg/index.js?t=1791232897199&v=1d2e7c62', '/app/node_modules/pkg/index.js'],
		// a component's virtual CSS is a different module than the component
		[
			'/app/src/Foo.svelte?svelte&type=style&lang.css',
			'/app/src/Foo.svelte?svelte&type=style&lang.css'
		],
		[
			'/app/node_modules/pkg/Foo.svelte?v=1d2e7c62&svelte&type=style&lang.css',
			'/app/node_modules/pkg/Foo.svelte?v=1d2e7c62&svelte&type=style&lang.css'
		],
		[
			'/app/node_modules/pkg/Foo.svelte?svelte&type=style&lang.css&v=1d2e7c62',
			'/app/node_modules/pkg/Foo.svelte?svelte&type=style&lang.css&v=1d2e7c62'
		],
		// generated wrappers, not the file's source
		['/app/src/frag.html?raw', '/app/src/frag.html?raw'],
		['/app/src/other.ts?url', '/app/src/other.ts?url'],
		['/app/src/worker.ts?worker', '/app/src/worker.ts?worker'],
		['/app/src/worker.ts?worker_file&type=module', '/app/src/worker.ts?worker_file&type=module'],
		['/app/src/frag.html?raw&v=1d2e7c62', '/app/src/frag.html?raw&v=1d2e7c62'],
		// CSS request variants
		['/app/src/a.css?inline', '/app/src/a.css?inline'],
		['/app/src/a.css?direct', '/app/src/a.css?direct'],
		['/app/src/a.css?used', '/app/src/a.css?used'],
		// an inline script of an HTML file is its own module
		['/app/index.html?html-proxy&index=0.js', '/app/index.html?html-proxy&index=0.js'],
		// parameters that only resemble the cache-busters
		['/app/src/main.ts?version=2', '/app/src/main.ts?version=2'],
		['/app/src/main.ts?t=soon', '/app/src/main.ts?t=soon'],
		['/app/src/main.ts?v', '/app/src/main.ts?v'],
		['/app/src/main.ts?', '/app/src/main.ts?']
	];

	test.each(cases)('%s -> %s', (id, expected) => {
		assert.strictEqual(to_extraction_id(id), expected);
	});
});

describe('vite_plugin_fuz_css dev pre-scan', () => {
	test('first CSS serve includes classes from files no module ever imported', async () => {
		const server = await create_dev_server();
		try {
			// Request the virtual CSS before transforming anything - the cold-start
			// shape where extraction state would otherwise be empty.
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(result.code.includes('.p_md'), 'includes classes from src/page.html');
			assert(result.code.includes('.box'), 'includes composite classes from src/page.html');
			assert(
				result.code.includes('.gap_lg'),
				'includes classes from the never-imported src/island.html'
			);
			assert(!result.code.includes('.mt_lg'), 'extra/ is not scanned by default');
		} finally {
			await server.close();
		}
	});

	test('first CSS serve includes classes from the root index.html', async () => {
		const server = await create_dev_server();
		try {
			assert(await serves_class(server, 'pt_xl7'));
		} finally {
			await server.close();
		}
	});

	test('prescan: false leaves the first serve without utility classes', async () => {
		const server = await create_dev_server({ prescan: false });
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(!result.code.includes('.p_md'));
			assert(!result.code.includes('.gap_lg'));
			assert(!result.code.includes('.pt_xl7'), 'the root index.html is not scanned either');
		} finally {
			await server.close();
		}
	});

	test('prescan accepts custom roots', async () => {
		const server = await create_dev_server({ prescan: ['src', 'extra'] });
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(result.code.includes('.gap_lg'), 'includes the default src root');
			assert(result.code.includes('.mt_lg'), 'includes classes from the extra/ root');
		} finally {
			await server.close();
		}
	});

	test('custom roots keep the root index.html', async () => {
		const server = await create_dev_server({ prescan: ['extra'] });
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(result.code.includes('.mt_lg'), 'includes classes from the extra/ root');
			assert(!result.code.includes('.gap_lg'), 'src is not scanned');
			assert(result.code.includes('.pt_xl7'), 'includes classes from the root index.html');
		} finally {
			await server.close();
		}
	});

	test('filter_file applies to the root index.html', async () => {
		const server = await create_dev_server({
			filter_file: (path) => path.endsWith('.html') && !path.endsWith('/index.html')
		});
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(result.code.includes('.p_md'));
			assert(!result.code.includes('.pt_xl7'));
		} finally {
			await server.close();
		}
	});

	test('a file that throws mid-scan does not abort the rest of the pre-scan', async () => {
		// `each_concurrent` is fail-fast - without per-file isolation one bad
		// file would silently skip every file not yet in flight for the
		// server's life. The fixture is smaller than the scan concurrency, so
		// the discriminating assertion is the log shape: the per-file message
		// (isolated) vs the whole-scan `pre-scan failed:` abort (fail-fast).
		const logs: CapturedLogs = { warnings: [], errors: [] };
		const { errors } = logs;
		const server = await createServer({
			root: fixture_root,
			configFile: false,
			customLogger: create_capturing_logger(logs),
			server: { middlewareMode: true, ws: false },
			optimizeDeps: { noDiscovery: true },
			plugins: [
				vite_plugin_fuz_css({
					filter_file: filter_fixture_file,
					cache_dir,
					deps: {
						...default_cache_deps,
						read_text: async (options) => {
							if (options.path.endsWith('island.html')) {
								throw new Error('synthetic read failure');
							}
							return default_cache_deps.read_text(options);
						}
					}
				})
			]
		});
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(result.code.includes('.p_md'), 'other files still extract');
			assert(!result.code.includes('.gap_lg'), 'the throwing file is skipped');
			assert(
				errors.some((m) => m.includes('pre-scan failed to extract')),
				'the failure is logged per file'
			);
			assert(!errors.some((m) => m.includes('pre-scan failed:')), 'the scan itself does not abort');
		} finally {
			await server.close();
		}
	});
});

describe('vite_plugin_fuz_css dev watcher', () => {
	test('the cache directory is not watched', async () => {
		await with_temp_root(
			{ 'src/page.html': '<div class="p_md"></div>', [`${cache_dir}/stale.json`]: '{}' },
			async (server, root) => {
				// the cache holds a file from the start, so a watched cache would show by the time
				// the watcher has reached the source next to it
				const watched = await wait_for(() => {
					const w = server.watcher.getWatched();
					return w[join(root, 'src')]?.includes('page.html') ? w : undefined;
				});
				const cache_path = join(root, cache_dir);
				const watched_cache_dirs = Object.keys(watched).filter(
					(dir) => dir === cache_path || dir.startsWith(cache_path + '/')
				);
				assert.deepEqual(watched_cache_dirs, []);
				assert.notInclude(watched[join(root, '.fuz')] ?? [], 'dev_test');
			}
		);
	});
});

describe('vite_plugin_fuz_css pre-scanned files on disk', { timeout: POLLING_TEST_TIMEOUT }, () => {
	// The watcher's events are emitted by hand: what's under test is the
	// plugin's response to them, not when chokidar delivers one.
	test('an edit to the root index.html is re-extracted', async () => {
		await with_temp_root({ 'index.html': '<body class="pt_xl7"></body>' }, async (server, root) => {
			assert(await serves_class(server, 'pt_xl7'));
			await writeFile(join(root, 'index.html'), '<body class="pb_xl7"></body>');
			server.watcher.emit('change', join(root, 'index.html'));
			await wait_for(() => serves_class(server, 'pb_xl7'));
			assert(!(await serves_class(server, 'pt_xl7')), 'the replaced class is gone');
		});
	});

	test('deleting the root index.html drops its classes', async () => {
		await with_temp_root(
			{ 'index.html': '<body class="pt_xl7"></body>', 'src/page.html': '<div class="p_md"></div>' },
			async (server, root) => {
				assert(await serves_class(server, 'pt_xl7'));
				await rm(join(root, 'index.html'));
				server.watcher.emit('unlink', join(root, 'index.html'));
				await wait_for(async () => !(await serves_class(server, 'pt_xl7')));
				assert(await serves_class(server, 'p_md'), 'other files keep their classes');
			}
		);
	});

	test('a root index.html created after startup is extracted', async () => {
		await with_temp_root({ 'src/page.html': '<div class="p_md"></div>' }, async (server, root) => {
			assert(!(await serves_class(server, 'pt_xl7')));
			await writeFile(join(root, 'index.html'), '<body class="pt_xl7"></body>');
			server.watcher.emit('add', join(root, 'index.html'));
			await wait_for(() => serves_class(server, 'pt_xl7'));
		});
	});

	test('an edit to a scanned file no module imports is re-extracted', async () => {
		await with_temp_root(
			{ 'src/app.html': '<body class="pt_xl7"></body>' },
			async (server, root) => {
				assert(await serves_class(server, 'pt_xl7'));
				await writeFile(join(root, 'src/app.html'), '<body class="pb_xl7"></body>');
				server.watcher.emit('change', join(root, 'src/app.html'));
				await wait_for(() => serves_class(server, 'pb_xl7'));
			}
		);
	});

	test('an edit undone while its own ingest is in flight leaves the undone content', async () => {
		await with_temp_root(
			{ 'src/page.html': '<div class="pt_xl7"></div>' },
			async (server, root) => {
				assert(await serves_class(server, 'pt_xl7'));
				const plugin = server.config.plugins.find((p) => p.name === 'vite-plugin-fuz-css');
				const transform = plugin?.transform as
					((code: string, id: string) => Promise<unknown>) | undefined;
				assert(transform);
				const id = join(root, 'src/page.html');
				// the edit's ingest awaits its cache read; the undo, back to the
				// content already recorded, arrives before it resolves
				const edit = transform('<div class="pb_xl7"></div>', id);
				await transform('<div class="pt_xl7"></div>', id);
				await edit;
				// past the update debounce, so a stale ingest would have landed
				await new Promise((r) => setTimeout(r, 100));
				assert(await serves_class(server, 'pt_xl7'));
				assert(!(await serves_class(server, 'pb_xl7')), 'the superseded edit is dropped');
			}
		);
	});

	test('an edit that fails the render under on_error: throw reaches the next request', async () => {
		// the debounced update can't throw from its timer, so it drops the
		// served modules instead - the next request re-renders in load() and
		// throws where Vite owns the error, rather than serving the last good CSS
		await with_temp_root(
			{ 'src/page.html': '<div class="p_md"></div>', 'src/hint.ts': 'export const a = 1;\n' },
			async (server, root) => {
				assert(await serves_class(server, 'p_md'));
				await writeFile(join(root, 'src/hint.ts'), '// @fuz-classes not_a_real_fuz_class\n');
				server.watcher.emit('change', join(root, 'src/hint.ts'));
				const rejection = await wait_for(() =>
					server.transformRequest('/__fuz.css').then(
						() => false,
						(error: unknown) => error
					)
				);
				// the rejection names the hint, not the render's absence
				assert(rejection instanceof Error, `rejects with an error: ${String(rejection)}`);
				assert.include(rejection.message, 'not_a_real_fuz_class');
			},
			{
				on_error: 'throw',
				filter_file: (path) => path.endsWith('.html') || path.endsWith('.ts')
			}
		);
	});

	test('a file outside the pre-scanned set is left to transform', async () => {
		await with_temp_root(
			{ 'src/page.html': '<div class="p_md"></div>', 'extra/widgets.html': '<div></div>' },
			async (server, root) => {
				assert(await serves_class(server, 'p_md'));
				// a nested index.html is not the root's
				for (const path of ['extra/widgets.html', 'extra/index.html']) {
					await writeFile(join(root, path), '<div class="mt_lg"></div>');
					server.watcher.emit('change', join(root, path));
				}
				// a scanned file's edit lands after the ignored ones were handled
				await writeFile(join(root, 'src/page.html'), '<div class="pb_xl7"></div>');
				server.watcher.emit('change', join(root, 'src/page.html'));
				await wait_for(() => serves_class(server, 'pb_xl7'));
				assert(!(await serves_class(server, 'mt_lg')));
			}
		);
	});
});

describe('vite_plugin_fuz_css dev ids', { timeout: POLLING_TEST_TIMEOUT }, () => {
	test('a `?v=` request is extracted under the plain id', async () => {
		const server = await create_dev_server({
			filter_file: filter_fixture_file_and_late_module,
			prescan: false
		});
		try {
			// the shape of a dev client's request for a node_modules dependency
			await server.transformRequest('/extra/late_module.ts?v=1d2e7c62');
			// the same file by its plain id, as SSR or the pre-scan ingests it
			await server.transformRequest('/extra/late_module.ts');
			// deleting the file removes the one entry both ingests share; an
			// entry keyed by the `?v=` id would outlive it
			server.watcher.emit('unlink', join(fixture_root, 'extra/late_module.ts'));
			assert(!(await serves_class(server, 'mb_xl3')), 'no entry outlives the file');

			// ingested by the `?v=` request alone, the class is served
			await server.transformRequest('/extra/late_module.ts?v=2e7c621d');
			await wait_for(() => serves_class(server, 'mb_xl3'));
		} finally {
			await server.close();
		}
	});
});

describe('vite_plugin_fuz_css pre-bundled dependencies', { timeout: POLLING_TEST_TIMEOUT }, () => {
	// A chunk in the layout Vite's dependency optimizer writes, under the
	// default `cacheDir` of a project with a package.json: the bundle has lost
	// the source's comment hint and names a class of its own, so each test can
	// tell which got extracted.
	const chunk_path = 'node_modules/.vite/deps/fake_lib.js';
	const files = {
		'package.json': '{}',
		'node_modules/fake_lib/index.js': '// @fuz-classes pt_xl7\nexport const a = 1;\n',
		'node_modules/fake_lib/Widget.svelte': '<div class="pb_xl7"></div>\n',
		'node_modules/fake_lib/excluded.js': '// @fuz-classes mt_lg\nexport const b = 2;\n',
		[chunk_path]: "var a = 1;\nvar widget_classes = 'mb_xl3';\nexport { a, widget_classes };\n"
	};
	// every source the filter passes is on disk; the two it rejects - one by
	// name, one a pre-bundler placeholder that is no file - don't count
	const sources = [
		'../../fake_lib/index.js',
		'../../fake_lib/Widget.svelte',
		'../../fake_lib/excluded.js',
		'browser-external:fs'
	];
	const to_sourcemap = (sources: Array<string>): string =>
		JSON.stringify({ version: 3, sources, mappings: '' });
	const options: VitePluginFuzCssOptions = {
		filter_file: (path) => /\.(?:html|js|svelte)$/.test(path) && !path.endsWith('/excluded.js'),
		prescan: false
	};

	test('a chunk is extracted through the sources its sourcemap lists', async () => {
		await with_temp_root(
			{ ...files, [chunk_path + '.map']: to_sourcemap(sources) },
			async (server) => {
				await server.transformRequest(`/${chunk_path}?v=1d2e7c62`);
				assert(await serves_class(server, 'pt_xl7'), 'the comment hint in the JS source');
				assert(await serves_class(server, 'pb_xl7'), 'the class attribute in the Svelte source');
				assert(!(await serves_class(server, 'mb_xl3')), 'the bundle itself is not a source');
				assert(!(await serves_class(server, 'mt_lg')), 'filter_file applies to the sources');
			},
			options
		);
	});

	test('a chunk whose sourcemap names a file not on disk is extracted too', async () => {
		// the shape of a package that ships compiled files with sourcemaps of
		// its own, pointing at sources it didn't publish
		await with_temp_root(
			{ ...files, [chunk_path + '.map']: to_sourcemap([...sources, '../../fake_lib/src/a.js']) },
			async (server) => {
				await server.transformRequest(`/${chunk_path}?v=1d2e7c62`);
				assert(await serves_class(server, 'mb_xl3'), 'the bundle stands in for the missing source');
				assert(await serves_class(server, 'pt_xl7'), 'the sources on disk are still extracted');
				assert(await serves_class(server, 'pb_xl7'));
				assert(!(await serves_class(server, 'mt_lg')), 'filter_file applies to the sources');
			},
			options
		);
	});

	test('a chunk with no sourcemap is extracted as its bundled code', async () => {
		await with_temp_root(
			files,
			async (server) => {
				await server.transformRequest(`/${chunk_path}?v=1d2e7c62`);
				assert(await serves_class(server, 'mb_xl3'));
				assert(!(await serves_class(server, 'pt_xl7')), 'the sources are unknown');
			},
			options
		);
	});

	test('a chunk with an unreadable sourcemap is extracted as its bundled code', async () => {
		await with_temp_root(
			{ ...files, [chunk_path + '.map']: 'not a sourcemap' },
			async (server) => {
				await server.transformRequest(`/${chunk_path}?v=1d2e7c62`);
				assert(await serves_class(server, 'mb_xl3'));
			},
			options
		);
	});
});

describe('vite_plugin_fuz_css served variants', { timeout: POLLING_TEST_TIMEOUT }, () => {
	test("a variant's first load ahead of the debounced update still updates the others", async () => {
		const server = await create_dev_server({ filter_file: filter_fixture_file_and_late_module });
		try {
			assert(!(await serves_class(server, 'mb_xl3')), 'the client module is served and cached');
			await server.transformRequest('/extra/late_module.ts');
			// the SSR-inlined variant loads for the first time inside the debounce
			// window, rendering the new class before the update announces it
			const inlined = await server.ssrLoadModule('/__fuz.css?inline');
			assert(inlined.default.includes('.mb_xl3'));
			await wait_for(() => serves_class(server, 'mb_xl3'));
		} finally {
			await server.close();
		}
	});
});

describe('vite_plugin_fuz_css serve plugins', () => {
	test('only the serve plugin objects are applied', async () => {
		const server = await create_dev_server();
		try {
			const names = server.config.plugins.map((p) => p.name).filter((n) => n.includes('fuz-css'));
			assert.deepEqual(names, ['vite-plugin-fuz-css', 'vite-plugin-fuz-css:serve']);
		} finally {
			await server.close();
		}
	});
});

describe('vite_plugin_fuz_css theme option', () => {
	test('bakes a theme into the served CSS, auto-resolving its stance', async () => {
		const server = await create_dev_server({
			additional_variables: ['shade_lightness_00'],
			// hand-rolled stanced theme: no `resolve_theme_stance` call - the
			// build seam resolves the mirror itself
			theme: {
				name: 'test dark',
				scheme: 'dark',
				variables: [{ name: 'space_md', light: '99px' }]
			}
		});
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(result.code.includes('--space_md: 99px'), 'the authored theme value bakes in');
			const adaptive = scheme_adaptive_variables.find((v) => v.name === 'shade_lightness_00')!;
			assert(
				result.code.includes(`--shade_lightness_00: ${adaptive.dark}`),
				'the stance mirror re-slots the untouched scheme-adaptive default'
			);
			assert(
				!result.code.includes(`--shade_lightness_00: ${adaptive.light}`),
				'the light appearance never renders under the dark stance'
			);
		} finally {
			await server.close();
		}
	});
});
