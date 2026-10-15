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
	BORDER_CHROMA_MULTIPLIER,
	PALETTE_LIGHTNESS_KNOBS,
	PALETTE_CHROMA_CAPS,
	ramp_lightness,
	ramp_chroma,
	ramp_chroma_shape,
	render_chroma_stop_css
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
				{ name: 'hue_accent', base: 'var(--hue_d)' },
				{ name: 'hue_d', base: '123' }
			]
		};
		assert.strictEqual(resolve_theme_knob(theme, 'hue_accent', 'light'), 123);
	});

	test('an intent follows an overridden default-bound letter', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'hue_a', base: '99' }] };
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
			variables: [{ name: 'palette_f_chroma_scale', base: '1' }]
		};
		assert.strictEqual(resolve_theme_knob(pinned, 'palette_f_chroma_scale', 'light'), 1);
	});

	test('self and mutual cycles resolve to null without hanging', () => {
		const self: Theme = { name: 't', variables: [{ name: 'hue_a', base: 'var(--hue_a)' }] };
		assert.strictEqual(resolve_theme_knob(self, 'hue_a', 'light'), null);
		const mutual: Theme = {
			name: 't',
			variables: [
				{ name: 'hue_a', base: 'var(--hue_b)' },
				{ name: 'hue_b', base: 'var(--hue_a)' }
			]
		};
		assert.strictEqual(resolve_theme_knob(mutual, 'hue_a', 'light'), null);
	});

	test('a cyclic theme still yields a report, unchecked and not ok', () => {
		const mutual: Theme = {
			name: 't',
			variables: [
				{ name: 'hue_a', base: 'var(--hue_b)' },
				{ name: 'hue_b', base: 'var(--hue_a)' }
			]
		};
		const report = check_theme(mutual);
		assert.isFalse(report.ok);
		assert.isAbove(report.unchecked.length, 0);
	});

	test('an unresolvable calc on a lightness knob leaves the affected gates unchecked', () => {
		const theme: Theme = {
			name: 't',
			variables: [{ name: 'text_lightness_curve', base: 'calc(1 + 2)' }]
		};
		assert.strictEqual(resolve_theme_knob(theme, '_text_lightness_50', 'light'), null);
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
			variables: [{ name: 'neutral_chroma', base: '0.05' }]
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
			variables: [{ name: 'border_color_chroma', base: '0.09' }]
		});
		assert.strictEqual(resolver.resolve('border_color_chroma', 'light'), 0.09);
	});

	test('pinned() reports authored variables only, excluding stance-mirror entries', () => {
		const resolver = create_theme_resolver({
			name: 't',
			variables: [{ name: 'chroma_scale', base: '0.5' }],
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
			variables: [{ name: 'shade_lightness_00', base: '0.5' }],
			scheme: 'dark'
		};
		assert.strictEqual(resolve_theme_knob(theme, 'shade_lightness_00', 'light'), 0.5);
	});
});

describe('ramp intermediates', () => {
	// the schema refuses these names, so the themes here skip it the way
	// untrusted input could; the renderer would emit what the theme carries,
	// so the resolver fails rather than reading the default
	test('an intermediate a theme sets resolves to nothing', () => {
		for (const variable of [
			{ name: '_chroma_shape_50', base: '0.5' },
			{ name: '_palette_lightness_30', base: '0.5' },
			{ name: '_shade_lightness_30', dark: '0.5' },
			{ name: '_palette_chroma_40', base: '0.01' },
			// the capped form, but for another stop
			{ name: '_palette_chroma_40', base: render_chroma_stop_css('50', 0.01) }
		]) {
			const resolver = create_theme_resolver({ name: 't', variables: [variable] });
			const scheme = variable.base === undefined ? 'dark' : 'light';
			assert.isNull(resolver.resolve(variable.name, scheme), JSON.stringify(variable));
		}
	});

	test('an unset intermediate derives from the knobs', () => {
		const defaults = create_theme_resolver({ name: 't', variables: [] });
		assert.closeTo(
			defaults.resolve('_palette_lightness_30', 'light')!,
			ramp_lightness(PALETTE_LIGHTNESS_KNOBS.light, '30'),
			1e-12
		);
		assert.closeTo(
			defaults.resolve('_palette_chroma_40', 'light')!,
			ramp_chroma('40', PALETTE_CHROMA_KNOBS.light, PALETTE_CHROMA_CAPS.light['40']),
			1e-12
		);
	});

	test('the shape is 1 at the midpoint and 0 at the ends, following chroma_curve', () => {
		const defaults = create_theme_resolver({ name: 't', variables: [] });
		assert.strictEqual(defaults.resolve('_chroma_shape_50', 'light'), 1);
		assert.strictEqual(defaults.resolve('_chroma_shape_00', 'light'), 0);
		const curved = create_theme_resolver({
			name: 't',
			variables: [{ name: 'chroma_curve', base: '2' }]
		});
		assert.closeTo(curved.resolve('_chroma_shape_20', 'light')!, ramp_chroma_shape('20', 2), 1e-12);
	});

	test('a compiled cap on a palette chroma stop is read', () => {
		const theme: Theme = {
			name: 't',
			variables: [{ name: '_palette_chroma_50', base: render_chroma_stop_css('50', 0.01) }]
		};
		const resolver = create_theme_resolver(theme);
		assert.strictEqual(resolver.resolve('_palette_chroma_50', 'light'), 0.01);
		assert.isTrue(resolver.pinned('_palette_chroma_50'));
	});

	test('a compiled cap reads through CSS whitespace but not U+00A0', () => {
		const cap = render_chroma_stop_css('50', 0.01);
		const resolve = (base: string) =>
			create_theme_resolver({
				name: 't',
				variables: [{ name: '_palette_chroma_50', base }]
			}).resolve('_palette_chroma_50', 'light');
		assert.strictEqual(resolve(`\n\t${cap.replace('min(', 'min(\n')} `), 0.01);
		assert.isNull(resolve(cap.replace('min(', 'min(\u00a0')));
		assert.isNull(resolve(`\u00a0${cap}`));
	});

	test('the public spelling resolves to nothing', () => {
		const defaults = create_theme_resolver({ name: 't', variables: [] });
		assert.isNull(defaults.resolve('palette_lightness_30', 'light'));
		assert.isNull(defaults.resolve('chroma_shape_50', 'light'));
		assert.isNull(defaults.resolve('palette_chroma_50', 'light'));
	});
});
