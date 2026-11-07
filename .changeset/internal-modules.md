---
'@fuzdev/fuz_css': minor
---

**breaking** refactor: mark the generator pipeline modules `@internal` and make the custom-class authoring surface public

The modules beneath the Vite plugin - extraction, class resolution and generation, the token class generators, the CSS-literal parser, the bundled-CSS pipeline, the cache, and the filesystem deps - carry a module-level `@internal`, so the API docs label them unstable. They stay importable and documented; the public surface is the Vite plugin and its options, the theme system, the variables, the diagnostics and file filter, the modifiers, and the custom-class authoring surface: the class registries a project spreads (`css_class_definitions.ts`, `css_class_composites.ts`, `css_class_keywords.ts`, `css_class_interpreters.ts`) and the types the `class_definitions`, `class_interpreters`, and `acorn_plugins` options take. `css_extraction_state.ts` and `vite_plugin_fuz_css_build.ts`, previously hidden from the docs, are now listed as internal.

Breaking:

- `CssClassDefinition` and its forms (`CssClassDefinitionBase`, `CssClassDefinitionComposition`, `CssClassDefinitionDeclaration`, `CssClassDefinitionRuleset`, `CssClassDefinitionStatic`), `CssClassDefinitionInterpreter`, and `CssClassInterpreterContext` move from `css_class_generation.ts` to `css_class_definitions.ts`
- `AcornPlugin` moves from `css_class_extractor.ts` to `css_plugin_options.ts`
