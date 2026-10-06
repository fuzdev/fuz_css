---
'@fuzdev/fuz_css': minor
---

feat: dev-server prescan, content-hashed build CSS, and a stated `base_css` contract

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
- Custom `base_css` is any CSS the parser accepts, placed in `fuz.base`,
  what a callback appends included. Top-level style rules and top-level
  `@media`, `@supports`, and `@container` rules are tree-shaken by the
  elements and classes they target, nested groups counted, and every other
  at-rule ships as written: `@keyframes`, `@property`, `@scope`, `@page`,
  and the rest were dropped, as was a group nested in another.
- Base rules that detection can't match always ship. Bundled output
  dropped a rule naming no element or class (`::selection`, `[hidden]`) and
  a conditional group of such rules, including a `:root` block in any media
  query but `prefers-reduced-motion`. A rule also always ships when one
  selector in its list is unmatchable (`button, [role='button']`) or has an
  escaped or non-ASCII name (`.md\:flex`).
- Every `var()` in base CSS that ships pulls in its theme variable at any
  nesting depth, not only one level into a conditional group.
- An `@layer` rule in `base_css` is the error `base_css_layer`, and
  `@import` and `@namespace` are the error `base_css_unsupported_at_rule`.
  The error names the rule and its line and removes nothing: a layer ships
  as written, as a sublayer of `fuz.base` (layer blocks were tree-shaken,
  layer statements dropped), and the other two ship where they were dropped
  silently. Top-level `@layer fuz.base` and `@layer fuz.preferences` blocks
  are unwrapped as `style.css` uses them.
- A `base_css` the parser rejects, or a callback that doesn't return a
  string, fails with an error naming `base_css` (was the CSS parser's bare
  error).
- New error `undefined_theme_variables`: emitted base styles reference,
  with no fallback, a variable the defaults define that nothing defines,
  which left the `var()` undefined with no diagnostic. It covers
  `variables: null`, `[]`, and a set missing some, and names the variables.
  It skips a variable-free base, your own property names, a name the base
  declares in the same rule or in a top-level `:root`, `:host`, `html`,
  `body`, or `*` rule, and names in `exclude_variables`. Define the variables,
  set `base_css: null` too for utility-only mode, or pair bundled base styles
  with a separately imported theme stylesheet through
  `exclude_variables: default_variables.map((v) => v.name)`.
- `style_rule_parser.ts`: `resolve_base_css_option` is removed;
  `parse_style_css(css)` drops its `content_hash` parameter and
  `StyleRuleIndex` trades `content_hash` for `diagnostics`;
  `generate_base_css` → `generate_base_css_by_layer`, returning one string
  per `RuleLayer`; `StyleRuleBase` gains the required `layer`,
  `variables_required`, and `variables_defined`; `CoreReason` loses
  `media_query` and `font_face` and gains `conditional_core`, `at_rule`,
  and `untargetable`.
- `css_variable_utils.ts` gains `extract_required_css_variables`,
  `extract_declared_css_variables`, and `strip_css_comments`.
