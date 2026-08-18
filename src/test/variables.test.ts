import { test, assert } from 'vitest';

import { default_variables } from '$lib/variables.ts';
import { StyleVariable } from '$lib/variable.ts';
import { PALETTE_CHROMA_MULTIPLIERS } from '$lib/ramps.ts';
import {
	palette_variants,
	intent_variants,
	palette_glosses,
	numeric_scale_variants,
	font_size_variants,
	line_height_variants,
	space_variants,
	distance_variants,
	border_radius_variants,
	border_width_variants,
	icon_size_variants,
	shadow_size_variants,
	shadow_variant_prefixes
} from '$lib/variable_data.ts';

test('all variables pass schema validation', () => {
	for (const v of default_variables) {
		const result = StyleVariable.safeParse(v);
		assert.isTrue(
			result.success,
			`variable "${v.name}" failed validation: ${JSON.stringify(result.error?.issues)}`
		);
	}
});

test('variables have no duplicates', () => {
	const names = new Set();
	for (const v of default_variables) {
		assert.isFalse(
			names.has(v.name),
			`variable "${v.name}" is duplicated in \`default_variables\``
		);
		names.add(v.name);
	}
});

test('the loop-built families cover every variant list', () => {
	// the families are spread in from loops over `variable_data.ts`, so a
	// variant added there without a matching family (or vice versa) shows up
	// here rather than as a silently missing token
	const names = new Set(default_variables.map((v) => v.name));
	const expected = [
		...palette_variants.flatMap((letter) => [
			`hue_${letter}`,
			`palette_${letter}_chroma_scale`,
			...numeric_scale_variants.map((stop) => `palette_${letter}_${stop}`)
		]),
		...intent_variants.flatMap((intent) => [
			`hue_${intent}`,
			`${intent}_chroma_scale`,
			...numeric_scale_variants.map((stop) => `${intent}_${stop}`)
		]),
		...numeric_scale_variants.flatMap((stop) => [
			`chroma_shape_${stop}`,
			`palette_chroma_${stop}`,
			`shade_${stop}`,
			`text_${stop}`,
			`darken_${stop}`,
			`lighten_${stop}`,
			`fg_${stop}`,
			`bg_${stop}`,
			`border_color_${stop}`,
			`shadow_alpha_${stop}`
		]),
		...(['palette', 'shade', 'text'] as const).flatMap((family) =>
			['00', '100', 'curve', ...numeric_scale_variants.slice(1, -1)].map(
				(stop) => `${family}_lightness_${stop}`
			)
		),
		...font_size_variants.map((size) => `font_size_${size}`),
		...line_height_variants.map((size) => `line_height_${size}`),
		...space_variants.map((size) => `space_${size}`),
		...distance_variants.map((size) => `distance_${size}`),
		...border_radius_variants.map((size) => `border_radius_${size}`),
		...border_width_variants.map((width) => `border_width_${width}`),
		...icon_size_variants.map((size) => `icon_size_${size}`),
		...shadow_size_variants.flatMap((size) =>
			shadow_variant_prefixes.map((prefix) => `${prefix}${size}`)
		)
	];
	const missing = expected.filter((name) => !names.has(name));
	assert.deepEqual(missing, []);
});

test('per-slot chroma multiplier defaults pin the numeric twin', () => {
	// the emitted CSS falls back to 1 when the variable is absent, so the
	// declared defaults are what keep the CSS and the numeric-twin gates
	// agreeing - brown's 0.55 mute in particular
	const by_name = new Map(default_variables.map((v) => [v.name, v]));
	for (const letter of palette_variants) {
		const v = by_name.get(`palette_${letter}_chroma_scale`);
		assert(v, `palette_${letter}_chroma_scale is declared`);
		assert.strictEqual(v.light, String(PALETTE_CHROMA_MULTIPLIERS[letter]), v.name);
		assert.isUndefined(v.dark, `${v.name} is scheme-agnostic`);
	}
	for (const intent of intent_variants) {
		const v = by_name.get(`${intent}_chroma_scale`);
		assert(v, `${intent}_chroma_scale is declared`);
		assert.strictEqual(v.light, '1', v.name);
	}
});

test('intent hue defaults agree with palette_glosses bindings', () => {
	// theme_check derives its numeric-twin bindings from palette_glosses, so a
	// hand-edit to a hue_<intent> default here without the gloss (or vice
	// versa) would make the gates evaluate the wrong hue
	const by_name = new Map(default_variables.map((v) => [v.name, v]));
	for (const [letter, gloss] of Object.entries(palette_glosses)) {
		if (!gloss.binding) continue;
		const v = by_name.get(`hue_${gloss.binding}`);
		assert(v, `hue_${gloss.binding} is declared`);
		assert.strictEqual(v.light, `var(--hue_${letter})`, v.name);
	}
});
