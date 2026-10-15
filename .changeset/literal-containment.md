---
'@fuzdev/fuz_css': patch
---

fix: reject literal classes that could end their declaration or rule

A literal class whose value could end its declaration or rule (an unclosed quote or bracket, a top-level `;`, a brace, comment, or escape outside a string, a `!` other than a trailing `!important`, or an unquoted `url(` holding what needs quotes) no longer generates CSS, nor does one whose custom-property name or modifier argument (`nth-child(...)`, `min-width(...)`) could: a class found in source logs a warning, and a hinted or listed one is an error. Quote such values or set them in a stylesheet.

Modifier arguments must also be valid where they render: `nth-*(...)` takes An+B (`odd`, `2n+1`, `-n+3`), and a breakpoint takes a length or a `calc()`, `clamp()`, `min()`, or `max()` of lengths, so a unitless `min-width(800)`, a percentage, or `env()` no longer generates. `2xl:` classes, and any class name starting with a digit, now apply - their selector was invalid before. A class name containing a space, listed by hand, now renders as one selector.
