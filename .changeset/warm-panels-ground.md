---
'@fuzdev/fuz_css': minor
---

feat: the ground tint (`--shade_chroma_00`) fades over the near-ground shade stops instead of stopping at `shade_00`, so raised surfaces keep a tinted page's cast; themes that set it (parchment, marquee, custom) carry more of the ground's tint across `shade_05`–`shade_40`

feat: add `--panel_fill`, the `.panel` fill (`--ink_10` by default)
