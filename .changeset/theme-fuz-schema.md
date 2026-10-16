---
'@fuzdev/fuz_css': minor
---

**breaking** feat: move the theme schemas from zod to fuz_schema

`Theme`, `StyleVariable`, `ThemeScheme`, and `StyleVariableName` in `variable.ts` are now `@fuzdev/fuz_schema` schemas, with the same names, the same verdicts, and types of the same shape:

- `Theme.safeParse(x)` becomes `s.parse(Theme, x)` with `import * as s from '@fuzdev/fuz_schema/schema.ts'`, returning `{ok: true, value}` or `{ok: false, issues}`, and `Theme.parse(x)` becomes `s.parse_or_throw(Theme, x)`. `parse_theme` and `validate_theme` keep their signatures. `Theme` is no longer a zod schema, so it can't be nested in one.
- `zod` is no longer a peer dependency, and `@fuzdev/fuz_schema` `^0.4.0` is a required one. The `Theme` and `StyleVariable` types no longer fall back to `any` where zod isn't installed.
- `parse_theme` and `s.parse(Theme, x)` return a valid input as the same object, where zod returned a copy, so clone it before mutating a theme you don't own.
- The descriptions on `summary` and `scheme` move to fuz_schema's `meta`, read with `get_meta` from `@fuzdev/fuz_schema/meta.ts`.
- An issue on a variable whose `base` and `dark` are equal is at the path `variables.N.dark` as before. The cross-field rules (at least one of `base` or `dark`, the two differing) now run only once a variable's fields and keys are all valid, where zod also ran them past a failed name or slot check or an unknown key.

`validate_theme` keeps fuz_css's own messages. The ones zod used to word read differently:

- an unknown key: `Unrecognized key: "oops"` is now `unknown key "oops"`, one issue per key where zod listed several in one (`invalid variable "x": unknown key "light"` on a variable)
- a wrong or missing value: `Invalid input: expected string, received undefined` is now `expected string, received undefined`, and likewise for `object` and `array`
- a variable with an invalid field or an unknown key no longer also reports `must have at least one of base or dark` or `base and dark must differ when both specified`
