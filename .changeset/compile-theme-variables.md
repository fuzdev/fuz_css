---
'@fuzdev/fuz_css': minor
---

feat: compile a theme over a configured variable set with `compile_theme(theme, {variables})`

Given `variables`, `compile_theme` measures the theme as a build that configures them renders it: the stance mirror re-slots the given set, and each knob-tier value it changes from the default folds in beneath the theme's own for the caps and the gates. The build-time bake now compiles this way, so `compile_theme(theme, {variables})` reports what a build with those `variables` bakes - before, `compile_theme` always measured against the defaults. Without `variables` it compiles as before, and the bake's output and diagnostics are unchanged.

- `CompileThemeOptions` is new
- `contain_variable` is exported from `css_containment.ts`
