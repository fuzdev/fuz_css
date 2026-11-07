---
'@fuzdev/fuz_css': minor
---

feat: complete the token families

- `gap_0`, `column_gap_0`, and `row_gap_0` join `p_0` and `m_0`
- `border_radius_0` and the corner twins (`border_top_left_radius_0`, ...) set a radius of `0`
- the intents take the palette letters' border, outline, and shadow families: `border_{intent}_NN` and `outline_{intent}_NN` set the color and its contextual variable, and `shadow_{intent}_NN` sets `--shadow_color` (`border_positive_50`, `outline_accent_60`, `shadow_negative_40`)
- `icon_size_*` also sets `--icon_size`, so what reads it, like a menu item's icon column, follows the class
