---
'@fuzdev/fuz_css': minor
---

simplify CSS variable detection with regex-based scanning

**Breaking changes:**

- remove `include_all_base_css` option - use `additional_elements: 'all'` instead
- remove `include_all_variables` option - use `additional_variables: 'all'` instead
- remove `@fuz-variables` comment support - variables are now detected automatically via regex

**Improvements:**

- CSS variables are now detected via simple regex scan of `var(--name)` patterns in all source files
- this catches usage in component props like `size="var(--icon_size_xs)"` that AST-based extraction missed
- unknown variables (not in theme) are silently ignored
