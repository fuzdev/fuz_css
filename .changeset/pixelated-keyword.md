---
'@fuzdev/fuz_css': minor
---

feat: make `pixelated` a keyword class

`pixelated` now sets `image-rendering: pixelated` alone and orders by its property like the other keyword classes, instead of as a composite. It drops the vendor values and the trailing `crisp-edges` declaration, which a browser supporting `crisp-edges` applied in place of `pixelated` - and `crisp-edges` needn't scale nearest-neighbor, so pixel art may render differently than before.
