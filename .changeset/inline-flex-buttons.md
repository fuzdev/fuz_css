---
'@fuzdev/fuz_css': minor
---

**breaking** fix: display buttons `inline-flex` so siblings sit side by side

A styled `button` was `display: flex`, so each one took its own line in a block. It's now `inline-flex`, like the native inline button: sibling buttons in a block sit on one line with a space between them and wrap like text, and a lone button follows its parent's `text-align` and sits on the text baseline. Inside a flex or grid parent (`.row`, `.row_wrap`, `.column`, `.box`, a `display:flex` toolbar) a button is blockified as before, so nothing there changes, and `.menuitem` sets its own `display: flex`.

Breaking:

- a styled `button` in a block no longer takes its own line - wrap buttons that should stack in a `.column`
