---
'@fuzdev/fuz_css': patch
---

fix: a dev change invalidates the served CSS in every Vite environment, not just `client` and `ssr`, and the plugin uses the per-environment module graphs and hot channel instead of the mixed `server.moduleGraph` and `server.hot`, so it runs clean under Vite's `future.removeServerModuleGraph`/`removeServerHot` flags
