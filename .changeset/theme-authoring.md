---
'@fuzdev/fuz_css': minor
---

feat: rework themes as knob-sets - registry and contrast modifiers, scheme stance, knob catalog, checks, pure renderer, build-time `theme` option

Themes are now knob-first: a theme moves the derived color system's curve
and scale knobs, composes with modifiers, validates and gates like the
shipped defaults, and applies at runtime or build time.

**Registry and modifiers.** `themes.ts` exports the curated
`default_themes` registry (just base) and `contrast_modifiers`: low/high
contrast are curve-knob fragments composed over any theme with the new
`compose_themes(base, ...overlays)` (flatten + last-wins; a single-scheme
base re-slots dual-slot overlay variables to its stance), not themes in the
list. Themes live one module per theme under `themes/`, with unregistered
exemplars: necromancer, sunset ember, brutalish, and terminalien. Low
contrast is tuned to the softest compression that passes every
`check_theme` contrast gate.

**Scheme stance.** `Theme` gains `scheme?: 'dual' | 'light' | 'dark'`
(default `'dual'`). A single-scheme theme renders its one appearance in
both color schemes by mirroring every scheme-adaptive default it doesn't
override and pinning `color-scheme` on the scope so form controls and
native scrollbars agree. Author a stanced theme's own variables single-slot
in the light/base position and resolve it with `resolve_theme_stance` (new
`theme_stance.ts`), which computes the mirror onto the theme's
`scheme_mirror` field - kept apart from `variables` so the authored knobs
stay distinguishable from the derived ones. `validate_theme` warns on a
missing mirror and on dark slots a stance makes meaningless;
`check_theme`/`compile_theme` resolve through the same mirror so the gates
evaluate the stanced reality in both schemes. The necromancer and
terminalien exemplars are dark-only via the stance, resolved at module
scope.

**Pure renderer.** `theme.ts` no longer depends on `variables.ts`, so
mounting a theme stops pulling the full derived variable set into the
bundle: minified, `theme.ts` drops from ~38KB to ~1.3KB (~9KB to ~0.7KB
gzipped). Breaking:

- `RenderThemeStyleOptions.empty_default_theme` is removed - to render the
  full defaults, pass them:
  `render_theme_style({name: 'base', variables: default_variables})`. The
  default-theme special case now keys on empty `variables` rather than the
  `'base'` name.
- `render_theme_style` loses `specificity` (the `:root:root` hack) and
  gains `layer?: string | null` (default `'fuz.theme'`);
  `generate_theme_css` loses its specificity parameter; the
  `theme_specificity` generator option is removed.

**Theme knobs and the catalog.** New scale knobs derive into existing token
defaults so one knob move reshapes a whole family while individual tokens
stay pinnable: `--shadow_alpha_scale` (the `shadow_alpha_*` ramp, button
shadows included), `--radius_scale` (the `border_radius_*` tiers),
`--scale_factor` (the `space_*` scale), `--font_weight` (body),
`--heading_font_weight` (a hook with per-tier fallbacks - setting it
flattens the heading ladder), `--heading_font_family`, and the
`--background_image` decoration hook on `:root`. New `knobs.ts` catalogs
the theme-facing knobs with typed metadata (`kind`, `axis`, `leverage`,
`tier`, `bindable`, ranges), powering the inline theme editor on the themes
docs page; `variable_data.ts` gains `palette_glosses`, the letter →
color/default-intent display data.

**Validation, gates, compile.** New `theme_check.ts` resolves a theme's
authored values back to numbers (literals, `var(--hue_x)` binding chains,
compiled-cap overrides):

- `validate_theme` - structural lint: shape and unknown-name errors, plus
  advisory type/range warnings for the knob-tier variables
- `check_theme` - report-only gamut, ramp-monotonicity, and contrast
  gates, with the thresholds exported as the `GATE_*` constants
- `compile_theme` - recomputes per-stop worst-hue chroma caps from a
  theme's own hues and lightness ramp, emits `palette_chroma_NN` overrides
  where the baked caps no longer fit, and re-checks the result

The shipped themes and their contrast-modifier compositions are gated in
CI (one declared marginal exception: sunset ember composed with low
contrast sits just under three light-scheme UI-fill gates), and the docs
page's inline editor runs the same lint and gates live on every edit.

**Build-time `theme` option.** The Vite plugin and Gro generator take a
`theme` baked into the generated CSS:

```ts
import {necromancer_theme} from '@fuzdev/fuz_css/themes/necromancer.ts';

vite_plugin_fuz_css({theme: necromancer_theme});
```

The theme overlays the resolved `variables` last-wins by name, so its
values flow through the dependency graph like any other - the variables a
theme references are pulled in transitively and the output stays
tree-shaken. A single-scheme theme's `scheme_mirror` applies first,
matching the renderer's order, computed automatically if the theme arrives
unresolved. This is the static counterpart to fuz_ui's
`ThemeRoot`: no runtime theme rendering, no JavaScript shipped; the two
compose, the runtime theme winning by cascade layer. Pinning
`color-scheme` stays separate - the `dark`/`light` class on the root
element drives it. Also exposes `apply_theme_variables` from
`variable_graph.ts`; `build_variable_graph_from_options` takes an optional
theme.

Also fixed: the dangling-`var()` warning for `base_css` with
`variables: null` never fired - it checked the variable graph that same
option had emptied; it now checks the default variable names.
