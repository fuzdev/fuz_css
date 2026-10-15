---
'@fuzdev/fuz_css': patch
---

fix: install the generator's parser stack as dependencies so the Vite plugin loads on a fresh install

`svelte`, `acorn`, `@sveltejs/acorn-typescript`, `zimmerframe`, and `@webref/css` move from optional peers (`acorn` was undeclared) to `dependencies`; `vite` is declared as an optional peer (`>=6`). The plugin hashes with `node:crypto` instead of `@fuzdev/blake3-wasm`, which is no longer a peer. `acorn-jsx` is no longer a peer either - JSX projects still install it themselves and pass it through `acorn_plugins`.
