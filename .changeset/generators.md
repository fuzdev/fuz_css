---
'@fuzdev/fuz_css': minor
---

feat: dev-server prescan, content-hashed build CSS, and a stated `base_css` contract

Breaking:

- `vite_plugin_fuz_css()` returns an array of plugin objects instead of
  one. Passing it to `plugins` works as before; list it after any plugin
  that rewrites CSS in its `transform` hook. The Vite plugin requires Vite
  6 or later.
- New errors, which fail a CI build (where `on_error` defaults to
  `'throw'`):
  - `undefined_theme_variables`: emitted base styles reference, with no
    fallback, a default variable that `variables` (`null`, `[]`, or a
    partial set) leaves undefined. Names declared in the same rule or a
    top-level `:root`/`:host`/`html`/`body`/`*` rule, and names in
    `exclude_variables`, are skipped. Define them, set `base_css: null` for
    utility-only mode, or pair with a separately imported `theme.css`
    through `exclude_variables: default_variables.map((v) => v.name)`.
    It replaces the `theme_variables_disabled` warning, which covered only
    `variables: null`.
  - `uncontained_theme_value`: a `variables` or `theme` value that could
    escape its declaration, or is blank, is left out (a theme's keeps the
    value beneath it), as is a variable whose name isn't a plain
    identifier. `variables` values were written into the stylesheet as is.
  - `base_css_layer` for an `@layer` rule in `base_css`, and
    `base_css_unsupported_at_rule` for `@import` and `@namespace`. Each
    names the rule and its line, and the CSS ships as written (a layer as
    a sublayer of `fuz.base`). Top-level `@layer fuz.base` and
    `@layer fuz.preferences` blocks are unwrapped as `style.css` uses them.
- A `base_css` the parser rejects, or a callback that doesn't return a
  string, fails with an error naming `base_css` (was the CSS parser's bare
  error).
- `style_rule_parser.ts`: `resolve_base_css_option` is removed;
  `parse_style_css(css)` drops its `content_hash` parameter and
  `StyleRuleIndex` trades `content_hash` for `diagnostics`;
  `generate_base_css` → `generate_base_css_by_layer`, returning one string
  per `RuleLayer`; `StyleRuleBase` gains the required `layer`,
  `variables_required`, and `variables_defined`; `CoreReason` loses
  `media_query` and `font_face` and gains `conditional_core`, `at_rule`,
  and `untargetable`. `load_style_rule_index` and `load_default_style_css`
  drop the `style_css_path` parameter.
- `variable_graph.ts`: `build_variable_graph(variables)` drops its
  `content_hash` parameter and `VariableDependencyGraph` trades its
  `content_hash` field for `diagnostics`; `resolve_variables_transitive`
  takes the excluded names and reports the ones it reached in
  `ResolveVariablesResult.excluded`; `build_variable_graph_from_options`
  takes a theme, applied by the new `apply_theme_variables`.
- The `theme_specificity` option is removed, along with the specificity
  parameter of `generate_css`, `resolve_css`, and `generate_theme_css` -
  layer order does that job. `CssResolutionResult` gains
  `preferences_css`, `generate_bundled_css` takes `theme_overlay_css`, and
  `generate_css` takes `theme` and filters `detected_css_variables` itself
  (pass the source's `var()` names unfiltered).
- `class_variable_index.ts` is removed: the variables generated classes
  reference come from the CSS they generate, which covers composite and
  literal classes too. `BundledCssResources` and `resolve_css`'s options
  lose `class_variable_index`, and `create_bundled_resources` trades
  `class_definitions` for `theme`.
- `splice_css_at_placeholder` moves from `vite_plugin_fuz_css.ts` to
  `css_placeholder_splice.ts`.
- `css_variable_utils.ts` gains `extract_required_css_variables`,
  `extract_declared_css_variables`, and `strip_css_comments`, and loses
  `has_css_variables`.
- Removed as unused: `extract_css_comment` (`css_ruleset_parser.ts`),
  `format_dimension_value`, `CSS_DIRECTIONS`, and `CssDirection`
  (`css_class_generators.ts`), and `has_variable` (`variable_graph.ts`);
  `resolve_variables_option` is no longer exported.
- `FileFilter` takes the project root as a second argument
  (`(path, root) => boolean`); a one-argument filter still works.

New:

- The Vite plugin pre-scans sources at dev-server startup so the first
  page load has complete utility CSS. New `prescan` option: `true`
  (default, `src` under the Vite root), `false`, or an array of
  directories. The Vite root's `index.html` is scanned too, so its classes
  are styled in dev as they are in build, and edits to pre-scanned files
  are picked up whether or not a module imports them.
- The built stylesheet's filename hash covers the generated CSS, so a
  change in the classes, elements, or variables used renames it (and the
  chunks that load it) instead of shipping different CSS under a cached
  filename.
- `build.cssCodeSplit: false` and `build.lib` builds that import
  `virtual:fuz.css` are supported; they failed with "no CSS asset exists".
- Custom `base_css` is any CSS the parser accepts, placed in `fuz.base`,
  callback additions included. Top-level style rules and `@media`,
  `@supports`, and `@container` groups, nested groups included, are
  tree-shaken by the elements and classes they target; every other at-rule
  ships as written except a top-level `@charset`. `@keyframes`,
  `@property`, `@scope`, `@page`, and `@layer` statements were dropped, and
  so was a group holding only a nested group.
- `cache_salt` option, folded into the extraction cache key - change it
  when only an acorn plugin's options change.

Fixes:

- In dev, node_modules dependencies are extracted on the client path, not
  only when SSR transforms them: a dependency served as its own files, and
  a pre-bundled one through the sources its sourcemap lists, so classes
  used only by a dependency are styled in a client-rendered app.
- In dev, CSS that changes while a page is still loading (a dependency or
  a file outside the pre-scan extracted for the first time) reaches that
  page without a reload.
- In dev, an edit that fails the render under `on_error: 'throw'` surfaces
  on the next request as Vite's error, instead of the last good CSS being
  served as if nothing changed.
- Each build environment's CSS comes from the modules in its own graph: a
  client build no longer carries the classes of SSR-only modules (or the
  reverse), and a watch rebuild drops the classes of a file that was
  deleted or is no longer imported.
- A diagnostic is logged once while it persists, not on every re-render.
- Base rules that detection can't match always ship. Bundled output
  dropped a rule naming no element or class (`::selection`, `[hidden]`)
  and a conditional group of such rules, including a `:root` block in any
  media query but `prefers-reduced-motion`. A rule also always ships when
  one selector in its list is unmatchable (`button, [role='button']`), can
  match through a branch naming nothing (`:is(input, [contenteditable])`),
  or has an escaped or non-ASCII name (`.md\:flex`). The `::placeholder`
  and `::file-selector-button` styles ship with `input`/`textarea`.
- Names inside `:not()` no longer decide whether a base rule ships (using
  `.unstyled` anywhere shipped every `:not(.unstyled)` rule).
- Base selectors are read from the parsed selector tree, so a name inside
  an attribute selector no longer counts as an element or class
  (`[aria-label="Close dialog"]` shipped only with `<dialog>`,
  `a[href$=".pdf"]` only with a `.pdf` class), and `[href*="x"]` is no
  longer taken for the universal selector.
- Every `var()` in base CSS that ships pulls in its theme variable at any
  nesting depth, not only one level into a conditional group.
- `exclude_variables` holds against dependencies: an excluded variable that
  a shipped variable depends on stays out, with a warning, along with the
  variables only it needs.
- A brace or semicolon inside a comment, string, or `url()` ahead of
  `virtual:fuz.css`'s position in an unminified build no longer swallows
  the generated CSS.
- The default `style.css` loads from a package path holding a space or a
  Windows drive (the URL's encoded path was read as a file path).
- The default file filter judges test directories inside the project or
  the dependency's package, so a project checked out under a `test/`
  directory no longer has every file filtered out.
- The extraction cache key covers `acorn_plugins`, so adding or removing
  one (`acorn-jsx`) re-extracts files cached without it; the cache version
  bumps, so every file re-extracts once.
