/**
 * Tests for the docs site's theme editor state: the slot-merge semantics,
 * scheme-stance re-slotting, display values, snapshots, the applied theme
 * and its sync with the page, and the copyable TypeScript output.
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
import { compose_themes } from '$lib/theme.ts';
import { base_theme } from '$lib/themes/base.ts';
import { marquee_theme } from '$lib/themes/marquee.ts';
import { default_variables } from '$lib/variables.ts';
import { NEUTRAL_CHROMA, BORDER_CHROMA_MULTIPLIER, PALETTE_HUES } from '$lib/ramps.ts';

const adaptive_default = default_variables.find((v) => v.name === 'shade_lightness_00')!;
const single_slot_default = default_variables.find((v) => v.name === 'chroma_scale')!;

const create_editor = (): ThemeEditorState =>
	new ThemeEditorState({ themes: [base_theme, marquee_theme] });

describe('initial state', () => {
	test('starts clean on the first theme, whatever it is named', () => {
		const editor = new ThemeEditorState({ themes: [marquee_theme, base_theme] });
		assert.strictEqual(editor.based_on, marquee_theme.name);
		assert.strictEqual(editor.scheme, 'dark');
		assert.isFalse(editor.dirty);
		assert.strictEqual(editor.name, 'new theme');
		editor.load_theme(base_theme);
		assert.strictEqual(editor.name, `custom ${base_theme.name}`);
	});
});

describe('gates and naming', () => {
	test('the base draft passes every gate', () => {
		const editor = create_editor();
		assert.isTrue(editor.gates_pass);
		assert.deepEqual(editor.failing_gates, []);
	});

	test('a draft that fails a gate lists it and no longer passes', () => {
		const editor = create_editor();
		editor.set_value('text_lightness_curve', '8', 'light');
		assert.isFalse(editor.gates_pass);
		assert.isAbove(editor.failing_gates.length, 0);
		assert.isTrue(editor.failing_gates.every((e) => !e.pass));
	});

	test('a name taken by a pickable theme or the unsaved draft collides', () => {
		const editor = create_editor();
		assert.isFalse(editor.name_collides);
		for (const name of [` ${marquee_theme.name} `, UNSAVED_THEME_NAME]) {
			editor.name = name;
			assert.isTrue(editor.name_collides, name);
		}
		assert.strictEqual(editor.trimmed_name, UNSAVED_THEME_NAME);
	});
});

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
	const merged_adaptive = (editor: ThemeEditorState) =>
		editor.merged_variables.find((v) => v.name === adaptive_default.name);

	test('entering a stance renders an existing override from the stanced slot', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		editor.set_scheme('dark');
		assert.deepEqual(merged_adaptive(editor), { name: adaptive_default.name, light: '0.25' });
	});

	test("a light stance doesn't render a dark-only override - that appearance never shows", () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		editor.set_scheme('light');
		assert.isUndefined(merged_adaptive(editor));
	});

	test("a dark stance doesn't render a light-only override - that appearance never shows", () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.95', 'light');
		editor.set_scheme('dark');
		assert.isUndefined(merged_adaptive(editor));
	});

	test('a single-slot override still renders under a dark stance', () => {
		const editor = create_editor();
		editor.set_value(single_slot_default.name, '2', 'light');
		editor.set_scheme('dark');
		assert.deepEqual(
			editor.merged_variables.find((v) => v.name === single_slot_default.name),
			{ name: single_slot_default.name, light: '2' }
		);
	});

	test('a stance round trip loses no edits', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.9', 'light');
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		const before = { ...editor.overrides.get(adaptive_default.name) };
		for (const stance of ['dark', 'light'] as const) {
			editor.set_scheme(stance);
			editor.set_scheme('dual');
			assert.deepEqual(editor.overrides.get(adaptive_default.name), before, stance);
		}
		assert.deepEqual(merged_adaptive(editor), {
			name: adaptive_default.name,
			light: '0.9',
			dark: '0.25'
		});
	});

	test('edits under a stance write the stanced slot and skip dark preservation', () => {
		const editor = create_editor();
		editor.set_scheme('dark');
		// whichever scheme is being viewed, the one appearance is the stance's
		editor.set_value(adaptive_default.name, '0.25', 'light');
		assert.deepEqual(editor.overrides.get(adaptive_default.name), { dark: '0.25' });
		// no preserved dark slot - the stance mirror owns untouched defaults
		assert.deepEqual(merged_adaptive(editor), { name: adaptive_default.name, light: '0.25' });
	});

	test('a stanced edit wins over an edit made before the stance', () => {
		const editor = create_editor();
		editor.set_value(adaptive_default.name, '0.25', 'dark');
		editor.set_scheme('dark');
		editor.set_value(adaptive_default.name, '0.3', 'dark');
		assert.deepEqual(merged_adaptive(editor), { name: adaptive_default.name, light: '0.3' });
	});

	test('a single-slot variable edits the base slot under a stance, so it holds after it', () => {
		const editor = create_editor();
		editor.set_scheme('dark');
		editor.set_value(single_slot_default.name, '2', 'dark');
		assert.deepEqual(editor.overrides.get(single_slot_default.name), { light: '2' });
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
	// a dual base authoring both slots itself - like zine
	const dual_base: Theme = {
		name: 'dualish',
		variables: [
			{ name: 'shade_lightness_00', light: '0.9', dark: '0.3' },
			{ name: 'chroma_scale', light: '1.4' }
		]
	};
	const create_dual_editor = (): ThemeEditorState => {
		const editor = new ThemeEditorState({ themes: [base_theme, dual_base] });
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
		editor.load_theme(marquee_theme);
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
		editor.load_theme(marquee_theme);
		assert.strictEqual(editor.based_on, marquee_theme.name);
		assert.strictEqual(editor.overrides.size, 0);
		assert.strictEqual(editor.scheme, 'dark');
		assert.isFalse(editor.dirty);
		// the base theme's own variables flow into the merge
		const merged_names = new Set(editor.merged_variables.map((v) => v.name));
		for (const v of marquee_theme.variables) {
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
		editor.load_theme(marquee_theme);
		editor.name = 'my theme'; // after the load, which renames the draft
		editor.set_value(single_slot_default.name, '1.4', 'light');
		const snapshot = editor.to_snapshot();

		const restored = create_editor();
		restored.restore_snapshot(snapshot);
		assert.strictEqual(restored.name, 'my theme');
		assert.strictEqual(restored.based_on, marquee_theme.name);
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

	test('a name leading with a digit takes the prefix form, a valid identifier', () => {
		const ts = render_theme_ts({ name: '90s web', variables: [] });
		assert.include(ts, 'export const theme_90s_web: Theme = {');
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
		assert.include(discard_confirm_message(editor, 'marquee'), '1 edited knob(s)');
		editor.reset_all();
		editor.set_scheme('dark');
		assert.include(discard_confirm_message(editor, 'marquee'), 'scheme change');
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

describe('applied theme', () => {
	const high: Theme = { name: 'high', variables: [{ name: 'chroma_scale', light: '1.5' }] };
	const low: Theme = { name: 'low', variables: [{ name: 'chroma_scale', light: '0.5' }] };
	const create_contrast_editor = (): ThemeEditorState =>
		new ThemeEditorState({ themes: [base_theme, marquee_theme], contrast_modifiers: [low, high] });

	test('a clean editor applies and picks its base', () => {
		const editor = create_contrast_editor();
		assert.strictEqual(editor.applied_theme, base_theme);
		assert.strictEqual(editor.picked_theme, base_theme);
		assert.deepEqual(editor.picker_themes, [base_theme, marquee_theme]);
	});

	test('a dirty editor applies and picks its draft, which joins the picker', () => {
		const editor = create_contrast_editor();
		editor.set_value(single_slot_default.name, '2', 'light');
		assert.strictEqual(editor.applied_theme.name, UNSAVED_THEME_NAME);
		// read outside a reactive context a derived recomputes, so compare by value
		assert.deepEqual(editor.picked_theme, editor.draft);
		assert.deepEqual(editor.picker_themes.at(-1), editor.draft);
	});

	test('the contrast modifier composes over the base, and over a draft under its stable name', () => {
		const editor = create_contrast_editor();
		editor.contrast_modifier = high;
		assert.strictEqual(editor.applied_theme.name, 'base (high)');
		// the picker still highlights the base, not the composition
		assert.strictEqual(editor.picked_theme, base_theme);
		editor.set_value(single_slot_default.name, '2', 'light');
		assert.strictEqual(editor.applied_theme.name, UNSAVED_THEME_NAME);
		assert.isDefined(editor.applied_theme.variables.find((v) => v.name === 'chroma_scale'));
	});

	test('load_theme_guarded loads over a clean editor without asking', () => {
		const editor = create_contrast_editor();
		let asked = 0;
		assert.isTrue(editor.load_theme_guarded(marquee_theme, () => (asked++, true)));
		assert.strictEqual(asked, 0);
		assert.strictEqual(editor.based_on, marquee_theme.name);
	});

	test('load_theme_guarded keeps a dirty draft when the discard is declined', () => {
		const editor = create_contrast_editor();
		editor.set_value(single_slot_default.name, '2', 'light');
		let message = '';
		assert.isFalse(editor.load_theme_guarded(marquee_theme, (m) => ((message = m), false)));
		assert.include(message, marquee_theme.name);
		assert.strictEqual(editor.based_on, base_theme.name);
		assert.isTrue(editor.dirty);
		assert.isTrue(editor.load_theme_guarded(marquee_theme, () => true));
		assert.isFalse(editor.dirty);
	});

	test('load_theme_guarded ignores the draft itself', () => {
		const editor = create_contrast_editor();
		editor.set_value(single_slot_default.name, '2', 'light');
		assert.isFalse(editor.load_theme_guarded(editor.draft, () => true));
		assert.isTrue(editor.dirty);
	});

	test('sync_applied_theme adopts an applied base by name', () => {
		const editor = create_contrast_editor();
		// a theme restored from storage is an equal value, not the same object
		assert.isTrue(editor.sync_applied_theme(structuredClone(marquee_theme)));
		assert.strictEqual(editor.base_theme, marquee_theme);
		assert.strictEqual(editor.scheme, marquee_theme.scheme);
		assert.isNull(editor.contrast_modifier);
		assert.strictEqual(editor.applied_theme, marquee_theme);
	});

	test('sync_applied_theme adopts an applied contrast composition', () => {
		const editor = create_contrast_editor();
		const applied = compose_themes(marquee_theme, high);
		assert.isTrue(editor.sync_applied_theme(applied));
		assert.strictEqual(editor.base_theme, marquee_theme);
		assert.strictEqual(editor.contrast_modifier, high);
		assert.strictEqual(editor.applied_theme.name, applied.name);
	});

	test('sync_applied_theme clears a modifier the applied theme lacks', () => {
		const editor = create_contrast_editor();
		editor.contrast_modifier = low;
		assert.isTrue(editor.sync_applied_theme(marquee_theme));
		assert.isNull(editor.contrast_modifier);
	});

	test('sync_applied_theme leaves a dirty editor, the draft, and unknown themes alone', () => {
		const editor = create_contrast_editor();
		assert.isFalse(editor.sync_applied_theme({ name: 'stranger', variables: [] }));
		assert.isFalse(editor.sync_applied_theme({ name: UNSAVED_THEME_NAME, variables: [] }));
		assert.strictEqual(editor.based_on, base_theme.name);
		editor.set_value(single_slot_default.name, '2', 'light');
		assert.isFalse(editor.sync_applied_theme(marquee_theme));
		assert.strictEqual(editor.based_on, base_theme.name);
	});

	test('the snapshot round-trips the contrast modifier, and tolerates one without it', () => {
		const editor = create_contrast_editor();
		editor.contrast_modifier = high;
		const restored = create_contrast_editor();
		restored.restore_snapshot(editor.to_snapshot());
		assert.strictEqual(restored.contrast_modifier, high);
		restored.restore_snapshot({ name: 'x', based_on: 'base', scheme: 'dual', overrides: [] });
		assert.isNull(restored.contrast_modifier);
	});
});
