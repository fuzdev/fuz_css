---
'@fuzdev/fuz_css': minor
---

**breaking** feat: make `pixelated` a keyword class

`pixelated` moves into the keyword classes and sets one declaration, `image-rendering: pixelated`. It already ordered with the token classes, so its ordering is unchanged.

Breaking:

- `pixelated` drops the vendor values and the trailing `image-rendering: crisp-edges`, which a browser supporting `crisp-edges` applied in place of `pixelated` - `crisp-edges` needn't scale nearest-neighbor, so pixel art may render differently than before
