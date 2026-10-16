---
'@fuzdev/fuz_css': minor
---

**breaking** feat: the build-time theme bake runs `validate_theme`, reporting each issue as a `theme_lint` diagnostic at its own level, so an unknown theme variable or a malformed theme is an error that fails a build throwing on errors (the CI default)
