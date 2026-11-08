---
'@fuzdev/fuz_css': minor
---

feat: give the default control border its weight back at no contrast

The default `--border_color` now mixes `shade_30` a quarter of the way toward `shade_50` at no contrast (`BORDER_CONTRAST_REST_SHARE`), about 2:1 against the ground in both schemes - where control borders sat before the steeper shade curve pulled `shade_30` toward the page - and still reaches `shade_50` exactly at `HIGH_CONTRAST`. Surfaces, text, and the gate thresholds are unchanged; a theme that authors `border_color` keeps its own color.

Breaking:

- `border_contrast_share(0)` returns `BORDER_CONTRAST_REST_SHARE` (0.25), not 0.
- `BORDER_CONTRAST_GAIN` is derived from the rest share and `HIGH_CONTRAST` (1.5) rather than set by hand.
