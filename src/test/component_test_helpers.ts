/**
 * Helpers for mounting Svelte components in jsdom tests (the fuz_ui
 * `test_helpers.ts` pattern). Kept separate from `test_helpers.ts` so the
 * node-environment suites never pull svelte's client runtime.
 *
 * @module
 */

import { afterEach } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';

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
 * Creates the mount a test file shares: each call renders a component into a
 * fresh container and flushes, and whatever was mounted is unmounted after
 * each test. Call at the top level of a test file or inside a `describe`.
 *
 * @returns the mount, which resolves the component's container
 */
export const create_mount_tracker = (): ((
	component: Component<any, any, any>,
	props: Record<string, any>
) => HTMLElement) => {
	let mounted: { instance: Record<string, any>; container: HTMLElement } | null = null;
	afterEach(async () => {
		if (!mounted) return;
		await unmount_component(mounted.instance, mounted.container);
		mounted = null;
	});
	return (component, props) => {
		mounted = mount_component(component, props);
		flushSync();
		return mounted.container;
	};
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
