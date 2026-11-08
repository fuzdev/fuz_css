---
'@fuzdev/fuz_css': minor
---

refactor: own the filesystem error type and file search instead of importing them from fuz_util

Breaking:

- the Vite plugin's `deps` option is now `FsDeps & FsSearchDeps`: a custom `deps` passed to the plugin must also provide `search_files`, the dev pre-scan's file search. `FsDeps` itself is unchanged.

Added:

- fuz_css defines its own `FsError` and `fs_classify_error` rather than importing them from `@fuzdev/fuz_util/fs.ts`.
