/**
 * Shared setup for the Vite plugin suites: the fixture roots and filters,
 * per-suite cache directories, polling, and a logger that captures what the
 * plugin logs.
 *
 * @module
 */

import { afterAll } from 'vitest';
import type { Logger } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { rm } from 'node:fs/promises';

const fixtures_dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/** The dev and ws suites' fixture root. */
export const vite_dev_fixture_root = join(fixtures_dir, 'vite_dev');

/** The build suite's fixture root. */
export const vite_build_fixture_root = join(fixtures_dir, 'vite_build');

// The fixtures live under `src/test/`, which the default filter excludes by
// path - so each suite scopes extraction to its fixture's own files.

/** The dev fixture's html files. */
export const filter_dev_fixture_html = (path: string): boolean => path.endsWith('.html');

/** The dev fixture's html files plus the one module outside the pre-scan roots, which ingests on transform. */
export const filter_dev_fixture_html_and_late_module = (path: string): boolean =>
	path.endsWith('.html') || path.endsWith('late_module.ts');

/** The build fixture's modules. */
export const filter_build_fixture_module = (path: string): boolean =>
	path.startsWith(vite_build_fixture_root) && path.endsWith('.ts');

/**
 * Names a suite's own cache directory under a fixture root and removes it
 * after the suite. Suites sharing a fixture run in parallel, so a shared
 * cache would be deleted mid-run.
 *
 * @param fixture_root - the suite's fixture root
 * @param cache_dir - the cache directory, relative to the fixture root
 * @returns `cache_dir`, for the plugin's options
 */
export const use_suite_cache_dir = (fixture_root: string, cache_dir: string): string => {
	afterAll(async () => {
		await rm(join(fixture_root, cache_dir), { recursive: true, force: true });
	});
	return cache_dir;
};

/**
 * Polls until `predicate` returns something other than `undefined` or
 * `false`, and resolves with it.
 *
 * @throws Error - when `timeout` passes first
 */
export const wait_for = async <T>(
	predicate: () => T | false | undefined | Promise<T | false | undefined>,
	timeout = 3000,
	interval = 25
): Promise<T> => {
	const deadline = Date.now() + timeout;
	for (;;) {
		const result = await predicate();
		if (result !== undefined && result !== false) return result;
		if (Date.now() > deadline) throw new Error('timed out waiting');
		await new Promise((r) => setTimeout(r, interval));
	}
};

/** What a capturing logger collected. */
export interface CapturedLogs {
	warnings: Array<string>;
	errors: Array<string>;
}

/** A Vite logger that records warnings and errors into `logs` and drops the rest. */
export const create_capturing_logger = (logs: CapturedLogs): Logger => {
	const noop = () => {};
	return {
		info: noop,
		warn: (msg) => void logs.warnings.push(msg),
		warnOnce: (msg) => void logs.warnings.push(msg),
		error: (msg) => void logs.errors.push(msg),
		clearScreen: noop,
		hasErrorLogged: () => false,
		hasWarned: false
	};
};
