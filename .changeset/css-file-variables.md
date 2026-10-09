---
'@fuzdev/fuz_css': patch
---

fix: bundled mode includes theme variables referenced by imported CSS files, including dependencies' - `filter_file_default` accepts `.css` files, scanned for `var()` references only
