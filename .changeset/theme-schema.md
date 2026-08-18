---
'@fuzdev/fuz_css': minor
---

feat: `Theme` is a zod schema, beside `StyleVariable` in `variable.ts`

`Theme` and `ThemeScheme` move out of `theme.ts` into `variable.ts`, where
they join `StyleVariable` as zod schemas with their types inferred:

```ts
import type {Theme} from '@fuzdev/fuz_css/variable.ts'; // was theme.ts
```

`theme.ts` imports the types type-only, so the renderer stays zod-free and
mounting a theme still costs ~1.3KB minified.

Being a schema means a theme validates at runtime: `Theme.safeParse(value)`
when the failure detail matters, and the new `parse_theme(value)` for a
theme-or-`null` at a boundary like restoring one from storage.
`validate_theme` in `theme_check.ts` runs the schema in place of its
hand-rolled shape checks, so it reports the whole theme's shape at once and
returns those errors on their own - the advisory knob-tier warnings run only
over a theme that parsed.

`Theme` is strict: an unknown property is an error rather than quietly
ignored.
