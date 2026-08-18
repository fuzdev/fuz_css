---
'@fuzdev/fuz_css': minor
---

feat: `--font_family` names the body font, and buttons get their own border style

Two knobs that were previously one thing doing two jobs.

**`--font_family`** is the body font, defaulting to `var(--font_family_sans)`.
`body` reads it instead of `--font_family_sans` directly, so the three stacks
(`--font_family_sans`/`_serif`/`_mono`) keep meaning what they say - a theme
that wants serif body text sets `--font_family`, rather than declaring that
the sans stack is Georgia. Headings still take `--heading_font_family`
(default `var(--font_family_serif)`), so "one family everywhere" stays two
knobs, deliberately - the serif-headings-over-sans-body default is the design.

**`--button_border_style`** (default `var(--border_style)`) and
**`--button_border_style_active`** (default `var(--button_border_style)`) give
buttons the raised/pressed pair that `border-style: outset`/`inset` expresses
and that no single global knob could:

```ts
{name: 'border_style', light: 'inset'}, // sunken fields
{name: 'button_border_style', light: 'outset'}, // raised buttons
{name: 'button_border_style_active', light: 'inset'} // that press in
```

Buttons are the only element with a pressed appearance, which is why the
split lands here rather than as a general `--border_style_active`. The knob
catalog's border-style values gain `inset` and `outset`.

Breaking, narrowly: buttons now read `--button_border_style`, whose derived
default resolves at `:root`, so a *contextual* `--border_style` override
(set on an ancestor rather than in a theme) no longer reaches the buttons
inside it. Set `--button_border_style` there too.
