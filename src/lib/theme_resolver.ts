/**
 * The numeric resolution core under `theme_validate.ts` and `theme_check.ts`:
 * it turns the CSS strings themes author back into numbers so the lint and
 * the gates can run. `create_theme_resolver` exposes it for UI lookups; the
 * rest of the module's exports are the internals the two modules share.
 *
 * Its contract:
 *
 * - Knob-tier defaults come from the numeric-twin constants in `ramps.ts`, not
 *   from parsing `default_variables`; intent and neutral hues default to their
 *   palette-letter binding (`hue_accent` → `hue_a`, `hue_neutral` → `hue_f`,
 *   and so on) so they follow an overridden letter.
 * - Theme-authored values parse as a CSS `<number>` literal, an exact
 *   `var(--x)` reference (recursed through the same effective-value merge,
 *   with a visited-set cycle guard), a scaled reference
 *   `calc(var(--x) * <number>)`, or the machine-emitted compiled-cap
 *   `min(calc(...), <number>)` form. Anything else is unresolvable and is
 *   recorded with its variable, value, and reason. A derived color is
 *   clamped as the browser clamps the `oklch()` it renders.
 * - Derived ramp stops (`palette_lightness_NN` and its shade/text twins,
 *   `palette_chroma_NN`, `chroma_shape_NN`) use a pinned numeric value when
 *   the theme pins one, fall back to the `ramps.ts` formulas with the
 *   resolved knobs otherwise, and mark the touching gates `unchecked` when a
 *   pin is unresolvable.
 * - The color variables the gates read (the palette, intent, shade, and text
 *   stops, `text_max`, and `border_color_30`) derive from those numbers
 *   unless the theme authors one directly. An authored color is measured as
 *   written when it is an `oklch(L C H)` literal with plain numeric
 *   components (an optional `/ alpha` composites where the gate measures a
 *   color over its ground) or an exact `var()` reference to another color
 *   the gates evaluate; any other form is recorded in `unchecked` and its
 *   gates are skipped. The gates look every color up by variable name, so
 *   this covers exactly the variables a gate reads and no others.
 * - The gates measure what the default styles paint, so they follow the
 *   roles those styles paint through: `text_color`, `text_disabled`,
 *   `link_color`, `link_color_selected`, `border_color`, and `outline_color`
 *   (`theme_gate_role_names`). Each aliases a stop or another role by
 *   default, read from the shipped declarations, and a theme that repoints
 *   one is gated at the color it points to - same rule, same `unchecked`
 *   fallback. One table of
 *   pairing gates names each role beside its grounds and threshold, so the
 *   gate definitions and the following can't drift.
 * - Outside the gates: the micro-surface colors no pairing models
 *   (`caret_color`, `selection_color`, `scrollbar_thumb_color`,
 *   `backdrop_color`), the `input_fill` behind field text, a
 *   `background_image` painted over the `shade_00` ground, and the stronger
 *   button tints of the hover, focus, and pressed states.
 *
 * The effective-value merge mirrors the renderer's cascade-layer semantics
 * (`theme.ts` `render_theme_style`): light = `theme.light`; dark =
 * `theme.dark ?? theme.light`, falling back to the numeric-twin default for
 * the scheme. A single-scheme
 * stance (`Theme.scheme`) resolves through the same `scheme_stance_variables`
 * mirror `resolve_theme_stance` computes, so the gates evaluate the stanced
 * reality in both schemes whether or not the theme arrives resolved.
 *
 *
 * @module
 */

import { Theme, type StyleVariable } from './variable.ts';
import { scheme_stance_variables } from './theme_stance.ts';
import { to_theme_stance } from './theme.ts';
import {
	PALETTE_HUES,
	PALETTE_CHROMA_MULTIPLIERS,
	LIGHTNESS_KNOBS,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_CAPS,
	NEUTRAL_CHROMA,
	BORDER_COLOR_LIGHTNESS,
	BORDER_CHROMA_MULTIPLIER,
	ramp_lightness,
	ramp_chroma_shape,
	ramp_chroma_at_shape,
	type LightnessRampKnobs,
	type RampFamily
} from './ramps.ts';
import {
	numeric_scale_variants,
	intent_variants,
	palette_glosses,
	type NumericScaleVariant,
	type ColorSchemeVariant,
	type PaletteVariant
} from './variable_data.ts';

/**
 * Equality slack for resolved hue angles and chroma multipliers.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const NUMERIC_EPSILON = 1e-9;

//
// Resolution core.
//

/**
 * A resolved numeric value, or the offending variable/value/reason on failure.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export type Resolved =
	{ ok: true; value: number } | { ok: false; variable: string; value: string; reason: string };

/**
 * Intent and neutral hues default to a palette-letter binding - derived by
 * inverting `palette_glosses` so rebinding an intent there flows through.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const INTENT_HUE_DEFAULT_BINDING: Record<string, string> = Object.fromEntries(
	Object.entries(palette_glosses).flatMap(([letter, gloss]) =>
		gloss.binding ? [[`hue_${gloss.binding}`, `hue_${letter}`]] : []
	)
);

/**
 * A CSS `<number>` as a pattern source, stricter than what `Number()`
 * accepts - no hex, binary, `Infinity`, or empty string.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const CSS_NUMBER_PATTERN = String.raw`[+-]?(?:\d*\.)?\d+(?:[eE][+-]?\d+)?`;
const CSS_NUMBER_MATCHER = new RegExp(`^${CSS_NUMBER_PATTERN}$`, 'u');

/**
 * Parses text as a CSS `<number>`, or `null` when it isn't one.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const parse_css_number = (text: string): number | null =>
	CSS_NUMBER_MATCHER.test(text) ? Number(text) : null;

/**
 * Matches a palette letter's hue name, capturing the letter.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const PALETTE_LETTER_MATCHER = /^hue_([a-j])$/u;
const PALETTE_MULTIPLIER_MATCHER = /^palette_([a-j])_chroma_scale$/u;
const INTENT_MULTIPLIER_MATCHER = new RegExp(`^(${intent_variants.join('|')})_chroma_scale$`, 'u');
const LIGHTNESS_KNOB_MATCHER = /^(palette|shade|text)_lightness_(00|100|curve)$/u;
/**
 * The stop alternation as a pattern source, built from the variant list so a
 * scale change can't strand a matcher.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const STOPS_PATTERN = numeric_scale_variants.join('|');
const DERIVED_STOPS_PATTERN = numeric_scale_variants.slice(1, -1).join('|');
const LIGHTNESS_STOP_MATCHER = new RegExp(
	`^(palette|shade|text)_lightness_(${DERIVED_STOPS_PATTERN})$`,
	'u'
);
const PALETTE_CHROMA_STOP_MATCHER = new RegExp(`^palette_chroma_(${STOPS_PATTERN})$`, 'u');
const CHROMA_SHAPE_STOP_MATCHER = new RegExp(`^chroma_shape_(${STOPS_PATTERN})$`, 'u');
/**
 * Matches exactly `var(--x)`, capturing the name - the reference form the
 * resolver follows.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const VAR_MATCHER = /^var\(\s*--([a-z][a-z0-9_]*)\s*\)$/u;
/**
 * Matches the scaled-reference form emitted for `border_color_chroma`
 * (`calc(var(--neutral_chroma) * 2.12)`), also useful for authored
 * multipliers, capturing the name and the factor.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export const SCALED_VAR_MATCHER = new RegExp(
	String.raw`^calc\(\s*var\(\s*--([a-z][a-z0-9_]*)\s*\)\s*\*\s*(${CSS_NUMBER_PATTERN})\s*\)$`,
	'u'
);

/**
 * The compiled worst-hue cap form emitted by `render_chroma_stop_css`:
 * `min(calc(var(--palette_chroma_min) + (var(--palette_chroma_max) - var(--palette_chroma_min)) * var(--chroma_shape_NN)), <number>)`.
 * Recognizing it keeps compiled themes fully checkable.
 */
const COMPILED_CAP_MATCHER = new RegExp(
	String.raw`^min\(\s*calc\(\s*var\(--palette_chroma_min\)\s*\+\s*\(\s*var\(--palette_chroma_max\)\s*-\s*var\(--palette_chroma_min\)\s*\)\s*\*\s*var\(--chroma_shape_(${STOPS_PATTERN})\)\s*\)\s*,\s*(${CSS_NUMBER_PATTERN})\s*\)$`,
	'u'
);

/**
 * Resolves knob-tier and derived-stop variables of a single theme to numbers,
 * mirroring the renderer's effective-value merge and the `ramps.ts` formulas.
 * `create_theme_resolver` is the public surface over it.
 *
 * @internal Shared by `theme_validate.ts` and `theme_check.ts` - not stable API.
 */
export class ThemeResolver {
	readonly #by_name: Map<string, StyleVariable>;
	readonly #authored_names: Set<string>;
	readonly #memo: Map<string, Resolved> = new Map();

	constructor(theme: Theme) {
		this.#by_name = new Map(theme.variables.map((v) => [v.name, v]));
		this.#authored_names = new Set(this.#by_name.keys());
		// a single-scheme stance resolves through the renderer's mirror, so both
		// schemes see the stanced values; mirror entries are not author pins
		const stance = to_theme_stance(theme.scheme);
		if (stance) {
			for (const v of scheme_stance_variables(stance, theme.variables)) {
				this.#by_name.set(v.name, v);
			}
		}
	}

	/** Whether the theme authors a value for `name` (a pin). */
	pinned(name: string): boolean {
		return this.#authored_names.has(name);
	}

	/**
	 * The theme's own value for `name` in `scheme` (a pin), or `undefined` when
	 * it authors none for that slot. Stance-mirror entries are not pins.
	 */
	authored(name: string, scheme: ColorSchemeVariant): string | undefined {
		return this.#authored_names.has(name) ? this.#slot_value(name, scheme) : undefined;
	}

	/** Resolves `name` for `scheme`, memoized per name+scheme. */
	resolve(name: string, scheme: ColorSchemeVariant): Resolved {
		const key = `${scheme}|${name}`;
		const cached = this.#memo.get(key);
		if (cached) return cached;
		const result = this.#resolve(name, scheme, new Set());
		this.#memo.set(key, result);
		return result;
	}

	// the effective value for a slot (authored or stance-mirrored), honoring
	// the dark → light fallback
	#slot_value(name: string, scheme: ColorSchemeVariant): string | undefined {
		const v = this.#by_name.get(name);
		if (!v) return undefined;
		return scheme === 'light' ? v.light : (v.dark ?? v.light);
	}

	#resolve(name: string, scheme: ColorSchemeVariant, visited: Set<string>): Resolved {
		if (visited.has(name)) {
			return {
				ok: false,
				variable: name,
				value: `var(--${name})`,
				reason: 'cyclic var() reference'
			};
		}
		const next = new Set(visited);
		next.add(name);
		const value = this.#slot_value(name, scheme);
		if (value !== undefined) return this.#parse(name, value, scheme, next);
		return this.#resolve_default(name, scheme, next);
	}

	#parse(name: string, value: string, scheme: ColorSchemeVariant, visited: Set<string>): Resolved {
		const trimmed = value.trim();
		// numeric literal
		const n = parse_css_number(trimmed);
		if (n !== null) return { ok: true, value: n };
		// exactly var(--x) - recurse through the same merge
		const var_match = VAR_MATCHER.exec(trimmed);
		if (var_match) return this.#resolve(var_match[1]!, scheme, visited);
		// calc(var(--x) * k) - a scaled reference, resolved then multiplied
		const scaled_match = SCALED_VAR_MATCHER.exec(trimmed);
		if (scaled_match) {
			const inner = this.#resolve(scaled_match[1]!, scheme, visited);
			if (!inner.ok) return inner;
			return { ok: true, value: inner.value * Number(scaled_match[2]) };
		}
		// machine-emitted compiled cap form
		const cap = this.#parse_compiled_cap(trimmed, scheme, visited);
		if (cap) return cap;
		return { ok: false, variable: name, value: trimmed, reason: 'unrecognized value expression' };
	}

	#parse_compiled_cap(
		value: string,
		scheme: ColorSchemeVariant,
		visited: Set<string>
	): Resolved | null {
		const m = COMPILED_CAP_MATCHER.exec(value);
		if (!m) return null;
		return this.#capped_chroma(m[1] as NumericScaleVariant, Number(m[2]), scheme, visited);
	}

	// a palette chroma stop: the requested curve clamped by a worst-hue cap -
	// the numeric twin of `render_chroma_stop_css`, reading the stop's shape
	// through the resolver so a pinned `chroma_shape_NN` is honored
	#capped_chroma(
		stop: NumericScaleVariant,
		cap: number,
		scheme: ColorSchemeVariant,
		visited: Set<string>
	): Resolved {
		const r = this.#resolve_all(
			['palette_chroma_min', 'palette_chroma_max', `chroma_shape_${stop}`],
			scheme,
			visited
		);
		if (!r.ok) return r.error;
		const [chroma_min, chroma_max, shape] = r.values;
		return { ok: true, value: ramp_chroma_at_shape(shape!, chroma_min!, chroma_max!, cap) };
	}

	#resolve_default(name: string, scheme: ColorSchemeVariant, visited: Set<string>): Resolved {
		// palette letters
		const letter_match = PALETTE_LETTER_MATCHER.exec(name);
		if (letter_match) return { ok: true, value: PALETTE_HUES[letter_match[1] as PaletteVariant] };
		// intent/neutral hues default to a palette-letter binding
		const binding = INTENT_HUE_DEFAULT_BINDING[name];
		if (binding) return this.#resolve(binding, scheme, visited);
		// per-slot chroma multipliers
		const multiplier_match = PALETTE_MULTIPLIER_MATCHER.exec(name);
		if (multiplier_match) {
			return {
				ok: true,
				value: PALETTE_CHROMA_MULTIPLIERS[multiplier_match[1] as PaletteVariant]
			};
		}
		if (INTENT_MULTIPLIER_MATCHER.test(name)) return { ok: true, value: 1 };
		// scalar knobs
		if (name === 'chroma_scale') return { ok: true, value: 1 };
		if (name === 'neutral_chroma') return { ok: true, value: NEUTRAL_CHROMA[scheme] };
		if (name === 'border_color_lightness') {
			return { ok: true, value: BORDER_COLOR_LIGHTNESS[scheme] };
		}
		if (name === 'border_color_chroma') {
			// derives from the neutral so a retinted theme flows through
			const neutral = this.#resolve('neutral_chroma', scheme, visited);
			if (!neutral.ok) return neutral;
			return { ok: true, value: neutral.value * BORDER_CHROMA_MULTIPLIER[scheme] };
		}
		if (name === 'palette_chroma_min') {
			return { ok: true, value: PALETTE_CHROMA_KNOBS[scheme].chroma_min };
		}
		if (name === 'palette_chroma_max') {
			return { ok: true, value: PALETTE_CHROMA_KNOBS[scheme].chroma_max };
		}
		if (name === 'chroma_curve') {
			return { ok: true, value: PALETTE_CHROMA_KNOBS[scheme].curve };
		}
		// lightness endpoints and curve
		const knob_match = LIGHTNESS_KNOB_MATCHER.exec(name);
		if (knob_match) {
			const knobs = LIGHTNESS_KNOBS[knob_match[1] as RampFamily][scheme];
			const field = knob_match[2];
			const value =
				field === '00' ? knobs.lightness_00 : field === '100' ? knobs.lightness_100 : knobs.curve;
			return { ok: true, value };
		}
		// derived lightness intermediates - compute from the resolved knobs
		const stop_match = LIGHTNESS_STOP_MATCHER.exec(name);
		if (stop_match) {
			const family = stop_match[1] as RampFamily;
			const stop = stop_match[2] as NumericScaleVariant;
			const knobs = this.#lightness_knobs(family, scheme, visited);
			if (!knobs.ok) return knobs.error;
			return { ok: true, value: ramp_lightness(knobs.value, stop) };
		}
		// derived chroma shape stops - the normalized curve both the palette
		// chroma ramp and the neutral scales ride
		const shape_match = CHROMA_SHAPE_STOP_MATCHER.exec(name);
		if (shape_match) {
			const curve = this.#resolve('chroma_curve', scheme, visited);
			if (!curve.ok) return curve;
			return {
				ok: true,
				value: ramp_chroma_shape(shape_match[1] as NumericScaleVariant, curve.value)
			};
		}
		// derived palette chroma stops - the knob curve under the baked cap
		const chroma_match = PALETTE_CHROMA_STOP_MATCHER.exec(name);
		if (chroma_match) {
			const stop = chroma_match[1] as NumericScaleVariant;
			return this.#capped_chroma(stop, PALETTE_CHROMA_CAPS[scheme][stop], scheme, visited);
		}
		return {
			ok: false,
			variable: name,
			value: '(default)',
			reason: 'no numeric default for variable'
		};
	}

	// resolves every name to a number, bailing with the first failure
	#resolve_all(
		names: Array<string>,
		scheme: ColorSchemeVariant,
		visited: Set<string>
	): { ok: true; values: Array<number> } | { ok: false; error: Resolved } {
		const values: Array<number> = [];
		for (const name of names) {
			const r = this.#resolve(name, scheme, visited);
			if (!r.ok) return { ok: false, error: r };
			values.push(r.value);
		}
		return { ok: true, values };
	}

	#lightness_knobs(
		family: RampFamily,
		scheme: ColorSchemeVariant,
		visited: Set<string>
	): { ok: true; value: LightnessRampKnobs } | { ok: false; error: Resolved } {
		const r = this.#resolve_all(
			[`${family}_lightness_00`, `${family}_lightness_100`, `${family}_lightness_curve`],
			scheme,
			visited
		);
		if (!r.ok) return r;
		const [lightness_00, lightness_100, curve] = r.values;
		return {
			ok: true,
			value: { lightness_00: lightness_00!, lightness_100: lightness_100!, curve: curve! }
		};
	}
}

/**
 * A reusable numeric resolver over one theme - the memoized query surface for
 * UI display (the theme editor's derived-knob readouts) and tests.
 */
export interface ThemeKnobResolver {
	/** Resolves `name` for `scheme` to a number, or `null` when it can't be resolved. */
	resolve(name: string, scheme: ColorSchemeVariant): number | null;
	/** Whether the theme authors a value for `name` (a pin; stance-mirror entries excluded). */
	pinned(name: string): boolean;
}

/**
 * Creates a `ThemeKnobResolver` for `theme`, sharing the resolution core used
 * by `validate_theme`/`check_theme`/`compile_theme`. The instance memoizes per
 * name+scheme, so repeated lookups (a UI rendering every knob) stay cheap -
 * create one per theme value and discard when the theme changes.
 */
export const create_theme_resolver = (theme: Theme): ThemeKnobResolver => {
	const resolver = new ThemeResolver(theme);
	return {
		resolve: (name, scheme) => {
			const r = resolver.resolve(name, scheme);
			return r.ok ? r.value : null;
		},
		pinned: (name) => resolver.pinned(name)
	};
};
