---
'@fuzdev/fuz_css': patch
---

fix: the Vite plugin doesn't write the extraction cache in Vite's `test` mode

The plugin trusts a cache entry whose content hash matches without re-checking its payload, so the cache is build input. In Vite's `test` mode (Vitest's default) the plugin still reads `cache_dir` but never writes an entry or deletes one, so a sandbox that denies the test runner the directory's writes costs a test run nothing. Not writing doesn't keep test code out of the cache - only such a denial does. Vitest run in another mode (`--mode`, or a project's `mode` or `test.mode`) writes the cache as before.
