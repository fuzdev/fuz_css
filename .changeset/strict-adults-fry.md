---
'@fuzdev/fuz_css': minor
---

refactor: share the CSS generation pipeline between the Gro generator and Vite plugin

- add `generate_css` (generate → resolve → bundle), called by both `gen_fuz_css` and `vite_plugin_fuz_css`
- add `create_bundled_resources` and `extract_file_cached`, shared by both generators
- fix the Vite transform resurrecting a file deleted during its in-flight cache read
