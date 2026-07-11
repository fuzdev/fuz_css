---
'@fuzdev/fuz_css': patch
---

fix: complete utility CSS on the first dev page load

The Vite plugin now eagerly pre-scans project sources at dev-server startup
(new `prescan` option: `true` scans `src` under the Vite root, `false`
disables, or an array of directories) and resyncs clients whose HMR socket
connects after a missed CSS update. Previously the first cold-start page
load could render with incomplete utility classes until a manual refresh:
extraction state accumulated only from modules Vite had transformed so far,
and the corrective HMR update was dropped when the browser hadn't connected
yet. Bundled resources (base-CSS rule index, variable graph) also load
eagerly at dev-server startup now, overlapping their parse with the
pre-scan for faster cold starts.
