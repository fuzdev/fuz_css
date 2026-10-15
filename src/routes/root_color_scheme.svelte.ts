import { createSubscriber } from 'svelte/reactivity';

import type { ColorSchemeVariant } from '#lib/variable_data.ts';

// TODO upstream to fuz_ui

const DARK_QUERY = '(prefers-color-scheme: dark)';

const subscribe = createSubscriber((update) => {
	const observer = new MutationObserver(update);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	const media = matchMedia(DARK_QUERY);
	media.addEventListener('change', update);
	return () => {
		observer.disconnect();
		media.removeEventListener('change', update);
	};
});

/**
 * Reads the color scheme the page currently renders: the `dark` or `light`
 * class on the root element, the ecosystem convention, or the OS preference
 * when the root names neither. Reactive when called in an effect or derived,
 * so a reader re-runs after the class or the OS preference changes.
 *
 * This is what's on screen, which the theme state's `color_scheme` isn't
 * always: `'auto'` resolves against the OS once and the class doesn't follow
 * a later OS flip, and the class is synced in an effect, so a sibling effect
 * reading the state can run before it. `'light'` during SSR.
 */
export const root_color_scheme = (): ColorSchemeVariant => {
	if (typeof document === 'undefined') return 'light';
	subscribe();
	const { classList } = document.documentElement;
	return classList.contains('dark') ||
		(!classList.contains('light') && matchMedia(DARK_QUERY).matches)
		? 'dark'
		: 'light';
};
