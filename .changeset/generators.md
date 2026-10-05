---
'@fuzdev/fuz_css': minor
---

feat: dev-server prescan, content-hashed build CSS, and `base_css` without `variables` is an error

- The Vite plugin pre-scans sources at dev-server startup so the first page
  load has complete utility CSS. New `prescan` option: `true` (default,
  `src` under the Vite root), `false`, or an array of directories. The Vite
  root's `index.html` is scanned too, so its classes are styled in dev as
  they are in build, and edits to pre-scanned files are picked up whether
  or not a module imports them.
- In dev, node_modules dependencies are extracted on the client path, not
  only when SSR transforms them: a dependency served as its own files, and
  a pre-bundled one through the sources its sourcemap lists. Classes used
  only by a dependency no longer go unstyled in a client-rendered app.
- In dev, CSS that changes while a page is still loading (a dependency or a
  file outside the pre-scan extracted for the first time) reaches that page
  without a reload. Each client reports when it has evaluated
  `virtual:fuz.css`, and the server sends the update it couldn't take
  earlier.
- The built stylesheet's filename hash covers the generated CSS, so a
  change in the classes, elements, or variables used renames it (and the
  chunks that load it) instead of shipping different CSS under a cached
  filename.
- `build.cssCodeSplit: false` and `build.lib` builds that import
  `virtual:fuz.css` are supported; they failed with "no CSS asset exists".
- `vite_plugin_fuz_css()` returns an array of plugin objects instead of
  one. Passing it to `plugins` works as before; list it after any plugin
  that rewrites CSS in its `transform` hook.
- The Vite plugin requires Vite 6 or later.
- `base_css` enabled with `variables: null` is now the error diagnostic
  `theme_variables_disabled`. Set `base_css: null` too for utility-only
  mode, or keep `variables` and set `additional_variables: 'all'` to bundle
  the full theme.
- `CssResolutionResult` loses `referenced_variables`.
