import { test, assert, describe } from 'vitest';

import {
	theme_knobs,
	theme_knob_by_name,
	theme_knob_hook_names,
	theme_knob_axes,
	HUE_BINDING_MATCHER
} from '$lib/knobs.ts';
import { default_variables } from '$lib/variables.ts';
import { PALETTE_LETTER_MATCHER, VAR_MATCHER } from '$lib/theme_resolver.ts';

const declared_names = new Set(default_variables.map((v) => v.name));

describe('theme_knobs', () => {
	test('every knob axis is in the editor axis list', () => {
		// a knob on an unlisted axis would silently vanish from the editor
		const axes = new Set(theme_knob_axes.map((a) => a.axis));
		for (const knob of theme_knobs) {
			assert.isTrue(axes.has(knob.axis), `Knob "${knob.name}" axis "${knob.axis}" is unlisted`);
		}
	});

	test('knob names are unique', () => {
		const names = theme_knobs.map((k) => k.name);
		assert.strictEqual(new Set(names).size, names.length);
	});

	test('non-hook knobs resolve to declared variables', () => {
		for (const knob of theme_knobs) {
			if (knob.hook) continue;
			assert.isTrue(
				declared_names.has(knob.name),
				`Knob "${knob.name}" is not declared in default_variables`
			);
		}
	});

	test('hook knobs are not declared variables', () => {
		// a hook knob that gains a declaration should drop its stale `hook` flag
		for (const name of theme_knob_hook_names) {
			assert.isFalse(
				declared_names.has(name),
				`Hook knob "${name}" is declared in default_variables - remove its hook flag`
			);
		}
	});

	test('ranges and steps are sane', () => {
		for (const knob of theme_knobs) {
			if (knob.range) {
				assert.isBelow(knob.range[0], knob.range[1], `Knob "${knob.name}" has an inverted range`);
			}
			if (knob.step !== undefined) {
				assert.isAbove(knob.step, 0, `Knob "${knob.name}" has a nonpositive step`);
			}
			if (knob.kind === 'enum') {
				assert.isAbove(knob.values?.length ?? 0, 0, `Enum knob "${knob.name}" needs values`);
			}
		}
	});

	test('palette tier is exactly the letter hues and their chroma multipliers', () => {
		const palette_names = theme_knobs.filter((k) => k.tier === 'palette').map((k) => k.name);
		assert.deepEqual(palette_names, [
			'hue_a',
			'hue_b',
			'hue_c',
			'hue_d',
			'hue_e',
			'hue_f',
			'hue_g',
			'hue_h',
			'hue_i',
			'hue_j',
			'palette_a_chroma_scale',
			'palette_b_chroma_scale',
			'palette_c_chroma_scale',
			'palette_d_chroma_scale',
			'palette_e_chroma_scale',
			'palette_f_chroma_scale',
			'palette_g_chroma_scale',
			'palette_h_chroma_scale',
			'palette_i_chroma_scale',
			'palette_j_chroma_scale'
		]);
	});

	test('theme_knob_by_name indexes every knob', () => {
		assert.strictEqual(theme_knob_by_name.size, theme_knobs.length);
		for (const knob of theme_knobs) {
			assert.strictEqual(theme_knob_by_name.get(knob.name), knob);
		}
	});
});

describe('HUE_BINDING_MATCHER', () => {
	test('reads a binding exactly where the theme resolver follows one', () => {
		for (const value of [
			'var(--hue_a)',
			'var( --hue_c )',
			' var(--hue_j) ',
			'var(--hue_k)',
			'var(--hue_accent)',
			'var(--hue_a, 10)',
			'calc(var(--hue_a))',
			'250'
		]) {
			const resolver_letter = PALETTE_LETTER_MATCHER.exec(
				VAR_MATCHER.exec(value.trim())?.[1] ?? ''
			)?.[1];
			assert.strictEqual(HUE_BINDING_MATCHER.exec(value)?.[1], resolver_letter, value);
		}
	});
});
