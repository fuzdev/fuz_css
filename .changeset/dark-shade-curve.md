---
'@fuzdev/fuz_css': patch
---

fix: soften the dark shade ramp curve from 0.92 to 1.05 so the near-dark surface stops (`shade_05`, `shade_10`, `shade_20`) sit darker, closer to the pre-oklch look; the ramp endpoints are unchanged
