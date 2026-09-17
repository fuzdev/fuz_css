/**
 * Tests for the docs site's theme editor state: the slot-merge semantics,
 * scheme-stance re-slotting, display values, snapshots, and the copyable
 * TypeScript output.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import {
	ThemeEditorState,
	render_theme_ts,
	discard_confirm_message
} from '$routes/theme_editor_state.svelte.ts';
import { UNSAVED_THEME_NAME } from '$routes/theme_draft.ts';
import type { Theme } from '$lib/variable.ts';
import { base_theme } from '$lib/themes/base.ts';
import { neon_theme } from '$lib/themes/neon.ts';
import { default_variables } from '$lib/variables.ts';
import { NEUTRAL_CHROMA, BORDER_CHROMA_MULTIPLIER, PALETTE_HUES } from '$lib/ramps.ts';

const adaptive_default = default_variables.find((v) => v.name === 'shade_lightness_00')!;
const single_slot_default = default_variables.find((v) => v.name === 'chroma_scale')!;

const create_editor = (): ThemeEditorState => new ThemeEditorState([base_theme, neon_theme]);

describe('set_value slot semantics', () => {
	test('a scheme-adaptive variable edits the viewed scheme, preserving the other slot', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.9', 'light');
		const merged = editor.merged_variables.find((v) => v.name === adaptive_default.name);
		// the default's dark slot is preserved explicitly - a theme's :root block
		// beats the base defaults' :root.dark by layer order, so omitting it
		// would silently change dark mode too
		assert.deepEqual(merged, {
			name: adaptive_default.name,
			light: '0.9',
			dark: adaptive_default.dark
		});
	});

	test('editing the dark slot leaves the light slot to the default', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.3', 'dark');
		const merged = editor.merged_variables.find((v) => v.name === adaptive_default.name);
		assert.deepEqual(merged, { name: adaptive_default.name, dark: '0.3' });
	});

	test('a single-slot variable always edits the base slot', () => {
		const editor = create_editor();
		editor.set_value(single_slot_default.name, '1.4', 'dark');
		const merged = editor.merged_variables.find((v) => v.name === single_slot_default.name);
		assert.deepEqual(merged, { name: single_slot_default.name, light: '1.4' });
	});

	test('identical light and dark values collapse to a single slot', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.5', 'light');
		editor.set_value(adaptive_default.name, '0.5', 'dark');
		const merged = editor.merged_variables.find((v) => v.name === adaptive_default.name);
		assert.deepEqual(merged, { name: adaptive_default.name, light: '0.5' });
	});
});

describe('scheme stance', () => {
	test('entering a stance re-slots existing overrides to the base slot', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		editor.set_scheme('dark');
		const merged = editor.merged_variables.find((v) => v.name === adaptive_default.name);
		assert.deepEqual(merged, { name: adaptive_default.name, light: '0.25' });
	});

	test('a light stance drops dark-only overrides - that appearance never renders', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		editor.set_scheme('light');
		assert.isFalse(editor.overrides.has(adaptive_default.name));
	});

	test('edits under a stance write the base slot and skip dark preservation', () => {
		const editor = create_editor();
		editor.set_scheme('dark');
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		const merged = editor.merged_variables.find((v) => v.name === adaptive_default.name);
		// no preserved dark slot - the stance mirror owns untouched defaults
		assert.deepEqual(merged, { name: adaptive_default.name, light: '0.25' });
	});

	test('the draft and output of a stanced editor carry a resolved scheme_mirror', () => {
		const editor = create_editor();
		editor.set_scheme('dark');
		assert.strictEqual(editor.draft.scheme, 'dark');
		assert.isAbove(editor.draft.scheme_mirror!.length, 0);
		assert.isAbove(editor.output.scheme_mirror!.length, 0);
		// a dual editor's draft has no mirror
		const dual = create_editor();
		assert.isUndefined(dual.draft.scheme_mirror);
	});
});

describe('scheme stance over a dual base theme', () => {
	// a dual base authoring both slots itself - like concrete and smolder
	const dual_base: Theme = {
		name: 'dualish',
		variables: [
			{ name: 'shade_lightness_00', light: '0.9', dark: '0.3' },
			{ name: 'chroma_scale', light: '1.4' }
		]
	};
	const create_dual_editor = (): ThemeEditorState => {
		const editor = new ThemeEditorState([base_theme, dual_base]);
		editor.load_theme(dual_base);
		return editor;
	};

	test("entering a stance re-slots the base theme's own dual-slot variables", () => {
		const editor = create_dual_editor();
		editor.set_scheme('dark');
		// the base's dark appearance becomes the base slot - without this the
		// output would ship both appearances the stance promises to unify
		assert.deepEqual(
			editor.merged_variables.find((v) => v.name === 'shade_lightness_00'),
			{ name: 'shade_lightness_00', light: '0.3' }
		);
		// single-slot base variables pass through unchanged
		assert.deepEqual(
			editor.merged_variables.find((v) => v.name === 'chroma_scale'),
			{ name: 'chroma_scale', light: '1.4' }
		);
		// no dark-slot stance warnings - the merge re-slotted them away
		assert.isUndefined(editor.issues.find((i) => i.message.includes('dark slot')));
	});

	test('a light stance keeps the light value and drops the dark slot', () => {
		const editor = create_dual_editor();
		editor.set_scheme('light');
		assert.deepEqual(
			editor.merged_variables.find((v) => v.name === 'shade_lightness_00'),
			{ name: 'shade_lightness_00', light: '0.9' }
		);
	});

	test('display_value shows the stanced appearance in both schemes', () => {
		const editor = create_dual_editor();
		editor.set_scheme('dark');
		assert.strictEqual(editor.display_value('shade_lightness_00', 'light'), '0.3');
		assert.strictEqual(editor.display_value('shade_lightness_00', 'dark'), '0.3');
	});

	test('an override under the stance still wins over the re-slotted base', () => {
		const editor = create_dual_editor();
		editor.set_scheme('dark');
		editor.set_value('shade_lightness_00', '0.2', 'dark');
		assert.deepEqual(
			editor.merged_variables.find((v) => v.name === 'shade_lightness_00'),
			{ name: 'shade_lightness_00', light: '0.2' }
		);
	});
});

describe('display_value', () => {
	test('falls back to the default per scheme', () => {
		const editor = create_editor();
		assert.strictEqual(
			editor.display_value(adaptive_default.name, 'light'),
			adaptive_default.light
		);
		assert.strictEqual(editor.display_value(adaptive_default.name, 'dark'), adaptive_default.dark);
	});

	test('a light-only merged value applies to both schemes', () => {
		const editor = create_editor();
		editor.set_value(single_slot_default.name, '1.7', 'light');
		assert.strictEqual(editor.display_value(single_slot_default.name, 'light'), '1.7');
		assert.strictEqual(editor.display_value(single_slot_default.name, 'dark'), '1.7');
	});

	test('a stance mirrors untouched scheme-adaptive defaults into both schemes', () => {
		const editor = create_editor();
		editor.set_scheme('dark');
		assert.strictEqual(editor.display_value(adaptive_default.name, 'light'), adaptive_default.dark);
		assert.strictEqual(editor.display_value(adaptive_default.name, 'dark'), adaptive_default.dark);
	});
});

describe('resolved_value', () => {
	test('resolves the derived border_color_chroma default per scheme', () => {
		const editor = create_editor();
		assert.closeTo(
			editor.resolved_value('border_color_chroma', 'light')!,
			NEUTRAL_CHROMA.light * BORDER_CHROMA_MULTIPLIER.light,
			1e-9
		);
		assert.closeTo(
			editor.resolved_value('border_color_chroma', 'dark')!,
			NEUTRAL_CHROMA.dark * BORDER_CHROMA_MULTIPLIER.dark,
			1e-9
		);
	});

	test('an override on the source knob moves the derived value', () => {
		const editor = create_editor();
		editor.set_value('neutral_chroma', '0.05', 'light');
		assert.closeTo(
			editor.resolved_value('border_color_chroma', 'light')!,
			0.05 * BORDER_CHROMA_MULTIPLIER.light,
			1e-9
		);
	});

	test('a direct pin wins over the derivation and reset re-derives', () => {
		const editor = create_editor();
		editor.set_value('border_color_chroma', '0.09', 'light');
		assert.strictEqual(editor.resolved_value('border_color_chroma', 'light'), 0.09);
		editor.reset('border_color_chroma');
		assert.closeTo(
			editor.resolved_value('border_color_chroma', 'light')!,
			NEUTRAL_CHROMA.light * BORDER_CHROMA_MULTIPLIER.light,
			1e-9
		);
	});

	test('a stanced base resolves the same value in both schemes', () => {
		const editor = create_editor();
		editor.load_theme(neon_theme);
		const light = editor.resolved_value('border_color_chroma', 'light');
		assert.isNotNull(light);
		assert.strictEqual(light, editor.resolved_value('border_color_chroma', 'dark'));
	});

	test('hue bindings resolve to their letter angles', () => {
		const editor = create_editor();
		assert.strictEqual(editor.resolved_value('hue_accent', 'light'), PALETTE_HUES.a);
		editor.set_value('hue_accent', 'var(--hue_c)', 'light');
		assert.strictEqual(editor.resolved_value('hue_accent', 'light'), PALETTE_HUES.c);
	});

	test('values outside the color system resolve to null', () => {
		const editor = create_editor();
		assert.isNull(editor.resolved_value('space_md', 'light'));
	});
});

describe('load_theme and dirty', () => {
	test('a fresh editor is clean; edits and scheme changes dirty it', () => {
		const editor = create_editor();
		assert.isFalse(editor.dirty);
		editor.set_value(single_slot_default.name, '2', 'light');
		assert.isTrue(editor.dirty);
		editor.reset(single_slot_default.name);
		assert.isFalse(editor.dirty);
		editor.set_scheme('dark');
		assert.isTrue(editor.dirty);
		editor.reset_all();
		assert.isFalse(editor.dirty);
	});

	test('loading a theme flattens it as the base and carries its stance', () => {
		const editor = create_editor();
		editor.set_value(single_slot_default.name, '2', 'light');
		editor.load_theme(neon_theme);
		assert.strictEqual(editor.based_on, neon_theme.name);
		assert.strictEqual(editor.overrides.size, 0);
		assert.strictEqual(editor.scheme, 'dark');
		assert.isFalse(editor.dirty);
		// the base theme's own variables flow into the merge
		const merged_names = new Set(editor.merged_variables.map((v) => v.name));
		for (const v of neon_theme.variables) {
			assert.isTrue(merged_names.has(v.name), v.name);
		}
	});

	test('the unsaved draft itself never loads as a base', () => {
		const editor = create_editor();
		editor.load_theme({ name: UNSAVED_THEME_NAME, variables: [] });
		assert.strictEqual(editor.based_on, 'base');
	});
});

describe('snapshots', () => {
	test('round-trips name, base, scheme, and overrides', () => {
		const editor = create_editor();
		editor.name = 'my theme';
		editor.load_theme(neon_theme);
		editor.set_value(single_slot_default.name, '1.4', 'light');
		const snapshot = editor.to_snapshot();

		const restored = create_editor();
		restored.restore_snapshot(snapshot);
		assert.strictEqual(restored.based_on, neon_theme.name);
		assert.strictEqual(restored.scheme, 'dark');
		assert.deepEqual(restored.overrides.get(single_slot_default.name), { light: '1.4' });
	});

	test('a stale snapshot referencing a removed theme falls back to the first', () => {
		const editor = create_editor();
		editor.restore_snapshot({
			name: 'x',
			based_on: 'deleted theme',
			scheme: 'dual',
			overrides: []
		});
		assert.strictEqual(editor.based_on, base_theme.name);
	});
});

describe('render_theme_ts', () => {
	test('a dual theme renders a plain module', () => {
		const ts = render_theme_ts({
			name: 'my theme',
			variables: [{ name: 'chroma_scale', light: '1.4' }]
		});
		assert.include(ts, 'export const my_theme_theme: Theme = {');
		assert.include(ts, "{name: 'chroma_scale', light: '1.4'},");
		assert.notInclude(ts, 'resolve_theme_stance');
	});

	test('a stanced theme renders the resolve-at-module-scope shape', () => {
		const ts = render_theme_ts({
			name: 'darkling',
			scheme: 'dark',
			variables: [{ name: 'neutral_chroma', light: '0.04' }]
		});
		assert.include(ts, "import {resolve_theme_stance} from '@fuzdev/fuz_css/theme_stance.ts';");
		assert.include(ts, "scheme: 'dark',");
		assert.include(ts, 'const authored: Theme = {');
		assert.include(ts, 'export const darkling_theme: Theme = resolve_theme_stance(authored);');
	});

	test('single quotes in values escape', () => {
		const ts = render_theme_ts({
			name: "it's",
			variables: [{ name: 'background_image', light: "url('x.png')" }]
		});
		assert.include(ts, "name: 'it\\'s'");
		assert.include(ts, "light: 'url(\\'x.png\\')'");
	});
});

describe('discard_confirm_message', () => {
	test('names the discarded work', () => {
		const editor = create_editor();
		editor.set_value(single_slot_default.name, '2', 'light');
		assert.include(discard_confirm_message(editor, 'neon'), '1 edited knob(s)');
		editor.reset_all();
		editor.set_scheme('dark');
		assert.include(discard_confirm_message(editor, 'neon'), 'scheme change');
	});
});

describe('gates', () => {
	test('an untouched draft passes the lint and gates', () => {
		const editor = create_editor();
		assert.deepEqual(editor.issues, []);
		assert.isTrue(editor.check_report.ok);
		assert.isAbove(editor.check_report.entries.length, 0);
	});

	test('a gate-breaking edit surfaces failing entries', () => {
		const editor = create_editor();
		// collapsing the shade lightness ramp to a single value breaks
		// monotonicity in both schemes
		editor.set_value('shade_lightness_00', '0.5', 'light');
		editor.set_value('shade_lightness_00', '0.5', 'dark');
		editor.set_value('shade_lightness_100', '0.5', 'light');
		editor.set_value('shade_lightness_100', '0.5', 'dark');
		assert.isFalse(editor.check_report.ok);
		assert.isTrue(
			editor.check_report.entries.some((e) => e.gate === 'monotonicity' && !e.pass),
			'the collapsed ramp fails the monotonicity gate'
		);
	});

	test('an unknown variable is a lint error', () => {
		const editor = create_editor();
		editor.set_value('not_a_real_variable', '1', 'light');
		assert.isTrue(
			editor.issues.some((i) => i.level === 'error' && i.variable === 'not_a_real_variable')
		);
	});
});
