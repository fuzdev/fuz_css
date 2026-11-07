---
'@fuzdev/fuz_css': minor
---

**breaking** feat: split the theme check report into `passed` and `complete`

A theme can pass every gate the checker could read and still leave inputs unread, so `ThemeCheckReport` answers the two apart: `passed` is true when every evaluated entry passes, `complete` when nothing is unchecked.

Breaking:

- `ThemeCheckReport.ok` is removed - `ok` was `passed && complete`
