import { test, assert, describe } from 'vitest';

import {
	validate_theme,
	check_theme,
	create_theme_resolver,
	GATE_BODY_TEXT,
	GATE_SUBTLE_TEXT,
	GATE_LINK,
	GATE_UI,
	GATE_FILL_TEXT,
	GATE_SELECTED_TEXT,
	GATE_BORDER,
	GATE_BORDER_DIVIDER
} from '$lib/theme_check.ts';
import { resolve_theme_stance } from '$lib/theme_stance.ts';
import { compose_themes } from '$lib/theme.ts';
import type { Theme } from '$lib/variable.ts';
import { default_themes, contrast_modifiers } from '$lib/themes.ts';
import { low_contrast_theme } from '$lib/themes/low_contrast.ts';
import { high_contrast_theme } from '$lib/themes/high_contrast.ts';
import { ember_theme } from '$lib/themes/ember.ts';
import { parchment_theme } from '$lib/themes/parchment.ts';
import { concrete_theme } from '$lib/themes/concrete.ts';
import { phosphor_theme } from '$lib/themes/phosphor.ts';
import { neon_theme } from '$lib/themes/neon.ts';
import { nineties_theme } from '$lib/themes/nineties.ts';
import { create_monochrome_theme } from './test_helpers.ts';
import {
	PALETTE_HUES,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_MULTIPLIERS,
	SHADE_LIGHTNESS_KNOBS,
	NEUTRAL_CHROMA,
	BORDER_CHROMA_MULTIPLIER,
	palette_stop_oklch,
	shade_stop_oklch
} from '$lib/ramps.ts';
import { oklch_to_srgb } from '$lib/oklch.ts';
import { wcag_contrast_ratio } from '$lib/wcag.ts';

const base_theme = default_themes[0]!;

// per-call resolver over the shared resolution core, for direct tests of the
// resolution rules (binding chains, cycles, unresolvable expressions)
const resolve_theme_knob = (theme: Theme, name: string, scheme: 'light' | 'dark'): number | null =>
	create_theme_resolver(theme).resolve(name, scheme);

describe('validate_theme', () => {
	test('registry and exemplar themes produce no errors', () => {
		const themes = [
			...default_themes,
			ember_theme,
			parchment_theme,
			concrete_theme,
			phosphor_theme,
			neon_theme,
			nineties_theme,
			create_monochrome_theme(70) // amber, exercises the palette-tier collapse
		];
		for (const theme of themes) {
			const errors = validate_theme(theme).filter((issue) => issue.level === 'error');
			assert.deepEqual(errors, [], `${theme.name}: ${JSON.stringify(errors)}`);
		}
	});

	test('an empty theme is valid', () => {
		assert.deepEqual(validate_theme({ name: 'base', variables: [] }), []);
	});

	test('a blank name is an error', () => {
		assert.isTrue(validate_theme({ name: '', variables: [] }).some((i) => i.level === 'error'));
	});

	test('an unknown variable name is an error', () => {
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'not_a_real_var', light: '1' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'error' && i.variable === 'not_a_real_var'));
	});

	test('a malformed StyleVariable is an error', () => {
		// light === dark trips the schema refine
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'chroma_scale', light: '1', dark: '1' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'error'));
	});

	test('an out-of-range number is a warning, not an error', () => {
		const issues = validate_theme({ name: 't', variables: [{ name: 'chroma_scale', light: '5' }] });
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'chroma_scale'));
		assert.isFalse(issues.some((i) => i.level === 'error'));
	});

	test('a bad enum value is a warning', () => {
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'border_style', light: 'wavy' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'border_style'));
		assert.isFalse(issues.some((i) => i.level === 'error'));
	});

	test('a var(--hue_X) binding on a hue knob is accepted', () => {
		assert.deepEqual(
			validate_theme({ name: 't', variables: [{ name: 'hue_accent', light: 'var(--hue_d)' }] }),
			[]
		);
	});

	test('scheme stance values validate', () => {
		assert.deepEqual(validate_theme({ name: 't', variables: [], scheme: 'dual' }), []);
		for (const scheme of ['light', 'dark'] as const) {
			assert.deepEqual(
				validate_theme(resolve_theme_stance({ name: 't', variables: [], scheme })),
				[]
			);
		}
		const issues = validate_theme({ name: 't', variables: [], scheme: 'dusk' as 'dark' });
		assert.isTrue(issues.some((i) => i.level === 'error'));
	});

	test('a single-scheme stance without a resolved mirror is a warning', () => {
		for (const scheme of ['light', 'dark'] as const) {
			const issues = validate_theme({ name: 't', variables: [], scheme });
			assert.isTrue(
				issues.some((i) => i.level === 'warning' && i.message.includes('resolve_theme_stance'))
			);
			assert.isFalse(issues.some((i) => i.level === 'error'));
			// resolving clears it
			assert.deepEqual(
				validate_theme(resolve_theme_stance({ name: 't', variables: [], scheme })),
				[]
			);
		}
	});

	test('a dark slot under a single-scheme stance is a warning, not an error', () => {
		for (const scheme of ['light', 'dark'] as const) {
			const issues = validate_theme({
				name: 't',
				scheme,
				variables: [{ name: 'neutral_chroma', light: '0.02', dark: '0.03' }]
			});
			assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'neutral_chroma'));
			assert.isFalse(issues.some((i) => i.level === 'error'));
		}
		// single-slot stanced and dual-slot unstanced themes stay clean
		assert.deepEqual(
			validate_theme(
				resolve_theme_stance({
					name: 't',
					scheme: 'dark',
					variables: [{ name: 'neutral_chroma', light: '0.02' }]
				})
			),
			[]
		);
		assert.deepEqual(
			validate_theme({
				name: 't',
				variables: [{ name: 'neutral_chroma', light: '0.02', dark: '0.03' }]
			}),
			[]
		);
	});

	test('binding an intent to the muted brown slot warns about the dropped character', () => {
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'hue_accent', light: 'var(--hue_f)' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'hue_accent'));
	});

	test('setting the intent chroma twin to match the bound slot silences the pairing warning', () => {
		const issues = validate_theme({
			name: 't',
			variables: [
				{ name: 'hue_accent', light: 'var(--hue_f)' },
				{ name: 'accent_chroma_scale', light: String(PALETTE_CHROMA_MULTIPLIERS.f) }
			]
		});
		assert.deepEqual(issues, []);
	});

	test('muting a letter warns through the default binding that points at it', () => {
		// hue_negative defaults to var(--hue_c)
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'palette_c_chroma_scale', light: '0.5' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'hue_negative'));
	});

	test('a literal intent hue never triggers the pairing warning', () => {
		const issues = validate_theme({
			name: 't',
			variables: [
				{ name: 'hue_negative', light: '20' },
				{ name: 'palette_c_chroma_scale', light: '0.5' }
			]
		});
		assert.deepEqual(issues, []);
	});
});

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

describe('check_theme', () => {
	test('the base theme passes every gate with nothing unchecked', () => {
		const report = check_theme(base_theme);
		assert.isTrue(report.ok);
		assert.strictEqual(report.unchecked.length, 0);
		assert.isAbove(report.entries.length, 0);
	});

	test('a gate entry matches direct numeric computation', () => {
		const report = check_theme(base_theme);
		const link = report.entries.find(
			(e) => e.gate === 'contrast' && e.scheme === 'light' && e.subject === 'accent_60 on shade_00'
		);
		assert(link, 'link entry exists');
		const expected = wcag_contrast_ratio(
			oklch_to_srgb(palette_stop_oklch('a', '60', 'light')),
			oklch_to_srgb(shade_stop_oklch('00', 'light'))
		);
		assert.closeTo(link.value, expected, 1e-6);
		assert.strictEqual(link.threshold, GATE_LINK);
	});

	test('high contrast passes every gate', () => {
		assert.isTrue(check_theme(high_contrast_theme).ok);
	});

	test('low contrast passes every gate', () => {
		// tuned to the softest shade compression that clears the fixed AA/AAA
		// thresholds, so the whole registry passes its own gates
		const report = check_theme(low_contrast_theme);
		assert.strictEqual(report.unchecked.length, 0);
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('concrete passes every gate', () => {
		assert.isTrue(check_theme(concrete_theme).ok);
	});

	test('parchment passes every gate in both schemes', () => {
		assert.isTrue(check_theme(parchment_theme).ok);
	});

	test('nineties passes every gate - no clipping, its ground stays inside them', () => {
		// the theme's whole premise is a ground off the paper-white extreme, and
		// how far it can step is exactly what these gates bound
		const report = check_theme(nineties_theme);
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('phosphor keeps its contrast gates', () => {
		const contrast = check_theme(phosphor_theme).entries.filter((e) => e.gate === 'contrast');
		assert.isAbove(contrast.length, 0, 'contrast gates resolved');
		assert.isTrue(contrast.every((e) => e.pass));
	});

	// gamut regression floors for the vivid pair: the deliberate clipping is
	// part of their design, but a knob edit that doubles it should not land
	// silently - update these recorded counts when retuning on purpose
	test.each([
		['neon', neon_theme, 72],
		['ember', ember_theme, 68]
	])('%s clips gamut by design but keeps all contrast', (_name, theme, expected_gamut_fails) => {
		const report = check_theme(theme);
		const gamut_fails = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.strictEqual(
			gamut_fails.length,
			expected_gamut_fails,
			'chroma_scale > 1 clips a recorded set of weak-hue stops'
		);
		const contrast = report.entries.filter((e) => e.gate === 'contrast');
		assert.isAbove(contrast.length, 0, 'contrast gates resolved');
		assert.isTrue(
			contrast.every((e) => e.pass),
			'lightness holds through chroma clipping'
		);
	});

	test('a mid lightness stop pinned out of order fails monotonicity', () => {
		const theme: Theme = { name: 't', variables: [{ name: 'shade_lightness_50', light: '0.99' }] };
		const entry = check_theme(theme).entries.find(
			(e) => e.gate === 'monotonicity' && e.scheme === 'light' && e.subject === 'shade_lightness'
		);
		assert(entry, 'monotonicity entry exists');
		assert.isFalse(entry.pass);
	});

	test('a chroma multiplier above 1 clips gamut on a low-headroom slot', () => {
		// the cyan slot binds the worst-hue caps, so 1.4x pushes past sRGB
		const theme: Theme = {
			name: 't',
			variables: [{ name: 'palette_i_chroma_scale', light: '1.4' }]
		};
		const failing = check_theme(theme).entries.filter(
			(e) => e.gate === 'gamut' && !e.pass && e.subject.startsWith('palette_i_')
		);
		assert.isAbove(failing.length, 0);
	});

	test('an intent folds into a letter only when hue and multiplier both match', () => {
		// bound to the muted brown slot with the default twin of 1: same hue,
		// different chroma, so the accent gets its own gamut entries
		const unpaired: Theme = {
			name: 't',
			variables: [{ name: 'hue_accent', light: 'var(--hue_f)' }]
		};
		assert.isTrue(
			check_theme(unpaired).entries.some((e) => e.gate === 'gamut' && e.subject === 'accent_50')
		);
		// with the twin carried, the accent renders identically to the letter and folds
		const paired: Theme = {
			name: 't',
			variables: [
				{ name: 'hue_accent', light: 'var(--hue_f)' },
				{ name: 'accent_chroma_scale', light: String(PALETTE_CHROMA_MULTIPLIERS.f) }
			]
		};
		assert.isFalse(
			check_theme(paired).entries.some((e) => e.gate === 'gamut' && e.subject === 'accent_50')
		);
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

	test('a dark stance evaluates the same reality in both schemes', () => {
		const report = check_theme({ name: 't', variables: [], scheme: 'dark' });
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
		const dark_by_subject = new Map(
			report.entries.filter((e) => e.scheme === 'dark').map((e) => [`${e.gate}|${e.subject}`, e])
		);
		for (const entry of report.entries) {
			if (entry.scheme !== 'light') continue;
			const twin = dark_by_subject.get(`${entry.gate}|${entry.subject}`);
			assert(twin, `dark twin exists for ${entry.subject}`);
			assert.closeTo(entry.value, twin.value, 1e-9, `${entry.gate} ${entry.subject}`);
		}
	});

	test('every contrast gate emits its pinned subjects at its exported threshold', () => {
		// pins gate *emission*: deleting a gate's block from check_theme fails
		// here even though every all-pass assertion elsewhere stays green
		const report = check_theme({ name: 't', variables: [] });
		const by_subject = new Map<string, Array<(typeof report.entries)[number]>>();
		for (const e of report.entries) {
			if (e.gate !== 'contrast') continue;
			const list = by_subject.get(e.subject) ?? [];
			list.push(e);
			by_subject.set(e.subject, list);
		}
		const expect_subject = (subject: string, threshold: number): void => {
			const entries = by_subject.get(subject);
			assert(entries, `emits ${subject}`);
			assert.strictEqual(entries.length, 2, `${subject} in both schemes`);
			for (const e of entries) assert.strictEqual(e.threshold, threshold, subject);
		};
		expect_subject('text_80 on shade_00', GATE_BODY_TEXT);
		expect_subject('text_80 on shade_05', GATE_BODY_TEXT);
		expect_subject('text_80 on shade_10', GATE_BODY_TEXT);
		expect_subject('text_00 on shade_50', GATE_SELECTED_TEXT);
		expect_subject('text_50 on shade_00', GATE_SUBTLE_TEXT);
		expect_subject('shade_30 vs shade_00', GATE_BORDER);
		expect_subject('border_color_30 over shade_00', GATE_BORDER_DIVIDER);
		expect_subject('accent_60 on shade_00', GATE_LINK);
		for (const letter of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
			expect_subject(`palette_${letter}_50 vs shade_00`, GATE_UI);
			expect_subject(`text_max on palette_${letter}_50`, GATE_FILL_TEXT);
			expect_subject(`text_00 on palette_${letter}_50`, GATE_SELECTED_TEXT);
		}
	});

	test('the stanced exemplars pass their contrast gates in both schemes', () => {
		for (const theme of [neon_theme, phosphor_theme]) {
			const contrast = check_theme(theme).entries.filter((e) => e.gate === 'contrast');
			assert.isAbove(contrast.length, 0, `${theme.name}: contrast gates resolved`);
			assert.isTrue(
				contrast.every((e) => e.pass),
				`${theme.name}: ${JSON.stringify(contrast.filter((e) => !e.pass))}`
			);
		}
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
		const resolver = create_theme_resolver(neon_theme);
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

describe('contrast modifier compositions', () => {
	// discover the shipped themes by glob like themes.test.ts, so a new
	// exemplar module can't be silently left out of the composition matrix
	const theme_modules = import.meta.glob('../lib/themes/*.ts', { eager: true });
	const is_theme = (value: unknown): value is Theme =>
		value !== null &&
		typeof value === 'object' &&
		'name' in value &&
		'variables' in value &&
		Array.isArray((value as Theme).variables);
	const modifier_names = new Set(contrast_modifiers.map((t) => t.name));
	const bases: Array<Theme> = Object.values(theme_modules)
		.flatMap((mod) => Object.values(mod as Record<string, unknown>).filter(is_theme))
		.filter((t) => !modifier_names.has(t.name));

	test('the glob discovers every hand-known base', () => {
		const names = new Set(bases.map((t) => t.name));
		for (const expected of [
			default_themes[0]!.name,
			ember_theme.name,
			parchment_theme.name,
			concrete_theme.name,
			phosphor_theme.name,
			neon_theme.name
		]) {
			assert.isTrue(names.has(expected), expected);
		}
	});

	test('every base × modifier validates with no errors', () => {
		for (const base of bases) {
			for (const modifier of contrast_modifiers) {
				const composed = compose_themes(base, modifier);
				const errors = validate_theme(composed).filter((issue) => issue.level === 'error');
				assert.deepEqual(errors, [], `${composed.name}: ${JSON.stringify(errors)}`);
			}
		}
	});

	// declared exception: ember's past-cap cyan/teal UI fills sit just
	// under the 3:1 fill gate against low contrast's raised background floor
	// (~2.89 to 2.91) - a marginal, known combination cost, not a regression
	const known_failing = new Set(['ember (low contrast)']);

	test('every base × modifier resolves fully and keeps its lightness ramps monotonic', () => {
		for (const base of bases) {
			for (const modifier of contrast_modifiers) {
				const composed = compose_themes(base, modifier);
				const report = check_theme(composed);
				// nothing unresolvable: an unresolved knob silently removes gate
				// entries, so this is what keeps the contrast assertions honest
				assert.deepEqual(report.unchecked, [], composed.name);
				const monotonicity = report.entries.filter((e) => e.gate === 'monotonicity');
				assert.isAbove(monotonicity.length, 0, `${composed.name}: monotonicity resolved`);
				const failing_monotonicity = monotonicity.filter((e) => !e.pass);
				assert.deepEqual(failing_monotonicity, [], composed.name);
			}
		}
	});

	test('every base × modifier keeps its contrast gates, minus declared exceptions', () => {
		for (const base of bases) {
			for (const modifier of contrast_modifiers) {
				const composed = compose_themes(base, modifier);
				const contrast = check_theme(composed).entries.filter((e) => e.gate === 'contrast');
				assert.isAbove(contrast.length, 0, `${composed.name}: contrast gates resolved`);
				const failing = contrast.filter((e) => !e.pass);
				if (known_failing.has(composed.name)) {
					// the exception stays marginal: only near-threshold fill gates fail
					assert.isAbove(failing.length, 0, `${composed.name}: exception no longer needed`);
					for (const e of failing) {
						assert.isAbove(e.value, e.threshold * 0.9, `${composed.name}: ${e.subject}`);
					}
				} else {
					assert.deepEqual(failing, [], `${composed.name}: ${JSON.stringify(failing)}`);
				}
			}
		}
	});
});
