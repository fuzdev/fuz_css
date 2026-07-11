import {test, assert, describe} from 'vitest';

import {validate_theme, check_theme, resolve_theme_knob, GATE_LINK} from '$lib/theme_check.ts';
import type {Theme} from '$lib/theme.ts';
import {default_themes} from '$lib/themes.ts';
import {low_contrast_theme} from '$lib/themes/low_contrast.ts';
import {high_contrast_theme} from '$lib/themes/high_contrast.ts';
import {necromancer_theme} from '$lib/themes/necromancer.ts';
import {sunset_ember_theme} from '$lib/themes/sunset_ember.ts';
import {brutalish_theme} from '$lib/themes/brutalish.ts';
import {terminal_green_theme, create_terminal_theme} from '$lib/themes/terminal.ts';
import {PALETTE_HUES, palette_stop_oklch, shade_stop_oklch} from '$lib/ramps.ts';
import {oklch_to_srgb} from '$lib/oklch.ts';
import {wcag_contrast_ratio} from '$lib/wcag.ts';

const base_theme = default_themes[0]!;

describe('validate_theme', () => {
	test('registry and exemplar themes produce no errors', () => {
		const themes = [
			...default_themes,
			necromancer_theme,
			sunset_ember_theme,
			brutalish_theme,
			terminal_green_theme,
			create_terminal_theme(70), // amber, exercises the factory
		];
		for (const theme of themes) {
			const errors = validate_theme(theme).filter((issue) => issue.level === 'error');
			assert.deepEqual(errors, [], `${theme.name}: ${JSON.stringify(errors)}`);
		}
	});

	test('an empty theme is valid', () => {
		assert.deepEqual(validate_theme({name: 'base', variables: []}), []);
	});

	test('a blank name is an error', () => {
		assert.isTrue(validate_theme({name: '', variables: []}).some((i) => i.level === 'error'));
	});

	test('an unknown variable name is an error', () => {
		const issues = validate_theme({name: 't', variables: [{name: 'not_a_real_var', light: '1'}]});
		assert.isTrue(issues.some((i) => i.level === 'error' && i.variable === 'not_a_real_var'));
	});

	test('a malformed StyleVariable is an error', () => {
		// light === dark trips the schema refine
		const issues = validate_theme({
			name: 't',
			variables: [{name: 'chroma_scale', light: '1', dark: '1'}],
		});
		assert.isTrue(issues.some((i) => i.level === 'error'));
	});

	test('an out-of-range number is a warning, not an error', () => {
		const issues = validate_theme({name: 't', variables: [{name: 'chroma_scale', light: '5'}]});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'chroma_scale'));
		assert.isFalse(issues.some((i) => i.level === 'error'));
	});

	test('a bad enum value is a warning', () => {
		const issues = validate_theme({name: 't', variables: [{name: 'border_style', light: 'wavy'}]});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'border_style'));
		assert.isFalse(issues.some((i) => i.level === 'error'));
	});

	test('a var(--hue_X) binding on a hue knob is accepted', () => {
		assert.deepEqual(
			validate_theme({name: 't', variables: [{name: 'hue_accent', light: 'var(--hue_d)'}]}),
			[],
		);
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
				{name: 'hue_accent', light: 'var(--hue_d)'},
				{name: 'hue_d', light: '123'},
			],
		};
		assert.strictEqual(resolve_theme_knob(theme, 'hue_accent', 'light'), 123);
	});

	test('an intent follows an overridden default-bound letter', () => {
		const theme: Theme = {name: 't', variables: [{name: 'hue_a', light: '99'}]};
		assert.strictEqual(resolve_theme_knob(theme, 'hue_accent', 'light'), 99);
	});

	test('self and mutual cycles resolve to null without hanging', () => {
		const self: Theme = {name: 't', variables: [{name: 'hue_a', light: 'var(--hue_a)'}]};
		assert.strictEqual(resolve_theme_knob(self, 'hue_a', 'light'), null);
		const mutual: Theme = {
			name: 't',
			variables: [
				{name: 'hue_a', light: 'var(--hue_b)'},
				{name: 'hue_b', light: 'var(--hue_a)'},
			],
		};
		assert.strictEqual(resolve_theme_knob(mutual, 'hue_a', 'light'), null);
	});

	test('a cyclic theme still yields a report, unchecked and not ok', () => {
		const mutual: Theme = {
			name: 't',
			variables: [
				{name: 'hue_a', light: 'var(--hue_b)'},
				{name: 'hue_b', light: 'var(--hue_a)'},
			],
		};
		const report = check_theme(mutual);
		assert.isFalse(report.ok);
		assert.isAbove(report.unchecked.length, 0);
	});

	test('an unresolvable calc on a lightness knob leaves the affected gates unchecked', () => {
		const theme: Theme = {
			name: 't',
			variables: [{name: 'text_lightness_curve', light: 'calc(1 + 2)'}],
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
			(e) => e.gate === 'contrast' && e.scheme === 'light' && e.subject === 'accent_60 on shade_00',
		);
		assert(link, 'link entry exists');
		const expected = wcag_contrast_ratio(
			oklch_to_srgb(palette_stop_oklch('a', '60', 'light')),
			oklch_to_srgb(shade_stop_oklch('00', 'light')),
		);
		assert.closeTo(link.value, expected, 1e-6);
		assert.strictEqual(link.threshold, GATE_LINK);
	});

	test('high contrast passes every gate', () => {
		assert.isTrue(check_theme(high_contrast_theme).ok);
	});

	test('low contrast dips below the WCAG gates by design', () => {
		// low_contrast deliberately darkens the page (shade_lightness_00) and
		// softens the tint, so subtle text, links, and mid fills fall below the
		// fixed AA/AAA thresholds — the gate surfaces the tradeoff rather than
		// blessing it. gamut, monotonicity, and resolution stay clean.
		const report = check_theme(low_contrast_theme);
		assert.strictEqual(report.unchecked.length, 0);
		assert.isTrue(report.entries.filter((e) => e.gate === 'gamut').every((e) => e.pass));
		assert.isTrue(report.entries.filter((e) => e.gate === 'monotonicity').every((e) => e.pass));
		const contrast_fails = report.entries.filter((e) => e.gate === 'contrast' && !e.pass);
		assert.isAbove(contrast_fails.length, 0, 'low contrast is expected to dip below the gates');
		assert.isFalse(report.ok);
	});

	test('brutalish passes every gate', () => {
		assert.isTrue(check_theme(brutalish_theme).ok);
	});

	test('terminal green keeps its contrast gates', () => {
		const contrast = check_theme(terminal_green_theme).entries.filter((e) => e.gate === 'contrast');
		assert.isTrue(contrast.every((e) => e.pass));
	});

	test('necromancer clips gamut by design but keeps all contrast', () => {
		const report = check_theme(necromancer_theme);
		const gamut_fails = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.isAbove(gamut_fails.length, 0, 'chroma_scale > 1 is expected to clip weak hues');
		const contrast = report.entries.filter((e) => e.gate === 'contrast');
		assert.isTrue(
			contrast.every((e) => e.pass),
			'lightness holds through chroma clipping',
		);
	});

	test('sunset ember clips gamut by design but keeps all contrast', () => {
		const report = check_theme(sunset_ember_theme);
		const gamut_fails = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.isAbove(gamut_fails.length, 0, 'chroma_scale > 1 is expected to clip weak hues');
		const contrast = report.entries.filter((e) => e.gate === 'contrast');
		assert.isTrue(
			contrast.every((e) => e.pass),
			'lightness holds through chroma clipping',
		);
	});

	test('a mid lightness stop pinned out of order fails monotonicity', () => {
		const theme: Theme = {name: 't', variables: [{name: 'shade_lightness_50', light: '0.99'}]};
		const entry = check_theme(theme).entries.find(
			(e) => e.gate === 'monotonicity' && e.scheme === 'light' && e.subject === 'shade_lightness',
		);
		assert(entry, 'monotonicity entry exists');
		assert.isFalse(entry.pass);
	});
});
