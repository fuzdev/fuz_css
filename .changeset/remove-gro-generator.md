---
'@fuzdev/fuz_css': minor
---

**breaking** feat: remove the Gro generator

The Vite plugin is now the one way to generate bundled CSS. `gen_fuz_css.ts` is deleted, with `gen_fuz_css` and `GenFuzCssOptions` and its Gro-only options (`include_stats`, `project_root`, `concurrency`, `cache_io_concurrency`), and `@fuzdev/gro` is no longer an optional peer.

To migrate a `fuz.gen.css.ts`, delete it and its generated `fuz.css`, add `vite_plugin_fuz_css()` to `plugins` in `vite.config.ts` with the same options, and import `virtual:fuz.css` where you imported `./fuz.css`. A SvelteKit app takes the plugin directly, beside `sveltekit()`.

Breaking for code calling the pipeline directly: `resolve_css` and `generate_css` no longer take `include_stats`, and the `resolve_css` result has no `stats`, so `CssResolutionStats` is gone. `included_elements`, `included_rule_indices`, and `resolved_variables` on the result carry the same counts.
