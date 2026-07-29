---
'@fuzdev/fuz_css': minor
---

Add a `theme` option to the Vite plugin and Gro generator for picking a theme
at build time:

```ts
import {necromancer_theme} from '@fuzdev/fuz_css/themes/necromancer.ts';

vite_plugin_fuz_css({theme: necromancer_theme});
```

The theme overlays the resolved `variables` last-wins by name, so its values
flow through the dependency graph like any other - the variables a theme
references are pulled in transitively and the output stays tree-shaken. A
single-scheme theme's `scheme_mirror` applies first, matching the renderer's
order.

This is the static counterpart to fuz_ui's `ThemeRoot`: no theme rendering at
runtime and no JavaScript to ship. The two compose, with a runtime theme
overriding the build-time one by cascade layer. Pinning `color-scheme` stays
separate - the `dark`/`light` class on the root element drives it.

Also exposes `apply_theme_variables` from `variable_graph.ts`, and
`build_variable_graph_from_options` takes an optional theme.
