import { test, assert, describe } from 'vitest';

import { check_theme } from '#lib/theme_check.ts';
import {
	validate_theme,
	known_theme_variable_names,
	ACCENT_STATUS_HUE_SEPARATION
} from '#lib/theme_validate.ts';
import { resolve_theme_stance } from '#lib/theme_stance.ts';
import { shipped_base_themes, create_monochrome_theme } from './theme_test_helpers.ts';
import { PALETTE_HUES, PALETTE_CHROMA_MULTIPLIERS, render_chroma_stop_css } from '#lib/ramps.ts';
import { INTERNAL_VARIABLE_NAME_MATCHER, type StyleVariable, type Theme } from '#lib/variable.ts';
import { default_variables } from '#lib/variables.ts';

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
			variables: [{ name: 'not_a_real_var', base: '1' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'error' && i.variable === 'not_a_real_var'));
	});

	test('a malformed StyleVariable is an error', () => {
		// light === dark trips the schema refine
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'chroma_scale', base: '1', dark: '1' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'error'));
	});

	test('an out-of-range number is a warning, not an error', () => {
		const issues = validate_theme({ name: 't', variables: [{ name: 'chroma_scale', base: '5' }] });
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'chroma_scale'));
		assert.isFalse(issues.some((i) => i.level === 'error'));
	});

	test('a knob warning names the slot it read', () => {
		const messages = (variable: StyleVariable): Array<string> =>
			validate_theme({ name: 't', variables: [variable] }).map((i) => i.message);
		assert.isTrue(
			messages({ name: 'chroma_scale', base: '5' }).some((m) =>
				m.startsWith('chroma_scale base 5 is outside the safe range')
			)
		);
		assert.isTrue(
			messages({ name: 'chroma_scale', base: '1', dark: '5' }).some((m) =>
				m.startsWith('chroma_scale dark 5 is outside the safe range')
			)
		);
	});

	test('a bad enum value is a warning', () => {
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'border_style', base: 'wavy' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'border_style'));
		assert.isFalse(issues.some((i) => i.level === 'error'));
	});

	test('a var(--hue_X) binding on a hue knob is accepted', () => {
		assert.deepEqual(
			validate_theme({ name: 't', variables: [{ name: 'hue_accent', base: 'var(--hue_d)' }] }),
			[]
		);
	});

	test('the default variables lint clean', () => {
		// the defaults are the reference values, so a warning here is a lint
		// false positive (derived defaults are var() references and calc()s);
		// the intermediates are left out, since a theme can't set them
		const variables = default_variables.filter((v) => !INTERNAL_VARIABLE_NAME_MATCHER.test(v.name));
		assert.deepEqual(validate_theme({ name: 't', variables }), []);
	});

	test('setting a ramp intermediate is an error naming it', () => {
		for (const name of ['_palette_lightness_30', '_chroma_shape_50', '_text_lightness_95']) {
			const issues = validate_theme({ name: 't', variables: [{ name, base: '0.5' }] });
			assert.strictEqual(issues.length, 1, name);
			assert.strictEqual(issues[0]!.level, 'error');
			assert.strictEqual(issues[0]!.variable, name);
			assert.include(issues[0]!.message, 'internal ramp variable');
		}
	});

	test('a palette chroma intermediate is an error, the capped form included', () => {
		// compiled caps are derived data beside a theme, never in it
		for (const base of ['0.05', render_chroma_stop_css('50', 0.05)]) {
			const issues = validate_theme({
				name: 't',
				variables: [{ name: '_palette_chroma_50', base }]
			});
			assert.strictEqual(issues.length, 1, base);
			assert.strictEqual(issues[0]!.level, 'error');
			assert.include(issues[0]!.message, 'internal ramp variable');
		}
	});

	test('a contextual hook is a warning, not an unknown variable', () => {
		const local = validate_theme({
			name: 't',
			variables: [{ name: 'button_fill', base: 'red' }]
		});
		assert.strictEqual(local.length, 1);
		assert.strictEqual(local[0]!.level, 'warning');
		assert.strictEqual(local[0]!.variable, 'button_fill');
		assert.include(local[0]!.message, 'never reaches');
		const inherited = validate_theme({
			name: 't',
			variables: [{ name: 'flow_margin', base: '0' }]
		});
		assert.strictEqual(inherited.length, 1);
		assert.strictEqual(inherited[0]!.level, 'warning');
		assert.include(inherited[0]!.message, 'retunes every element');
		// the knob-tier hook is a theme variable
		assert.deepEqual(
			validate_theme({ name: 't', variables: [{ name: 'heading_font_weight', base: '700' }] }),
			[]
		);
		assert.isFalse(known_theme_variable_names.has('flow_margin'));
	});

	test('the known names leave out the intermediates', () => {
		for (const name of known_theme_variable_names) {
			assert.notMatch(name, INTERNAL_VARIABLE_NAME_MATCHER, name);
		}
		assert.isTrue(known_theme_variable_names.has('palette_lightness_00'));
		assert.isTrue(known_theme_variable_names.has('palette_a_50'));
	});

	test('the public spelling of an intermediate is unknown, with a pointer', () => {
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'palette_lightness_30', base: '0.5' }]
		});
		assert.strictEqual(issues.length, 1);
		assert.strictEqual(issues[0]!.level, 'error');
		assert.include(issues[0]!.message, 'unknown variable "palette_lightness_30"');
		assert.include(issues[0]!.message, '--_palette_lightness_30');
	});

	test('a var() reference passes the hue, enum, and time lints', () => {
		assert.deepEqual(
			validate_theme({
				name: 't',
				variables: [
					{ name: 'hue_positive', base: 'var(--hue_j)' },
					{ name: 'button_border_style', base: 'var(--border_style)' },
					{ name: 'duration_1', base: 'var(--duration_2)' }
				]
			}),
			[]
		);
	});

	test('a time knob takes milliseconds, range-checked in seconds', () => {
		assert.deepEqual(
			validate_theme({ name: 't', variables: [{ name: 'duration_1', base: '80ms' }] }),
			[]
		);
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'duration_1', base: '90000ms' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'duration_1'));
	});

	test('a number form CSS lacks is not a numeric knob value, and never resolves', () => {
		for (const value of ['0x10', '0b11', 'Infinity', '1.']) {
			const issues = validate_theme({
				name: 't',
				variables: [{ name: 'chroma_scale', base: value }]
			});
			assert.isTrue(
				issues.some((i) => i.level === 'warning' && i.variable === 'chroma_scale'),
				value
			);
			// the gates agree with the lint: the value is unchecked, not read as a number
			const report = check_theme({ name: 't', variables: [{ name: 'hue_a', base: value }] });
			assert.deepEqual(
				report.unchecked.map((u) => u.variable),
				['hue_a'],
				value
			);
		}
	});

	test('every CSS number form is a numeric knob value', () => {
		for (const value of ['1e0', '+1', '.9', '1.0', '1E0']) {
			assert.deepEqual(
				validate_theme({ name: 't', variables: [{ name: 'chroma_scale', base: value }] }),
				[],
				value
			);
		}
	});

	test('scheme stance values validate, a stance needing nothing beside it', () => {
		for (const scheme of ['dual', 'light', 'dark'] as const) {
			assert.deepEqual(validate_theme({ name: 't', variables: [], scheme }), []);
		}
		const issues = validate_theme({ name: 't', variables: [], scheme: 'dusk' as 'dark' });
		assert.isTrue(issues.some((i) => i.level === 'error'));
	});

	test('a scheme_mirror on a theme is an error - the mirror is derived, never wire data', () => {
		const { theme, scheme_mirror } = resolve_theme_stance({
			name: 't',
			variables: [],
			scheme: 'dark'
		});
		const issues = validate_theme({ ...theme, scheme_mirror });
		assert.isTrue(issues.some((i) => i.level === 'error' && i.message.includes('scheme_mirror')));
	});

	test('a dark slot under a single-scheme stance is a warning, not an error', () => {
		for (const scheme of ['light', 'dark'] as const) {
			const issues = validate_theme({
				name: 't',
				scheme,
				variables: [{ name: 'neutral_chroma', base: '0.02', dark: '0.03' }]
			});
			assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'neutral_chroma'));
			assert.isFalse(issues.some((i) => i.level === 'error'));
		}
		// single-slot stanced and dual-slot unstanced themes stay clean
		assert.deepEqual(
			validate_theme({
				name: 't',
				scheme: 'dark',
				variables: [{ name: 'neutral_chroma', base: '0.02' }]
			}),
			[]
		);
		assert.deepEqual(
			validate_theme({
				name: 't',
				variables: [{ name: 'neutral_chroma', base: '0.02', dark: '0.03' }]
			}),
			[]
		);
	});

	test('binding an intent to the muted brown slot warns about the dropped character', () => {
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'hue_accent', base: 'var(--hue_f)' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'hue_accent'));
	});

	test('setting the intent chroma twin to match the bound slot silences the pairing warning', () => {
		const issues = validate_theme({
			name: 't',
			variables: [
				{ name: 'hue_accent', base: 'var(--hue_f)' },
				{ name: 'accent_chroma_scale', base: String(PALETTE_CHROMA_MULTIPLIERS.f) },
				// brown sits near the default orange caution
				{ name: 'hue_caution', base: 'var(--hue_e)' }
			]
		});
		assert.deepEqual(issues, []);
	});

	test('muting a letter warns through the default binding that points at it', () => {
		// hue_negative defaults to var(--hue_c)
		const issues = validate_theme({
			name: 't',
			variables: [{ name: 'palette_c_chroma_scale', base: '0.5' }]
		});
		assert.isTrue(issues.some((i) => i.level === 'warning' && i.variable === 'hue_negative'));
	});

	test('a muted binding in one scheme warns even when the other binds a full-chroma slot', () => {
		for (const variable of [
			{ name: 'hue_accent', base: 'var(--hue_f)', dark: 'var(--hue_a)' },
			{ name: 'hue_accent', base: 'var(--hue_a)', dark: 'var(--hue_f)' }
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
		// hue_positive defaults to var(--hue_b)
		const warnings = separation_warnings({
			name: 't',
			variables: [{ name: 'hue_accent', base: 'var(--hue_b)' }]
		});
		assert.strictEqual(warnings.length, 1);
		assert.include(warnings[0], 'hue_positive');
	});

	test('rebinding the status clears the accent separation warning', () => {
		assert.deepEqual(
			separation_warnings({
				name: 't',
				variables: [
					{ name: 'hue_accent', base: 'var(--hue_c)' },
					{ name: 'hue_negative', base: 'var(--hue_g)' },
					// red is also near the default orange caution
					{ name: 'hue_caution', base: 'var(--hue_e)' }
				]
			}),
			[]
		);
	});

	test('a unitless length warns, and a bare 0 only where it lands inside max()', () => {
		const length_warnings = (name: string, base: string): number =>
			validate_theme({ name: 't', variables: [{ name, base }] }).filter(
				(i) => i.level === 'warning' && i.message.includes('needs a unit')
			).length;
		assert.strictEqual(length_warnings('border_radius_min', '0'), 1);
		assert.strictEqual(length_warnings('border_radius_min', '0rem'), 0);
		assert.strictEqual(length_warnings('border_radius_min', '0.5rem'), 0);
		assert.strictEqual(length_warnings('outline_offset', '0'), 0);
		assert.strictEqual(length_warnings('outline_offset', '2'), 1);
		assert.strictEqual(length_warnings('control_radius', 'var(--border_radius_md)'), 0);
	});

	test('the accent separation threshold splits a near-clone from a neighbor', () => {
		const distance = (a: number, b: number): number =>
			Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
		// a red accent beside the default orange caution warns
		assert.isAbove(ACCENT_STATUS_HUE_SEPARATION, distance(PALETTE_HUES.c, PALETTE_HUES.h));
		// a pink accent beside the default red negative doesn't
		assert.isAtMost(ACCENT_STATUS_HUE_SEPARATION, distance(PALETTE_HUES.g, PALETTE_HUES.c));
		// and the default theme clears it
		assert.deepEqual(separation_warnings({ name: 't', variables: [] }), []);
		const at = (angle: number): Array<string> =>
			separation_warnings({ name: 't', variables: [{ name: 'hue_accent', base: String(angle) }] });
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
					{ name: 'hue_accent', base: String(angle) },
					{ name: 'hue_negative', base: 'var(--hue_g)' }
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
			variables: [{ name: 'hue_accent', base: 'var(--hue_b)' }]
		});
		assert.strictEqual(warnings.length, 1);
		assert.include(warnings[0], 'hue_positive in dark');
	});

	test('a hue that resolves to no number is skipped by the separation lint', () => {
		assert.deepEqual(
			separation_warnings({
				name: 't',
				variables: [{ name: 'hue_accent', base: `${PALETTE_HUES.c}deg` }]
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
					{ name: 'hue_accent', base: 'var(--hue_c)' },
					{ name: 'chroma_scale', base: '0' }
				]
			}),
			[]
		);
	});

	test('an accent that collides in one scheme only still warns, naming that scheme', () => {
		const warnings = separation_warnings({
			name: 't',
			variables: [{ name: 'hue_accent', base: 'var(--hue_a)', dark: 'var(--hue_b)' }]
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
				{ name: 'hue_negative', base: '20' },
				{ name: 'palette_c_chroma_scale', base: '0.5' }
			]
		});
		assert.deepEqual(issues, []);
	});
});
