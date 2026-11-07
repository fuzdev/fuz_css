/**
 * Pins the resolver's built-in defaults to the shipped declarations. The
 * ramp-derived branches share their constants with `ramps.ts`, but the scalar
 * defaults (`chroma_scale`, the per-slot multipliers, ...) are restated in
 * `theme_resolver.ts`, so nothing else would notice them drifting from
 * `variables.ts`.
 */

import { test, assert, describe } from 'vitest';

import { create_theme_resolver } from '#lib/theme_resolver.ts';
import { theme_knobs } from '#lib/knobs.ts';
import { default_variables } from '#lib/variables.ts';
import { base_theme } from '#lib/themes/base.ts';
import { color_scheme_variants } from '#lib/variable_data.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';
import {
	CONTRAST_CURVE_BEND,
	CONTRAST_GROUND_END,
	HIGH_CONTRAST,
	SHADE_LIGHTNESS_KNOBS,
	TEXT_LIGHTNESS_KNOBS,
	ramp_lightness,
	to_lightness_stop_name
} from '#lib/ramps.ts';

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
				const literal = scheme === 'dark' ? (variable.dark ?? variable.base) : variable.base;
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
			'shade_chroma_00',
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

	test('the ground tint resolves to what renders, held at the ground lightness', () => {
		const resolver = create_theme_resolver({
			name: 't',
			variables: [
				{ name: 'shade_chroma_00', base: '0.1' },
				{ name: 'shade_lightness_00', base: '0.98', dark: '0.2' }
			]
		});
		assert.strictEqual(resolver.resolve('shade_chroma_00', 'light'), 0.1);
		assert.closeTo(resolver.resolve('_shade_ground_chroma', 'light')!, 0.46 * 0.02, 1e-12);
		assert.closeTo(resolver.resolve('_shade_ground_chroma', 'dark')!, 0.169 * 0.2, 1e-12);
		// a tint the ground carries resolves unchanged
		const carried = create_theme_resolver({
			name: 'carried',
			variables: [{ name: 'shade_chroma_00', base: '0.005' }]
		});
		assert.strictEqual(carried.resolve('_shade_ground_chroma', 'light'), 0.005);
	});

	test('the contrast intermediates are the knobs at the default contrast', () => {
		const resolver = create_theme_resolver(base_theme);
		for (const scheme of color_scheme_variants) {
			assert.strictEqual(resolver.resolve('contrast', scheme), 0);
			assert.strictEqual(resolver.resolve('_contrast_preference', scheme), 0);
			assert.strictEqual(resolver.resolve('_contrast', scheme), 0);
			assert.strictEqual(
				resolver.resolve('_contrast_ground_end', scheme),
				CONTRAST_GROUND_END[scheme]
			);
			assert.strictEqual(
				resolver.resolve('_shade_lightness_00', scheme),
				resolver.resolve('shade_lightness_00', scheme)
			);
			assert.strictEqual(
				resolver.resolve('_shade_lightness_curve', scheme),
				resolver.resolve('shade_lightness_curve', scheme)
			);
			assert.strictEqual(
				resolver.resolve('_text_lightness_curve', scheme),
				resolver.resolve('text_lightness_curve', scheme)
			);
		}
	});

	test('the contrast intermediates move by the effective contrast', () => {
		const c = HIGH_CONTRAST;
		const resolver = create_theme_resolver({
			name: 't',
			variables: [{ name: 'contrast', base: String(c) }]
		});
		for (const scheme of color_scheme_variants) {
			const shade = SHADE_LIGHTNESS_KNOBS[scheme];
			const text = TEXT_LIGHTNESS_KNOBS[scheme];
			const end = CONTRAST_GROUND_END[scheme];
			const ground = shade.lightness_00 + (end - shade.lightness_00) * c;
			const shade_curve = shade.curve * (1 - CONTRAST_CURVE_BEND * c);
			const text_curve = text.curve * (1 - CONTRAST_CURVE_BEND * c);
			assert.strictEqual(resolver.resolve('_contrast', scheme), c);
			// the preference input stays 0 - the gates measure the theme
			assert.strictEqual(resolver.resolve('_contrast_preference', scheme), 0);
			assert.closeTo(resolver.resolve('_shade_lightness_00', scheme)!, ground, 1e-12);
			assert.closeTo(resolver.resolve('_shade_lightness_curve', scheme)!, shade_curve, 1e-12);
			assert.closeTo(resolver.resolve('_text_lightness_curve', scheme)!, text_curve, 1e-12);
			// the knobs themselves don't move
			assert.strictEqual(resolver.resolve('shade_lightness_00', scheme), shade.lightness_00);
			// the derived stops ride the intermediates; the far ends stay the knobs
			const shade_knobs = { ...shade, lightness_00: ground, curve: shade_curve };
			const text_knobs = { ...text, curve: text_curve };
			for (const stop of ['10', '50', '90'] as const) {
				assert.closeTo(
					resolver.resolve(to_lightness_stop_name('shade', stop), scheme)!,
					ramp_lightness(shade_knobs, stop),
					1e-12
				);
				assert.closeTo(
					resolver.resolve(to_lightness_stop_name('text', stop), scheme)!,
					ramp_lightness(text_knobs, stop),
					1e-12
				);
			}
			assert.strictEqual(resolver.resolve('text_lightness_00', scheme), text.lightness_00);
		}
	});

	test('the ground end clamps to the ground, so a ground past it stays put', () => {
		const resolver = create_theme_resolver({
			name: 't',
			variables: [
				{ name: 'shade_lightness_00', base: '0.97', dark: '0.05' },
				{ name: 'contrast', base: '0.5' }
			]
		});
		// the dark ground already sits below the dark end, so it doesn't lift
		assert.strictEqual(resolver.resolve('_contrast_ground_end', 'dark'), 0.05);
		assert.strictEqual(resolver.resolve('_shade_lightness_00', 'dark'), 0.05);
		// the light ground still moves halfway to its end
		assert.strictEqual(resolver.resolve('_contrast_ground_end', 'light'), 1);
		assert.closeTo(resolver.resolve('_shade_lightness_00', 'light')!, 0.985, 1e-12);
		// the curves still bend
		assert.closeTo(
			resolver.resolve('_shade_lightness_curve', 'dark')!,
			SHADE_LIGHTNESS_KNOBS.dark.curve * (1 - CONTRAST_CURVE_BEND * 0.5),
			1e-12
		);
	});

	test('a stanced theme resolves its ground end from its stance', () => {
		// marquee is dark-only, so the dark end applies in both schemes, as its
		// mirror renders - its ground moves halfway to it under high
		const high = create_theme_resolver({
			...marquee_theme,
			variables: [...marquee_theme.variables, { name: 'contrast', base: String(HIGH_CONTRAST) }]
		});
		const own = SHADE_LIGHTNESS_KNOBS.dark.lightness_00;
		assert.strictEqual(own, 0.171);
		for (const scheme of color_scheme_variants) {
			assert.strictEqual(high.resolve('_contrast_ground_end', scheme), CONTRAST_GROUND_END.dark);
			assert.closeTo(high.resolve('_shade_lightness_00', scheme)!, 0.1355, 1e-12);
		}
		const resolver = create_theme_resolver({
			...marquee_theme,
			variables: [...marquee_theme.variables, { name: 'contrast', base: '1' }]
		});
		for (const scheme of color_scheme_variants) {
			assert.strictEqual(
				resolver.resolve('_contrast_ground_end', scheme),
				CONTRAST_GROUND_END.dark
			);
			assert.closeTo(
				resolver.resolve('_shade_lightness_00', scheme)!,
				CONTRAST_GROUND_END.dark,
				1e-12
			);
		}
	});
});
