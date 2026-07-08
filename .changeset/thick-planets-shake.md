---
'@fuzdev/fuz_css': minor
---

feat: add theme scale knobs, the knob catalog, and the inline theme editor

New high-leverage theme knobs, each derived into existing token defaults so
one knob move reshapes a whole family while individual tokens stay pinnable:

- `--shadow_alpha_scale` — multiplies the `shadow_alpha_*` ramp (0 flattens
  all shadows including button shadows, which reference the ramp)
- `--radius_scale` — multiplies the `border_radius_*` tiers (0 is sharp,
  above 1 is rounder; per-element tiers survive)
- `--scale_factor` — multiplies the `space_*` scale (tight ↔ spacious)
- `--font_weight` — base body font weight (applied on `body`)
- `--heading_font_weight` — a hook with per-tier fallbacks (h1 300 … h5 900);
  setting it flattens the heading weight ladder deliberately
- `--heading_font_family` — headings' font family (defaults to
  `var(--font_family_serif)`)
- `--background_image` — decoration hook on `:root` for gradient skies,
  vignettes, and textures (defaults to `none`)

The exemplar themes exercise them: brutalish (renamed from brutalist, now
concrete ground with saturated accents) and terminal collapse ~20 variables
each into the scale knobs (brutalish also gains its heavy display type),
sunset ember gains a gradient sky, and necromancer and terminal amber get
modestly denser via `scale_factor`.

New `knobs.ts` module: `theme_knobs`, a typed catalog of the theme-facing
knobs (`kind`, `axis`, `leverage`, `tier`, ranges) that powers the new inline
theme editor on the themes docs page — live global retheming, leverage-sized
controls, flatten-on-load "based on" composition, per-knob reset, and
copyable `Theme`/CSS output.

Retune ("honest chroma"): `--palette_chroma_min/_max/_curve` defaults re-fit
to hug the per-stop gamut cap envelope, so turning them down now responds
immediately instead of being dead until the request drops below the caps.
Default palette chroma shifts slightly (mean ΔEOK ≈ 0.005 light / 0.003
dark, max 0.028 at light stop 30).
