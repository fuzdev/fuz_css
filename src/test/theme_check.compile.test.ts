import { test, assert, describe } from 'vitest';

import { compile_theme, check_theme } from '$lib/theme_check.ts';
import type { Theme } from '$lib/variable.ts';
import { create_monochrome_theme } from './theme_test_helpers.ts';
import { base_theme } from '$lib/themes/base.ts';
import { marquee_theme } from '$lib/themes/marquee.ts';
import { PALETTE_CHROMA_CAPS, PALETTE_HUES } from '$lib/ramps.ts';
import { oklch_max_srgb_chroma } from '$lib/oklch.ts';
import type { NumericScaleVariant } from '$lib/variable_data.ts';

// the trailing worst-hue cap literal of a compiled `min(calc(...), <cap>)` value
const cap_of = (value: string | undefined): number => {
	const m = /,\s*([\d.]+)\)$/u.exec(value ?? '');
	assert(m, `not a compiled cap: ${value}`);
	return Number(m[1]);
};

const stop_of = (name: string): NumericScaleVariant =>
	name.slice('palette_chroma_'.length) as NumericScaleVariant;

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
		const { theme } = compile_theme(marquee_theme);
		assert.strictEqual(theme.variables.length, marquee_theme.variables.length);
	});

	test('the base theme emits no cap overrides', () => {
		const { theme } = compile_theme(base_theme);
		assert.strictEqual(theme.variables.length, base_theme.variables.length);
	});

	test('a single-hue monochrome theme emits higher mid-stop caps', () => {
		const input = create_monochrome_theme(145);
		const { theme, report } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.isAbove(overrides.length, 0);
		const stop_50 = overrides.find((v) => v.name === 'palette_chroma_50');
		assert(stop_50, 'stop 50 emitted');
		// one green hue has more gamut headroom than the worst-hue envelope;
		// the theme is dark-stanced, so the baseline is the dark baked table
		assert.isAbove(cap_of(stop_50.light), PALETTE_CHROMA_CAPS.dark['50']);
		// a stanced theme emits single-slot in the base position - both schemes
		// resolve identically through the mirror
		assert.isUndefined(stop_50.dark);
		assert.strictEqual(report.unchecked.length, 0);
	});

	test('compile does not mutate the input theme', () => {
		const input = create_monochrome_theme(145);
		const before = input.variables.length;
		compile_theme(input);
		assert.strictEqual(input.variables.length, before);
	});

	test('a stance alone emits nothing - the mirror already carries its caps', () => {
		// both schemes resolve to the stanced appearance, whose baked caps the
		// stance mirror re-slots; with hues and lightness unmoved there is no
		// drift to fix, so overrides would only duplicate the mirror
		const stanced: Theme = { name: 'dark stance', scheme: 'dark', variables: [] };
		const { theme } = compile_theme(stanced);
		assert.strictEqual(theme.variables.length, 0);
	});

	test('a dark-stanced hue move drifts from the stanced baked caps and emits', () => {
		const input = create_monochrome_theme(145); // dark-stanced, hues collapsed
		const { theme } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.isAbove(overrides.length, 0);
		// the baseline under a dark stance is the dark baked table
		const changed = overrides.some(
			(v) => Math.abs(cap_of(v.light) - PALETTE_CHROMA_CAPS.dark[stop_of(v.name)]) > 0.002
		);
		assert.isTrue(changed, "caps differ from the stanced scheme's baked table");
	});

	test('compiling resolves the stance, so the lint reports the output as resolved', () => {
		const { issues } = compile_theme(create_monochrome_theme(145));
		assert.isFalse(
			issues.some((issue) => issue.message.includes('resolve_theme_stance')),
			'no stale advice to resolve a stance the compile already resolved'
		);
	});

	test('a pinned palette_chroma_NN is respected - no emission for that stop', () => {
		const input: Theme = {
			name: 'monochrome pinned',
			variables: [
				...create_monochrome_theme(145).variables,
				{ name: 'palette_chroma_50', light: '0.05' }
			]
		};
		const { theme } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.isFalse(overrides.some((v) => v.name === 'palette_chroma_50'));
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
				{ name: 'palette_lightness_00', light: '0.999', dark: '0.99' },
				{ name: 'palette_lightness_100', light: '0.9', dark: '0.92' }
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
		const input: Theme = { name: 'cyan nudge', variables: [{ name: 'hue_i', light: '205' }] };
		const before = check_theme(input).entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.isAbove(before.length, 0, 'the input fails gamut against the baked caps');
		const { theme, report } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.isAbove(overrides.length, 0);
		for (const v of overrides) {
			const stop = stop_of(v.name);
			assert.isAtMost(cap_of(v.light), PALETTE_CHROMA_CAPS.light[stop], `${v.name} light`);
		}
		const after = report.entries.filter((e) => e.gate === 'gamut' && !e.pass);
		assert.deepEqual(after, [], 'compiled caps bring every stop back into gamut');
	});

	test('a pinned intermediate lightness stop gets its cap at the pinned lightness', () => {
		// stop 20 pinned lighter than the curve puts it, inside its neighbors:
		// the baked cap assumes the curve's lightness, so the stop overshoots
		// sRGB until its cap is recomputed where the stop actually sits
		const input: Theme = {
			name: 'pinned stop',
			variables: [{ name: 'palette_lightness_20', light: '0.92', dark: '0.32' }]
		};
		const before = check_theme(input);
		assert.isAbove(gamut_fails(before).length, 0, 'the input fails gamut against the baked caps');
		assert.isTrue(
			gamut_fails(before).every((subject) => subject.endsWith('_20')),
			'only the pinned stop overshoots'
		);
		const { theme, report } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.deepEqual(
			overrides.map((v) => v.name),
			['palette_chroma_20'],
			'only the pinned stop drifts from the baked table'
		);
		const hues = Object.values(PALETTE_HUES);
		const [override] = overrides;
		assert.strictEqual(cap_of(override!.light), worst_hue_cap(0.92, hues));
		assert.strictEqual(cap_of(override!.dark), worst_hue_cap(0.32, hues));
		// both tighten: the pin moves each scheme's stop toward its near-ground end
		assert.isBelow(cap_of(override!.light), PALETTE_CHROMA_CAPS.light['20']);
		assert.isBelow(cap_of(override!.dark), PALETTE_CHROMA_CAPS.dark['20']);
		assert.deepEqual(gamut_fails(report), []);
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('compiling a theme that checks clean keeps it clean under a pinned lightness stop', () => {
		// one green hue with the chroma request raised until the caps bind: the
		// input passes on the conservative baked caps, so the looser caps compile
		// emits have to be the pinned stop's own or they push it out of gamut
		const input: Theme = {
			name: 'monochrome pinned stop',
			variables: [
				...Object.keys(PALETTE_HUES).map((letter) => ({ name: `hue_${letter}`, light: '145' })),
				{ name: 'palette_chroma_max', light: '0.3' },
				{ name: 'palette_lightness_20', light: '0.92', dark: '0.32' }
			]
		};
		assert.isTrue(check_theme(input).ok, 'the input checks clean');
		const { theme, report } = compile_theme(input);
		const stop_20 = theme.variables
			.slice(input.variables.length)
			.find((v) => v.name === 'palette_chroma_20');
		assert(stop_20, 'stop 20 emitted');
		assert.strictEqual(cap_of(stop_20.light), worst_hue_cap(0.92, [145]));
		assert.strictEqual(cap_of(stop_20.dark), worst_hue_cap(0.32, [145]));
		assert.deepEqual(gamut_fails(report), []);
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('a stanced theme honors a pinned lightness stop in its one appearance', () => {
		const input: Theme = {
			name: 'stanced pinned stop',
			scheme: 'dark',
			variables: [{ name: 'palette_lightness_20', light: '0.32' }]
		};
		assert.isAbove(gamut_fails(check_theme(input)).length, 0);
		const { theme, report } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.deepEqual(
			overrides.map((v) => v.name),
			['palette_chroma_20']
		);
		// both schemes resolve the same pin through the mirror, so one slot carries it
		assert.strictEqual(
			cap_of(overrides[0]!.light),
			worst_hue_cap(0.32, Object.values(PALETTE_HUES))
		);
		assert.isUndefined(overrides[0]!.dark);
		assert.isTrue(report.ok, JSON.stringify(report.entries.filter((e) => !e.pass)));
	});

	test('a stanced theme whose pin splits its schemes emits a cap for each', () => {
		// a dark slot under a stance breaks the one-appearance promise (the lint
		// warns), but both slots still render - so each needs its own cap
		const input: Theme = {
			name: 'stanced split stop',
			scheme: 'dark',
			variables: [{ name: 'palette_lightness_20', light: '0.32', dark: '0.25' }]
		};
		const { theme, report } = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.deepEqual(
			overrides.map((v) => v.name),
			['palette_chroma_20']
		);
		const hues = Object.values(PALETTE_HUES);
		assert.strictEqual(cap_of(overrides[0]!.light), worst_hue_cap(0.32, hues));
		assert.strictEqual(cap_of(overrides[0]!.dark), worst_hue_cap(0.25, hues));
		assert.notStrictEqual(cap_of(overrides[0]!.light), cap_of(overrides[0]!.dark));
		assert.deepEqual(gamut_fails(report), []);
	});

	test('a stop whose lightness does not resolve is skipped, not capped at the curve', () => {
		// valid CSS, but not a number the resolver reads - a cap computed at the
		// curve's lightness would describe a color the stop doesn't render
		const input: Theme = {
			name: 'percent stop',
			variables: [
				{ name: 'hue_i', light: '205' },
				{ name: 'palette_lightness_20', light: '84%' }
			]
		};
		const { theme, report } = compile_theme(input);
		const names = theme.variables.slice(input.variables.length).map((v) => v.name);
		assert.isAbove(names.length, 0, 'the nudged hue still tightens the stops that resolve');
		assert.notInclude(names, 'palette_chroma_20');
		assert.isTrue(report.unchecked.some((u) => u.variable === 'palette_lightness_20'));
	});

	test('an unresolvable hue emits nothing rather than caps computed without it', () => {
		// valid CSS, but not a number the resolver reads - caps computed from
		// the remaining hues would claim headroom this one may not have
		const input: Theme = { name: 'unit hue', variables: [{ name: 'hue_i', light: '195deg' }] };
		const { theme, report } = compile_theme(input);
		assert.strictEqual(theme.variables.length, input.variables.length);
		assert.isAbove(report.unchecked.length, 0, 'the re-check still reports the hue');
	});

	test('a stanced compiled theme recomputes its scheme_mirror over the emitted variables', () => {
		const input = create_monochrome_theme(145); // dark-stanced, unresolved
		const { theme } = compile_theme(input);
		assert(theme.scheme_mirror, 'compile resolves the stance');
		const mirror_names = new Set(theme.scheme_mirror.map((v) => v.name));
		for (const v of theme.variables) {
			assert.isFalse(mirror_names.has(v.name), `mirror excludes emitted ${v.name}`);
		}
	});
});
