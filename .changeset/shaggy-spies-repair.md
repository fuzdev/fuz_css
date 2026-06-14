---
'@fuzdev/fuz_css': patch
---

fix: invalidate dev SSR-inlined CSS variants on HMR

The Vite plugin only invalidated the bare `virtual:fuz.css` module on HMR, but
SvelteKit's dev FOUC-inlining reads the `?inline` variant — a separately cached
module. Once cached, it was never refreshed, so SSR reloads kept serving stale
inlined `<head>` CSS (e.g. a theme `var()` used in a single route staying
undefined). HMR now invalidates every served virtual-module variant.
