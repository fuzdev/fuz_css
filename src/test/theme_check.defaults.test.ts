/**
 * Pins the resolver's built-in defaults to the shipped declarations. The
 * ramp-derived branches share their constants with `ramps.ts`, but the scalar
 * defaults (`chroma_scale`, the per-slot multipliers, ...) are restated in
 * `theme_check.ts`, so nothing else would notice them drifting from
 * `variables.ts`.
 */

import { test, assert, describe } from 'vitest';

import { create_theme_resolver } from '$lib/theme_check.ts';
import { theme_knobs } from '$lib/knobs.ts';
import { default_variables } from '$lib/variables.ts';
import { default_themes } from '$lib/themes.ts';
import { color_scheme_variants } from '$lib/variable_data.ts';

const base_theme = default_themes[0]!;

const declared = new Map(default_variables.map((v) => [v.name, v]));

describe('create_theme_resolver defaults', () => {
	test('every resolvable numeric knob default matches its declaration', () => {
		const resolver = create_theme_resolver(base_theme);
		let checked = 0;
		for (const knob of theme_knobs) {
			if (knob.kind !== 'number' && knob.kind !== 'hue') continue;
			const variable = declared.get(knob.name);
			if (!variable) continue;
			for (const scheme of color_scheme_variants) {
				const literal = scheme === 'dark' ? (variable.dark ?? variable.light) : variable.light;
				if (literal === undefined || !Number.isFinite(Number(literal))) continue;
				const resolved = resolver.resolve(knob.name, scheme);
				if (resolved === null) continue;
				assert.closeTo(
					resolved,
					Number(literal),
					1e-9,
					`${knob.name} (${scheme}) resolves to ${resolved} but declares ${literal}`
				);
				checked++;
			}
		}
		assert.isAbove(checked, 0);
	});

	test('the restated scalar defaults resolve', () => {
		const resolver = create_theme_resolver(base_theme);
		for (const name of [
			'chroma_scale',
			'neutral_chroma',
			'palette_a_chroma_scale',
			'palette_f_chroma_scale',
			'accent_chroma_scale',
			'border_color_lightness',
			'palette_chroma_min',
			'palette_lightness_00',
			'hue_a',
			'hue_accent'
		]) {
			for (const scheme of color_scheme_variants) {
				assert.isNotNull(resolver.resolve(name, scheme), `${name} (${scheme})`);
			}
		}
	});
});
