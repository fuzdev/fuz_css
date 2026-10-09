---
'@fuzdev/fuz_css': minor
---

**breaking** refactor: the `oklch.ts` module moves to `@fuzdev/fuz_util/oklch.ts` — import `Oklch`, `RgbUnit`, `oklch_to_srgb`, `oklch_max_srgb_chroma`, and the rest from there; the `@fuzdev/fuz_util` peer dependency is now `>=0.72.0`
