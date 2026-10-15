---
'@fuzdev/fuz_css': minor
---

feat: label `.palette_X` buttons at stop 70 so they hold AA in every state

A `.palette_X` button's label moves from `--palette_X_60` to `--palette_X_70` at rest, hovered, and pressed, so it holds AA contrast on its own tinted fill as the tint deepens; at stop 60 a keyboard press (no hover) dropped it as low as 3.3:1 on light grounds. The label darkens in light schemes and lightens in dark ones (about 0.09 and 0.07 in OKLCH lightness); the border, focus ring, fill tint, and selected fill stay at stop 60, as do links, colored text, and chip labels. The `low contrast` modifier and the `guestbook` theme now clear every contrast gate.

`check_theme` gates the label on each of the button's fills: rest (8%), hover (16%, with the hovered label's 10% mix toward `shade_max`), and pressed (24%), for a mouse press (hovered label) and a keyboard press (plain label). The rest entry is now `palette_X_70 on palette_X button fill`, joined by `palette_X_70 on palette_X active fill`, `palette_X_70 hovered on palette_X hover fill`, and `palette_X_70 hovered on palette_X active fill`, and `shade_max` is now a gate input, so a theme that pins it in a form the gates don't read reports it as `unchecked`.
