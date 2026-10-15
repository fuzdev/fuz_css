import { test, assert, describe } from 'vitest';

import { oklch_max_srgb_chroma } from '@fuzdev/fuz_util/oklch.ts';

import { check_theme } from '#lib/theme_check.ts';
import { compile_theme } from '#lib/theme_compile.ts';
import { parse_theme, type Theme } from '#lib/variable.ts';
import { render_theme_style } from '#lib/theme.ts';
import { scheme_stance_variables } from '#lib/theme_stance.ts';
import { create_monochrome_theme } from './theme_test_helpers.ts';
import { base_theme } from '#lib/themes/base.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';
import {
	PALETTE_CHROMA_CAPS,
	PALETTE_HUES,
	PALETTE_LIGHTNESS_KNOBS,
	ramp_lightness
} from '#lib/ramps.ts';
import type { NumericScaleVariant } from '#lib/variable_data.ts';

// the trailing worst-hue cap literal of a compiled `min(calc(...), <cap>)` value
const cap_of = (value: string | undefined): number => {
	const m = /,\s*([\d.]+)\)$/u.exec(value ?? '');
	assert(m, `not a compiled cap: ${value}`);
	return Number(m[1]);
};

const stop_of = (name: string): NumericScaleVariant =>
	name.slice('_palette_chroma_'.length) as NumericScaleVariant;

// the worst-hue cap straight from the gamut math: the largest chroma inside
// sRGB for every hue at one lightness, floored like the emitted literal
const worst_hue_cap = (lightness: number, hues: Array<number>): number =>
	Math.floor(Math.min(...hues.map((hue) => oklch_max_srgb_chroma(lightness, hue))) * 1e4) / 1e4;

const gamut_fails = (report: ReturnType<typeof check_theme>): Array<string> =>
	report.entries
		.filter((e) => e.gate === 'gamut' && !e.pass)
		.map((e) => `${e.scheme} ${e.subject}`);

describe('compile_theme', () => {
	test('the marquee exemplar emits no cap overrides', () => {
		// its rotated yellow slot stays inside the baked worst-hue caps
		assert.deepEqual(compile_theme(marquee_theme).caps, []);
	});

	test('the base theme emits no cap overrides', () => {
		assert.deepEqual(compile_theme(base_theme).caps, []);
	});

	test('a single-hue monochrome theme emits higher mid-stop caps', () => {
		const input = create_monochrome_theme(145);
		const { caps: overrides, report } = compile_theme(input);
		assert.isAbove(overrides.length, 0);
		const stop_50 = overrides.find((v) => v.name === '_palette_chroma_50');
		assert(stop_50, 'stop 50 emitted');
		// one green hue has more gamut headroom than the worst-hue envelope;
		// the theme is dark-stanced, so the baseline is the dark baked table
		assert.isAbove(cap_of(stop_50.base), PALETTE_CHROMA_CAPS.dark['50']);
		// a stanced theme emits single-slot in the base position - both schemes
		// resolve identically through the mirror
		assert.isUndefined(stop_50.dark);
		assert.strictEqual(report.unchecked.length, 0);
	});

	test('compile returns the input theme as is, the caps beside it', () => {
		const input = create_monochrome_theme(145);
		const before = structuredClone(input);
		const compiled = compile_theme(input);
		assert.strictEqual(compiled.theme, input);
		assert.deepEqual(input, before);
		assert.isFalse(input.variables.some((v) => v.name.startsWith('_')));
	});

	test('a stance alone emits nothing - the mirror already carries its caps', () => {
		// both schemes resolve to the stanced appearance, whose baked caps the
		// stance mirror re-slots; with hues and lightness unmoved there is no
		// drift to fix, so overrides would only duplicate the mirror
		const stanced: Theme = { name: 'dark stance', scheme: 'dark', variables: [] };
		assert.deepEqual(compile_theme(stanced).caps, []);
	});

	test('a dark-stanced hue move drifts from the stanced baked caps and emits', () => {
		const input = create_monochrome_theme(145); // dark-stanced, hues collapsed
		const { caps: overrides } = compile_theme(input);
		assert.isAbove(overrides.length, 0);
		// the baseline under a dark stance is the dark baked table
		const changed = overrides.some(
			(v) => Math.abs(cap_of(v.base) - PALETTE_CHROMA_CAPS.dark[stop_of(v.name)]) > 0.002
		);
		assert.isTrue(changed, "caps differ from the stanced scheme's baked table");
	});

	test('compiling is idempotent: the same theme gives the same caps', () => {
		const input = create_monochrome_theme(145);
		const once = compile_theme(input);
		const twice = compile_theme(once.theme);
		assert.deepEqual(twice.caps, once.caps);
		assert.deepEqual(twice.issues, []);
	});

	test('the caps stay out of the theme, which passes the schema and the lint', () => {
		for (const input of [create_monochrome_theme(145), create_monochrome_theme(70)]) {
			const { theme, caps, issues } = compile_theme(input);
			assert.isAbove(caps.length, 0, input.name);
			assert.isTrue(caps.every((v) => v.name.startsWith('_palette_chroma_')));
			assert.deepEqual(issues, [], input.name);
			// a theme can't carry one - the caps are derived data, never wire data
			assert.isNull(parse_theme({ ...theme, variables: [...theme.variables, caps[0]] }));
		}
	});

	test('the gates read the caps beside the theme', () => {
		// a cyan nudge fails gamut on the baked caps until its own tighten them
		const input: Theme = { name: 'cyan nudge', variables: [{ name: 'hue_i', base: '205' }] };
		const { caps, report } = compile_theme(input);
		assert.deepEqual(check_theme(input, { caps }), report);
		assert.deepEqual(gamut_fails(report), []);
		assert.isAbove(gamut_fails(check_theme(input)).length, 0);
	});

	test('the compiled theme renders the caps last, the mirror deduped against them', () => {
		const compiled = compile_theme(create_monochrome_theme(145));
		const css = render_theme_style(compiled.theme, compiled);
		const first_cap = css.indexOf(`--${compiled.caps[0]!.name}:`);
		assert.isAbove(first_cap, css.indexOf('--hue_a:'));
		// the mirror re-slots every default cap, and yields each compiled one
		for (const cap of compiled.caps) {
			assert.strictEqual(css.split(`--${cap.name}:`).length, 2, cap.name);
		}
	});

	test('the compiled theme is fully checkable - nothing unchecked', () => {
		assert.strictEqual(compile_theme(create_monochrome_theme(145)).report.unchecked.length, 0);
	});

	test('compiling fixes the gamut failures its input has - the differential', () => {
		// an extremely light palette ramp: the baked worst-hue caps assume the
		// default lightness, so the requested chroma is far out of gamut at the
		// new lightness until compile recomputes the caps
		const input: Theme = {
			name: 'washed out',
			variables: [
				{ name: 'palette_lightness_00', base: '0.999', dark: '0.99' },
				{ name: 'palette_lightness_100', base: '0.9', dark: '0.92' }
			]
		};
		const before = check_theme(input).entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.isAbove(before.length, 0, 'the input fails gamut against the baked caps');
		const { report } = compile_theme(input);
		const after = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.deepEqual(after, [], 'compiled caps bring every stop back into gamut');
		assert.strictEqual(report.unchecked.length, 0);
	});

	test('a small hue rotation that tightens a cap emits it, clearing the gamut failures', () => {
		// cyan nudged a few degrees loses headroom the baked worst-hue table
		// sized for the default angle - a drift well under the loosening
		// epsilon, but past the gamut gate's tolerance
		const input: Theme = { name: 'cyan nudge', variables: [{ name: 'hue_i', base: '205' }] };
		const before = check_theme(input).entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.isAbove(before.length, 0, 'the input fails gamut against the baked caps');
		const { caps: overrides, report } = compile_theme(input);
		assert.isAbove(overrides.length, 0);
		for (const v of overrides) {
			const stop = stop_of(v.name);
			assert.isAtMost(cap_of(v.base), PALETTE_CHROMA_CAPS.light[stop], `${v.name} light`);
		}
		const after = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.deepEqual(after, [], 'compiled caps bring every stop back into gamut');
	});

	test('a moved lightness curve gets each stop its cap at the lightness the curve puts it', () => {
		// the baked caps assume the default curve, so the stops it moves
		// overshoot sRGB until their caps are recomputed where they now sit
		const input: Theme = {
			name: 'moved curve',
			variables: [{ name: 'palette_lightness_curve', base: '0.7' }]
		};
		assert.isAbove(gamut_fails(check_theme(input)).length, 0, 'the input fails gamut');
		const { caps: overrides, report } = compile_theme(input);
		assert.isAbove(overrides.length, 0);
		const hues = Object.values(PALETTE_HUES);
		for (const v of overrides) {
			const stop = stop_of(v.name);
			const at = (scheme: 'light' | 'dark'): number =>
				worst_hue_cap(
					ramp_lightness({ ...PALETTE_LIGHTNESS_KNOBS[scheme], curve: 0.7 }, stop),
					hues
				);
			assert.strictEqual(cap_of(v.base), at('light'), `${v.name} light`);
			assert.strictEqual(cap_of(v.dark), at('dark'), `${v.name} dark`);
		}
		assert.deepEqual(gamut_fails(report), []);
	});

	test('compiling a theme that checks clean keeps it clean under a moved curve', () => {
		// one green hue with the chroma request raised until the caps bind: the
		// input passes on the conservative baked caps, so the looser caps compile
		// emits have to be each stop's own or they push it out of gamut
		const input: Theme = {
			name: 'monochrome moved curve',
			variables: [
				...Object.keys(PALETTE_HUES).map((letter) => ({ name: `hue_${letter}`, base: '145' })),
				{ name: 'palette_chroma_max', base: '0.3' },
				{ name: 'palette_lightness_curve', base: '0.9' }
			]
		};
		assert.isTrue(check_theme(input).ok, 'the input checks clean');
		const { caps, report } = compile_theme(input);
		const stop_20 = caps.find((v) => v.name === '_palette_chroma_20');
		assert(stop_20, 'stop 20 emitted');
		const at = (scheme: 'light' | 'dark'): number =>
			worst_hue_cap(
				ramp_lightness({ ...PALETTE_LIGHTNESS_KNOBS[scheme], curve: 0.9 }, '20'),
				[145]
			);
		assert.strictEqual(cap_of(stop_20.base), at('light'));
		assert.strictEqual(cap_of(stop_20.dark), at('dark'));
		assert.deepEqual(gamut_fails(report), []);
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('a stanced theme caps its moved curve in its one appearance', () => {
		const input: Theme = {
			name: 'stanced moved curve',
			scheme: 'dark',
			variables: [{ name: 'palette_lightness_curve', base: '0.7' }]
		};
		assert.isAbove(gamut_fails(check_theme(input)).length, 0);
		const { caps: overrides, report } = compile_theme(input);
		assert.isAbove(overrides.length, 0);
		const hues = Object.values(PALETTE_HUES);
		// both schemes resolve the same ramp through the mirror, so one slot carries it
		for (const v of overrides) {
			const lightness = ramp_lightness(
				{ ...PALETTE_LIGHTNESS_KNOBS.dark, curve: 0.7 },
				stop_of(v.name)
			);
			assert.strictEqual(cap_of(v.base), worst_hue_cap(lightness, hues), v.name);
			assert.isUndefined(v.dark, v.name);
		}
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('a stanced theme whose curve splits its schemes emits a cap for each', () => {
		// a dark slot under a stance breaks the one-appearance promise (the lint
		// warns), but both slots still render - so each needs its own cap
		const input: Theme = {
			name: 'stanced split curve',
			scheme: 'dark',
			variables: [{ name: 'palette_lightness_curve', base: '0.6', dark: '1.4' }]
		};
		const { caps: overrides, report } = compile_theme(input);
		assert.isAbove(overrides.length, 0);
		const hues = Object.values(PALETTE_HUES);
		// the mirror puts the stanced endpoints under both slots
		const at = (curve: number, stop: NumericScaleVariant): number =>
			worst_hue_cap(ramp_lightness({ ...PALETTE_LIGHTNESS_KNOBS.dark, curve }, stop), hues);
		for (const v of overrides) {
			const stop = stop_of(v.name);
			assert.strictEqual(cap_of(v.base), at(0.6, stop), `${v.name} base`);
			assert.strictEqual(cap_of(v.dark), at(1.4, stop), `${v.name} dark`);
		}
		assert.deepEqual(gamut_fails(report), []);
	});

	test('a lightness ramp that does not resolve emits nothing, not caps at the default curve', () => {
		// valid CSS, but not a number the resolver reads - caps computed at the
		// default curve's lightness would describe colors the stops don't render
		const input: Theme = {
			name: 'percent curve',
			variables: [
				{ name: 'hue_i', base: '205' },
				{ name: 'palette_lightness_curve', base: '84%' }
			]
		};
		const { caps, report } = compile_theme(input);
		const names = caps.map((v) => v.name);
		// the endpoint stops are the knobs themselves, so only they resolve and
		// take the nudged hue's tightened caps
		assert.deepEqual(names, ['_palette_chroma_00', '_palette_chroma_100']);
		assert.isTrue(report.unchecked.some((u) => u.variable === 'palette_lightness_curve'));
	});

	test('an unresolvable hue emits nothing rather than caps computed without it', () => {
		// valid CSS, but not a number the resolver reads - caps computed from
		// the remaining hues would claim headroom this one may not have
		const input: Theme = { name: 'unit hue', variables: [{ name: 'hue_i', base: '195deg' }] };
		const { caps, report } = compile_theme(input);
		assert.deepEqual(caps, []);
		assert.isAbove(report.unchecked.length, 0, 'the re-check still reports the hue');
	});

	test("a stanced compiled theme carries its stance's mirror, a dual one none", () => {
		const input = create_monochrome_theme(145); // dark-stanced
		assert.deepEqual(compile_theme(input).scheme_mirror, scheme_stance_variables('dark'));
		assert.isUndefined(compile_theme(base_theme).scheme_mirror);
	});
});
