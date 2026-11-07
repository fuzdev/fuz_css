import type { Theme } from '#lib/variable.ts';
import { default_themes } from '#lib/themes.ts';
import { zine_theme } from '#lib/themes/zine.ts';
import { pebble_theme } from '#lib/themes/pebble.ts';
import { parchment_theme } from '#lib/themes/parchment.ts';
import { phosphor_theme } from '#lib/themes/phosphor.ts';
import { guestbook_theme } from '#lib/themes/guestbook.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';
import { signage_theme } from '#lib/themes/signage.ts';

/**
 * The docs site's theme registry: the registry and the shipped exemplars as
 * one gallery - registry membership is policy for consumer pickers, not UX.
 * The themes page's editor bases drafts on it, and the root layout's
 * `ThemeRoot` takes it so a picked theme persists by name.
 *
 * Lives in its own leaf module, like `theme_draft.ts`, so the root layout
 * doesn't pull the editor-state module into every page's bundle. The theme
 * modules are plain data, so importing them costs only their variables.
 */
export const site_themes: Array<Theme> = [
	...default_themes,
	zine_theme,
	pebble_theme,
	parchment_theme,
	phosphor_theme,
	guestbook_theme,
	marquee_theme,
	signage_theme
];
