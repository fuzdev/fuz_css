import { describe, test, assert, afterAll } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rm } from 'node:fs/promises';

import { vite_plugin_fuz_css, type VitePluginFuzCssOptions } from '$lib/vite_plugin_fuz_css.ts';

const fixture_root = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/vite_dev');

// The fixture lives under `src/test/`, which the default filter excludes by
// path - scope extraction to the fixture's html files instead.
const filter_fixture_file = (path: string): boolean => path.endsWith('.html');

const create_dev_server = (options?: VitePluginFuzCssOptions): Promise<ViteDevServer> =>
	createServer({
		root: fixture_root,
		configFile: false,
		logLevel: 'silent',
		// middlewareMode avoids binding an http port; `ws: false` avoids the
		// standalone HMR websocket server (the plugin's connection listener
		// registers against Vite's noop ws stub).
		server: { middlewareMode: true, ws: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [vite_plugin_fuz_css({ filter_file: filter_fixture_file, ...options })]
	});

afterAll(async () => {
	// The plugin's extraction cache defaults to `.fuz/cache/css` under the Vite root.
	await rm(join(fixture_root, '.fuz'), { recursive: true, force: true });
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

	test('prescan: false leaves the first serve without utility classes', async () => {
		const server = await create_dev_server({ prescan: false });
		try {
			const result = await server.transformRequest('/__fuz.css');
			assert(result);
			assert(!result.code.includes('.p_md'));
			assert(!result.code.includes('.gap_lg'));
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
});
