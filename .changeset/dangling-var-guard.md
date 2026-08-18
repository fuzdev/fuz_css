---
'@fuzdev/fuz_css': patch
---

fix: the dangling-`var()` warning for `base_css` with `variables: null`
never fired - it checked the variable graph that same option had emptied;
it now checks the default variable names
