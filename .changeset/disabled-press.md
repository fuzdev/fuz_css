---
'@fuzdev/fuz_css': patch
---

fix: give a pressed disabled control no feedback

Pressing a disabled `button`, `input`, `textarea`, `select`, or `label.disabled` flashed its text and border in the negative color (and a selected button's fill, and a range's thumb). A disabled control now shows no change when pressed, as an `aria-disabled` one already did. The press states of a disabled `.selectable`, `.menuitem`, and `.clickable`, and the active outline of an `aria-disabled` form control or settled `.selected` button, are skipped too.
