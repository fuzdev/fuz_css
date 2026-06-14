---
'@fuzdev/fuz_css': patch
---

fix: dev theme `var()` references left undefined in `virtual:fuz.css`

Two dev-only fixes:

- Variable detection no longer depends on the bundled theme graph being loaded.
  The graph loads lazily on the first `load()`, but SvelteKit resolves (and thus
  transforms) route modules during SSR *before* that first `load()` — so a theme
  `var()` used only in a route (e.g. a `+page.svelte`) was silently dropped, and
  the cached content hash meant it never re-scanned until the file was edited.
  References are now recorded unfiltered and narrowed to theme variables at render
  time, when the graph is always available.
- HMR now invalidates every served virtual-module variant, not just the bare id.
  SvelteKit's dev FOUC-inlining reads the separately-cached `?inline` variant,
  which was never refreshed — so SSR reloads kept serving stale inlined `<head>`
  CSS after a mid-session edit.
