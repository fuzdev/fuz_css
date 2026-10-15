---
'@fuzdev/fuz_css': patch
---

fix: label selected `.menuitem` and `.selectable` buttons in the text color

A selected button labels in the inverse text color for its solid fill, but `.menuitem.selected` and `.selectable.selected` paint a light tint instead, so their button labels were nearly invisible (about 1.1:1 to 1.4:1). `button.menuitem.selected`, `button.selectable.selected`, and `button.selectable[aria-pressed='true']` now label in `--text_color` (the palette color with `.palette_X`), hovered, pressed, and focused alike. Other elements with these classes, which never took the inverse, are unchanged.
