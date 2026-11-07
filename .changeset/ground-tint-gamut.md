---
'@fuzdev/fuz_css': patch
---

fix: hold the ground tint to sRGB at the ground's lightness

`--shade_chroma_00` is now the tint requested: the ground and the near-ground shade stops render it through a private `--_shade_ground_chroma`, clamped to what the ground's lightness can carry at every hue, at both the light and dark ends. A tint past that no longer clips - a light ground near white holds little, so at the default light ground the knob does nothing past about 0.014. `check_theme`'s gamut gate measures the clamped tint, and the theme resolver reports it as `_shade_ground_chroma`.

Parchment composed with high contrast, or under the OS high-contrast preference, now renders a white light ground, untinted rather than a tint the browser clipped, and its near-ground surfaces drop the ground's tint while keeping the neutral cast. Marquee's ground tint moves imperceptibly.
