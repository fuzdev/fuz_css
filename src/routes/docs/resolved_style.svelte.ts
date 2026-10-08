import { theme_state_context } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

import { root_color_scheme } from '$routes/root_color_scheme.svelte.ts';

/**
 * Runs `read` in an effect that re-runs after anything that can change a
 * style the page renders: the root's scheme class, the applied theme, and
 * whatever `read` itself tracks. For the docs readouts that show a computed
 * value, which a derived can't read - the browser resolves it only after
 * the render the change caused.
 *
 * The scheme is read off the root class, which is what computed styles
 * resolve against and changes after the theme state does. Call during
 * component init - it registers the effect and reads the theme-state context.
 *
 * @param read - reads computed styles and stores what it found
 */
export const watch_resolved_style = (read: () => void): void => {
	const get_theme_state = theme_state_context.get();
	$effect(() => {
		root_color_scheme();
		get_theme_state().theme;
		read();
	});
};
