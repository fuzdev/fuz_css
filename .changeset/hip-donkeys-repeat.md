---
'@fuzdev/fuz_css': patch
---

fix: splice the generated CSS at the build-mode placeholder's position instead of appending it, so stylesheets imported after `virtual:fuz.css` cascade over fuz_css in production builds like they do in dev
