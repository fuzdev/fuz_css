/**
 * @vitest-environment jsdom
 */
import { describe, test, assert, afterEach } from 'vitest';
import { flushSync } from 'svelte';

import { root_color_scheme } from '#routes/root_color_scheme.svelte.ts';
import { install_match_media } from './component_test_helpers.ts';

const set_os_dark = install_match_media();

afterEach(() => {
	document.documentElement.classList.remove('dark', 'light');
	set_os_dark(false);
});

describe('root_color_scheme', () => {
	test('a root scheme class wins over the OS preference', () => {
		set_os_dark(true);
		document.documentElement.classList.add('light');
		assert.strictEqual(root_color_scheme(), 'light');
		document.documentElement.classList.replace('light', 'dark');
		set_os_dark(false);
		assert.strictEqual(root_color_scheme(), 'dark');
	});

	test('a classless root follows the OS preference', () => {
		assert.strictEqual(root_color_scheme(), 'light');
		set_os_dark(true);
		assert.strictEqual(root_color_scheme(), 'dark');
	});

	test('a reader re-runs when the OS preference changes', () => {
		const seen: Array<string> = [];
		const cleanup = $effect.root(() => {
			$effect(() => {
				seen.push(root_color_scheme());
			});
		});
		try {
			flushSync();
			set_os_dark(true);
			flushSync();
			assert.deepEqual(seen, ['light', 'dark']);
		} finally {
			cleanup();
		}
	});
});
