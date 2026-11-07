---
'@fuzdev/fuz_css': minor
---

**breaking** refactor: name the string emitters `render_*` and the mirror `compute_scheme_mirror`

A pure function returning CSS text is a `render_*`, beside `render_theme_style`; `generate_css` and `generate_classes_css` keep the pipeline verb.

Breaking:

- `generate_theme_css` is `render_theme_css`, `generate_base_css_by_layer` is `render_base_css_by_layer`, `generate_bundled_css` is `render_bundled_css`, and `generate_declaration` is `render_declaration`
- `scheme_stance_variables` is `compute_scheme_mirror`
- `check_theme` takes the new `CheckThemeOptions` (`{caps?}`) in place of `ThemeResolverOptions`, which stays the resolver's
- `CacheDeps` is `FsDeps` and `default_cache_deps` is `default_fs_deps` - the deps cover the default `style.css` load as well as the cache
- `format_variable_name` is `to_class_segment`
- `contrast_modifiers` is a `{low, high}` record (the new `ContrastModifiers`) instead of an array - read `contrast_modifiers.low` and `.high`, or `Object.values(contrast_modifiers)` for both
