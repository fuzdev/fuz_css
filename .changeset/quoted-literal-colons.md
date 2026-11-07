---
'@fuzdev/fuz_css': patch
---

fix: keep a colon inside a quoted literal value, so `content:"a:b"`, `content:'a:b'`, and `before:content:"a:b"` generate CSS instead of failing as an unknown modifier
