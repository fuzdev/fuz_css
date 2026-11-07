---
'@fuzdev/fuz_css': patch
---

refactor: mark the generator pipeline modules `@internal`

The modules beneath the Vite plugin - extraction, class resolution and generation, the bundled-CSS pipeline, the cache, and the filesystem deps - carry a module-level `@internal`, so the API docs label them unstable. They stay importable and documented; the public surface is the Vite plugin and its options, the theme system, the variables, the diagnostics and file filter, and the modifiers. `css_extraction_state.ts` and `vite_plugin_fuz_css_build.ts`, previously hidden from the docs, are now listed as internal.
