/**
 * @vitest-environment jsdom
 */
import { describe, test, assert, afterEach } from 'vitest';
import { flushSync } from 'svelte';

import RampStrip from '$routes/RampStrip.svelte';
import { numeric_scale_variants } from '$lib/variable_data.ts';
import { mount_component, unmount_component } from './component_test_helpers.ts';

let mounted: { instance: Record<string, any>; container: HTMLElement } | null = null;

afterEach(async () => {
	if (mounted) {
		await unmount_component(mounted.instance, mounted.container);
		mounted = null;
	}
});

const mount_strip = (props: Record<string, any>): HTMLElement => {
	mounted = mount_component(RampStrip as any, props);
	flushSync();
	return mounted.container;
};

describe('RampStrip', () => {
	test('renders one cell per numeric scale stop, oriented by title', () => {
		const container = mount_strip({ prefix: 'accent' });
		const cells = container.querySelectorAll('.cell');
		assert.strictEqual(cells.length, numeric_scale_variants.length);
		assert.strictEqual(cells[0]!.getAttribute('title'), '--accent_00');
		assert.strictEqual(cells[cells.length - 1]!.getAttribute('title'), '--accent_100');
	});

	test('each cell paints the live variable, letting the browser resolve it', () => {
		const container = mount_strip({ prefix: 'shade' });
		const cells = container.querySelectorAll('.cell');
		for (const [i, stop] of numeric_scale_variants.entries()) {
			assert.include(cells[i]!.getAttribute('style') ?? '', `var(--shade_${stop})`);
		}
	});

	test('label defaults to the prefix and accepts an override', () => {
		const container = mount_strip({ prefix: 'palette_a', label: 'palette a' });
		assert.strictEqual(container.querySelector('.ramp_name')?.textContent, 'palette a');
	});

	test('label falls back to the prefix', () => {
		const container = mount_strip({ prefix: 'text' });
		assert.strictEqual(container.querySelector('.ramp_name')?.textContent, 'text');
	});
});
