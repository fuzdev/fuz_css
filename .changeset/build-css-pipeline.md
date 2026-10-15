---
'@fuzdev/fuz_css': minor
---

**breaking** fix: run the Vite plugin's generated build CSS through Vite's CSS pipeline

The generated CSS was spliced into the bundled stylesheet after Vite processed it, so production builds shipped it unminified and untouched by PostCSS or lightningcss. The build now processes it with `preprocessCSS` and hands it to Vite before the stylesheet renders, so it's minified and post-processed like the rest of the stylesheet, in code-split and single-stylesheet builds alike, and an error from the project's own CSS pipeline fails the build. CSS that Vite inlines into JS (an `iife` output) now carries it too instead of failing the build. Splicing remains as a fallback, with a warning, for a Vite whose internals don't allow the handoff.

Breaking: `to_hashed_css_placeholder` and `parse_css_placeholder_hash` are removed from `css_placeholder_splice.ts`.
