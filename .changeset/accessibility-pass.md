---
'@fuzdev/fuz_css': minor
---

feat: focus-visible rings, ARIA state styles, and forced-colors support

Base styles render differently for these:

- **Focus** — links, buttons, form controls, and `.clickable` show focus on `:focus-visible` instead of `:focus`, and a focused button no longer takes the hover fill, border, and shadow - the outline ring is the only focus signal. Keyboard focus and a click into a text field or select look as before; a link, button, or checkbox clicked with the mouse no longer holds the ring or the hover look, and `.clickable` no longer holds its focus scale after a click. A popover trigger that wants a held look while open can style its own `[aria-expanded='true']` state.
- **ARIA states** — `button[aria-pressed='true']` takes the `.selected` fill but stays clickable like `.deselectable`, and `.selectable[aria-pressed='true']` takes the selected fill on any element; `a[aria-current]` (any value but `false`) takes the selected link look; `aria-disabled='true'` on a button, input, textarea, or select takes the disabled look (dashed border, `--disabled_opacity`, default cursor, no hover or active states) but keeps its outline and pointer events, and `:not(:disabled)` hover and checked states, in the base styles and in `.selectable` and `.menuitem`, now skip it too - a form that sets `aria-disabled` while submitting now looks disabled, and `aria-disabled='true'` on a `.deselectable` `.menuitem` or `.selectable` drops its pointer cursor; `aria-invalid='true'` on an input, textarea, or select sets `--border_color` and `--outline_color` to `--negative_50`.
- **Forced colors** (Windows High Contrast) — a checked radio's dot, range thumbs and tracks, selected and pressed buttons, `.menuitem.selected`, `.selectable.selected`, and the edges of `.panel` and `.pane` vanished; they now render in system colors, and selects restore their native arrow. Selection shows as a `Highlight` border with an outline just inside it, which becomes a double `Highlight` ring when focused, while a focus ring alone takes `CanvasText`; the colors stay forced, so labels and colored text keep the system's text color, as do icons drawn in `currentColor`. `aria-disabled` takes `GrayText`, and the radio dot, range, and panel and pane edges `CanvasText`.
- **Select arrow** — single selects draw a chevron in the text color, with right padding for it; `multiple` and list-box selects have none.
- **First heading in a container** — an `h2`-`h6` that is the first child of `.panel`, `.pane`, `aside`, `blockquote`, `fieldset`, `dialog`, `li`, `td`, or `th` drops its top margin, sitting on the container's padding.
- **Text size adjustment** — `text-size-adjust` is `100%` instead of `none`, so mobile browsers still skip automatic text inflation without the setting also reaching the reader's own text scaling.
- **Disabled controls** — disabled checkboxes, radios, and other inputs take the default cursor; a `label` wrapping one still shows the pointer.

The forced-colors rules ship in `fuz.preferences`, one block per element, so bundled output carries each only when its element is used; the composites' rules nest inside their own rules.
