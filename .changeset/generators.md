---
'@fuzdev/fuz_css': minor
---

feat: dev-server prescan, and `base_css` without `variables` is an error

- The Vite plugin pre-scans sources at dev-server startup so the first page
  load has complete utility CSS. New `prescan` option: `true` (default,
  `src` under the Vite root), `false`, or an array of directories.
- `base_css` enabled with `variables: null` is now the error diagnostic
  `theme_variables_disabled`. Set `base_css: null` too for utility-only
  mode, or keep `variables` and set `additional_variables: 'all'` to bundle
  the full theme.
- `CssResolutionResult` loses `referenced_variables`.
