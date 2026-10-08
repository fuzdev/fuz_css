/**
 * @vitest-environment jsdom
 */
import { describe, test, assert, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { ThemeState } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

import { ThemeEditorState } from '$routes/theme_editor_state.svelte.ts';
import { base_theme } from '$lib/themes/base.ts';
import { marquee_theme } from '$lib/themes/marquee.ts';
import { NEUTRAL_CHROMA, BORDER_CHROMA_MULTIPLIER } from '$lib/ramps.ts';
import ThemeEditorHarness from './ThemeEditorHarness.svelte';
import { create_mount_tracker, set_input_value } from './component_test_helpers.ts';

const mount = create_mount_tracker();

afterEach(() => {
	vi.unstubAllGlobals();
});

const mount_editor = (): { editor: ThemeEditorState; container: HTMLElement } => {
	const editor = new ThemeEditorState({ themes: [base_theme, marquee_theme] });
	const container = mount(ThemeEditorHarness, { editor, theme_state: new ThemeState() });
	return { editor, container };
};

const border_chroma_input = (container: HTMLElement): HTMLInputElement => {
	const input = container.querySelector('input[aria-label^="border_color_chroma"]');
	assert(input instanceof HTMLInputElement, 'border_color_chroma number input renders');
	return input;
};

describe('ThemeEditor', () => {
	test('renders the draft name and the based-on picker', () => {
		const { container } = mount_editor();
		const name = container.querySelector('input');
		assert(name instanceof HTMLInputElement);
		assert.strictEqual(name.value, 'new theme');
		const based_on = container.querySelector('select');
		assert(based_on instanceof HTMLSelectElement);
		assert.strictEqual(based_on.value, 'base');
	});

	test('a derived knob renders its resolved value as placeholder with an empty input', () => {
		// no `dark` class on the root, so edits target the light scheme
		const { container } = mount_editor();
		const input = border_chroma_input(container);
		const expected = NEUTRAL_CHROMA.light * BORDER_CHROMA_MULTIPLIER.light;
		assert.strictEqual(input.value, '');
		assert.strictEqual(input.placeholder, expected.toFixed(3));
		assert.include(input.getAttribute('aria-label') ?? '', 'derived');
	});

	test('typing into a derived knob pins it and the input fills', () => {
		const { editor, container } = mount_editor();
		set_input_value(border_chroma_input(container), '0.08');
		flushSync();
		assert.isTrue(editor.overrides.has('border_color_chroma'));
		const input = border_chroma_input(container);
		assert.strictEqual(input.value, '0.08');
		assert.strictEqual(input.getAttribute('aria-label'), 'border_color_chroma');
	});

	test('the derived placeholder tracks its source knob', () => {
		const { editor, container } = mount_editor();
		editor.set_value('neutral_chroma', '0.05', 'light');
		flushSync();
		const expected = 0.05 * BORDER_CHROMA_MULTIPLIER.light;
		assert.strictEqual(border_chroma_input(container).placeholder, expected.toFixed(3));
	});

	test('switching the base theme is confirm-guarded when dirty', () => {
		const { editor, container } = mount_editor();
		editor.set_value('chroma_scale', '0.5', 'light');
		flushSync();
		const based_on = container.querySelector('select');
		assert(based_on instanceof HTMLSelectElement);
		const confirm = vi.fn(() => false);
		vi.stubGlobal('confirm', confirm);
		set_input_value(based_on, 'marquee', 'change');
		flushSync();
		assert.strictEqual(editor.based_on, 'base');
		assert.strictEqual(based_on.value, 'base', 'the select shows the base it kept');
		assert.strictEqual(confirm.mock.calls.length, 1);
		confirm.mockReturnValue(true);
		set_input_value(based_on, 'marquee', 'change');
		flushSync();
		assert.strictEqual(editor.based_on, 'marquee');
		assert.strictEqual(editor.overrides.size, 0);
	});
});
