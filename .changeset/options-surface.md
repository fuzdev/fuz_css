---
'@fuzdev/fuz_css': minor
---

**breaking** feat: take a callback over the defaults for class definitions and interpreters

`class_definitions` and `class_interpreters` take a callback over the built-in defaults, as `base_css` and `variables` already do. The callback receives a copy of the defaults and returns the set to use, and one that returns the wrong shape fails generator creation. The plain forms are unchanged: a `class_definitions` record merges over the defaults, and a `class_interpreters` array replaces them.

```ts
vite_plugin_fuz_css({
	class_interpreters: (defaults) => [grid_cols_interpreter, ...defaults],
});
```

Breaking:

- `include_default_classes` is removed. Replace `include_default_classes: false, class_definitions: mine` with `class_definitions: () => mine`.
- `merge_class_definitions` is replaced by `resolve_class_definitions(option)`, which takes the `class_definitions` option in any form; `resolve_class_interpreters(option)` is its interpreter twin.
- `generate_bundled_css` no longer takes `include_utilities` - pass an empty `utility_css` to leave the utility classes out.
- The `deps` option is marked `@internal`: it is a test seam for the extraction cache's filesystem access, not stable API.
