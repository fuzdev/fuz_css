/**
 * Authored values on the variables the gates read: a color stop or role
 * authored directly either becomes the color the gates measure or lands in
 * `unchecked`, a pinned `chroma_shape_NN` flows through every stop that rides
 * it, and a variable no gate reads leaves the report alone.
 */

import { test, assert, describe } from 'vitest';

import {
	check_theme,
	theme_gate_role_names,
	GATE_BORDER,
	GATE_LINK,
	GATE_UI,
	type ThemeCheckReport,
	type ThemeGateId
} from '$lib/theme_check.ts';
import { create_theme_resolver } from '$lib/theme_resolver.ts';
import type { StyleVariable } from '$lib/variable.ts';
import { base_theme } from '$lib/themes/base.ts';
import { zine_theme } from '$lib/themes/zine.ts';
import { default_variables } from '$lib/variables.ts';
import { palette_stop_oklch, shade_stop_oklch, text_stop_oklch } from '$lib/ramps.ts';
import { oklch_to_srgb, type Oklch, type RgbUnit } from '$lib/oklch.ts';
import { wcag_contrast_ratio } from '$lib/wcag.ts';
import type { ColorSchemeVariant } from '$lib/variable_data.ts';

const base_report = check_theme(base_theme);

const check = (...variables: Array<StyleVariable>): ThemeCheckReport =>
	check_theme({ name: 't', variables });

const find_entry = (
	report: ThemeCheckReport,
	gate: ThemeGateId,
	scheme: ColorSchemeVariant,
	subject: string
): ThemeCheckReport['entries'][number] | undefined =>
	report.entries.find((e) => e.gate === gate && e.scheme === scheme && e.subject === subject);

const get_entry = (
	report: ThemeCheckReport,
	gate: ThemeGateId,
	scheme: ColorSchemeVariant,
	subject: string
): ThemeCheckReport['entries'][number] => {
	const entry = find_entry(report, gate, scheme, subject);
	assert(entry, `${gate} ${scheme} ${subject} exists`);
	return entry;
};

const srgb = (color: Oklch): RgbUnit =>
	oklch_to_srgb(color).map((c) => Math.min(1, Math.max(0, c))) as RgbUnit;

const gamut_excess = (color: Oklch): number =>
	Math.max(0, ...oklch_to_srgb(color).flatMap((c) => [-c, c - 1]));

describe('pinned color stops', () => {
	test('a pinned palette stop is the color the gates evaluate', () => {
		const pin: Oklch = [0.9, 0.35, 250];
		const report = check({ name: 'palette_a_50', light: 'oklch(0.9 0.35 250)' });
		assert.deepEqual(report.unchecked, []);
		// far outside sRGB, where the derived stop sits inside it
		const gamut = get_entry(report, 'gamut', 'light', 'palette_a_50');
		assert.closeTo(gamut.value, gamut_excess(pin), 1e-9);
		assert.isFalse(gamut.pass);
		assert.isTrue(get_entry(base_report, 'gamut', 'light', 'palette_a_50').pass);
		// and the contrast gates over it read the same pinned color
		const ui = get_entry(report, 'contrast', 'light', 'palette_a_50 vs shade_00');
		const expected = wcag_contrast_ratio(srgb(pin), srgb(shade_stop_oklch('00', 'light')));
		assert.closeTo(ui.value, expected, 1e-9);
		assert.isFalse(ui.pass);
		assert.isFalse(report.ok);
		// the neighboring stop still derives
		assert.deepEqual(
			get_entry(report, 'gamut', 'light', 'palette_a_60'),
			get_entry(base_report, 'gamut', 'light', 'palette_a_60')
		);
	});

	test('a pinned shade stop moves every pairing on it', () => {
		const pin: Oklch = [0.5, 0.01, 60];
		const report = check({ name: 'shade_00', light: 'oklch(0.5 0.01 60)' });
		assert.deepEqual(report.unchecked, []);
		const body = get_entry(report, 'contrast', 'light', 'text_80 on shade_00');
		const expected = wcag_contrast_ratio(srgb(text_stop_oklch('80', 'light')), srgb(pin));
		assert.closeTo(body.value, expected, 1e-9);
		assert.isFalse(body.pass);
		// the button label's fill composites over the pinned ground too
		const button = get_entry(report, 'contrast', 'light', 'palette_a_60 on palette_a button fill');
		assert.isFalse(button.pass);
	});

	test('a pinned text stop the gates cannot evaluate lands in unchecked', () => {
		const report = check({ name: 'text_80', light: '#777' });
		assert.isFalse(report.ok);
		assert.deepEqual(
			report.unchecked.map((u) => [u.variable, u.value]),
			[['text_80', '#777']]
		);
		// its gates are skipped rather than evaluated at the derived color
		assert.isUndefined(find_entry(report, 'contrast', 'light', 'text_80 on shade_00'));
		assert.isUndefined(find_entry(report, 'gamut', 'light', 'text_80'));
		// while every entry that doesn't read it is untouched
		assert.deepEqual(
			report.entries,
			base_report.entries.filter((e) => !e.subject.includes('text_80'))
		);
	});

	test('a pin in one scheme leaves the other deriving', () => {
		const report = check({ name: 'text_80', dark: '#777' });
		assert.deepEqual(
			report.unchecked.map((u) => u.variable),
			['text_80']
		);
		assert.deepEqual(
			get_entry(report, 'contrast', 'light', 'text_80 on shade_00'),
			get_entry(base_report, 'contrast', 'light', 'text_80 on shade_00')
		);
		assert.isUndefined(find_entry(report, 'contrast', 'dark', 'text_80 on shade_00'));
	});

	test('a pinned text_max is read by the fill-text gate', () => {
		const pin: Oklch = [0.7, 0, 0];
		const report = check({ name: 'text_max', light: 'oklch(0.7 0 0)' });
		assert.deepEqual(report.unchecked, []);
		const entry = get_entry(report, 'contrast', 'light', 'text_max on palette_a_50');
		const expected = wcag_contrast_ratio(srgb(pin), srgb(palette_stop_oklch('a', '50', 'light')));
		assert.closeTo(entry.value, expected, 1e-9);
		assert.isFalse(entry.pass);
		// a form the gates don't read is unchecked, not assumed black
		const hex = check({ name: 'text_max', light: '#999' });
		assert.deepEqual(
			hex.unchecked.map((u) => u.variable),
			['text_max']
		);
		assert.isUndefined(find_entry(hex, 'contrast', 'light', 'text_max on palette_a_50'));
		assert.isFalse(hex.ok);
	});

	test('a pinned border_color_30 composites at its own alpha', () => {
		const report = check({ name: 'border_color_30', light: 'oklch(0.9 0 0 / 5%)' });
		assert.deepEqual(report.unchecked, []);
		const entry = get_entry(report, 'contrast', 'light', 'border_color_30 over shade_00');
		const ground = srgb(shade_stop_oklch('00', 'light'));
		const border = srgb([0.9, 0, 0]);
		const composited = border.map((c, i) => 0.05 * c + 0.95 * ground[i]!) as RgbUnit;
		assert.closeTo(entry.value, wcag_contrast_ratio(composited, ground), 1e-9);
		assert.isFalse(entry.pass);
		// the alpha reads as a number too, and the derived default clears the gate
		const numeric = check({ name: 'border_color_30', light: 'oklch(0.9 0 0 / 0.05)' });
		assert.closeTo(
			get_entry(numeric, 'contrast', 'light', 'border_color_30 over shade_00').value,
			entry.value,
			1e-9
		);
		assert.isTrue(
			get_entry(base_report, 'contrast', 'light', 'border_color_30 over shade_00').pass
		);
	});

	test('a translucent pin on an opaque stop lands in unchecked', () => {
		const report = check({ name: 'shade_00', light: 'oklch(0.9 0 0 / 50%)' });
		assert.isFalse(report.ok);
		assert.deepEqual(
			report.unchecked.map((u) => [u.variable, u.value]),
			[['shade_00', 'oklch(0.9 0 0 / 50%)']]
		);
		assert.isUndefined(find_entry(report, 'contrast', 'light', 'text_80 on shade_00'));
	});

	test('a stop authored as a var() reference is measured at the color it points at', () => {
		const report = check({ name: 'text_80', light: 'var(--text_50)' });
		assert.deepEqual(report.unchecked, []);
		const body = get_entry(report, 'contrast', 'light', 'text_80 on shade_00');
		const expected = wcag_contrast_ratio(
			srgb(text_stop_oklch('50', 'light')),
			srgb(shade_stop_oklch('00', 'light'))
		);
		assert.closeTo(body.value, expected, 1e-9);
		assert.isFalse(body.pass);
	});

	test('a var() reference the gates cannot evaluate is unchecked', () => {
		// a variable outside the gated colors, and a reference cycle
		const outside = check({ name: 'text_80', light: 'var(--fg_30)' });
		assert.deepEqual(
			outside.unchecked.map((u) => [u.variable, u.value]),
			[['text_80', 'var(--fg_30)']]
		);
		const cycle = check(
			{ name: 'text_80', light: 'var(--text_90)' },
			{ name: 'text_90', light: 'var(--text_80)' }
		);
		assert.sameMembers(
			cycle.unchecked.map((u) => u.variable),
			['text_80', 'text_90']
		);
		assert.isTrue(cycle.unchecked.every((u) => u.reason.includes('cyclic')));
		assert.isFalse(cycle.ok);
	});

	test('an out-of-range literal is evaluated the way the browser clamps it', () => {
		// lightness above 1 and negative chroma parse to plain white, which sits
		// in gamut and reads as white against the page
		const report = check({ name: 'text_80', light: 'oklch(1.5 -0.2 250)' });
		assert.deepEqual(report.unchecked, []);
		assert.strictEqual(get_entry(report, 'gamut', 'light', 'text_80').value, 0);
		const body = get_entry(report, 'contrast', 'light', 'text_80 on shade_00');
		const white = wcag_contrast_ratio(srgb([1, 0, 0]), srgb(shade_stop_oklch('00', 'light')));
		assert.closeTo(body.value, white, 1e-9);
		// negative lightness clamps to black the same way
		const dark = check({ name: 'text_80', light: 'oklch(-0.5 0 0)' });
		assert.strictEqual(get_entry(dark, 'gamut', 'light', 'text_80').value, 0);
		assert.closeTo(
			get_entry(dark, 'contrast', 'light', 'text_80 on shade_00').value,
			wcag_contrast_ratio([0, 0, 0], srgb(shade_stop_oklch('00', 'light'))),
			1e-9
		);
		// alpha above 1 clamps to opaque, below 0 to fully transparent
		const ground = srgb(shade_stop_oklch('00', 'light'));
		const opaque = check({ name: 'border_color_30', light: 'oklch(0.3 0 0 / 150%)' });
		assert.closeTo(
			get_entry(opaque, 'contrast', 'light', 'border_color_30 over shade_00').value,
			wcag_contrast_ratio(srgb([0.3, 0, 0]), ground),
			1e-9
		);
		const clear = check({ name: 'border_color_30', light: 'oklch(0.3 0 0 / -1)' });
		assert.closeTo(
			get_entry(clear, 'contrast', 'light', 'border_color_30 over shade_00').value,
			1,
			1e-9
		);
	});

	test('a derived lightness past an end is evaluated the way the browser clamps it', () => {
		// `oklch(var(--l) …)` clamps at computed-value time, so an overshooting
		// ground renders as the white a pin of 1 gives
		const overshoot = check({ name: 'shade_lightness_00', light: '1.03' });
		const at_end = check({ name: 'shade_lightness_00', light: '1' });
		assert.strictEqual(get_entry(overshoot, 'gamut', 'light', 'shade_00').value, 0);
		assert.strictEqual(get_entry(at_end, 'gamut', 'light', 'shade_00').value, 0);
		assert.closeTo(
			get_entry(overshoot, 'contrast', 'light', 'text_80 on shade_00').value,
			get_entry(at_end, 'contrast', 'light', 'text_80 on shade_00').value,
			1e-9
		);
	});

	test.each([
		['a hex color', '#777'],
		['a named color', 'gray'],
		['a percentage lightness', 'oklch(50% 0 0)'],
		['a var() component', 'oklch(0.5 0 var(--hue_a))'],
		['a var() with a fallback', 'var(--text_90, #000)'],
		['another color function', 'rgb(119 119 119)']
	])('%s pin is unchecked, never read as a number', (_label, value) => {
		const report = check({ name: 'text_80', light: value });
		assert.deepEqual(
			report.unchecked.map((u) => [u.variable, u.value]),
			[['text_80', value]]
		);
		assert.isFalse(report.ok);
	});

	test('a pinned intent stop gets its own gamut entry instead of folding into its letter', () => {
		// the accent binds letter a by default and folds into its entries
		assert.isUndefined(find_entry(base_report, 'gamut', 'light', 'accent_50'));
		const report = check({ name: 'accent_50', light: 'oklch(0.9 0.35 250)' });
		assert.isFalse(get_entry(report, 'gamut', 'light', 'accent_50').pass);
		// only the pinned stop unfolds, and the letter keeps its derived color
		assert.isUndefined(find_entry(report, 'gamut', 'light', 'accent_60'));
		assert.isTrue(get_entry(report, 'gamut', 'light', 'palette_a_50').pass);
		assert.isFalse(get_entry(report, 'contrast', 'light', 'accent_50 vs shade_00').pass);
	});

	test('pinning a letter stop unfolds the intent that still derives there', () => {
		// with the letter pinned in gamut, the bound accent keeps rendering the
		// derived stop - vivid past the caps here - and must not hide behind it
		const report = check(
			{ name: 'chroma_scale', light: '1.6' },
			{ name: 'palette_a_30', light: 'oklch(0.7 0.05 250)' }
		);
		assert.isTrue(get_entry(report, 'gamut', 'light', 'palette_a_30').pass);
		assert.isFalse(get_entry(report, 'gamut', 'light', 'accent_30').pass);
	});
});

describe('pinned chroma shape', () => {
	test('a pinned shape tints the neutral stop the gates evaluate', () => {
		// stop 00 is untinted by default; a shape pinned there gives the page
		// ground the full neutral chroma, far outside sRGB that close to white
		const report = check({ name: 'chroma_shape_00', light: '5' });
		assert.deepEqual(report.unchecked, []);
		assert.isFalse(get_entry(report, 'gamut', 'light', 'shade_00').pass);
		assert.isTrue(get_entry(base_report, 'gamut', 'light', 'shade_00').pass);
		assert.isFalse(report.ok);
	});
});

describe('role variables', () => {
	const declared = new Map(default_variables.map((v) => [v.name, v]));

	test('the followed roles are the ones the default styles paint through', () => {
		assert.sameMembers(
			[...theme_gate_role_names],
			[
				'text_color',
				'text_disabled',
				'border_color',
				'link_color',
				'link_color_selected',
				'outline_color'
			]
		);
		// each is declared as a plain alias, the default the gates fall back to
		for (const role of theme_gate_role_names) {
			const variable = declared.get(role);
			assert(variable, `${role} is declared`);
			assert.match(variable.light!, /^var\(--[a-z0-9_]+\)$/u, role);
		}
	});

	test('a role in a form the gates cannot evaluate is unchecked', () => {
		for (const role of theme_gate_role_names) {
			const report = check({ name: role, light: '#999' });
			assert.deepEqual(
				report.unchecked.map((u) => [u.variable, u.value]),
				[[role, '#999']],
				role
			);
			assert.isFalse(report.ok, role);
		}
	});

	test('a role authored as its declared default measures what the default measures', () => {
		// where each role's pairing lives while the role is at its default
		const default_subjects: Record<string, string> = {
			text_color: 'text_80 on shade_00',
			text_disabled: 'text_50 on shade_00',
			border_color: 'shade_30 vs shade_00',
			link_color: 'accent_60 on shade_00',
			link_color_selected: 'text_80 on shade_00',
			outline_color: 'accent_50 vs shade_00'
		};
		for (const role of theme_gate_role_names) {
			const report = check({ name: role, light: declared.get(role)!.light! });
			assert.deepEqual(report.unchecked, [], role);
			const relation = default_subjects[role]!.split(' ')[1]!;
			for (const scheme of ['light', 'dark'] as const) {
				const authored = get_entry(report, 'contrast', scheme, `${role} ${relation} shade_00`);
				const base = get_entry(base_report, 'contrast', scheme, default_subjects[role]!);
				assert.strictEqual(authored.value, base.value, `${scheme} ${role}`);
			}
		}
	});

	test('a repointed body text role is measured on every ground it sits on', () => {
		const report = check({ name: 'text_color', light: 'var(--text_50)' });
		assert.deepEqual(report.unchecked, []);
		for (const stop of ['00', '05', '10'] as const) {
			const entry = get_entry(report, 'contrast', 'light', `text_color on shade_${stop}`);
			const expected = wcag_contrast_ratio(
				srgb(text_stop_oklch('50', 'light')),
				srgb(shade_stop_oklch(stop, 'light'))
			);
			assert.closeTo(entry.value, expected, 1e-9);
			assert.isFalse(entry.pass);
			// the stop the role left is no longer what the page paints
			assert.isUndefined(find_entry(report, 'contrast', 'light', `text_80 on shade_${stop}`));
		}
		assert.isFalse(report.ok);
	});

	test('a repointed subtle text role fails where its target washes out', () => {
		const report = check({ name: 'text_disabled', light: 'var(--text_20)' });
		assert.isFalse(get_entry(report, 'contrast', 'light', 'text_disabled on shade_00').pass);
		assert.isUndefined(find_entry(report, 'contrast', 'light', 'text_50 on shade_00'));
	});

	test('a repointed link role is gated, and the stop label.selected paints stays gated', () => {
		const report = check({ name: 'link_color', light: 'var(--accent_30)' });
		assert.deepEqual(report.unchecked, []);
		const link = get_entry(report, 'contrast', 'light', 'link_color on shade_00');
		const expected = wcag_contrast_ratio(
			srgb(palette_stop_oklch('a', '30', 'light')),
			srgb(shade_stop_oklch('00', 'light'))
		);
		assert.closeTo(link.value, expected, 1e-9);
		assert.strictEqual(link.threshold, GATE_LINK);
		assert.isFalse(link.pass);
		assert.deepEqual(
			get_entry(report, 'contrast', 'light', 'accent_60 on shade_00'),
			get_entry(base_report, 'contrast', 'light', 'accent_60 on shade_00')
		);
	});

	test('a repointed border role replaces the stop it left', () => {
		const report = check({ name: 'border_color', light: 'var(--shade_05)' });
		const border = get_entry(report, 'contrast', 'light', 'border_color vs shade_00');
		assert.strictEqual(border.threshold, GATE_BORDER);
		assert.isFalse(border.pass);
		assert.isUndefined(find_entry(report, 'contrast', 'light', 'shade_30 vs shade_00'));
	});

	test("zine's border gate measures the text stop its borders render", () => {
		const report = check_theme(zine_theme);
		const resolver = create_theme_resolver(zine_theme);
		for (const scheme of ['light', 'dark'] as const) {
			const n = (name: string): number => resolver.resolve(name, scheme)!;
			const neutral = (family: string, stop: string): Oklch => [
				n(`${family}_lightness_${stop}`),
				n('neutral_chroma') * n(`chroma_shape_${stop}`),
				n('hue_neutral')
			];
			const entry = get_entry(report, 'contrast', scheme, 'border_color vs shade_00');
			const expected = wcag_contrast_ratio(
				srgb(neutral('text', '60')),
				srgb(neutral('shade', '00'))
			);
			assert.closeTo(entry.value, expected, 1e-9, scheme);
			assert.isTrue(entry.pass);
			assert.isUndefined(find_entry(report, 'contrast', scheme, 'shade_30 vs shade_00'));
		}
		assert.isTrue(report.ok);
	});

	test('the focus ring and selected link get their own entries once authored', () => {
		// at their defaults both pairings are other gates' entries
		assert.isUndefined(find_entry(base_report, 'contrast', 'light', 'outline_color vs shade_00'));
		assert.isUndefined(
			find_entry(base_report, 'contrast', 'light', 'link_color_selected on shade_00')
		);
		const outline = check({ name: 'outline_color', light: 'var(--shade_10)' });
		const ring = get_entry(outline, 'contrast', 'light', 'outline_color vs shade_00');
		assert.strictEqual(ring.threshold, GATE_UI);
		assert.isFalse(ring.pass);
		const selected = check({ name: 'link_color_selected', light: 'var(--accent_30)' });
		const link = get_entry(selected, 'contrast', 'light', 'link_color_selected on shade_00');
		assert.strictEqual(link.threshold, GATE_LINK);
		assert.isFalse(link.pass);
	});

	test('a translucent role composites over the ground it is measured against', () => {
		const report = check({ name: 'text_color', light: 'oklch(0.2 0 0 / 60%)' });
		assert.deepEqual(report.unchecked, []);
		const ground = srgb(shade_stop_oklch('00', 'light'));
		const ink = srgb([0.2, 0, 0]);
		const composited = ink.map((c, i) => 0.6 * c + 0.4 * ground[i]!) as RgbUnit;
		assert.closeTo(
			get_entry(report, 'contrast', 'light', 'text_color on shade_00').value,
			wcag_contrast_ratio(composited, ground),
			1e-9
		);
	});

	test('a role follows a chain of roles, and a cycle is unchecked', () => {
		const chain = check({ name: 'text_color', light: 'var(--text_disabled)' });
		assert.deepEqual(chain.unchecked, []);
		assert.strictEqual(
			get_entry(chain, 'contrast', 'light', 'text_color on shade_00').value,
			get_entry(base_report, 'contrast', 'light', 'text_50 on shade_00').value
		);
		// link_color_selected defaults to var(--text_color)
		const cycle = check({ name: 'text_color', light: 'var(--link_color_selected)' });
		assert.isTrue(cycle.unchecked.some((u) => u.reason.includes('cyclic')));
		assert.isFalse(cycle.ok);
	});

	test('a reference reads the extremes and the border alpha ramp as they render', () => {
		// text_min is the near-ground extreme - white in light, where it vanishes
		const min = check({ name: 'text_color', light: 'var(--text_min)' });
		assert.isFalse(get_entry(min, 'contrast', 'light', 'text_color on shade_00').pass);
		const max = check({ name: 'text_color', light: 'var(--text_max)' });
		assert.isTrue(get_entry(max, 'contrast', 'light', 'text_color on shade_00').pass);
		// each border stop carries its own alpha
		const faint = check({ name: 'border_color', light: 'var(--border_color_10)' });
		const strong = check({ name: 'border_color', light: 'var(--border_color_90)' });
		assert.isBelow(
			get_entry(faint, 'contrast', 'light', 'border_color vs shade_00').value,
			get_entry(strong, 'contrast', 'light', 'border_color vs shade_00').value
		);
		// a translucent target can't stand in for an opaque stop
		const translucent = check({ name: 'text_80', light: 'var(--border_color_50)' });
		assert.deepEqual(
			translucent.unchecked.map((u) => u.variable),
			['text_80']
		);
	});

	test('a role gated only when authored follows the scheme it is authored in', () => {
		const report = check({ name: 'outline_color', dark: 'var(--shade_10)' });
		assert.isUndefined(find_entry(report, 'contrast', 'light', 'outline_color vs shade_00'));
		assert.isFalse(get_entry(report, 'contrast', 'dark', 'outline_color vs shade_00').pass);
	});

	test('a role authored in one scheme keeps the default pairing in the other', () => {
		const report = check({ name: 'border_color', dark: 'var(--shade_05)' });
		assert.deepEqual(
			get_entry(report, 'contrast', 'light', 'shade_30 vs shade_00'),
			get_entry(base_report, 'contrast', 'light', 'shade_30 vs shade_00')
		);
		assert.isFalse(get_entry(report, 'contrast', 'dark', 'border_color vs shade_00').pass);
		assert.isUndefined(find_entry(report, 'contrast', 'dark', 'shade_30 vs shade_00'));
	});
});

describe('variables no gate reads', () => {
	test('leave the report identical to the base theme', () => {
		const report = check(
			{ name: 'text_decoration', light: 'underline' },
			{ name: 'font_family', light: 'var(--font_family_serif)' },
			// colors outside the gated pairings: stops no gate measures, and
			// micro-surfaces whose pairing no gate models
			{ name: 'border_color_20', light: '#0002' },
			{ name: 'text_min', light: '#eee' },
			{ name: 'shade_max', light: '#111' },
			{ name: 'fg_10', light: '#0001' },
			{ name: 'caret_color', light: '#f00' },
			{ name: 'selection_color', light: '#f003' },
			{ name: 'scrollbar_thumb_color', light: '#888' },
			{ name: 'backdrop_color', light: '#0008' }
		);
		assert.deepEqual(report, base_report);
		assert.isTrue(report.ok);
	});
});
