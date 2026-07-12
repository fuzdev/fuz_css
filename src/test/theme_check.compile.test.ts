import {test, assert, describe} from 'vitest';

import {compile_theme} from '$lib/theme_check.ts';
import type {Theme} from '$lib/theme.ts';
import {default_themes} from '$lib/themes.ts';
import {necromancer_theme} from '$lib/themes/necromancer.ts';
import {create_terminal_theme} from '$lib/themes/terminal.ts';
import {PALETTE_CHROMA_CAPS} from '$lib/ramps.ts';
import type {NumericScaleVariant} from '$lib/variable_data.ts';

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
		const {theme} = compile_theme(base_theme);
		assert.strictEqual(theme.variables.length, base_theme.variables.length);
	});

	test('a single-hue terminal theme emits higher mid-stop caps', () => {
		const input = create_terminal_theme(145);
		const {theme, report} = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.isAbove(overrides.length, 0);
		const stop_50 = overrides.find((v) => v.name === 'palette_chroma_50');
		assert(stop_50, 'stop 50 emitted');
		// one green hue has more gamut headroom than the worst-hue envelope
		assert.isAbove(cap_of(stop_50.light), PALETTE_CHROMA_CAPS.light['50']);
		assert.isAbove(cap_of(stop_50.dark), PALETTE_CHROMA_CAPS.dark['50']);
		assert.strictEqual(report.unchecked.length, 0);
	});

	test('compile does not mutate the input theme', () => {
		const input = create_terminal_theme(145);
		const before = input.variables.length;
		compile_theme(input);
		assert.strictEqual(input.variables.length, before);
	});

	test('a dark stance recomputes stale light-scheme caps', () => {
		const {theme} = compile_theme(necromancer_theme);
		const overrides = theme.variables.slice(necromancer_theme.variables.length);
		assert.isAbove(overrides.length, 0);
		// the stance resolves the light scheme through the dark lightness ramp, so
		// the baked worst-hue caps are stale and must be recomputed
		const changed = overrides.some(
			(v) => Math.abs(cap_of(v.light) - PALETTE_CHROMA_CAPS.light[stop_of(v.name)]) > 0.002,
		);
		assert.isTrue(changed, 'light caps differ from the baked worst-hue table');
	});

	test('a pinned palette_chroma_NN is respected — no emission for that stop', () => {
		const input: Theme = {
			name: 'terminal pinned',
			variables: [
				...create_terminal_theme(145).variables,
				{name: 'palette_chroma_50', light: '0.05'},
			],
		};
		const {theme} = compile_theme(input);
		const overrides = theme.variables.slice(input.variables.length);
		assert.isFalse(overrides.some((v) => v.name === 'palette_chroma_50'));
	});

	test('the compiled theme is fully checkable — nothing unchecked', () => {
		assert.strictEqual(compile_theme(create_terminal_theme(145)).report.unchecked.length, 0);
	});
});
