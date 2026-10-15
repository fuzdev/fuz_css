---
'@fuzdev/fuz_css': minor
---

**breaking** feat: rename the adaptive alpha overlays `--fg_NN`/`--bg_NN` to `--ink_NN`/`--paper_NN`

The color-scheme-adaptive alpha overlays are now named for what they wash toward: `--ink_NN` toward the text color (darkening in light mode, lightening in dark mode), and `--paper_NN` toward the ground (the reverse). The opaque `bg_*` background classes (`bg_a_50`, `bg_positive_50`) no longer share a prefix with them and are unchanged, as are `--darken_NN`/`--lighten_NN`. Values are unchanged, and the `input_fill` default now reads `var(--paper_80)`.

Breaking: rename every reference - `var()` reads in CSS and markup, `@fuz-variables` hints, and theme variables that set an overlay by name:

- `--fg_NN` → `--ink_NN`
- `--bg_NN` → `--paper_NN`

As a GNU sed over your sources (it relies on `\b`; `NN` is a numeric stop, `00` through `100`, so `--bg_color`, `bg_a_50`, and other names are left alone):

```sh
sed -i -E 's/\bfg_([0-9]{2,3})\b/ink_\1/g; s/\bbg_([0-9]{2,3})\b/paper_\1/g' FILES
```

It doesn't catch names built at runtime (`'fg_' + n`, `` `bg_${n}` ``), so grep for `fg_`/`bg_` string fragments too.
