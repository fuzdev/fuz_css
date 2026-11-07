---
'@fuzdev/fuz_css': minor
---

**breaking** feat: `ColorScheme` is the rendered scheme, `ColorSchemePreference` the setting

`ColorScheme` names the two schemes a page renders in - what a stance, the gates, the mirror, and the `dark:`/`light:` modifiers deal in - and `ColorSchemePreference` the three-valued setting a picker offers, which can follow the OS.

Breaking:

- `ColorScheme` is `'light' | 'dark'` and lives in `variable_data.ts` - import it from `@fuzdev/fuz_css/variable_data.ts`; the old three-valued type is `ColorSchemePreference` in `theme.ts`
- `color_schemes` is `Array<ColorSchemePreference>`
- `ColorSchemeVariant` is removed - use `ColorScheme`
