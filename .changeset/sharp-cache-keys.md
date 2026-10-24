---
'@fuzdev/fuz_css': patch
---

fix: key the extraction cache's configuration fingerprint and external-file names with a 64-bit SHA-256 prefix instead of a 32-bit hash, so distinct plugin configs or files outside the root don't collide; existing keyed and `_external/` entries miss once and are rewritten
