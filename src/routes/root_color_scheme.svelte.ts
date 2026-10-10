import { createSubscriber } from 'svelte/reactivity';

import type { ColorSchemeVariant } from '#lib/variable_data.ts';

// TODO upstream to fuz_ui

const subscribe = createSubscriber((update) => {
	const observer = new MutationObserver(update);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observer.disconnect();
});

/**
 * Reads the color scheme the page currently renders: the `dark` class on the
 * root element, the ecosystem convention. Reactive when called in an effect
 * or derived, so a reader re-runs after the class changes.
 *
 * This is what's on screen, which the theme state's `color_scheme` isn't
 * always: `'auto'` resolves against the OS once and the class doesn't follow
 * a later OS flip, and the class is synced in an effect, so a sibling effect
 * reading the state can run before it. `'light'` during SSR.
 */
export const root_color_scheme = (): ColorSchemeVariant => {
	if (typeof document === 'undefined') return 'light';
	subscribe();
	return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};
