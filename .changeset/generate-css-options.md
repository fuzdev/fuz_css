---
'@fuzdev/fuz_css': minor
---

**breaking** refactor: take the class include and exclude options in `GenerateCssOptions`

`generate_css` applies all six include and exclude options itself - `additional_classes` and `exclude_classes` beside the element and variable pairs - so an integration over the pipeline passes them in one place. The generated CSS and diagnostics are unchanged. These modules are internal, so this touches only code that drives the pipeline directly.

Breaking:

- `GenerateCssOptions` takes `additional_classes` and `exclude_classes`
- `CssClasses` takes no constructor arguments, and its `get_all()` returns the extracted classes unfiltered, without `additional_classes` and with every location an array
