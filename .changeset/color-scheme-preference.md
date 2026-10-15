---
'@fuzdev/fuz_css': minor
---

feat: follow the OS color scheme without JS

The dark scheme's variables render under `:root.dark` and again under `@media (prefers-color-scheme: dark)` for a root that has neither `.dark` nor `.light`, so a page using the stylesheets without fuz_ui's theme script follows the OS preference. A page that never names a scheme now renders dark on a dark OS - add `class="light"` to its root to keep it light - and its own unlayered `:root` variable overrides, which outrank both schemes, now apply over the dark one too. An explicit `.light` or `.dark` class still wins - so a page that toggles only `.dark` for its own scheme switch must also set `.light` for an explicit light choice on a dark OS (fuz_ui's theme state always sets one or the other). The same applies to `render_theme_style`, the bundled theme, the `prefers-contrast: more` dark mapping, and the `dark:`/`light:` modifier classes, which also no longer add specificity (`:where(:root.dark)`), so a `hover:` class wins while hovering in dark mode. A theme scoped with `render_theme_style`'s `id` option now renders light when its scope element has `.light`, even under `:root.dark`. The modifiers no longer emit nested CSS, dropping the Safari 16.5 requirement. `render_color_scheme_rules` in `theme.ts`, with the `COLOR_SCHEME_ROOTS` selectors, renders a scheme's rules both ways.
