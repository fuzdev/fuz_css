import { describe, test, assert } from 'vitest';

import { CssExtractionState } from '#lib/css_extraction_state.ts';
import { CssClasses } from '#lib/css_classes.ts';
import { create_mock_fs_state, create_mock_fs_deps } from './fixtures/mock_deps.ts';

const FILE_ID = '/project/src/A.svelte';
const CACHE_PATH = '/project/.fuz/cache/css/src/A.svelte.json';

const create_state = (cache_writes: boolean) => {
	const fs_state = create_mock_fs_state();
	const extraction = new CssExtractionState({
		css_classes: new CssClasses(),
		get_cache_path: (id) => (id === FILE_ID ? CACHE_PATH : null),
		cache_writes: () => cache_writes,
		deps: create_mock_fs_deps(fs_state)
	});
	return { fs_state, extraction };
};

describe('CssExtractionState cache writes', () => {
	test('writes a miss and deletes a removed file entry', async () => {
		const { fs_state, extraction } = create_state(true);
		assert.isTrue(
			await extraction.ingest(FILE_ID, '<div class="p_md"></div>', { await_cache_write: true })
		);
		assert.isTrue(fs_state.files.has(CACHE_PATH), 'the miss is written');
		assert.isTrue(extraction.remove(FILE_ID));
		await Promise.resolve();
		assert.isFalse(fs_state.files.has(CACHE_PATH), 'the entry is deleted');
	});

	test('with writes off, reads the cache but neither writes nor deletes it', async () => {
		const writer = create_state(true);
		await writer.extraction.ingest(FILE_ID, '<div class="p_md"></div>', {
			await_cache_write: true
		});
		const written = writer.fs_state.files.get(CACHE_PATH);
		assert.isDefined(written);
		// a class the content doesn't hold, so only a cache hit records it
		const entry = written.replaceAll('p_md', 'p_xl');

		const { fs_state, extraction } = create_state(false);
		// a miss for other content, then a hit for the cached content
		await extraction.ingest(FILE_ID, '<div class="p_lg"></div>', { await_cache_write: true });
		assert.isFalse(fs_state.files.has(CACHE_PATH), 'the miss is not written');

		fs_state.files.set(CACHE_PATH, entry);
		await extraction.ingest(FILE_ID, '<div class="p_md"></div>', { await_cache_write: true });
		assert.strictEqual(fs_state.files.get(CACHE_PATH), entry, 'the hit leaves the entry as is');
		assert.isTrue(extraction.css_classes.get_all().all_classes.has('p_xl'), 'the hit is read');

		assert.isTrue(extraction.remove(FILE_ID));
		await Promise.resolve();
		assert.strictEqual(fs_state.files.get(CACHE_PATH), entry, 'the entry is not deleted');
	});
});
