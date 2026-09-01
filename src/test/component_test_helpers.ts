/**
 * Helpers for mounting Svelte components in jsdom tests (the fuz_ui
 * `test_helpers.ts` pattern). Kept separate from `test_helpers.ts` so the
 * node-environment suites never pull svelte's client runtime.
 *
 * @module
 */

import { mount, unmount, type Component } from 'svelte';

/**
 * Mounts a component into a fresh container appended to `document.body`.
 */
export const mount_component = <TProps extends Record<string, any>>(
	component: Component<TProps>,
	props: TProps
): { instance: Record<string, any>; container: HTMLElement } => {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const instance = mount(component, { target: container, props });
	return { instance, container };
};

/**
 * Unmounts a component and removes its container from the DOM.
 */
export const unmount_component = async (
	instance: Record<string, any>,
	container: HTMLElement
): Promise<void> => {
	await unmount(instance);
	container.remove();
};

/**
 * Sets an input's value and dispatches the event the component listens for.
 */
export const set_input_value = (
	input: HTMLInputElement | HTMLSelectElement,
	value: string,
	event_type: 'input' | 'change' = 'input'
): void => {
	input.value = value;
	input.dispatchEvent(new Event(event_type, { bubbles: true }));
};
