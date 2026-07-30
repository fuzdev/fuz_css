/**
 * @vitest-environment jsdom
 */
import { describe, test, assert, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';

import KnobControl from '$routes/KnobControl.svelte';
import { theme_knob_by_name, type ThemeKnob } from '$lib/knobs.ts';
import { PALETTE_HUES } from '$lib/ramps.ts';
import { palette_variants } from '$lib/variable_data.ts';
import { mount_component, unmount_component, set_input_value } from './component_test_helpers.ts';

let mounted: { instance: Record<string, any>; container: HTMLElement } | null = null;

afterEach(async () => {
	if (mounted) {
		await unmount_component(mounted.instance, mounted.container);
		mounted = null;
	}
});

const get_knob = (name: string): ThemeKnob => {
	const knob = theme_knob_by_name.get(name);
	assert(knob, `knob ${name} exists in the catalog`);
	return knob;
};

const mount_knob = (props: Record<string, any>): HTMLElement => {
	mounted = mount_component(KnobControl as any, {
		changed: false,
		onchange: () => {},
		onreset: () => {},
		...props
	});
	flushSync();
	return mounted.container;
};

const number_input = (container: HTMLElement): HTMLInputElement => {
	const input = container.querySelector('input[type="number"]');
	assert(input instanceof HTMLInputElement, 'number input renders');
	return input;
};

const range_input = (container: HTMLElement): HTMLInputElement => {
	const input = container.querySelector('input[type="range"]');
	assert(input instanceof HTMLInputElement, 'range input renders');
	return input;
};

describe('scalar knobs', () => {
	test('a literal value fills both the slider and the number input', () => {
		const container = mount_knob({ knob: get_knob('chroma_scale'), value: '1.3' });
		assert.strictEqual(range_input(container).value, '1.3');
		const number = number_input(container);
		assert.strictEqual(number.value, '1.3');
		assert.strictEqual(number.placeholder, '');
		assert.strictEqual(number.getAttribute('aria-label'), 'chroma_scale');
	});

	test('typing in the number input emits the literal', () => {
		const onchange = vi.fn();
		const container = mount_knob({ knob: get_knob('chroma_scale'), value: '1', onchange });
		set_input_value(number_input(container), '0.8');
		assert.deepEqual(onchange.mock.calls, [['0.8']]);
	});

	test('an empty number input does not slam the knob mid-edit', () => {
		const onchange = vi.fn();
		const container = mount_knob({ knob: get_knob('chroma_scale'), value: '1', onchange });
		set_input_value(number_input(container), '');
		assert.strictEqual(onchange.mock.calls.length, 0);
	});

	test('a percent knob strips % for display and restores it on emit', () => {
		const knob: ThemeKnob = {
			name: 'test_percent',
			kind: 'percent',
			axis: 'color',
			leverage: 'md',
			tier: 'semantic',
			range: [0, 100],
			step: 1
		};
		const onchange = vi.fn();
		const container = mount_knob({ knob, value: '40%', onchange });
		assert.strictEqual(number_input(container).value, '40');
		set_input_value(number_input(container), '55');
		assert.deepEqual(onchange.mock.calls, [['55%']]);
	});

	test('an enum knob renders a select over its values', () => {
		const knob: ThemeKnob = {
			name: 'test_enum',
			kind: 'enum',
			axis: 'shape',
			leverage: 'md',
			tier: 'semantic',
			values: ['solid', 'dashed']
		};
		const onchange = vi.fn();
		const container = mount_knob({ knob, value: 'solid', onchange });
		const select = container.querySelector('select');
		assert(select instanceof HTMLSelectElement);
		assert.strictEqual(select.value, 'solid');
		set_input_value(select, 'dashed', 'change');
		assert.deepEqual(onchange.mock.calls, [['dashed']]);
	});
});

describe('derived knobs', () => {
	const derived_value = 'calc(var(--neutral_chroma) * 2.6667)';

	test('a resolved expression positions the slider and renders as placeholder, never value', () => {
		const container = mount_knob({
			knob: get_knob('border_color_chroma'),
			value: derived_value,
			resolved: 0.0640008
		});
		// step 0.001 - the placeholder rounds to the knob's precision
		const number = number_input(container);
		assert.strictEqual(number.value, '');
		assert.strictEqual(number.placeholder, '0.064');
		assert.closeTo(Number(range_input(container).value), 0.064, 1e-3);
		assert.include(number.getAttribute('aria-label') ?? '', 'derived');
		assert.include(number.getAttribute('title') ?? '', derived_value);
	});

	test('dragging the slider pins the derived knob', () => {
		const onchange = vi.fn();
		const container = mount_knob({
			knob: get_knob('border_color_chroma'),
			value: derived_value,
			resolved: 0.064,
			onchange
		});
		set_input_value(range_input(container), '0.08');
		assert.deepEqual(onchange.mock.calls, [['0.08']]);
	});

	test('an unresolvable expression falls back to the text escape hatch', () => {
		const container = mount_knob({
			knob: get_knob('border_color_chroma'),
			value: derived_value,
			resolved: null
		});
		const text = container.querySelector('input[type="text"]');
		assert(text instanceof HTMLInputElement);
		assert.strictEqual(text.value, derived_value);
	});

	test('an unset hook keeps its unset placeholder', () => {
		const container = mount_knob({
			knob: get_knob('heading_font_weight'),
			value: undefined,
			resolved: null
		});
		const text = container.querySelector('input[type="text"]');
		assert(text instanceof HTMLInputElement);
		assert.strictEqual(text.value, '');
		assert.include(text.placeholder, 'unset');
	});
});

describe('bindable knobs', () => {
	test('renders a chip per palette letter plus the custom detach', () => {
		const container = mount_knob({ knob: get_knob('hue_accent'), value: 'var(--hue_a)' });
		const chips = container.querySelectorAll('.letter_chip');
		assert.strictEqual(chips.length, palette_variants.length + 1);
		const bound = container.querySelector('.letter_chip[aria-pressed="true"]');
		assert.strictEqual(bound?.textContent?.trim(), 'a');
	});

	test('clicking a letter chip writes the binding', () => {
		const onchange = vi.fn();
		const container = mount_knob({ knob: get_knob('hue_accent'), value: 'var(--hue_a)', onchange });
		const chips = [...container.querySelectorAll('.letter_chip')];
		const b = chips.find((c) => c.textContent?.trim() === 'b');
		assert(b instanceof HTMLButtonElement);
		b.click();
		flushSync();
		assert.deepEqual(onchange.mock.calls, [['var(--hue_b)']]);
	});

	test('detaching writes the resolved literal angle', () => {
		const onchange = vi.fn();
		const container = mount_knob({ knob: get_knob('hue_accent'), value: 'var(--hue_a)', onchange });
		const custom = [...container.querySelectorAll('.letter_chip')].find(
			(c) => c.textContent?.trim() === 'custom'
		);
		assert(custom instanceof HTMLButtonElement);
		custom.click();
		flushSync();
		assert.deepEqual(onchange.mock.calls, [[String(PALETTE_HUES.a)]]);
	});
});

describe('reset', () => {
	test('a changed knob renders the reset button', () => {
		const onreset = vi.fn();
		const container = mount_knob({
			knob: get_knob('chroma_scale'),
			value: '0.8',
			changed: true,
			onreset
		});
		const reset = container.querySelector('.knob_reset');
		assert(reset instanceof HTMLButtonElement);
		reset.click();
		flushSync();
		assert.strictEqual(onreset.mock.calls.length, 1);
	});

	test('an unchanged knob has no reset button', () => {
		const container = mount_knob({ knob: get_knob('chroma_scale'), value: '1' });
		assert.isNull(container.querySelector('.knob_reset'));
	});
});
