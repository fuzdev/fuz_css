---
'@fuzdev/fuz_css': minor
---

**breaking** feat: rename `outline_color_NN` to `outline_shade_NN`

The suffix names the variable family it reads (`--shade_NN`), beside the letterless `border_color_NN` alpha ramp.

Breaking:

- `outline_color_00` through `outline_color_100` are renamed `outline_shade_00` through `outline_shade_100`
