/**
 * The Vite plugin's extraction cache across modes: a build reads and writes
 * it, and in Vite's `test` mode (Vitest's default) the plugin does neither.
 *
 * Each case plants an entry for the build fixture's `variant.ts` whose
 * content hash matches the file and whose payload names a class the file
 * doesn't use - the class reaches the CSS only when the entry is read.
 *
 * @module
 */

import { describe, test, assert, beforeEach } from 'vitest';
import { build, type Rollup } from 'vite';
import { hash as crypto_hash } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { vite_plugin_fuz_css } from '#lib/vite_plugin_fuz_css.ts';
import { to_cache_version, type CachedExtraction } from '#lib/css_cache.ts';
import { default_fs_deps, default_fs_search_deps } from '#lib/deps_defaults.ts';
import type { FsDeps, FsSearchDeps } from '#lib/deps.ts';
import { is_ci } from '#lib/ci.ts';
import {
	vite_build_fixture_root as fixture_root,
	filter_build_fixture_module as filter_fixture_file,
	use_suite_cache_dir,
	create_capturing_logger
} from './vite_plugin_test_helpers.ts';

const entry_path = join(fixture_root, 'src/main.ts');
const variant_path = join(fixture_root, 'src/variant.ts');

const cache_dir = use_suite_cache_dir(fixture_root, '.fuz/cache_test');
const cache_root = join(fixture_root, cache_dir);
const planted_path = join(cache_root, 'src/variant.ts.json');

/** A literal class `variant.ts` doesn't use, so only the planted entry can add it. */
const PLANTED_CLASS = 'color:#a1b2c3';

/** Writes an entry for `variant.ts` that matches its content and adds `PLANTED_CLASS`. */
const plant_entry = async (): Promise<string> => {
	const code = await readFile(variant_path, 'utf8');
	const entry: CachedExtraction = {
		v: to_cache_version(),
		content_hash: crypto_hash('sha256', code),
		extraction_key: null,
		classes: [[PLANTED_CLASS, [{ file: variant_path, line: 1, column: 1 }]]],
		explicit_classes: null,
		diagnostics: null,
		elements: null,
		explicit_elements: null,
		explicit_variables: null
	};
	const content = JSON.stringify(entry);
	await mkdir(join(cache_root, 'src'), { recursive: true });
	await writeFile(planted_path, content);
	return content;
};

/** The default deps, recording every path under the cache directory they touch. */
const create_recording_deps = (touched: Array<string>): FsDeps & FsSearchDeps => {
	const record = (path: string): void => {
		if (path.startsWith(cache_root + '/')) touched.push(path);
	};
	return {
		...default_fs_deps,
		...default_fs_search_deps,
		read_text: (options) => {
			record(options.path);
			return default_fs_deps.read_text(options);
		},
		write_text_atomic: (options) => {
			record(options.path);
			return default_fs_deps.write_text_atomic(options);
		},
		unlink: (options) => {
			record(options.path);
			return default_fs_deps.unlink(options);
		}
	};
};

/** Builds the fixture in memory in `mode` and returns its one stylesheet. */
const build_css = async (mode: string, deps: FsDeps & FsSearchDeps): Promise<string> => {
	const outputs = await build({
		root: fixture_root,
		configFile: false,
		publicDir: false,
		mode,
		customLogger: create_capturing_logger({ warnings: [], errors: [] }),
		plugins: [vite_plugin_fuz_css({ filter_file: filter_fixture_file, cache_dir, deps })],
		build: { write: false, rollupOptions: { input: entry_path } }
	});
	assert(!('close' in outputs), 'a one-shot build, not a watcher');
	const css = [outputs]
		.flat()
		.flatMap((o) => o.output)
		.filter(
			(f): f is Rollup.OutputAsset & { source: string } =>
				f.type === 'asset' && f.fileName.endsWith('.css') && typeof f.source === 'string'
		);
	assert.strictEqual(css.length, 1, 'exactly one CSS asset');
	return css[0]!.source;
};

describe('extraction cache by mode', () => {
	let planted: string;
	beforeEach(async () => {
		planted = await plant_entry();
	});

	test('test mode neither reads nor writes the cache', async () => {
		const touched: Array<string> = [];
		const css = await build_css('test', create_recording_deps(touched));
		assert.deepEqual(touched, []);
		assert.notInclude(css, '#a1b2c3', 'the planted entry is not used');
		assert.strictEqual(await readFile(planted_path, 'utf8'), planted, 'the entry is untouched');
	});

	// CI skips the cache in every mode
	test.skipIf(is_ci)('another mode reads the cache', async () => {
		const touched: Array<string> = [];
		const css = await build_css('production', create_recording_deps(touched));
		assert.include(touched, planted_path);
		assert.include(css, '#a1b2c3', 'the planted entry is used');
	});
});
