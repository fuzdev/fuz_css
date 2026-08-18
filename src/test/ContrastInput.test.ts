/**
 * @vitest-environment jsdom
 */
import { describe, test, assert, afterEach } from 'vitest';
import { flushSync } from 'svelte';

import ContrastInput from '$routes/ContrastInput.svelte';
import { contrast_modifiers } from '$lib/themes.ts';
import type { Theme } from '$lib/variable.ts';
import { mount_component, unmount_component } from './component_test_helpers.ts';

let mounted: { instance: Record<string, any>; container: HTMLElement } | null = null;

afterEach(async () => {
	if (mounted) {
		await unmount_component(mounted.instance, mounted.container);
		mounted = null;
	}
});

const mount_input = (
	props: Partial<{ selected: Theme | null; select: (m: Theme | null) => void }> = {}
): HTMLElement => {
	mounted = mount_component(ContrastInput as any, {
		modifiers: contrast_modifiers,
		selected: null,
		select: () => {},
		...props
	});
	return mounted.container;
};

const buttons = (container: HTMLElement): Array<HTMLButtonElement> =>
	Array.from(container.querySelectorAll('button'));

describe('ContrastInput', () => {
	test('renders one button per modifier plus the default', () => {
		const container = mount_input();
		const labels = buttons(container).map((b) => b.textContent?.trim());
		assert.deepEqual(labels, ['default', 'low', 'high']);
	});

	test('the default sits first and is checked when nothing is selected', () => {
		const container = mount_input();
		const checked = buttons(container).filter((b) => b.getAttribute('aria-checked') === 'true');
		assert.strictEqual(checked.length, 1);
		assert.strictEqual(checked[0]!.textContent?.trim(), 'default');
	});

	test('exactly the selected modifier is checked', () => {
		const container = mount_input({ selected: contrast_modifiers[1]! });
		const checked = buttons(container).filter((b) => b.getAttribute('aria-checked') === 'true');
		assert.strictEqual(checked.length, 1);
		assert.strictEqual(checked[0]!.textContent?.trim(), 'high');
	});

	test('clicking selects the modifier, and the default selects null', () => {
		const selections: Array<Theme | null> = [];
		const container = mount_input({ select: (m) => selections.push(m) });
		const [default_button, low_button] = buttons(container);
		low_button!.click();
		flushSync();
		default_button!.click();
		flushSync();
		assert.deepEqual(selections, [contrast_modifiers[0]!, null]);
	});
});
