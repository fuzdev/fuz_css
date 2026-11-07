---
'@fuzdev/fuz_css': minor
---

**breaking** feat: give every diagnostic a code

Each diagnostic carries a `code` from the closed `DiagnosticCode` union, naming what went wrong (`class_unresolved`, `class_property_unknown`, `element_unknown`, `variable_misspelled`, `theme_gate_failed`, ...), and a generation diagnostic's `identifier` is always its subject. Formatted diagnostics read `[code] subject: message`.

Breaking:

- `code` is required on `ExtractionDiagnostic`, `GenerationDiagnostic`, and `InterpreterDiagnostic` - a custom interpreter pushing a diagnostic sets one, `class_interpreter` when no other code fits
- the codes that rode `identifier` move to `code`, and `identifier` names the subject instead: the variable for `variable_value_uncontained` and `variable_cycle`, the theme's name for `theme_discarded`, `theme_lint`, `theme_gate_failed`, and `theme_gate_unchecked`, the at-rule (`@layer mine`, `@import "x.css"`) for `base_css_layer` and `base_css_unsupported_at_rule`, and `base_css` for `base_css_variables_undefined` - match on `code` instead
- three of those codes are renamed to lead with their subject's family: `undefined_theme_variables` is `base_css_variables_undefined`, `uncontained_theme_value` is `variable_value_uncontained`, and `variable_resolution` is `variable_cycle`
- the `variable_misspelled` warning's `identifier` is the bare variable name (`color_primry`), not `var(--color_primry)`
- `format_diagnostic` output, and so the logged lines and `CssGenerationError` message, include the code
- `ResolveVariablesResult.warnings` is replaced by `cycles`, the names of the variables found on a dependency cycle
