// TODO upstream to fuz_ui

/**
 * The name of the in-progress theme shown in pickers. Never `'base'`, which
 * fuz_ui's `ThemeRoot` suppresses to render nothing (pickers key by name), and
 * never a registry/exemplar name, which would collide with `ThemeInput`'s
 * name-keyed selection.
 *
 * Lives in its own leaf module so the root layout (which only needs this
 * string to skip persisting drafts) doesn't pull the whole editor-state
 * module - and with it `variables.ts`, `theme_check.ts`, and `knobs.ts` -
 * into every page's bundle.
 */
export const UNSAVED_THEME_NAME = 'unsaved';
