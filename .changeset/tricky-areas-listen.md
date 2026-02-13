---
'@fuzdev/fuz_css': minor
---

refactor extraction pipeline APIs and diagnostics

- replace positional parameters with `ExtractionData` object in `CssClasses.add()` and `save_cached_extraction()`
- rename `GenerationDiagnostic.class_name` and `InterpreterDiagnostic.class_name` to `identifier`
- deduplicate three identical `parse_fuz_*_comment` functions into `create_fuz_comment_parser` factory
- vite plugin warning/error logs now use `format_diagnostic()` with location info and suggestions
