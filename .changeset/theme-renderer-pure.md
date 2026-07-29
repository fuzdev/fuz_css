---
'@fuzdev/fuz_css': minor
---

`theme.ts` is now a pure renderer with no dependency on `variables.ts`, so
mounting a theme no longer pulls the full derived variable set into the
bundle. Bundled minified, `theme.ts` drops from ~38KB to ~1.3KB (~9KB to
~0.7KB gzipped) — the variable data was previously paid by every consumer on
the theme path, including apps on the default theme that never call
`render_theme_style` at all.

Two breaking changes carry the split:

- `RenderThemeStyleOptions.empty_default_theme` is removed. It existed to let
  an empty theme render the full defaults, which meant the renderer had to
  hold them. Pass them instead:
  `render_theme_style({name: 'base', variables: default_variables})`.
- `render_theme_style` no longer computes the scheme-stance mirror, and
  `scheme_stance_variables` moves from `theme.ts` to the new
  `theme_stance.ts`. A single-scheme theme is resolved before rendering with
  `resolve_theme_stance`, which stores the mirror on the theme's new
  `scheme_mirror` field. The renderer still pins `color-scheme` on its own.

The shipped stanced exemplars (`themes/necromancer.ts`,
`themes/terminalien.ts`) resolve themselves at module scope, so consumers
importing them get a ready-to-render theme and the mirror data lands in that
theme's chunk. Only hand-rolled stanced themes need the new call.

`default_variables` is unchanged, so the class-extraction pipeline and
`theme.css` output are unaffected.
