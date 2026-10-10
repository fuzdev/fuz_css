import { test, assert, describe } from 'vitest';

import { check_theme } from '#lib/theme_check.ts';
import { create_theme_resolver } from '#lib/theme_resolver.ts';
import type { Theme } from '#lib/variable.ts';
import { base_theme } from '#lib/themes/base.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';
import {
	PALETTE_HUES,
	PALETTE_CHROMA_MULTIPLIERS,
	SHADE_LIGHTNESS_KNOBS,
	PALETTE_CHROMA_KNOBS,
	NEUTRAL_CHROMA,
	BORDER_CHROMA_MULTIPLIER
} from '#lib/ramps.ts';

// per-call resolver over the shared resolution core, for direct tests of the
// resolution rules (binding chains, cycles, unresolvable expressions)
const resolve_theme_knob = (theme: Theme, name: string, scheme: 'light' | 'dark'): number | null =>
	create_theme_resolver(theme).resolve(name, scheme);

describe('resolution', () => {
	test('intent hues follow their default letter binding', () => {
		assert.strictEqual(resolve_theme_knob(base_theme, 'hue_accent', 'light'), PALETTE_HUES.a);
		assert.strictEqual(resolve_theme_knob(base_theme, 'hue_neutral', 'light'), PALETTE_HUES.f);
	});

	test('binding chains resolve through an explicit override', () => {
		const theme: Theme = {
			name: 't',
			variables: [
				{ name: 'hue_accent', light: 'var(--hue_d)' },
				{ name: 'hue_d', light: '123' }
			]
		};
		assert.strictEqual(resolve_theme_knob(theme, 'hue_accent', 'light'), 123);
	});

	test('an intent follows an overridden default-bound letter', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'hue_a', light: '99' }] };
		assert.strictEqual(resolve_theme_knob(theme, 'hue_accent', 'light'), 99);
	});

	test('chroma multipliers resolve to their defaults and honor pins', () => {
		const empty: Theme = { name: 't', variables: [] };
		assert.strictEqual(
			resolve_theme_knob(empty, 'palette_f_chroma_scale', 'light'),
			PALETTE_CHROMA_MULTIPLIERS.f
		);
		assert.strictEqual(resolve_theme_knob(empty, 'palette_a_chroma_scale', 'light'), 1);
		assert.strictEqual(resolve_theme_knob(empty, 'accent_chroma_scale', 'light'), 1);
		const pinned: Theme = {
			name: 't',
			variables: [{ name: 'palette_f_chroma_scale', light: '1' }]
		};
		assert.strictEqual(resolve_theme_knob(pinned, 'palette_f_chroma_scale', 'light'), 1);
	});

	test('self and mutual cycles resolve to null without hanging', () => {
		const self: Theme = { name: 't', variables: [{ name: 'hue_a', light: 'var(--hue_a)' }] };
		assert.strictEqual(resolve_theme_knob(self, 'hue_a', 'light'), null);
		const mutual: Theme = {
			name: 't',
			variables: [
				{ name: 'hue_a', light: 'var(--hue_b)' },
				{ name: 'hue_b', light: 'var(--hue_a)' }
			]
		};
		assert.strictEqual(resolve_theme_knob(mutual, 'hue_a', 'light'), null);
	});

	test('a cyclic theme still yields a report, unchecked and not ok', () => {
		const mutual: Theme = {
			name: 't',
			variables: [
				{ name: 'hue_a', light: 'var(--hue_b)' },
				{ name: 'hue_b', light: 'var(--hue_a)' }
			]
		};
		const report = check_theme(mutual);
		assert.isFalse(report.ok);
		assert.isAbove(report.unchecked.length, 0);
	});

	test('an unresolvable calc on a lightness knob leaves the affected gates unchecked', () => {
		const theme: Theme = {
			name: 't',
			variables: [{ name: 'text_lightness_curve', light: 'calc(1 + 2)' }]
		};
		assert.strictEqual(resolve_theme_knob(theme, 'text_lightness_50', 'light'), null);
		const report = check_theme(theme);
		assert.isFalse(report.ok);
		assert.isTrue(report.unchecked.some((u) => u.variable === 'text_lightness_curve'));
	});
});

describe('create_theme_resolver', () => {
	test('resolves the derived border_color_chroma default per scheme', () => {
		const resolver = create_theme_resolver({ name: 't', variables: [] });
		assert.closeTo(
			resolver.resolve('border_color_chroma', 'light')!,
			NEUTRAL_CHROMA.light * BORDER_CHROMA_MULTIPLIER.light,
			1e-9
		);
		assert.closeTo(
			resolver.resolve('border_color_chroma', 'dark')!,
			NEUTRAL_CHROMA.dark * BORDER_CHROMA_MULTIPLIER.dark,
			1e-9
		);
	});

	test('the derivation tracks a theme-pinned neutral_chroma', () => {
		const resolver = create_theme_resolver({
			name: 't',
			variables: [{ name: 'neutral_chroma', light: '0.05' }]
		});
		assert.closeTo(
			resolver.resolve('border_color_chroma', 'light')!,
			0.05 * BORDER_CHROMA_MULTIPLIER.light,
			1e-9
		);
	});

	test('a pinned border_color_chroma wins over the derivation', () => {
		const resolver = create_theme_resolver({
			name: 't',
			variables: [{ name: 'border_color_chroma', light: '0.09' }]
		});
		assert.strictEqual(resolver.resolve('border_color_chroma', 'light'), 0.09);
	});

	test('pinned() reports authored variables only, excluding stance-mirror entries', () => {
		const resolver = create_theme_resolver({
			name: 't',
			variables: [{ name: 'chroma_scale', light: '0.5' }],
			scheme: 'dark'
		});
		assert.isTrue(resolver.pinned('chroma_scale'));
		assert.isFalse(resolver.pinned('shade_lightness_00'));
		// the mirror still resolves through: light reads the dark default
		assert.strictEqual(
			resolver.resolve('shade_lightness_00', 'light'),
			SHADE_LIGHTNESS_KNOBS.dark.lightness_00
		);
	});

	test('a dark stance derives border_color_chroma identically in both schemes', () => {
		const resolver = create_theme_resolver(marquee_theme);
		const light = resolver.resolve('border_color_chroma', 'light');
		const dark = resolver.resolve('border_color_chroma', 'dark');
		assert.isNotNull(light);
		assert.strictEqual(light, dark);
	});

	test('values outside the color system resolve to null', () => {
		const resolver = create_theme_resolver({ name: 't', variables: [] });
		assert.isNull(resolver.resolve('space_md', 'light'));
		assert.isNull(resolver.resolve('button_shadow', 'light'));
	});
});

describe('scheme stance', () => {
	test('a dark stance resolves light-scheme knobs to the dark defaults', () => {
		const theme: Theme = { name: 't', variables: [], scheme: 'dark' };
		assert.strictEqual(
			resolve_theme_knob(theme, 'shade_lightness_00', 'light'),
			SHADE_LIGHTNESS_KNOBS.dark.lightness_00
		);
		assert.strictEqual(
			resolve_theme_knob(theme, 'palette_chroma_max', 'light'),
			PALETTE_CHROMA_KNOBS.dark.chroma_max
		);
	});

	test('an authored value beats the stance mirror', () => {
		const theme: Theme = {
			name: 't',
			variables: [{ name: 'shade_lightness_00', light: '0.5' }],
			scheme: 'dark'
		};
		assert.strictEqual(resolve_theme_knob(theme, 'shade_lightness_00', 'light'), 0.5);
	});
});

describe('pinned chroma shape', () => {
	test('the resolver reads a pinned chroma_shape_NN through the palette chroma stop', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'chroma_shape_50', light: '0.5' }] };
		const resolver = create_theme_resolver(theme);
		assert.strictEqual(resolver.resolve('chroma_shape_50', 'light'), 0.5);
		const { chroma_min, chroma_max } = PALETTE_CHROMA_KNOBS.light;
		assert.closeTo(
			resolver.resolve('palette_chroma_50', 'light')!,
			chroma_min + (chroma_max - chroma_min) * 0.5,
			1e-12
		);
		// unpinned stops keep the curve-derived shape: 1 at the midpoint, 0 at the ends
		const defaults = create_theme_resolver({ name: 't', variables: [] });
		assert.strictEqual(defaults.resolve('chroma_shape_50', 'light'), 1);
		assert.strictEqual(defaults.resolve('chroma_shape_00', 'light'), 0);
	});
});
