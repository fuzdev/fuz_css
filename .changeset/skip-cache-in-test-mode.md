---
'@fuzdev/fuz_css': patch
---

fix: the Vite plugin skips the extraction cache in Vite's `test` mode

The plugin trusts a cache entry whose content hash matches without re-checking its payload, so the cache is build input. In Vite's `test` mode (Vitest's default) the plugin now neither reads nor writes `cache_dir`: a test run doesn't depend on what the cache holds, and a sandbox can deny the test runner the directory at no cost. Test runs re-extract every file they load. Vitest run in another mode (`--mode`, or a project's `mode` or `test.mode`) still uses the cache.
