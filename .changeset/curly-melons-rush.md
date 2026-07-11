---
'@fuzdev/fuz_css': minor
---

fix: key `render_theme_style`'s default-theme special case on empty variables, not the name

The empty-theme special case now triggers on `theme.variables.length === 0`
rather than the theme being named `'base'`. A theme that carries variables
always renders them regardless of its name — so a theme merely named `'base'`
in the docs theme editor no longer silently renders empty CSS. An empty theme
still renders nothing by default and the full `default_variables` set under
`empty_default_theme: false` (unchanged for `theme.gen.css.ts`).
`render_theme_style` no longer depends on the `themes.ts` registry.
