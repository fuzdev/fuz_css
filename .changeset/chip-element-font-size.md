---
'@fuzdev/fuz_css': patch
---

fix: a `chip` keeps its element's own font size (`small`, `sub`, `sup`, `legend`) when no size composite, `font_size_*` class, or heading sets a size context, instead of inheriting its parent's
