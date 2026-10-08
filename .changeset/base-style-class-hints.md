---
'@fuzdev/fuz_css': patch
---

fix: a `@fuz-classes` hint or `additional_classes` entry naming a class only base styles define (like `selected`, `palette_a`, or a class in a custom `base_css`) no longer errors when base styles are bundled, since the hint ships the rules that target it
