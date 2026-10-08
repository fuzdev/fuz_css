import { test, assert, describe } from 'vitest';
import { resolve } from 'node:path';
import type { GenConfig, GenContext, GenDependenciesResolver } from '@fuzdev/gro/gen.ts';

import { gen_fuz_css } from '$lib/gen_fuz_css.ts';
import type { FileFilter } from '$lib/file_filter.ts';

// the dependency resolver of a generator, which judges a changed file through the filter
const resolve_dependencies = (filter_file: FileFilter, project_root?: string) => {
	const gen = gen_fuz_css({ filter_file, project_root }) as GenConfig;
	const dependencies = gen.dependencies as GenDependenciesResolver;
	return (changed_file_id: string) => dependencies({ changed_file_id } as unknown as GenContext);
};

describe('gen_fuz_css', () => {
	test('the filter receives the project root, resolved to an absolute path', async () => {
		const calls: Array<[string, string]> = [];
		const spy: FileFilter = (path, root) => {
			calls.push([path, root]);
			return true;
		};
		await resolve_dependencies(spy, 'some/app')('/abs/some/app/src/a.ts');
		assert.deepEqual(calls, [['/abs/some/app/src/a.ts', resolve('some/app')]]);
	});

	test('the default filter judges a project under a test directory by its own paths', async () => {
		const root = '/srv/test/app';
		const gen = gen_fuz_css({ project_root: root }) as GenConfig;
		const dependencies = gen.dependencies as GenDependenciesResolver;
		const changed = (id: string) => dependencies({ changed_file_id: id } as unknown as GenContext);
		assert.strictEqual(await changed(`${root}/src/App.svelte`), 'all');
		assert.isNull(await changed(`${root}/src/test/App.svelte`));
		assert.isNull(await changed(`${root}/notes.md`));
	});
});
