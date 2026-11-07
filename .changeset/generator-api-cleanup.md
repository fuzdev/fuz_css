---
'@fuzdev/fuz_css': minor
---

**breaking** chore: trim the generator API

Breaking:

- class definitions and interpreters no longer take `comment`, and generated CSS no longer carries the composites' doc comments
- the unused `log` option is removed from `GenerateCssOptions`, `GenerateClassesCssOptions`, `CssRenderInput`, and `CssClassInterpreterContext`
- `CssClasses.get()` and `get_with_locations()` are removed - use `get_all()`
- `parse_ci_value` and `is_ci` moved from `css_cache.ts` to `ci.ts`
- `deps.ts` no longer re-exports `FsError` - import it from `@fuzdev/fuz_util/fs.ts`
- `format_spacing_value` handles `0`, `auto`, and the space variants only - `100` and `px` values are no longer special-cased
- `ClassTemplateFn` is a single three-parameter function type instead of a union of one-, two-, and three-parameter functions
