import { test, assert, describe } from 'vitest';

import { compile_theme, check_theme } from '$lib/theme_check.ts';
import type { Theme } from '$lib/theme.ts';
import { default_themes } from '$lib/themes.ts';
import { necromancer_theme } from '$lib/themes/necromancer.ts';
import { create_monochrome_theme } from './test_helpers.ts';
import { PALETTE_CHROMA_CAPS } from '$lib/ramps.ts';
import type { NumericScaleVariant } from '$lib/variable_data.ts';

const base_theme = default_themes[0]!;

// the trailing worst-hue cap literal of a compiled `min(calc(...), <cap>)` value
const cap_of = (value: string | undefined): number => {
	const m = /,\s*([\d.]+)\)$/u.exec(value ?? '');
	assert(m, `not a compiled cap: ${value}`);
	return Number(m[1]);
};

const stop_of = (name: string): NumericScaleVariant =>
	name.slice('palette_chroma_'.length) as NumericScaleVariant;

describe('compile_theme', () => {
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
		// one green hue has more gamut headroom than the worst-hue envelope
		assert.isAbove(cap_of(stop_50.light), PALETTE_CHROMA_CAPS.light['50']);
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

	test('a dark stance recomputes stale light-scheme caps', () => {
		const { theme } = compile_theme(necromancer_theme);
		const overrides = theme.variables.slice(necromancer_theme.variables.length);
		assert.isAbove(overrides.length, 0);
		// the stance resolves the light scheme through the dark lightness ramp, so
		// the baked worst-hue caps are stale and must be recomputed
		const changed = overrides.some(
			(v) => Math.abs(cap_of(v.light) - PALETTE_CHROMA_CAPS.light[stop_of(v.name)]) > 0.002
		);
		assert.isTrue(changed, 'light caps differ from the baked worst-hue table');
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
