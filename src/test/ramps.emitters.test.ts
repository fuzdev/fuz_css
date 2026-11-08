/**
 * Emitter ↔ numeric-twin equivalence: the CSS strings the `render_*_css`
 * emitters produce, evaluated numerically with the knob variables
 * substituted, must equal the `ramps.ts` evaluators the gates assert
 * against. Without this the gamut/monotonicity/contrast gates prove
 * properties of the JS model while the shipped `calc()`/`oklch()` CSS could
 * drift (an operator-precedence slip, a missing clamp, a dropped
 * multiplier).
 *
 * @module
 */

import { test, assert, describe } from 'vitest';
import { oklch_in_srgb_gamut } from '@fuzdev/fuz_util/oklch.ts';

import {
	PALETTE_HUES,
	PALETTE_CHROMA_MULTIPLIERS,
	LIGHTNESS_KNOBS,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_CAPS,
	NEUTRAL_CHROMA,
	SHADE_CHROMA_00,
	ramp_lightness,
	ramp_chroma,
	ramp_chroma_shape,
	palette_stop_oklch,
	shade_stop_oklch,
	text_stop_oklch,
	render_lightness_stop_css,
	render_chroma_shape_css,
	render_chroma_stop_css,
	render_neutral_stop_css,
	neutral_color_oklch,
	neutral_ground_chroma_weight,
	shade_ground_chroma,
	render_shade_ground_chroma_css,
	render_contrast_css,
	render_contrast_ground_end_css,
	render_contrast_ground_lightness_css,
	render_contrast_curve_css,
	contrast_lightness_knobs,
	contrast_ground_end,
	contrast_ground_lightness,
	contrast_lightness_curve,
	effective_contrast,
	CONTRAST_NAME,
	CONTRAST_PREFERENCE_NAME,
	CONTRAST_GROUND_END_NAME,
	SHADE_GROUND_CHROMA_NAME,
	SHADE_GROUND_CHROMA_REACH,
	render_ramp_color_css,
	render_border_color_stop_css,
	render_border_color_css,
	border_contrast_share,
	HIGH_CONTRAST,
	BORDER_CONTRAST_STOPS,
	render_shadow_tint_css,
	border_color_oklch,
	BORDER_COLOR_ALPHAS,
	to_chroma_shape_name,
	to_lightness_curve_name,
	to_lightness_stop_name,
	to_palette_chroma_name,
	type RampFamily
} from '#lib/ramps.ts';
import {
	numeric_scale_variants,
	palette_variants,
	color_scheme_variants,
	type ColorScheme,
	type NumericScaleVariant
} from '#lib/variable_data.ts';

// the emitters round ramp positions to 1e-6, so allow a hair over that
const TOLERANCE = 1e-5;

/**
 * Evaluates the emitted CSS value grammar to a number: numeric literals,
 * `var(--x[, fallback])`, `calc(expr)`, `min(a, ...)`, `max(a, ...)`,
 * `clamp(min, value, max)`, `pow(a, b)`, `+ - * /`, and parentheses. With
 * `percent`, every numeric literal must carry `%` and reads as its number, so
 * the expression evaluates in percent; without it a `%` throws. Throws on
 * anything outside the grammar so an emitter change that this evaluator can't
 * follow fails loudly instead of silently passing.
 */
const evaluate_css_number = (
	expr: string,
	vars: Record<string, number>,
	options?: { percent?: boolean }
): number => {
	const percent = options?.percent ?? false;
	let i = 0;
	const s = expr;

	const skip_ws = (): void => {
		while (i < s.length && /\s/.test(s[i]!)) i++;
	};

	const parse_expr = (): number => {
		let value = parse_term();
		for (;;) {
			skip_ws();
			const c = s[i];
			if (c === '+' || c === '-') {
				i++;
				const rhs = parse_term();
				value = c === '+' ? value + rhs : value - rhs;
			} else {
				return value;
			}
		}
	};

	const parse_term = (): number => {
		let value = parse_factor();
		for (;;) {
			skip_ws();
			const c = s[i];
			if (c === '*' || c === '/') {
				i++;
				const rhs = parse_factor();
				value = c === '*' ? value * rhs : value / rhs;
			} else {
				return value;
			}
		}
	};

	const expect = (char: string): void => {
		skip_ws();
		if (s[i] !== char) {
			throw new Error(`expected "${char}" at ${i} in ${expr}`);
		}
		i++;
	};

	const parse_factor = (): number => {
		skip_ws();
		if (s[i] === '(') {
			i++;
			const value = parse_expr();
			expect(')');
			return value;
		}
		const fn = /^(calc|min|max|clamp|pow|var)\(/.exec(s.slice(i));
		if (fn) {
			const name = fn[1]!;
			i += fn[0].length;
			if (name === 'calc') {
				const value = parse_expr();
				expect(')');
				return value;
			}
			if (name === 'var') {
				skip_ws();
				const m = /^--(_?[a-z][a-z0-9_]*)/.exec(s.slice(i));
				if (!m) throw new Error(`expected a custom property name at ${i} in ${expr}`);
				i += m[0].length;
				skip_ws();
				let fallback: number | null = null;
				if (s[i] === ',') {
					i++;
					fallback = parse_expr();
				}
				expect(')');
				const value = vars[m[1]!] ?? fallback;
				if (value === null || value === undefined) {
					throw new Error(`unbound variable --${m[1]} with no fallback in ${expr}`);
				}
				return value;
			}
			if (name === 'min' || name === 'max') {
				// one or more comma-separated arguments
				const args = [parse_expr()];
				skip_ws();
				while (s[i] === ',') {
					i++;
					args.push(parse_expr());
					skip_ws();
				}
				expect(')');
				return name === 'min' ? Math.min(...args) : Math.max(...args);
			}
			if (name === 'clamp') {
				const lo = parse_expr();
				expect(',');
				const value = parse_expr();
				expect(',');
				const hi = parse_expr();
				expect(')');
				return Math.max(lo, Math.min(value, hi));
			}
			// pow: two comma-separated arguments
			const a = parse_expr();
			expect(',');
			const b = parse_expr();
			expect(')');
			return a ** b;
		}
		const num = (percent ? /^-?\d*\.?\d+(e-?\d+)?%/i : /^-?\d*\.?\d+(e-?\d+)?/i).exec(s.slice(i));
		if (!num) throw new Error(`expected a number at ${i} ("${s.slice(i, i + 12)}") in ${expr}`);
		i += num[0].length;
		if (!percent && s[i] === '%') throw new Error(`unexpected % at ${i} in ${expr}`);
		return Number(num[0].replace('%', ''));
	};

	const value = parse_expr();
	skip_ws();
	if (i !== s.length) throw new Error(`trailing content at ${i} in ${expr}`);
	return value;
};

/** Splits `oklch(L C H)` into its three top-level space-separated arguments. */
const parse_oklch_args = (css: string): [string, string, string] => {
	const m = /^oklch\((.*)\)$/su.exec(css);
	assert(m, `not an oklch() value: ${css}`);
	const inner = m[1]!;
	const args: Array<string> = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === '(') depth++;
		else if (char === ')') depth--;
		if (char === ' ' && depth === 0) {
			if (current) args.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	if (current) args.push(current);
	assert.strictEqual(args.length, 3, `expected 3 oklch args in ${css}`);
	return args as [string, string, string];
};

// binds the contrast intermediates and then the ground tint by evaluating their
// own emitters over `vars`, so a knob override reaches the stops through them
// as the CSS would
const bind_derived = (
	vars: Record<string, number>,
	scheme: ColorScheme
): Record<string, number> => {
	const bound = { ...vars };
	bound[CONTRAST_NAME] = evaluate_css_number(render_contrast_css(), bound);
	bound[CONTRAST_GROUND_END_NAME] = evaluate_css_number(
		render_contrast_ground_end_css(scheme),
		bound
	);
	bound[to_lightness_stop_name('shade', '00')] = evaluate_css_number(
		render_contrast_ground_lightness_css(),
		bound
	);
	for (const family of ['shade', 'text'] as const) {
		bound[to_lightness_curve_name(family)] = evaluate_css_number(
			render_contrast_curve_css(family),
			bound
		);
	}
	bound[SHADE_GROUND_CHROMA_NAME] = evaluate_css_number(render_shade_ground_chroma_css(), bound);
	return bound;
};

/** All knob variables an emitted color stop can reference, per scheme. */
const knob_vars = (scheme: ColorScheme): Record<string, number> => {
	const vars: Record<string, number> = {
		chroma_scale: 1,
		neutral_chroma: NEUTRAL_CHROMA[scheme],
		shade_chroma_00: SHADE_CHROMA_00,
		border_color_lightness: border_color_oklch(scheme)[0],
		border_color_chroma: border_color_oklch(scheme)[1],
		hue_neutral: PALETTE_HUES.f,
		hue_accent: PALETTE_HUES.a,
		accent_chroma_scale: 1,
		palette_chroma_min: PALETTE_CHROMA_KNOBS[scheme].chroma_min,
		palette_chroma_max: PALETTE_CHROMA_KNOBS[scheme].chroma_max,
		chroma_curve: PALETTE_CHROMA_KNOBS[scheme].curve,
		contrast: 0,
		[CONTRAST_PREFERENCE_NAME]: 0
	};
	for (const family of ['palette', 'shade', 'text'] as const) {
		const knobs = LIGHTNESS_KNOBS[family][scheme];
		vars[`${family}_lightness_00`] = knobs.lightness_00;
		vars[`${family}_lightness_100`] = knobs.lightness_100;
		vars[`${family}_lightness_curve`] = knobs.curve;
	}
	for (const letter of palette_variants) {
		vars[`hue_${letter}`] = PALETTE_HUES[letter];
		vars[`palette_${letter}_chroma_scale`] = PALETTE_CHROMA_MULTIPLIERS[letter];
	}
	for (const stop of numeric_scale_variants) {
		vars[to_chroma_shape_name(stop)] = ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS[scheme].curve);
		vars[to_palette_chroma_name(stop)] = ramp_chroma(
			stop,
			PALETTE_CHROMA_KNOBS[scheme],
			PALETTE_CHROMA_CAPS[scheme][stop]
		);
		for (const family of ['palette', 'shade', 'text'] as const) {
			if (stop === '00' || stop === '100') continue; // the knobs, or bound below
			vars[to_lightness_stop_name(family, stop)] = ramp_lightness(
				LIGHTNESS_KNOBS[family][scheme],
				stop
			);
		}
	}
	return bind_derived(vars, scheme);
};

const DERIVED_STOPS = numeric_scale_variants.filter(
	(stop) => stop !== '00' && stop !== '100'
) as Array<NumericScaleVariant>;

describe('lightness stop emitter', () => {
	test('matches ramp_lightness for every family, scheme, and derived stop', () => {
		for (const family of ['palette', 'shade', 'text'] as Array<RampFamily>) {
			for (const scheme of color_scheme_variants) {
				const vars = knob_vars(scheme);
				for (const stop of DERIVED_STOPS) {
					const css = render_lightness_stop_css(family, stop);
					assert.closeTo(
						evaluate_css_number(css, vars),
						ramp_lightness(LIGHTNESS_KNOBS[family][scheme], stop),
						TOLERANCE,
						`${family} ${scheme} ${stop}`
					);
				}
			}
		}
	});
});

describe('chroma shape emitter', () => {
	test('matches ramp_chroma_shape at every stop, exact 0/1 at the extremes', () => {
		for (const scheme of color_scheme_variants) {
			const curve = PALETTE_CHROMA_KNOBS[scheme].curve;
			const vars = knob_vars(scheme);
			for (const stop of numeric_scale_variants) {
				const css = render_chroma_shape_css(stop);
				assert.closeTo(
					evaluate_css_number(css, vars),
					ramp_chroma_shape(stop, curve),
					TOLERANCE,
					`${scheme} ${stop}`
				);
			}
		}
		assert.strictEqual(render_chroma_shape_css('00'), '0');
		assert.strictEqual(render_chroma_shape_css('100'), '0');
		assert.strictEqual(render_chroma_shape_css('50'), '1');
	});
});

describe('chroma stop emitter', () => {
	test('matches ramp_chroma - the capped knob curve - at every stop', () => {
		for (const scheme of color_scheme_variants) {
			const vars = knob_vars(scheme);
			for (const stop of numeric_scale_variants) {
				const css = render_chroma_stop_css(stop, PALETTE_CHROMA_CAPS[scheme][stop]);
				assert.closeTo(
					evaluate_css_number(css, vars),
					ramp_chroma(stop, PALETTE_CHROMA_KNOBS[scheme], PALETTE_CHROMA_CAPS[scheme][stop]),
					TOLERANCE,
					`${scheme} ${stop}`
				);
			}
		}
	});

	test('an explicit cap overrides the baked one', () => {
		const vars = knob_vars('light');
		const css = render_chroma_stop_css('50', 0.01);
		assert.closeTo(evaluate_css_number(css, vars), 0.01, TOLERANCE);
	});
});

describe('palette stop emitter', () => {
	test('matches palette_stop_oklch for every letter, scheme, and stop', () => {
		for (const scheme of color_scheme_variants) {
			const vars = knob_vars(scheme);
			for (const letter of palette_variants) {
				for (const stop of numeric_scale_variants) {
					const [l_css, c_css, h_css] = parse_oklch_args(render_ramp_color_css(letter, stop));
					const [l, c, h] = palette_stop_oklch(letter, stop, scheme);
					assert.closeTo(evaluate_css_number(l_css, vars), l, TOLERANCE, `${letter} ${stop} L`);
					assert.closeTo(evaluate_css_number(c_css, vars), c, TOLERANCE, `${letter} ${stop} C`);
					assert.closeTo(evaluate_css_number(h_css, vars), h, TOLERANCE, `${letter} ${stop} H`);
				}
			}
		}
	});

	test("the slot multiplier rides the emitted chroma - brown's mute is in the CSS", () => {
		const vars = knob_vars('light');
		const [, c_f] = parse_oklch_args(render_ramp_color_css('f', '50'));
		const [, c_h] = parse_oklch_args(render_ramp_color_css('h', '50'));
		const ratio = evaluate_css_number(c_f, vars) / evaluate_css_number(c_h, vars);
		assert.closeTo(ratio, PALETTE_CHROMA_MULTIPLIERS.f, TOLERANCE);
	});
});

describe('neutral stop emitter', () => {
	test('matches shade_stop_oklch and text_stop_oklch at every stop', () => {
		for (const scheme of color_scheme_variants) {
			const vars = knob_vars(scheme);
			for (const stop of numeric_scale_variants) {
				for (const [family, twin] of [
					['shade', shade_stop_oklch],
					['text', text_stop_oklch]
				] as const) {
					const [l_css, c_css, h_css] = parse_oklch_args(render_neutral_stop_css(family, stop));
					const [l, c, h] = twin(stop, scheme);
					assert.closeTo(evaluate_css_number(l_css, vars), l, TOLERANCE, `${family} ${stop} L`);
					assert.closeTo(evaluate_css_number(c_css, vars), c, TOLERANCE, `${family} ${stop} C`);
					assert.closeTo(evaluate_css_number(h_css, vars), h, TOLERANCE, `${family} ${stop} H`);
				}
			}
		}
	});
});

describe('the ground tint', () => {
	test('the emitter and the twin add each stop its share of it', () => {
		// past what the default light ground carries, so the clamp is exercised
		const vars = bind_derived({ ...knob_vars('light'), shade_chroma_00: 0.015 }, 'light');
		const tint = shade_ground_chroma(0.015, LIGHTNESS_KNOBS.shade.light.lightness_00);
		assert.isBelow(tint, 0.015);
		for (const stop of numeric_scale_variants) {
			for (const family of ['shade', 'text'] as const) {
				const [l_css, c_css, h_css] = parse_oklch_args(render_neutral_stop_css(family, stop));
				const ground = tint * neutral_ground_chroma_weight(family, stop);
				const [l, c, h] = neutral_color_oklch(
					evaluate_css_number(l_css, vars),
					NEUTRAL_CHROMA.light,
					ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS.light.curve),
					PALETTE_HUES.f,
					ground
				);
				assert.closeTo(evaluate_css_number(c_css, vars), c, TOLERANCE, `${family} ${stop} C`);
				assert.closeTo(evaluate_css_number(l_css, vars), l, TOLERANCE, `${family} ${stop} L`);
				assert.closeTo(evaluate_css_number(h_css, vars), h, TOLERANCE, `${family} ${stop} H`);
			}
		}
		assert.include(render_neutral_stop_css('shade', '00'), 'var(--_shade_ground_chroma))');
		assert.include(render_neutral_stop_css('shade', '10'), 'var(--_shade_ground_chroma) *');
		assert.notInclude(render_neutral_stop_css('shade', '50'), 'var(--_shade_ground_chroma)');
		assert.notInclude(render_neutral_stop_css('text', '00'), 'var(--_shade_ground_chroma)');
		// the stops read the clamped tint, never the knob itself
		for (const stop of numeric_scale_variants) {
			assert.notInclude(render_neutral_stop_css('shade', stop), 'var(--shade_chroma_00)');
		}
	});

	test('the ground tint emitter matches its twin', () => {
		for (const scheme of color_scheme_variants) {
			for (let l = 0; l <= 100; l += 5) {
				// a negative request renders negative, like the CSS - the color clamp
				// is the browser's, not the twin's
				for (const chroma_00 of [-0.02, 0, 0.005, 0.012, 0.03, 0.1]) {
					const lightness_00 = l / 100;
					const vars = bind_derived(
						{
							...knob_vars(scheme),
							shade_chroma_00: chroma_00,
							shade_lightness_00: lightness_00
						},
						scheme
					);
					assert.closeTo(
						evaluate_css_number(render_shade_ground_chroma_css(), vars),
						shade_ground_chroma(chroma_00, lightness_00),
						TOLERANCE,
						`${scheme} L00 ${lightness_00} tint ${chroma_00}`
					);
				}
			}
		}
	});

	test('the ground tint emitter matches its twin at the effective ground under contrast', () => {
		// the clamp reads the moved ground, not the knob
		for (const scheme of color_scheme_variants) {
			for (const contrast of [0.25, 0.5, 1]) {
				for (const lightness_00 of [0.05, 0.2, 0.9, 0.97]) {
					for (const chroma_00 of [0.005, 0.012, 0.03]) {
						const vars = bind_derived(
							{
								...knob_vars(scheme),
								contrast,
								shade_chroma_00: chroma_00,
								shade_lightness_00: lightness_00
							},
							scheme
						);
						const ground = contrast_lightness_knobs(
							'shade',
							{ ...LIGHTNESS_KNOBS.shade[scheme], lightness_00 },
							contrast,
							scheme
						).lightness_00;
						assert.closeTo(
							evaluate_css_number(render_shade_ground_chroma_css(), vars),
							shade_ground_chroma(chroma_00, ground),
							TOLERANCE,
							`${scheme} c ${contrast} L00 ${lightness_00} tint ${chroma_00}`
						);
					}
				}
			}
		}
	});

	test('the clamped ground is in sRGB at every hue, ground lightness, and tint', () => {
		// worst hue at both ends: the slopes bound the tint below every hue's
		// sRGB edge, so no ground a theme can set clips
		for (let hue = 0; hue < 360; hue += 5) {
			for (let l = 0; l <= 100; l++) {
				const lightness_00 = l / 100;
				for (let t = 0; t <= 100; t += 5) {
					const ground = shade_ground_chroma(t / 1000, lightness_00);
					// the ground stop's chroma shape is 0, so the tint is its whole chroma
					const color = neutral_color_oklch(lightness_00, 0, 0, hue, ground);
					assert.isTrue(
						oklch_in_srgb_gamut(color),
						`hue ${hue} L00 ${lightness_00} tint ${t / 1000}: ${color.join(' ')}`
					);
				}
			}
		}
	});

	test('the weight is whole at the ground and fades out by the reach', () => {
		assert.strictEqual(neutral_ground_chroma_weight('shade', '00'), 1);
		// quadratic: a fifth of the way to the reach keeps (1 - 0.2)^2 of the tint
		assert.strictEqual(neutral_ground_chroma_weight('shade', '10'), 0.64);
		let previous = 1;
		for (const stop of numeric_scale_variants) {
			const weight = neutral_ground_chroma_weight('shade', stop);
			assert.isAtMost(weight, previous, `shade ${stop} rises`);
			if (Number(stop) / 100 >= SHADE_GROUND_CHROMA_REACH) {
				assert.strictEqual(weight, 0, `shade ${stop} past the reach`);
			} else {
				assert.isAbove(weight, 0, `shade ${stop} inside the reach`);
			}
			assert.strictEqual(neutral_ground_chroma_weight('text', stop), 0, `text ${stop}`);
			previous = weight;
		}
	});
});

describe('the contrast intermediates', () => {
	test('are the knobs exactly at the default contrast', () => {
		for (const scheme of color_scheme_variants) {
			for (const family of ['palette', 'shade', 'text'] as const) {
				const knobs = LIGHTNESS_KNOBS[family][scheme];
				assert.deepEqual(contrast_lightness_knobs(family, knobs, 0, scheme), knobs);
			}
			const vars = knob_vars(scheme);
			assert.strictEqual(vars[CONTRAST_NAME], 0);
			assert.strictEqual(
				vars[to_lightness_stop_name('shade', '00')],
				LIGHTNESS_KNOBS.shade[scheme].lightness_00
			);
			assert.strictEqual(
				vars[to_lightness_curve_name('shade')],
				LIGHTNESS_KNOBS.shade[scheme].curve
			);
			assert.strictEqual(vars[to_lightness_curve_name('text')], LIGHTNESS_KNOBS.text[scheme].curve);
		}
	});

	test('the emitters match their twins over a grid of contrast and knobs', () => {
		for (const scheme of color_scheme_variants) {
			for (const contrast of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
				for (const preference of [0, 0.5]) {
					// 0.05 sits below the dark end and 1.02 above the light one, so
					// the clamp to the ground holds them in place
					for (const lightness_00 of [0.05, 0.2, 0.5, 0.9, 0.97, 1.02]) {
						for (const curve of [0.5, 1, 1.3]) {
							// distinct shade and text curves, so a family swap shows
							const text_curve = curve + 0.2;
							const vars = bind_derived(
								{
									...knob_vars(scheme),
									contrast,
									[CONTRAST_PREFERENCE_NAME]: preference,
									shade_lightness_00: lightness_00,
									shade_lightness_curve: curve,
									text_lightness_curve: text_curve
								},
								scheme
							);
							const label = `${scheme} c ${contrast} pref ${preference} L00 ${lightness_00} curve ${curve}`;
							const c = effective_contrast(contrast, preference);
							assert.closeTo(vars[CONTRAST_NAME]!, c, TOLERANCE, label);
							assert.closeTo(
								vars[CONTRAST_GROUND_END_NAME]!,
								contrast_ground_end(scheme, lightness_00),
								TOLERANCE,
								label
							);
							assert.closeTo(
								vars[to_lightness_stop_name('shade', '00')]!,
								contrast_ground_lightness(
									lightness_00,
									contrast_ground_end(scheme, lightness_00),
									c
								),
								TOLERANCE,
								label
							);
							// the ground only ever moves toward the scheme's extreme
							const ground = vars[to_lightness_stop_name('shade', '00')]!;
							if (scheme === 'light') assert.isAtLeast(ground, lightness_00 - TOLERANCE, label);
							else assert.isAtMost(ground, lightness_00 + TOLERANCE, label);
							assert.closeTo(
								vars[to_lightness_curve_name('shade')]!,
								contrast_lightness_curve('shade', curve, c),
								TOLERANCE,
								label
							);
							assert.closeTo(
								vars[to_lightness_curve_name('text')]!,
								contrast_lightness_curve('text', text_curve, c),
								TOLERANCE,
								label
							);
							// every stop, through the emitted stop CSS, against the twin
							for (const family of ['shade', 'text'] as const) {
								const knobs = contrast_lightness_knobs(
									family,
									{
										...LIGHTNESS_KNOBS[family][scheme],
										...(family === 'shade' ? { lightness_00 } : {}),
										curve: family === 'shade' ? curve : text_curve
									},
									c,
									scheme
								);
								for (const stop of numeric_scale_variants) {
									const css =
										stop === '00' || stop === '100'
											? `var(--${to_lightness_stop_name(family, stop)})`
											: render_lightness_stop_css(family, stop);
									assert.closeTo(
										evaluate_css_number(css, vars),
										ramp_lightness(knobs, stop),
										TOLERANCE,
										`${family} ${stop} ${label}`
									);
								}
							}
						}
					}
				}
			}
		}
	});

	test('the neutral stops read the intermediates, never the moved knobs', () => {
		for (const stop of numeric_scale_variants) {
			assert.notInclude(render_neutral_stop_css('shade', stop), 'var(--shade_lightness_00)');
			assert.notInclude(render_neutral_stop_css('shade', stop), 'var(--shade_lightness_curve)');
			assert.notInclude(render_neutral_stop_css('text', stop), 'var(--text_lightness_curve)');
		}
		for (const stop of DERIVED_STOPS) {
			assert.notInclude(render_lightness_stop_css('shade', stop), 'var(--shade_lightness_00)');
			assert.notInclude(render_lightness_stop_css('shade', stop), 'var(--shade_lightness_curve)');
			assert.notInclude(render_lightness_stop_css('text', stop), 'var(--text_lightness_curve)');
		}
		assert.notInclude(render_shade_ground_chroma_css(), 'var(--shade_lightness_00)');
	});
});

describe('ramp color emitter', () => {
	test('an intent hue reference picks up its chroma multiplier twin', () => {
		const vars = { ...knob_vars('light'), accent_chroma_scale: 0.7 };
		const [, c_css] = parse_oklch_args(render_ramp_color_css('accent', '50'));
		assert.closeTo(
			evaluate_css_number(c_css, vars),
			ramp_chroma('50', PALETTE_CHROMA_KNOBS.light, PALETTE_CHROMA_CAPS.light['50']) * 0.7,
			TOLERANCE
		);
	});

	test('letter and intent slots pair their hue with their own multiplier', () => {
		assert.include(render_ramp_color_css('a', '50'), 'var(--palette_a_chroma_scale, 1)');
		assert.include(render_ramp_color_css('a', '50'), 'var(--hue_a)');
		assert.include(render_ramp_color_css('accent', '50'), 'var(--accent_chroma_scale, 1)');
		assert.include(render_ramp_color_css('accent', '50'), 'var(--hue_accent)');
	});

	test('the alpha channel renders into the oklch()', () => {
		const css = render_ramp_color_css('a', '40', '40%');
		assert.isTrue(css.endsWith('/ 40%)'), css);
	});
});

describe('border color stop emitter', () => {
	test('matches border_color_oklch with the stop alpha appended', () => {
		for (const scheme of color_scheme_variants) {
			const vars = knob_vars(scheme);
			const [l, c, h] = border_color_oklch(scheme);
			for (const stop of numeric_scale_variants) {
				const alpha = BORDER_COLOR_ALPHAS[scheme][stop];
				const css = render_border_color_stop_css(stop, scheme);
				if (alpha === 0) {
					assert.strictEqual(css, 'transparent');
					continue;
				}
				const color = alpha === 100 ? css : css.replace(` / ${alpha}%)`, ')');
				if (alpha !== 100) assert.notStrictEqual(color, css, 'alpha stripped');
				const [l_css, c_css, h_css] = parse_oklch_args(color);
				assert.closeTo(evaluate_css_number(l_css, vars), l, TOLERANCE, `${scheme} ${stop} L`);
				assert.closeTo(evaluate_css_number(c_css, vars), c, TOLERANCE, `${scheme} ${stop} C`);
				assert.closeTo(evaluate_css_number(h_css, vars), h, TOLERANCE, `${scheme} ${stop} H`);
			}
		}
	});
});

// splits a function's arguments on its top-level commas
const split_top_level = (inner: string, separator: string): Array<string> => {
	const args: Array<string> = [];
	let depth = 0;
	let current = '';
	for (const char of inner) {
		if (char === '(') depth++;
		else if (char === ')') depth--;
		if (char === separator && depth === 0) {
			args.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	args.push(current.trim());
	return args;
};

describe('control border emitter', () => {
	test('mixes the rest stop toward the reach stop by the twin share', () => {
		const css = render_border_color_css();
		const m = /^color-mix\((.*)\)$/su.exec(css);
		assert(m, `not a color-mix() value: ${css}`);
		const [space, first, second, ...rest] = split_top_level(m[1]!, ',');
		assert.deepEqual(rest, [], css);
		assert.strictEqual(space, 'in oklab');
		// the first color carries the remainder, so it's the rest stop
		assert.strictEqual(first, `var(--shade_${BORDER_CONTRAST_STOPS.rest})`);
		const [reach, ...percentage] = split_top_level(second!, ' ');
		assert.strictEqual(reach, `var(--shade_${BORDER_CONTRAST_STOPS.reach})`);
		const share = percentage.join(' ');
		for (const c of [0, 0.25, 0.5, 0.67, 1]) {
			assert.closeTo(
				evaluate_css_number(share, { [CONTRAST_NAME]: c }, { percent: true }),
				border_contrast_share(c) * 100,
				TOLERANCE,
				`c ${c}`
			);
		}
	});

	test('the border reaches its reach stop at HIGH_CONTRAST exactly', () => {
		// the docs promise the high-contrast border is the reach stop itself,
		// which holds only while the gain and HIGH_CONTRAST multiply to 1
		assert.strictEqual(border_contrast_share(HIGH_CONTRAST), 1);
		assert.isBelow(border_contrast_share(HIGH_CONTRAST - 0.01), 1);
	});
});

describe('shadow tint emitter', () => {
	test('renders the fitted tints on the neutral hue', () => {
		assert.strictEqual(render_shadow_tint_css('dim'), 'oklch(0.863 0.009 var(--hue_neutral))');
		assert.strictEqual(render_shadow_tint_css('bright'), 'oklch(0.955 0.003 var(--hue_neutral))');
	});
});
