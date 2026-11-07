---
'@fuzdev/fuz_css': minor
---

**breaking** feat: narrow the `theme` option to `Theme`

The bake derives a theme's mirror and caps from the configured variables itself, so the option takes the authored theme alone.

Breaking:

- the `theme` option of `vite_plugin_fuz_css` (and `GenerateCssOptions`, `CreateBundledResourcesOptions`, `build_variable_graph_from_options`, and `bake_theme`) no longer accepts a `ResolvedTheme` - pass `resolved.theme`
