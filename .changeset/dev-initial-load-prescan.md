---
'@fuzdev/fuz_css': patch
---

fix: complete utility CSS on the first dev page load

The Vite plugin now pre-scans project sources at dev-server startup (new
`prescan` option: `true` scans `src` under the Vite root, `false` disables,
or an array of directories) and resyncs clients whose HMR socket connects
after a missed CSS update. Previously the first cold-start page load could
render with incomplete utility classes until a manual refresh. Files are
isolated during the scan: one file that fails to read or extract logs and
is skipped rather than aborting the rest of the scan.
