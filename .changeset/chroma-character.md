---
'@fuzdev/fuz_css': minor
---

feat: add per-slot chroma multipliers and mute the brown slot

Every palette letter and intent gains a chroma-character knob:
`--palette_a_chroma_scale` … `--palette_j_chroma_scale` and the intent twins
`--accent_chroma_scale` (same for positive/negative/caution/info), default
`1`. Each multiplies its slot's chroma under the global `--chroma_scale`, so
the slot's character holds at any global setting - grayscale stays grayscale
and vivid scales proportionally. Values at or below 1 stay inside the sRGB
gamut caps by construction; above 1 knowingly clips, like the global knob.
The neutral is unchanged - its character remains `--neutral_chroma`.

`--palette_f_chroma_scale` ships at `0.55`: brown is low-chroma dark orange,
so no hue angle alone can render it - under uniform chroma the brown slot
read as a second orange beside `--hue_h`.

An intent hue bound to a palette letter (`--hue_accent: var(--hue_f)`)
shares only the angle. `validate_theme` now warns when the bound letter's
multiplier differs from the intent's `*_chroma_scale` twin, so a slot's
chroma character isn't silently dropped across a binding. `check_theme` runs
its gamut and contrast gates through the multipliers, and an intent folds
into a letter's report entries only when hue and multiplier both match. All
15 knobs are registered variables in the catalog (`knobs.ts`), editable in
the themes docs page's inline editor.
