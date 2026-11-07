---
'@fuzdev/fuz_css': minor
---

break: hold raised surfaces near the ground and strengthen control borders under contrast

The shade lightness curve is steeper (`SHADE_LIGHTNESS_KNOBS` curve 1.09 → 1.25 in light, 1.05 → 1.2 in dark), so the near-ground stops like `shade_10` sit closer to the page in both schemes. `shade_30` moves toward the ground with them, so default borders are slightly softer at no contrast while staying above the border gate's floor. The neutral `.selected` button fill moves from `shade_60` to `shade_70`, a step heavier in both schemes, so its inverse `text_00` label still holds AA.

Contrast now bends the shade curve less than the text curve (0.33 vs 0.66), so raised surfaces mostly stay put under contrast and body text on them gains contrast with the text curve, except where a ground is already at its contrast end (zine's white light ground), where the surface still bends slightly toward the text.

The default `--border_color` is now `shade_30` mixed in oklab toward `shade_50` as the effective contrast rises (`BORDER_CONTRAST_STOPS`, `BORDER_CONTRAST_GAIN`, `border_contrast_share`, `render_border_color_css`). It is exactly `shade_30` at no contrast, and control borders clear 3:1 against the ground under the high contrast modifier and `prefers-contrast: more`. A theme that authors `border_color` keeps its own color, which doesn't follow `--contrast`.

Breaking:

- `CONTRAST_CURVE_BEND` is a per-ramp record, `{shade: 0.33, text: 0.66}`, instead of one number for both ramps.
- `contrast_lightness_curve` takes the ramp family first: `contrast_lightness_curve(family, curve, contrast)`.
- `check_theme` entry subjects are renamed: `shade_30 vs shade_00` → `border_color vs shade_00` (the default border is derived, so its entry names the role), and `text_00 on shade_60` → `text_00 on shade_70`.
- `check_theme` raises the control-border floor from 1.5 to 3:1 (`GATE_BORDER_HIGH_CONTRAST`) at an effective contrast of `HIGH_CONTRAST` (0.5) and above, so a theme authoring `contrast` at 0.5 or more, or composed with the high contrast modifier, must keep its border, authored or default, at 3:1 against the ground.
