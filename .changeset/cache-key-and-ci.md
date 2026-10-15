---
'@fuzdev/fuz_css': minor
---

**breaking** fix: invalidate the extraction cache on upgrade, and read `CI=false` as not CI

The extraction cache now keys its entries by the installed versions of fuz_css, `svelte`, `acorn`, and `@sveltejs/acorn-typescript`, so upgrading any of them re-extracts every file instead of possibly serving extractions from the previous version. `CSS_CACHE_VERSION` is removed, since nothing needs to bump it.

Breaking: `CSS_CACHE_VERSION` is removed, and `CachedExtraction.v` is now the `to_cache_version` string rather than a number.

`CI` set to `false` or `0` (in any case), or empty, no longer counts as CI, so it keeps the extraction cache and the `on_error: 'log'` default instead of skipping the cache and throwing on errors. Any other value still counts.
