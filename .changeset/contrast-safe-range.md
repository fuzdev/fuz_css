---
'@fuzdev/fuz_css': patch
---

fix: cap the `contrast` knob's safe range at 0.75

The knob's domain stays 0 to 1, but past 0.75 `text_80` on `shade_10` fails on shipped themes, and 1 is a white or near-black ground. `validate_theme` now warns on a `contrast` above 0.75 (a warning, knowingly exceedable, like every knob's range), and the theme editor's slider stops there. A test holds every base theme's gates at the range top.
