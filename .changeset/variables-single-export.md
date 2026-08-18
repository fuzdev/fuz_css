---
'@fuzdev/fuz_css': minor
---

refactor: `variables.ts` exports only `default_variables`, with the value tables in `variable_data.ts`

The 558 per-variable exports (`hue_a`, `palette_a_50`, `space_md`, …) are
gone. Every family that follows one template is now built by loop from the
variant lists in `variable_data.ts` and the emitters in `ramps.ts`, then
spread into `default_variables` in place, so the module is a single array
declaration rather than a name-by-name transcript of one.

`variable_data.ts` gains the fitted value tables those ladders step through,
each beside the variant list that names its steps: `FONT_SIZES`,
`SPACE_SIZES`, `BORDER_RADII`, `DISTANCES`, `LINE_HEIGHTS`, `DURATIONS`
(with a new `duration_variants`), `SHADOW_GEOMETRY`, `SHADOW_ALPHAS`, and
`OVERLAY_ALPHAS`. They're keyed by variant and unitless - `variables.ts` adds
the unit and any `calc()` wrapper - so one table serves both the emitted CSS
and anything that wants the numbers.

Breaking: `icon_sizes` is now `ICON_SIZES`, keyed by variant with unitless
numbers, joining the tables above:

```ts
icon_sizes.icon_size_xs; // was '18px'
ICON_SIZES.xs; // now 18
```

The variables themselves are unchanged - same names, same order, same
light/dark slots, same summaries, and `theme.css` renders byte-identical.
Code that imported an individual variable reads it off the array instead:

```ts
import {default_variables} from '@fuzdev/fuz_css/variables.ts';

const space_md = default_variables.find((v) => v.name === 'space_md');
```
