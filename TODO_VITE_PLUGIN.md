# Vite Plugin for fuz_css

Alternative to the Gro generator for projects using Vite directly.

## Architecture

### Transform-based extraction (like UnoCSS)

Instead of filesystem scanning, use Vite's `transform()` hook to extract classes from every file Vite processes. This automatically includes node_modules dependencies as they're imported.

```
File imported → transform() extracts classes → registry updated
                                                    ↓
                              virtual:fuz.css ← generates CSS from registry
```

### Lazy generation with incremental HMR

1. First request for `virtual:fuz.css` generates CSS from current registry
2. Subsequent transforms may discover new classes
3. New classes trigger HMR update of virtual module
4. Dev mode may see multiple CSS updates during initial load (acceptable)
5. Production builds process all files before bundling (CSS complete)

## Implementation

### Plugin file

`src/lib/vite_plugin_fuz_css.ts` exports single identifier `vite_plugin_fuz_css`.

```ts
import type {Plugin} from 'vite';

export interface VitePluginFuzCssOptions {
  // Same options as GenFuzCssOptions where applicable
  filter_file?: (path: string) => boolean;
  class_definitions?: Record<string, CssClassDefinition | undefined>;
  class_interpreters?: Array<CssClassDefinitionInterpreter>;
  include_classes?: Iterable<string>;
  exclude_classes?: Iterable<string>;
  acorn_plugins?: Array<AcornPlugin>;
  on_error?: 'log' | 'throw';
}

export const vite_plugin_fuz_css = (options?: VitePluginFuzCssOptions): Plugin => {
  // ...
};
```

### Plugin hooks

| Hook | Purpose |
|------|---------|
| `configResolved` | Get project root for cache paths |
| `configureServer` | Set up file watcher for deletion handling |
| `buildStart` | Load CSS properties for validation |
| `resolveId` | Resolve `virtual:fuz.css` to internal ID |
| `load` | Generate CSS from current class registry |
| `transform` | Extract classes from each file, update registry, trigger HMR |

Note: `handleHotUpdate` is not needed - the `transform` hook handles file changes (it runs on every file edit), and `configureServer` sets up `watcher.on('unlink')` for file deletion.

### Class registry

Global mutable state within plugin instance:

```ts
interface ClassRegistry {
  // file path → extracted classes with locations
  files: Map<string, Map<string, Array<SourceLocation>>>;
  // file path → content hash (for caching)
  hashes: Map<string, string>;
  // aggregated classes (recomputed on change)
  all_classes: Set<string> | null; // null = dirty, needs recompute
}
```

### Transform hook

```ts
transform(code, id) {
  // Early filter - skip test files, .gen files, non-extractable extensions
  if (!filter_file(id)) return null;

  // Compute content hash
  const hash = compute_hash(code);
  if (registry.hashes.get(id) === hash) return null; // unchanged

  // Extract classes
  const result = extract_css_classes_with_locations(code, {
    filename: id,
    acorn_plugins,
  });

  // Update registry
  registry.files.set(id, result.classes);
  registry.hashes.set(id, hash);
  registry.all_classes = null; // mark dirty

  // If virtual module already loaded, trigger HMR
  if (virtual_module_loaded) {
    invalidate_virtual_module();
  }

  return null; // don't transform the code itself
}
```

### Virtual module

```ts
const VIRTUAL_ID = 'virtual:fuz.css';
const RESOLVED_ID = '\0virtual:fuz.css'; // \0 prefix = Vite convention

resolveId(id) {
  if (id === VIRTUAL_ID) return RESOLVED_ID;
}

load(id) {
  if (id === RESOLVED_ID) {
    virtual_module_loaded = true;
    return generate_css_from_registry();
  }
}
```

### HMR

HMR is triggered from within the `transform` hook when classes change:

```ts
// Called from transform() after registry update
const invalidate_virtual_module = () => {
  if (!server) return;

  // Debounce: wait 10ms for more changes before triggering HMR
  if (hmr_timeout) clearTimeout(hmr_timeout);
  hmr_timeout = setTimeout(() => {
    const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({
        type: 'update',
        updates: [{
          type: 'css-update',
          path: VIRTUAL_ID,
          acceptedPath: VIRTUAL_ID,
          timestamp: Date.now(),
        }],
      });
    }
  }, 10);
};
```

File deletion is handled via `configureServer`:

```ts
configureServer(dev_server) {
  server = dev_server;
  dev_server.watcher.on('unlink', (file) => {
    if (registry.files.has(file)) {
      registry.files.delete(file);
      registry.hashes.delete(file);
      registry.all_classes = null;
      // Also delete cache file
      delete_cached_extraction(get_file_cache_path(file));
      invalidate_virtual_module();
    }
  });
}
```

## Caching

Reuse per-file content hash caching from current system:

- Cache location: `.fuz/cache/css/` (same as Gro)
- On transform: check cache before extracting
- On file change: invalidate cache entry
- Refactor `css_cache.ts` if needed for shared API

## Examples

Directory structure:

```
examples/
├── vite-react/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       └── App.tsx
├── vite-preact/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       └── App.tsx
└── vite-solid/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        └── App.tsx
```

### Example UI scope

Minimal but demonstrates multiple patterns:

- Responsive layout (column on mobile, row on desktop)
- Token classes (spacing, colors, typography)
- Literal classes (display, flex properties)
- State modifiers (hover effects)
- Dark mode modifier
- Composite classes (box, row)

Self-explanatory UI - users understand what they're seeing at a glance.

### Example vite.config.ts

```ts
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import jsx from 'acorn-jsx';
import {vite_plugin_fuz_css} from '@fuzdev/fuz_css/vite_plugin_fuz_css.js';

export default defineConfig({
  plugins: [
    react(),
    vite_plugin_fuz_css({
      acorn_plugins: [jsx()],
    }),
  ],
});
```

### Example usage

```tsx
// src/main.tsx
import '@fuzdev/fuz_css/style.css';
import '@fuzdev/fuz_css/theme.css';
import 'virtual:fuz.css';

import {createRoot} from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

### Package.json dependencies

```json
{
  "devDependencies": {
    "@fuzdev/fuz_css": "file:../..",
    "vite": "^6",
    "acorn-jsx": "^5"
  }
}
```

## Tasks

### Phase 1: Core plugin

1. Create `src/lib/vite_plugin_fuz_css.ts` with basic structure
2. Implement `resolveId` and `load` for virtual module
3. Implement `transform` hook with class extraction
4. Implement class registry and CSS generation
5. Add HMR support via `handleHotUpdate`
6. Integrate per-file caching

### Phase 2: Examples

1. Create `examples/vite-react/` with minimal setup
2. Create `examples/vite-preact/`
3. Create `examples/vite-solid/`
4. Verify all examples work with `npm install && npm run dev`

### Phase 3: Polish

1. Add TypeScript types for virtual module (`virtual:fuz.css`)
2. Error handling and diagnostics
3. Test with real-world usage patterns
4. Documentation updates

## Future work

- **Auto-detect framework**: Infer acorn-jsx need from package.json dependencies
- **Vue SFC support**: Parse `:class` bindings (needs vue-template-compiler)
- **Physical file output**: Option to write fuz.css for debugging/CI
- **Configurable virtual module name**: `virtual:fuz.css` vs custom
- **Build-time optimization**: Pre-extract during `buildStart` for faster cold starts
- **Shared cache with Gro**: Ensure cache format compatibility

## Unknowns

- **Transform order**: Does Vite guarantee transform completes before load of dependent modules? Need to verify CSS is ready when components render.
- **Pre-bundled dependencies**: Vite pre-bundles node_modules. Does transform hook see original source or bundled output? May affect extraction accuracy.
- **SSR considerations**: How does virtual module work in SSR builds?
- **Large codebases**: Performance of extracting on every transform vs batching.
