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

import {
	PALETTE_HUES,
	PALETTE_CHROMA_MULTIPLIERS,
	LIGHTNESS_KNOBS,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_CAPS,
	NEUTRAL_CHROMA,
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
	render_ramp_color_css,
	render_border_color_stop_css,
	render_shadow_tint_css,
	border_color_oklch,
	BORDER_COLOR_ALPHAS,
	type RampFamily
} from '$lib/ramps.ts';
import {
	numeric_scale_variants,
	palette_variants,
	color_scheme_variants,
	type ColorSchemeVariant,
	type NumericScaleVariant
} from '$lib/variable_data.ts';

// the emitters round ramp positions to 1e-6, so allow a hair over that
const TOLERANCE = 1e-5;

/**
 * Evaluates the emitted CSS value grammar to a number: numeric literals,
 * `var(--x[, fallback])`, `calc(expr)`, `min(a, b)`, `pow(a, b)`, `+ - * /`,
 * and parentheses. Throws on anything outside the grammar so an emitter
 * change that this evaluator can't follow fails loudly instead of silently
 * passing.
 */
const evaluate_css_number = (expr: string, vars: Record<string, number>): number => {
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
		const fn = /^(calc|min|pow|var)\(/.exec(s.slice(i));
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
				const m = /^--([a-z][a-z0-9_]*)/.exec(s.slice(i));
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
			// min/pow: two comma-separated arguments
			const a = parse_expr();
			expect(',');
			const b = parse_expr();
			expect(')');
			return name === 'min' ? Math.min(a, b) : a ** b;
		}
		const num = /^-?\d*\.?\d+(e-?\d+)?/i.exec(s.slice(i));
		if (!num) throw new Error(`expected a number at ${i} ("${s.slice(i, i + 12)}") in ${expr}`);
		i += num[0].length;
		return Number(num[0]);
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

/** All knob variables an emitted color stop can reference, per scheme. */
const knob_vars = (scheme: ColorSchemeVariant): Record<string, number> => {
	const vars: Record<string, number> = {
		chroma_scale: 1,
		neutral_chroma: NEUTRAL_CHROMA[scheme],
		border_color_lightness: border_color_oklch(scheme)[0],
		border_color_chroma: border_color_oklch(scheme)[1],
		hue_neutral: PALETTE_HUES.f,
		hue_accent: PALETTE_HUES.a,
		accent_chroma_scale: 1,
		palette_chroma_min: PALETTE_CHROMA_KNOBS[scheme].chroma_min,
		palette_chroma_max: PALETTE_CHROMA_KNOBS[scheme].chroma_max,
		chroma_curve: PALETTE_CHROMA_KNOBS[scheme].curve
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
		vars[`chroma_shape_${stop}`] = ramp_chroma_shape(stop, PALETTE_CHROMA_KNOBS[scheme].curve);
		vars[`palette_chroma_${stop}`] = ramp_chroma(
			stop,
			PALETTE_CHROMA_KNOBS[scheme],
			PALETTE_CHROMA_CAPS[scheme][stop]
		);
		for (const family of ['palette', 'shade', 'text'] as const) {
			vars[`${family}_lightness_${stop}`] = ramp_lightness(LIGHTNESS_KNOBS[family][scheme], stop);
		}
	}
	return vars;
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
		const css = render_chroma_stop_css('50', 'light', 0.01);
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

describe('shadow tint emitter', () => {
	test('renders the fitted tints on the neutral hue', () => {
		assert.strictEqual(render_shadow_tint_css('dim'), 'oklch(0.863 0.009 var(--hue_neutral))');
		assert.strictEqual(render_shadow_tint_css('bright'), 'oklch(0.955 0.003 var(--hue_neutral))');
	});
});
