import { test, assert, describe } from 'vitest';
import { readFileSync } from 'node:fs';

import {
	validate_theme,
	check_theme,
	create_theme_resolver,
	type ThemeCheckReport,
	GATE_BODY_TEXT,
	GATE_SUBTLE_TEXT,
	GATE_LINK,
	GATE_UI,
	GATE_FILL_TEXT,
	GATE_SELECTED_TEXT,
	GATE_PALETTE_TEXT,
	GATE_BORDER,
	GATE_BORDER_DIVIDER,
	ACCENT_STATUS_HUE_SEPARATION
} from '$lib/theme_check.ts';
import { resolve_theme_stance } from '$lib/theme_stance.ts';
import { compose_themes } from '$lib/theme.ts';
import type { Theme } from '$lib/variable.ts';
import { default_themes, contrast_modifiers } from '$lib/themes.ts';
import { low_contrast_theme } from '$lib/themes/low_contrast.ts';
import { high_contrast_theme } from '$lib/themes/high_contrast.ts';
import { zine_theme } from '$lib/themes/zine.ts';
import { phosphor_theme } from '$lib/themes/phosphor.ts';
import { guestbook_theme } from '$lib/themes/guestbook.ts';
import { marquee_theme } from '$lib/themes/marquee.ts';
import { create_monochrome_theme } from './test_helpers.ts';
import { shipped_base_themes } from './theme_test_helpers.ts';
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
import { default_variables } from '$lib/variables.ts';
import { palette_variants, color_scheme_variants } from '$lib/variable_data.ts';

const base_theme = default_themes[0]!;

// the `.palette_X` button label on its own rest fill
const button_fill_subject = (letter: string): string =>
	`palette_${letter}_60 on palette_${letter} button fill`;

// the chip label on its stop-10 tint
const chip_subject = (letter: string): string => `palette_${letter}_60 on palette_${letter}_10`;

/**
 * Asserts a report's failing contrast entries are exactly the declared
 * exceptions, in emission order - all in light, each within its `margin` of
 * its threshold. Exact, so a regression inside an excepted theme still shows.
 */
const assert_declared_contrast_failures = (
	report: ThemeCheckReport,
	expected_subjects: Array<string>,
	margin: number,
	name: string
): void => {
	const contrast = report.entries.filter((e) => e.gate === 'contrast');
	assert.isAbove(contrast.length, 0, `${name}: contrast gates resolved`);
	const failing = contrast.filter((e) => !e.pass);
	assert.deepEqual(
		failing.map((e) => e.subject),
		expected_subjects,
		`${name}: ${JSON.stringify(failing)}`
	);
	for (const e of failing) {
		assert.strictEqual(e.scheme, 'light', `${name}: ${e.subject}`);
		assert.isAbove(e.value, e.threshold * margin, `${name}: ${e.subject} stays marginal`);
	}
};

// per-call resolver over the shared resolution core, for direct tests of the
// resolution rules (binding chains, cycles, unresolvable expressions)
const resolve_theme_knob = (theme: Theme, name: string, scheme: 'light' | 'dark'): number | null =>
	create_theme_resolver(theme).resolve(name, scheme);

describe('validate_theme', () => {
	test('registry and exemplar themes produce no errors', () => {
		const themes = [
			...shipped_base_themes,
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

	test('the default variables lint clean', () => {
		// the defaults are the reference values, so a warning here is a lint
		// false positive (derived defaults are var() references and calc()s)
		assert.deepEqual(validate_theme({ name: 't', variables: default_variables }), []);
	});

	test('a var() reference passes the hue, enum, and time lints', () => {
		assert.deepEqual(
			validate_theme({
				name: 't',
				variables: [
					{ name: 'hue_positive', light: 'var(--hue_j)' },
					{ name: 'button_border_style', light: 'var(--border_style)' },
					{ name: 'duration_1', light: 'var(--duration_2)' }
				]
			}),
			[]
		);
	});

	test('a time knob takes milliseconds, range-checked in seconds', () => {
		assert.deepEqual(
			validate_theme({ name: 't', variables: [{ name: 'duration_1', light: '80ms' }] }),
			[]
		);
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'duration_1', light: '90000ms' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'duration_1'));
	});

	test('a non-decimal number form is not a numeric knob value', () => {
		for (const value of ['0x10', '1e1', '0b11']) {
			const issues = validate_theme({
				name: 't',
				variables: [{ name: 'chroma_scale', light: value }]
			});
			assert.isTrue(
				issues.some((i) => i.level === 'warning' && i.variable === 'chroma_scale'),
				value
			);
		}
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

	test('a muted binding in one scheme warns even when the other binds a full-chroma slot', () => {
		for (const variable of [
			{ name: 'hue_accent', light: 'var(--hue_f)', dark: 'var(--hue_a)' },
			{ name: 'hue_accent', light: 'var(--hue_a)', dark: 'var(--hue_f)' }
		]) {
			const issues = validate_theme({ name: 't', variables: [variable] });
			assert.isTrue(
				issues.some((i) => i.level === 'warning' && i.variable === 'hue_accent'),
				JSON.stringify(variable)
			);
		}
	});

	const separation_warnings = (theme: Theme): Array<string> =>
		validate_theme(theme)
			.filter((i) => i.level === 'warning' && i.message.includes('degrees from'))
			.map((i) => i.message);

	test('an accent bound to a status slot warns that the two render alike', () => {
		// hue_negative defaults to var(--hue_c)
		const warnings = separation_warnings({
			name: 't',
			variables: [{ name: 'hue_accent', light: 'var(--hue_c)' }]
		});
		assert.strictEqual(warnings.length, 1);
		assert.include(warnings[0], 'hue_negative');
	});

	test('rebinding the status clears the accent separation warning', () => {
		assert.deepEqual(
			separation_warnings({
				name: 't',
				variables: [
					{ name: 'hue_accent', light: 'var(--hue_c)' },
					{ name: 'hue_negative', light: 'var(--hue_g)' }
				]
			}),
			[]
		);
	});

	test('the accent separation threshold sits under the tightest default pair', () => {
		// an accent on one slot has to be able to sit beside the default binding
		// of its nearest neighbor without warning
		const hues = Object.values(PALETTE_HUES);
		const tightest = Math.min(
			...hues.flatMap((a, i) =>
				hues.slice(i + 1).map((b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)))
			)
		);
		assert.isBelow(ACCENT_STATUS_HUE_SEPARATION, tightest);
		const at = (angle: number): Array<string> =>
			separation_warnings({ name: 't', variables: [{ name: 'hue_accent', light: String(angle) }] });
		// hue_info defaults to var(--hue_i)
		assert.strictEqual(at(PALETTE_HUES.i + ACCENT_STATUS_HUE_SEPARATION - 1).length, 1);
		assert.deepEqual(at(PALETTE_HUES.i + ACCENT_STATUS_HUE_SEPARATION), []);
	});

	test('the accent separation distance wraps the hue circle in any range', () => {
		// hue_negative bound to pink, which sits just under a full turn
		const near_pink = (angle: number): number =>
			separation_warnings({
				name: 't',
				variables: [
					{ name: 'hue_accent', light: String(angle) },
					{ name: 'hue_negative', light: 'var(--hue_g)' }
				]
			}).length;
		assert.strictEqual(near_pink((PALETTE_HUES.g + 5) % 360), 1);
		// the same angle a turn or two away, on either side of zero
		assert.strictEqual(near_pink(PALETTE_HUES.g - 720), 1);
		assert.strictEqual(near_pink(PALETTE_HUES.g + 720), 1);
		assert.strictEqual(near_pink(PALETTE_HUES.g - 180), 0);
	});

	test('a stanced theme names its one scheme in the separation warning', () => {
		const warnings = separation_warnings({
			name: 't',
			scheme: 'dark',
			variables: [{ name: 'hue_accent', light: 'var(--hue_b)' }]
		});
		assert.strictEqual(warnings.length, 1);
		assert.include(warnings[0], 'hue_positive in dark');
	});

	test('a hue that resolves to no number is skipped by the separation lint', () => {
		assert.deepEqual(
			separation_warnings({
				name: 't',
				variables: [{ name: 'hue_accent', light: `${PALETTE_HUES.c}deg` }]
			}),
			[]
		);
	});

	test('a monochrome or grayscale palette draws no separation warning', () => {
		// every slot at one angle is monochrome on purpose, and a palette with
		// no chroma has no hue for two intents to collide on
		assert.deepEqual(separation_warnings(create_monochrome_theme(70)), []);
		assert.deepEqual(
			separation_warnings({
				name: 't',
				variables: [
					{ name: 'hue_accent', light: 'var(--hue_c)' },
					{ name: 'chroma_scale', light: '0' }
				]
			}),
			[]
		);
	});

	test('an accent that collides in one scheme only still warns, naming that scheme', () => {
		const warnings = separation_warnings({
			name: 't',
			variables: [{ name: 'hue_accent', light: 'var(--hue_a)', dark: 'var(--hue_b)' }]
		});
		assert.strictEqual(warnings.length, 1);
		assert.include(warnings[0], 'hue_positive in dark');
	});

	test('no shipped theme puts its accent on a status hue', () => {
		for (const theme of shipped_base_themes) {
			assert.deepEqual(separation_warnings(theme), [], theme.name);
		}
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

	// declared exception: low contrast compresses the shade ramp from the
	// page-background end, and on that lowered light ground the faint tint of a
	// `.palette_X` button's rest fill takes its label just under AA for every
	// letter - every other gate clears its fixed threshold
	test('low contrast passes every gate, minus the declared button label exception', () => {
		const report = check_theme(low_contrast_theme);
		assert.strictEqual(report.unchecked.length, 0);
		const other_fails = report.entries.filter((e) => e.gate !== 'contrast' && !e.pass);
		assert.deepEqual(other_fails, []);
		assert_declared_contrast_failures(
			report,
			palette_variants.map(button_fill_subject),
			0.9,
			low_contrast_theme.name
		);
	});

	// every shipped base theme is gated on its own, discovered by glob: it
	// passes every gate unless it is named here, and each name here has its
	// own test below for exactly what it gives up
	const standalone_exceptions = new Set([guestbook_theme.name, marquee_theme.name]);

	test('every shipped base theme passes every gate, bar the declared exemplars', () => {
		for (const theme of shipped_base_themes) {
			if (standalone_exceptions.has(theme.name)) continue;
			assert.isTrue(check_theme(theme).ok, theme.name);
		}
	});

	// declared exception: the theme's whole premise is a ground off the
	// paper-white extreme, and on that light ground the faint tint of a
	// `.palette_X` button's rest fill takes its label just under AA for every
	// letter - how far the ground steps is what the other gates bound
	test('guestbook clips nothing and passes every gate, minus the declared button label exception', () => {
		const report = check_theme(guestbook_theme);
		assert.strictEqual(report.unchecked.length, 0);
		const other_fails = report.entries.filter((e) => e.gate !== 'contrast' && !e.pass);
		assert.deepEqual(other_fails, []);
		assert_declared_contrast_failures(
			report,
			palette_variants.map(button_fill_subject),
			0.9,
			guestbook_theme.name
		);
	});

	// gamut regression floor for the one vivid exemplar: the deliberate
	// clipping is part of its design, but a knob edit that doubles it should
	// not land silently - update the recorded count when retuning on purpose
	test('marquee clips gamut by design and keeps its contrast', () => {
		const report = check_theme(marquee_theme);
		const gamut_fails = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.strictEqual(
			gamut_fails.length,
			72,
			'chroma_scale > 1 clips a recorded set of weak-hue stops'
		);
		// lightness holds through chroma clipping
		assert_declared_contrast_failures(report, [], 0.95, marquee_theme.name);
	});

	test('the button label gate matches the fill a browser renders', () => {
		// the rest fill is the label's own color at the alpha `style.css` mixes
		// it to, composited over the page in gamma-encoded sRGB - read the alpha
		// from the stylesheet so the gate can't drift from the recipe it models
		const recipe =
			/--button_fill: color-mix\(in oklab, var\(--fill, var\(--shade_50\)\) (\d+)%, transparent\);/u.exec(
				readFileSync('./src/lib/style.css', 'utf8')
			);
		assert(recipe, 'style.css declares the button rest fill');
		const alpha = Number(recipe[1]) / 100;
		const report = check_theme(base_theme);
		for (const scheme of color_scheme_variants) {
			const ground = oklch_to_srgb(shade_stop_oklch('00', scheme));
			for (const letter of palette_variants) {
				const subject = button_fill_subject(letter);
				const entry = report.entries.find(
					(e) => e.gate === 'contrast' && e.scheme === scheme && e.subject === subject
				);
				assert(entry, `${scheme} ${subject} exists`);
				const label = oklch_to_srgb(palette_stop_oklch(letter, '60', scheme));
				const fill = label.map((c, i) => alpha * c + (1 - alpha) * ground[i]!) as typeof label;
				assert.closeTo(entry.value, wcag_contrast_ratio(label, fill), 1e-9, subject);
				assert.strictEqual(entry.threshold, GATE_PALETTE_TEXT);
				assert.isTrue(entry.pass, `${scheme} ${subject}: ${entry.value}`);
				// the tint costs contrast against the bare page
				const on_page = wcag_contrast_ratio(label, ground);
				assert.isBelow(entry.value, on_page, subject);
			}
		}
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
		expect_subject('text_00 on shade_60', GATE_SELECTED_TEXT);
		expect_subject('text_50 on shade_00', GATE_SUBTLE_TEXT);
		expect_subject('shade_30 vs shade_00', GATE_BORDER);
		expect_subject('border_color_30 over shade_00', GATE_BORDER_DIVIDER);
		expect_subject('accent_60 on shade_00', GATE_LINK);
		for (const letter of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
			expect_subject(`palette_${letter}_50 vs shade_00`, GATE_UI);
			expect_subject(`text_max on palette_${letter}_50`, GATE_FILL_TEXT);
			expect_subject(`text_00 on palette_${letter}_60`, GATE_SELECTED_TEXT);
			expect_subject(`palette_${letter}_60 on shade_00`, GATE_PALETTE_TEXT);
			expect_subject(button_fill_subject(letter), GATE_PALETTE_TEXT);
			expect_subject(chip_subject(letter), GATE_PALETTE_TEXT);
		}
	});

	test('the stanced exemplars pass their contrast gates in both schemes', () => {
		for (const theme of [marquee_theme, phosphor_theme]) {
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

describe('contrast modifier compositions', () => {
	// the shipped themes come from a glob (see theme_test_helpers.ts), so a new
	// exemplar module can't be silently left out of the composition matrix
	const bases = shipped_base_themes;

	test('every base × modifier validates with no errors', () => {
		for (const base of bases) {
			for (const modifier of contrast_modifiers) {
				const composed = compose_themes(base, modifier);
				const errors = validate_theme(composed).filter((issue) => issue.level === 'error');
				assert.deepEqual(errors, [], `${composed.name}: ${JSON.stringify(errors)}`);
			}
		}
	});

	// the declared exception, an exact list of failing contrast subjects (in
	// light) and how far under its gate the worst may sit: low contrast lowers
	// the light ground, where the faint tint of a `.palette_X` button's rest
	// fill takes its label just under AA - for every letter over every
	// dual-scheme base (the dark-stanced bases never render that ground). A
	// marginal, known cost of the modifier, not a regression
	const low_contrast_button_labels = palette_variants.map(button_fill_subject);
	const LOW_CONTRAST_MARGIN = 0.9;
	const renders_light = (theme: Theme): boolean => theme.scheme !== 'dark';

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

	test('every base × modifier keeps its contrast gates, minus the declared exception', () => {
		for (const base of bases) {
			for (const modifier of contrast_modifiers) {
				const composed = compose_themes(base, modifier);
				const excepted = modifier === low_contrast_theme && renders_light(base);
				assert_declared_contrast_failures(
					check_theme(composed),
					excepted ? low_contrast_button_labels : [],
					excepted ? LOW_CONTRAST_MARGIN : 1,
					composed.name
				);
			}
		}
	});

	test('a base with stronger rules cedes them to high contrast, down to the floor and no further', () => {
		// a base with stronger rules of its own (zine) cedes them to the modifier,
		// so the floor is what every composition is held to, not the base's value
		const composed = check_theme(compose_themes(zine_theme, high_contrast_theme));
		const own = check_theme(zine_theme);
		const border = (report: ThemeCheckReport, scheme: string): number =>
			report.entries.find((e) => e.subject === 'border_color vs shade_00' && e.scheme === scheme)!
				.value;
		for (const scheme of color_scheme_variants) {
			assert.isBelow(border(composed, scheme), border(own, scheme), scheme);
			assert.isAtLeast(border(composed, scheme), GATE_UI, scheme);
		}
	});

	test('high contrast holds control borders at the non-text floor over every base', () => {
		// at the extreme ground an input's sunken fill can't separate from the
		// page, so the border is what marks a control - WCAG 1.4.11's 3:1
		for (const base of bases) {
			const report = check_theme(compose_themes(base, high_contrast_theme));
			const borders = report.entries.filter((e) => e.subject === 'border_color vs shade_00');
			assert.isAbove(borders.length, 0, `${base.name}: the border pairing resolved`);
			for (const e of borders) {
				assert.isAtLeast(e.value, GATE_UI, `${base.name} ${e.scheme}`);
			}
		}
	});
});
