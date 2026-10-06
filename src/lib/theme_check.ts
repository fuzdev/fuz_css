/**
 * Theme lint, numeric-twin accessibility gates, and the compile step for the
 * derived OKLCH color system.
 *
 * Three functions sit over a shared numeric resolution core:
 *
 * - `validate_theme` is the structural lint - the `Theme` schema, known
 *   variable names, and advisory type/range warnings for the knob-tier
 *   variables.
 * - `check_theme` evaluates the gamut, ramp-monotonicity, and contrast gates
 *   against an arbitrary theme (the base theme's defaults included), reusing
 *   the `ramps.ts` numeric twin, `oklch.ts` conversions, and `wcag.ts`
 *   ratios. It is report-only and never throws.
 * - `compile_theme` recomputes the per-stop worst-hue chroma caps for a
 *   theme's own hues and the palette lightness each stop resolves to, emits
 *   `palette_chroma_NN` overrides where the baked caps no longer fit, then
 *   re-checks.
 *
 * The resolution core turns the CSS strings themes author back into numbers so
 * the gates can run. Its contract:
 *
 * - Knob-tier defaults come from the numeric-twin constants in `ramps.ts`, not
 *   from parsing `default_variables`; intent and neutral hues default to their
 *   palette-letter binding (`hue_accent` → `hue_a`, `hue_neutral` → `hue_f`,
 *   and so on) so they follow an overridden letter.
 * - Theme-authored values parse as a numeric literal, an exact `var(--x)`
 *   reference (recursed through the same effective-value merge, with a
 *   visited-set cycle guard), or the machine-emitted compiled-cap
 *   `min(calc(...), <number>)` form. Anything else is unresolvable and is
 *   recorded with its variable, value, and reason.
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
 *   one is gated at the
 *   color it points to - same rule, same `unchecked` fallback. One table of
 *   pairing gates names each role beside its grounds and threshold, so the
 *   gate definitions and the following can't drift.
 * - Outside the gates: the micro-surface colors no pairing models
 *   (`caret_color`, `selection_color`, `scrollbar_thumb_color`,
 *   `backdrop_color`), a `background_image` painted over the `shade_00`
 *   ground, and the stronger button tints of the hover, focus, and pressed
 *   states.
 *
 * The effective-value merge mirrors the renderer's cascade-layer semantics
 * (`theme.ts` `render_theme_style`): light = `theme.light`; dark =
 * `theme.dark ?? theme.light`, falling back to the numeric-twin default for
 * the scheme. A single-scheme
 * stance (`Theme.scheme`) resolves through the same `scheme_stance_variables`
 * mirror `resolve_theme_stance` computes, so the gates evaluate the stanced
 * reality in both schemes whether or not the theme arrives resolved.
 *
 * @module
 */

import { clamp } from '@fuzdev/fuz_util/maths.ts';

import { Theme, type StyleVariable } from './variable.ts';
import { scheme_stance_variables } from './theme_stance.ts';
import { default_variables } from './variables.ts';
import {
	theme_knob_by_name,
	theme_knob_hook_names,
	HUE_BINDING_MATCHER,
	type ThemeKnob
} from './knobs.ts';
import {
	PALETTE_HUES,
	PALETTE_CHROMA_MULTIPLIERS,
	LIGHTNESS_KNOBS,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_CAPS,
	NEUTRAL_CHROMA,
	BORDER_COLOR_LIGHTNESS,
	BORDER_CHROMA_MULTIPLIER,
	BORDER_COLOR_ALPHAS,
	ramp_lightness,
	ramp_chroma_shape,
	ramp_color_oklch,
	neutral_color_oklch,
	compute_worst_hue_chroma_cap,
	render_chroma_stop_css,
	type LightnessRampKnobs,
	type RampFamily
} from './ramps.ts';
import {
	numeric_scale_variants,
	palette_variants,
	intent_variants,
	color_scheme_variants,
	palette_glosses,
	type NumericScaleVariant,
	type ColorSchemeVariant,
	type PaletteVariant
} from './variable_data.ts';
import { oklch_to_srgb, type RgbUnit } from './oklch.ts';
import { wcag_contrast_ratio } from './wcag.ts';

//
// Gate thresholds - the WCAG levels the derived palette is designed to clear.
//

/** AAA body text: `--text_color` (`text_80` by default) on `shade_00`/`05`/`10`. */
export const GATE_BODY_TEXT = 7;
/** Disabled/secondary floor: `--text_disabled` (`text_50` by default) on `shade_00`. */
export const GATE_SUBTLE_TEXT = 3;
/**
 * AA links: `--link_color` (the accent at stop 60 by default) on `shade_00`,
 * plus that stop itself when a theme repoints the role, since
 * `label.selected` paints it directly, and an authored `--link_color_selected`.
 */
export const GATE_LINK = 4.5;
/**
 * WCAG 1.4.11 non-text: every hue at stop 50 vs `shade_00`, and an authored
 * `--outline_color` (the focus ring, the accent at stop 50 by default).
 */
export const GATE_UI = 3;
/** Large-text floor: `text_max` on every stop-50 fill. */
export const GATE_FILL_TEXT = 3;
/**
 * AA selected-control inverse text: `text_00` on `shade_60` and on every
 * stop-60 fill - the selected-button pairings in `style.css` (`.selected`
 * fills with `shade_60`, `.palette_X.selected` with `palette_X_60`). The
 * endpoint stop is immune to `text_lightness_curve` bends, so this gate moves
 * only when a theme moves the endpoints, the fill ramps, or the hues.
 */
export const GATE_SELECTED_TEXT = 4.5;
/**
 * AA colored labels: every palette hue at stop 60 on `shade_00` (colored text
 * and `.plain` buttons), on the `.palette_X` button's rest fill, and on its
 * own stop-10 tint (the chip). The button fill follows the `style.css`
 * recipe: the label's own color at 8% alpha, composited over `shade_00` in
 * gamma-encoded sRGB. An 8-bit raster quantizes both colors, so a rendered
 * measurement lands within about 0.07 of the ratio. Only the rest fill is
 * gated - the hover, focus, and pressed fills tint further and are not.
 */
export const GATE_PALETTE_TEXT = 4.5;
/**
 * Control borders: `--border_color` (`shade_30` by default) vs `shade_00`.
 * A regression floor for the shipped design, not a WCAG level - 1.4.11's 3:1
 * applies to required component boundaries, and fuz borders sit deliberately
 * softer - so a theme can't silently wash control borders out.
 */
export const GATE_BORDER = 1.5;
/**
 * Divider borders: the `border_color_30` alpha color composited over
 * `shade_00` (the `hr` pairing in `style.css`). A regression floor like
 * `GATE_BORDER`.
 */
export const GATE_BORDER_DIVIDER = 1.3;

/**
 * Gamut gate: how far outside sRGB (the largest channel excess) a stop may sit and
 * still pass - float noise, not visible clipping.
 */
export const GATE_GAMUT_TOLERANCE = 1e-4;

// equality slack for resolved hue angles and chroma multipliers
const NUMERIC_EPSILON = 1e-9;

/**
 * The variable names a theme may set: the declared defaults plus the hook
 * knobs `style.css` consumes through `var()` fallbacks. The authoring-side
 * companion to `validate_theme`, for tooling that completes or checks names
 * before a theme is assembled.
 */
export const known_theme_variable_names: Set<string> = new Set([
	...default_variables.map((v) => v.name),
	...theme_knob_hook_names
]);

//
// Report types.
//

/**
 * A structural lint finding. `error` marks a broken theme (bad shape, unknown
 * variable); `warning` is advisory (value doesn't match the knob's kind, sits
 * outside its safe range, or is a dark slot on a single-scheme-stanced theme).
 */
export interface ThemeIssue {
	level: 'error' | 'warning';
	message: string;
	variable?: string;
}

/** Which accessibility gate an entry belongs to. */
export type ThemeGateId = 'gamut' | 'monotonicity' | 'contrast';

/**
 * A single gate measurement against a theme. The `value`/`threshold`
 * comparison direction depends on the gate: `contrast` passes at
 * `value >= threshold` (a WCAG ratio floor), `monotonicity` at
 * `value > threshold` (the minimum ramp step must exceed 0), and `gamut` at
 * `value <= threshold` (sRGB channel excess stays within tolerance). `pass`
 * is authoritative; renderers formatting the comparison switch on `gate`.
 */
export interface ThemeGateEntry {
	gate: ThemeGateId;
	scheme: ColorSchemeVariant;
	subject: string;
	value: number;
	threshold: number;
	pass: boolean;
}

/**
 * A gate input the checker couldn't evaluate, so the gates reading it were
 * skipped: a knob or derived stop that doesn't resolve to a number, or a
 * pinned color in a form the gates don't read.
 */
export interface ThemeUncheckedEntry {
	variable: string;
	value: string;
	reason: string;
}

/**
 * The result of `check_theme`. `ok` is true only when every entry passes and
 * nothing was left unchecked.
 */
export interface ThemeCheckReport {
	ok: boolean;
	entries: Array<ThemeGateEntry>;
	unchecked: Array<ThemeUncheckedEntry>;
}

/** The output of `compile_theme`: the emitted theme plus its lint and gate report. */
export interface CompiledTheme {
	theme: Theme;
	report: ThemeCheckReport;
	issues: Array<ThemeIssue>;
}

//
// Resolution core.
//

/** A resolved numeric value, or the offending variable/value/reason on failure. */
type Resolved =
	{ ok: true; value: number } | { ok: false; variable: string; value: string; reason: string };

/**
 * Intent and neutral hues default to a palette-letter binding - derived by
 * inverting `palette_glosses` so rebinding an intent there flows through.
 */
const INTENT_HUE_DEFAULT_BINDING: Record<string, string> = Object.fromEntries(
	Object.entries(palette_glosses).flatMap(([letter, gloss]) =>
		gloss.binding ? [[`hue_${gloss.binding}`, `hue_${letter}`]] : []
	)
);

const PALETTE_LETTER_MATCHER = /^hue_([a-j])$/u;
const PALETTE_MULTIPLIER_MATCHER = /^palette_([a-j])_chroma_scale$/u;
const INTENT_MULTIPLIER_MATCHER = /^(accent|positive|negative|caution|info)_chroma_scale$/u;
const LIGHTNESS_KNOB_MATCHER = /^(palette|shade|text)_lightness_(00|100|curve)$/u;
// the stop alternations, built from the variant list so a scale change can't strand them
const STOPS_PATTERN = numeric_scale_variants.join('|');
const DERIVED_STOPS_PATTERN = numeric_scale_variants.slice(1, -1).join('|');
const LIGHTNESS_STOP_MATCHER = new RegExp(
	`^(palette|shade|text)_lightness_(${DERIVED_STOPS_PATTERN})$`,
	'u'
);
const PALETTE_CHROMA_STOP_MATCHER = new RegExp(`^palette_chroma_(${STOPS_PATTERN})$`, 'u');
const CHROMA_SHAPE_STOP_MATCHER = new RegExp(`^chroma_shape_(${STOPS_PATTERN})$`, 'u');
const VAR_MATCHER = /^var\(\s*--([a-z][a-z0-9_]*)\s*\)$/u;
// the scaled-reference form emitted for `border_color_chroma`
// (`calc(var(--neutral_chroma) * 2.12)`) and useful for authored multipliers
const SCALED_VAR_MATCHER = /^calc\(\s*var\(\s*--([a-z][a-z0-9_]*)\s*\)\s*\*\s*(-?\d*\.?\d+)\s*\)$/u;

/**
 * The compiled worst-hue cap form emitted by `render_chroma_stop_css`:
 * `min(calc(var(--palette_chroma_min) + (var(--palette_chroma_max) - var(--palette_chroma_min)) * var(--chroma_shape_NN)), <number>)`.
 * Recognizing it keeps compiled themes fully checkable.
 */
const COMPILED_CAP_MATCHER = new RegExp(
	String.raw`^min\(\s*calc\(\s*var\(--palette_chroma_min\)\s*\+\s*\(\s*var\(--palette_chroma_max\)\s*-\s*var\(--palette_chroma_min\)\s*\)\s*\*\s*var\(--chroma_shape_(${STOPS_PATTERN})\)\s*\)\s*,\s*(-?\d*\.?\d+)\s*\)$`,
	'u'
);

/**
 * Resolves knob-tier and derived-stop variables of a single theme to numbers,
 * mirroring the renderer's effective-value merge and the `ramps.ts` formulas.
 */
class ThemeResolver {
	readonly #by_name: Map<string, StyleVariable>;
	readonly #authored_names: Set<string>;
	readonly #memo: Map<string, Resolved> = new Map();

	constructor(theme: Theme) {
		this.#by_name = new Map(theme.variables.map((v) => [v.name, v]));
		this.#authored_names = new Set(this.#by_name.keys());
		// a single-scheme stance resolves through the renderer's mirror, so both
		// schemes see the stanced values; mirror entries are not author pins
		if (theme.scheme === 'light' || theme.scheme === 'dark') {
			for (const v of scheme_stance_variables(theme.scheme, theme.variables)) {
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
		if (trimmed !== '') {
			const n = Number(trimmed);
			if (Number.isFinite(n)) return { ok: true, value: n };
		}
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
		const requested = chroma_min! + (chroma_max! - chroma_min!) * shape!;
		return { ok: true, value: Math.min(requested, cap) };
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

//
// validate_theme - the structural lint.
//

const validate_knob_value = (
	knob: ThemeKnob,
	value: string,
	variable: string,
	slot: string
): Array<ThemeIssue> => {
	const issues: Array<ThemeIssue> = [];
	const trimmed = value.trim();
	// a plain decimal - `Number()` alone would also take hex, binary, and
	// exponent forms that aren't the CSS numbers a knob carries
	const numeric = /^-?\d*\.?\d+$/u.test(trimmed);
	const check_range = (n: number): void => {
		if (knob.range && (n < knob.range[0] || n > knob.range[1])) {
			issues.push({
				level: 'warning',
				message: `${variable} ${slot} ${trimmed} is outside the safe range [${knob.range[0]}, ${
					knob.range[1]
				}], the design envelope (knowingly exceedable)`,
				variable
			});
		}
	};
	// reference forms the resolver understands - var(--x) and the scaled
	// calc(var(--x) * k) (e.g. border_color_chroma's derived default) - pass
	// without a range check, which needs the resolved value
	const is_reference = VAR_MATCHER.test(trimmed) || SCALED_VAR_MATCHER.test(trimmed);
	switch (knob.kind) {
		case 'number': {
			if (!numeric && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a numeric value`,
					variable
				});
			} else if (numeric) {
				check_range(Number(trimmed));
			}
			break;
		}
		case 'percent': {
			// the CSS form (`60%`), which is what the defaults declare and the
			// editor writes; the range is in percent units
			const percent_match = /^(-?\d*\.?\d+)%$/u.exec(trimmed);
			if (!percent_match && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a CSS percentage like 60%`,
					variable
				});
			} else if (percent_match) {
				check_range(Number(percent_match[1]));
			}
			break;
		}
		case 'hue': {
			// a literal angle, or a var() binding (legal CSS regardless of `bindable`)
			if (!numeric && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a hue angle or var() binding`,
					variable
				});
			} else if (numeric) {
				check_range(Number(trimmed));
			}
			break;
		}
		case 'time': {
			// seconds or milliseconds; the range is in seconds
			const time_match = /^(-?\d*\.?\d+)(s|ms)$/u.exec(trimmed);
			if (!time_match && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a CSS time value like 0.2s`,
					variable
				});
			} else if (time_match) {
				const n = Number(time_match[1]);
				check_range(time_match[2] === 'ms' ? n / 1000 : n);
			}
			break;
		}
		case 'enum': {
			if (knob.values && !knob.values.includes(trimmed) && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not one of ${knob.values.join(', ')}`,
					variable
				});
			}
			break;
		}
		default:
			// length, color, font_stack, shadow, text - freeform, advisory only
			break;
	}
	return issues;
};

// maps one schema issue onto a `ThemeIssue`, naming the variable it landed on
// when the path points into `variables`/`scheme_mirror` - the schema reports
// the whole theme at once, so the path is what carries the location
const to_shape_issue = (
	theme: unknown,
	path: ReadonlyArray<PropertyKey>,
	message: string
): ThemeIssue => {
	const [head, index] = path;
	if (head === 'variables' || head === 'scheme_mirror') {
		const list =
			typeof theme === 'object' && theme !== null
				? (theme as Record<string, unknown>)[head]
				: undefined;
		const entry: unknown =
			Array.isArray(list) && typeof index === 'number' ? list[index] : undefined;
		const name =
			typeof entry === 'object' &&
			entry !== null &&
			typeof (entry as { name?: unknown }).name === 'string'
				? (entry as { name: string }).name
				: undefined;
		return {
			level: 'error',
			message: `invalid variable${name ? ` "${name}"` : ''}: ${message}`,
			...(name ? { variable: name } : null)
		};
	}
	return { level: 'error', message: path.length ? `${path.join('.')}: ${message}` : message };
};

/**
 * Lints a theme's structure: the `Theme` schema (errors), a known name per
 * variable (errors), and advisory type/range warnings for the knob-tier
 * variables - including a pairing warning when an intent hue binds a palette
 * letter whose chroma multiplier differs from the intent's own
 * `*_chroma_scale` twin (a binding shares only the hue angle, so the slot's
 * chroma character is otherwise silently dropped), and a separation warning
 * when the accent hue lands within `ACCENT_STATUS_HUE_SEPARATION` of a
 * status hue. Value validation is
 * advisory and never an error. An empty array means the theme is structurally
 * valid.
 *
 * A shape failure returns on its own: the knob lint reads values the schema
 * hasn't vouched for, so it runs only over a theme that parsed. Takes
 * `unknown` so untrusted input (a theme restored from storage, a pasted
 * object) needs no cast to be checked.
 */
export const validate_theme = (theme: unknown): Array<ThemeIssue> => {
	const parsed = Theme.safeParse(theme);
	if (!parsed.success) {
		return parsed.error.issues.map((issue) => to_shape_issue(theme, issue.path, issue.message));
	}
	const issues: Array<ThemeIssue> = [];
	const { scheme, scheme_mirror } = parsed.data;
	const stance = scheme === 'light' || scheme === 'dark' ? scheme : null;
	// a stanced theme renders correctly only with its mirror computed - the
	// gates here resolve through the mirror either way, so without this warning
	// a hand-rolled stanced theme checks clean but renders unmirrored
	if (stance && scheme_mirror === undefined) {
		issues.push({
			level: 'warning',
			message: `'${stance}' scheme stance with no scheme_mirror - resolve the theme with resolve_theme_stance before rendering so its one appearance holds in both color schemes`
		});
	}
	for (const valid of parsed.data.variables) {
		if (!known_theme_variable_names.has(valid.name)) {
			issues.push({
				level: 'error',
				message: `unknown variable "${valid.name}"`,
				variable: valid.name
			});
			continue;
		}
		// a stanced theme renders one appearance in both color schemes, so a
		// dark slot only shadows the base slot when the `.dark` class is set,
		// silently splitting the appearances the stance promises to unify
		if (stance && valid.dark !== undefined) {
			issues.push({
				level: 'warning',
				message: `"${valid.name}" carries a dark slot under a '${
					stance
				}' scheme stance - stanced themes render one appearance in both color schemes, so author single-slot values`,
				variable: valid.name
			});
		}
		const knob = theme_knob_by_name.get(valid.name);
		if (!knob) continue;
		if (valid.light !== undefined) {
			issues.push(...validate_knob_value(knob, valid.light, valid.name, 'light'));
		}
		if (valid.dark !== undefined) {
			issues.push(...validate_knob_value(knob, valid.dark, valid.name, 'dark'));
		}
	}
	const resolver = new ThemeResolver(parsed.data);
	issues.push(...validate_binding_pairing(parsed.data, resolver));
	issues.push(...validate_accent_separation(parsed.data, resolver));
	return issues;
};

/**
 * How far in degrees the accent hue has to sit from each status hue before
 * `validate_theme` stops warning. Under the palette's tightest default pair
 * (red and orange, 12 degrees apart), so the warning fires on a clone or a
 * near-clone, never on the spacing the defaults themselves ship.
 */
export const ACCENT_STATUS_HUE_SEPARATION = 10;

// the separation lint: two intents at the same hue angle render the same
// color at every stop, so an accent that lands on a status hue makes links,
// focus, and selection indistinguishable from that status. Each scheme is
// read through its own effective slot, and a hue that won't resolve to a
// number is skipped rather than guessed at
const validate_accent_separation = (theme: Theme, resolver: ThemeResolver): Array<ThemeIssue> => {
	const issues: Array<ThemeIssue> = [];
	// a stanced theme renders one appearance, so name that scheme alone
	const schemes =
		theme.scheme === 'light' || theme.scheme === 'dark' ? [theme.scheme] : color_scheme_variants;
	// the schemes where two intents at one hue can't be told apart by mistake:
	// a grayscale palette has no hue to collide, and a palette collapsed onto
	// one angle is monochrome on purpose
	const checked = schemes.filter((scheme) => {
		const chroma_scale = resolver.resolve('chroma_scale', scheme);
		if (chroma_scale.ok && chroma_scale.value === 0) return false;
		const hues = palette_variants.map((letter) => resolver.resolve(`hue_${letter}`, scheme));
		const first = hues[0]!;
		const collapsed =
			first.ok &&
			hues.every(
				(hue) => hue.ok && hue_distance(hue.value, first.value) < ACCENT_STATUS_HUE_SEPARATION
			);
		return !collapsed;
	});
	for (const intent of intent_variants) {
		if (intent === 'accent') continue;
		for (const scheme of checked) {
			const accent = resolver.resolve('hue_accent', scheme);
			const status = resolver.resolve(`hue_${intent}`, scheme);
			if (!accent.ok || !status.ok) continue;
			const distance = hue_distance(accent.value, status.value);
			if (distance < ACCENT_STATUS_HUE_SEPARATION) {
				issues.push({
					level: 'warning',
					message: `hue_accent sits ${Math.round(distance)} degrees from hue_${
						intent
					} in ${scheme} - intents at one hue render the same color, so links, focus, and selection read as ${
						intent
					}; rebind one of them`,
					variable: 'hue_accent'
				});
				break;
			}
		}
	}
	return issues;
};

// the shorter way around the hue circle, for angles in any range
const hue_distance = (a: number, b: number): number => {
	const turn = (((a - b) % 360) + 360) % 360;
	return Math.min(turn, 360 - turn);
};

// the pairing lint: an intent hue bound to a palette letter (authored
// `var(--hue_X)` or the default binding) shares only the angle, so warn when
// the letter's chroma multiplier and the intent's twin disagree - the theme
// probably meant the character to follow the binding (the neutral is exempt:
// its character is `--neutral_chroma` by design)
const validate_binding_pairing = (theme: Theme, resolver: ThemeResolver): Array<ThemeIssue> => {
	const issues: Array<ThemeIssue> = [];
	for (const intent of intent_variants) {
		const hue_name = `hue_${intent}`;
		const authored = theme.variables.find((v) => v.name === hue_name);
		const default_letter = INTENT_HUE_DEFAULT_BINDING[hue_name]!.slice('hue_'.length);
		for (const scheme of color_scheme_variants) {
			// each scheme binds through its own effective slot, so a theme that
			// binds a muted letter in only one scheme still gets the warning
			const slot = scheme === 'light' ? authored?.light : (authored?.dark ?? authored?.light);
			const letter =
				slot === undefined ? default_letter : HUE_BINDING_MATCHER.exec(slot.trim())?.[1];
			if (!letter) continue; // a literal angle binds no letter
			const letter_multiplier = resolver.resolve(`palette_${letter}_chroma_scale`, scheme);
			const intent_multiplier = resolver.resolve(`${intent}_chroma_scale`, scheme);
			if (
				letter_multiplier.ok &&
				intent_multiplier.ok &&
				Math.abs(letter_multiplier.value - intent_multiplier.value) > NUMERIC_EPSILON
			) {
				issues.push({
					level: 'warning',
					message: `${hue_name} binds palette letter ${letter} (chroma multiplier ${
						letter_multiplier.value
					}) but ${intent}_chroma_scale is ${
						intent_multiplier.value
					} - a binding shares only the hue angle, so set ${
						intent
					}_chroma_scale to carry the slot's chroma character`,
					variable: hue_name
				});
				break;
			}
		}
	}
	return issues;
};

//
// check_theme - the numeric-twin accessibility gates.
//

const clamp_rgb = (rgb: RgbUnit): RgbUnit => [
	clamp(rgb[0], 0, 1),
	clamp(rgb[1], 0, 1),
	clamp(rgb[2], 0, 1)
];

// max sRGB channel excess outside [0, 1] - 0 when in gamut
const gamut_excess = ([r, g, b]: RgbUnit): number => Math.max(0, -r, r - 1, -g, g - 1, -b, b - 1);

// source-over compositing of a translucent color on an opaque backdrop, in
// gamma-encoded sRGB - how browsers stack backgrounds and borders
const composite_over = (color: RgbUnit, alpha: number, backdrop: RgbUnit): RgbUnit => [
	alpha * color[0] + (1 - alpha) * backdrop[0],
	alpha * color[1] + (1 - alpha) * backdrop[1],
	alpha * color[2] + (1 - alpha) * backdrop[2]
];

// the rest fill of a `.palette_X` button in `style.css`:
// `--button_fill: color-mix(in oklab, var(--fill) 8%, transparent)`, which is
// the fill color at this alpha
const BUTTON_FILL_ALPHA = 0.08;

/** A color a gate reads: unclamped gamma-encoded sRGB and alpha in [0, 1]. */
interface GateColor {
	rgb: RgbUnit;
	alpha: number;
}

// a CSS <number>, which is stricter than what `Number()` accepts
const CSS_NUMBER_PATTERN = String.raw`[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?`;

// the color literal the gates evaluate: `oklch(L C H)` with plain numeric
// components and an optional `/ alpha` (a number or a percentage)
const OKLCH_LITERAL_MATCHER = new RegExp(
	String.raw`^oklch\(\s*(${CSS_NUMBER_PATTERN})\s+(${CSS_NUMBER_PATTERN})\s+(${CSS_NUMBER_PATTERN})\s*(?:\/\s*(${CSS_NUMBER_PATTERN})(%?)\s*)?\)$`,
	'iu'
);

// parses an authored color literal, clamping lightness, chroma, and alpha the
// way the browser clamps a parsed `oklch()`; `null` for every other form
const parse_color_literal = (value: string): GateColor | null => {
	const m = OKLCH_LITERAL_MATCHER.exec(value);
	if (!m) return null;
	const alpha = m[4] === undefined ? 1 : Number(m[4]) / (m[5] ? 100 : 1);
	return {
		rgb: oklch_to_srgb([clamp(Number(m[1]), 0, 1), Math.max(0, Number(m[2])), Number(m[3])]),
		alpha: clamp(alpha, 0, 1)
	};
};

const REASON_COLOR_FORM =
	'authored color is neither an oklch(L C H) numeric literal nor an exact var() reference, so the gates reading it are skipped';
const REASON_COLOR_REFERENCE =
	'authored color references a variable the gates cannot evaluate, so the gates reading it are skipped';
const REASON_COLOR_ALPHA =
	'authored color is translucent where the gates read an opaque color, so they are skipped';

// the names of the color variables the gates can evaluate, beyond the aliases
const PALETTE_STOP_MATCHER = new RegExp(`^palette_([a-j])_(${STOPS_PATTERN})$`, 'u');
const INTENT_STOP_MATCHER = new RegExp(`^(${intent_variants.join('|')})_(${STOPS_PATTERN})$`, 'u');
const NEUTRAL_STOP_MATCHER = new RegExp(`^(shade|text)_(${STOPS_PATTERN})$`, 'u');
const BORDER_COLOR_STOP_MATCHER = new RegExp(`^border_color_(${STOPS_PATTERN})$`, 'u');
const EXTREME_MATCHER = /^(?:shade|text)_(min|max)$/u;

// the aliases the declared defaults carry - a variable whose default is
// exactly `var(--x)`, like the roles `text_color` → `text_80` and
// `link_color_selected` → `text_color`. Read from the declarations, so what a
// role falls back to can't drift from what ships
const ALIAS_DEFAULTS: Map<string, string> = new Map(
	default_variables.flatMap((v): Array<[string, string]> => {
		const m = v.light !== undefined && v.dark === undefined ? VAR_MATCHER.exec(v.light) : null;
		return m ? [[v.name, m[1]!]] : [];
	})
);

/**
 * A contrast gate over one painted color and the shade stops it sits on.
 * `color` names what `style.css` paints: a role variable (`text_color`),
 * which the gate follows through whatever the theme points it at, or a stop
 * painted directly (`text_00`).
 */
interface PairingGate {
	color: string;
	/** How the subject reads: `<color> on|vs|over shade_NN`. */
	relation: 'on' | 'vs' | 'over';
	grounds: ReadonlyArray<NumericScaleVariant>;
	threshold: number;
	/**
	 * The role's default pairing is another gate's entry, so it gets its own
	 * only when the theme authors it.
	 */
	when_authored?: boolean;
	/**
	 * `style.css` also paints the role's default stop directly, so that stop
	 * stays gated when the theme repoints the role.
	 */
	default_painted?: boolean;
}

// the single-color pairings, in report order. A role is gated here and
// nowhere else: its default comes from `ALIAS_DEFAULTS`, and `check_theme`
// measures whatever the theme points it at
const PAIRING_GATES: ReadonlyArray<PairingGate> = [
	// body text on the page and the first raised surfaces
	{ color: 'text_color', relation: 'on', grounds: ['00', '05', '10'], threshold: GATE_BODY_TEXT },
	// selected-control inverse text on the neutral selected fill
	{ color: 'text_00', relation: 'on', grounds: ['60'], threshold: GATE_SELECTED_TEXT },
	{ color: 'text_disabled', relation: 'on', grounds: ['00'], threshold: GATE_SUBTLE_TEXT },
	{ color: 'border_color', relation: 'vs', grounds: ['00'], threshold: GATE_BORDER },
	// the `hr` divider, the one translucent default
	{ color: 'border_color_30', relation: 'over', grounds: ['00'], threshold: GATE_BORDER_DIVIDER },
	// `label.selected` paints the link's default stop itself
	{
		color: 'link_color',
		relation: 'on',
		grounds: ['00'],
		threshold: GATE_LINK,
		default_painted: true
	},
	// a selected link reads as body text by default, which the first gate covers
	{
		color: 'link_color_selected',
		relation: 'on',
		grounds: ['00'],
		threshold: GATE_LINK,
		when_authored: true
	},
	// the focus ring is the accent at stop 50 by default, which the fill gate covers
	{
		color: 'outline_color',
		relation: 'vs',
		grounds: ['00'],
		threshold: GATE_UI,
		when_authored: true
	}
];

/**
 * The role variables the contrast gates follow - each aliases a color stop or
 * another role by default (`text_color` is `var(--text_80)`), and
 * `check_theme` measures
 * whatever a theme points it at instead of the stop it left.
 */
export const theme_gate_role_names: ReadonlyArray<string> = PAIRING_GATES.map(
	(gate) => gate.color
).filter((name) => ALIAS_DEFAULTS.has(name));

const NO_VISITS: ReadonlySet<string> = new Set();

/**
 * Runs the gamut, monotonicity, and contrast gates against a theme, resolving
 * its authored CSS back to numbers through the resolution core. Report-only:
 * failures land in `entries` (with `pass: false`), inputs that can't be
 * evaluated land in `unchecked`, and `ok` is true only when every entry passes
 * and nothing is unchecked. Never throws.
 *
 * Every color a gate reads is looked up by its variable name, so a theme that
 * authors one directly - a stop (`palette_a_50`, `shade_00`, `text_max`,
 * `border_color_30`) or a role (`text_color`, `link_color`, `border_color`) -
 * is measured at the authored color when it is an `oklch(L C H)` numeric
 * literal or an exact `var()` reference to another color the gates evaluate,
 * and recorded in `unchecked` otherwise. An authored color a gate depends on
 * never passes unread, and one no gate reads stays out of the report.
 *
 * A contrast subject names what was measured: the default stop while a role
 * is at its default (`text_80 on shade_00`), the role once the theme authors
 * it (`text_color on shade_00`).
 *
 * An intent stop that renders the same color as a palette letter's (the
 * default for every intent) folds into that letter's gamut entry rather than
 * duplicating it, so reports for letter-bound themes list fewer subjects than
 * the full letters × intents grid.
 */
export const check_theme = (theme: Theme): ThemeCheckReport => {
	const resolver = new ThemeResolver(theme);
	const stance = theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : null;
	const entries: Array<ThemeGateEntry> = [];
	const unchecked: Array<ThemeUncheckedEntry> = [];
	const seen_unchecked: Set<string> = new Set();

	const record = (r: ThemeUncheckedEntry): null => {
		const key = `${r.variable}|${r.value}|${r.reason}`;
		if (!seen_unchecked.has(key)) {
			seen_unchecked.add(key);
			unchecked.push({ variable: r.variable, value: r.value, reason: r.reason });
		}
		return null;
	};

	const num = (name: string, scheme: ColorSchemeVariant): number | null => {
		const r = resolver.resolve(name, scheme);
		return r.ok ? r.value : record(r);
	};

	// the theme's own value for a color variable, evaluated: `undefined` when
	// it authors none for the slot, `null` (recorded) when the value isn't a
	// form the gates evaluate. Every gate color comes through here by name,
	// which is what makes the set of authored colors the report answers for
	// exactly the gates' own inputs
	const authored_color = (
		name: string,
		scheme: ColorSchemeVariant,
		visited: ReadonlySet<string>
	): GateColor | null | undefined => {
		const authored = resolver.authored(name, scheme);
		if (authored === undefined) return undefined;
		const value = authored.trim();
		const literal = parse_color_literal(value);
		if (literal) return literal;
		const reference = VAR_MATCHER.exec(value);
		if (!reference) return record({ variable: name, value, reason: REASON_COLOR_FORM });
		const color = color_of(reference[1]!, scheme, new Set(visited).add(name));
		return color === undefined
			? record({ variable: name, value, reason: REASON_COLOR_REFERENCE })
			: color;
	};

	// an opaque color variable: the theme's authored color when it has one,
	// else the value derived from the resolved knobs
	const opaque_color = (
		name: string,
		scheme: ColorSchemeVariant,
		derive: () => RgbUnit | null,
		visited: ReadonlySet<string> = NO_VISITS
	): RgbUnit | null => {
		const authored = authored_color(name, scheme, visited);
		if (authored === undefined) return derive();
		if (authored === null) return null;
		if (authored.alpha < 1) {
			const value = resolver.authored(name, scheme)!.trim();
			return record({ variable: name, value, reason: REASON_COLOR_ALPHA });
		}
		return authored.rgb;
	};

	// a palette letter's or intent's color at a stop (`palette_a_50`,
	// `accent_60`), derived from the slot's hue angle and chroma multiplier
	const slot_color = (
		slot: string,
		hue: number,
		multiplier: number,
		stop: NumericScaleVariant,
		scheme: ColorSchemeVariant,
		visited?: ReadonlySet<string>
	): RgbUnit | null =>
		opaque_color(
			`${slot}_${stop}`,
			scheme,
			() => {
				const lightness = num(`palette_lightness_${stop}`, scheme);
				const chroma_stop = num(`palette_chroma_${stop}`, scheme);
				const chroma_scale = num('chroma_scale', scheme);
				if (lightness === null || chroma_stop === null || chroma_scale === null) {
					return null;
				}
				return oklch_to_srgb(
					ramp_color_oklch(lightness, chroma_stop, hue, chroma_scale, multiplier)
				);
			},
			visited
		);

	// a neutral (shade/text) ramp color at a stop
	const neutral_color = (
		family: 'shade' | 'text',
		stop: NumericScaleVariant,
		scheme: ColorSchemeVariant,
		visited?: ReadonlySet<string>
	): RgbUnit | null =>
		opaque_color(
			`${family}_${stop}`,
			scheme,
			() => {
				const lightness = num(`${family}_lightness_${stop}`, scheme);
				const neutral_c = num('neutral_chroma', scheme);
				const shape = num(`chroma_shape_${stop}`, scheme);
				const neutral_hue = num('hue_neutral', scheme);
				if (lightness === null || neutral_c === null || shape === null || neutral_hue === null) {
					return null;
				}
				return oklch_to_srgb(neutral_color_oklch(lightness, neutral_c, shape, neutral_hue));
			},
			visited
		);

	const opaque = (rgb: RgbUnit | null): GateColor | null => rgb && { rgb, alpha: 1 };

	// evaluates a color variable by name - a stop, an untinted extreme, or an
	// alias followed through to what it points at. `undefined` when the name
	// isn't a color the gates evaluate
	const color_of = (
		name: string,
		scheme: ColorSchemeVariant,
		visited: ReadonlySet<string> = NO_VISITS
	): GateColor | null | undefined => {
		if (visited.has(name)) {
			return record({
				variable: name,
				value: `var(--${name})`,
				reason: 'cyclic var() reference'
			});
		}
		const slot_match = PALETTE_STOP_MATCHER.exec(name) ?? INTENT_STOP_MATCHER.exec(name);
		if (slot_match) {
			const letter = name.startsWith('palette_');
			const slot = letter ? `palette_${slot_match[1]}` : slot_match[1]!;
			const hue = num(`hue_${slot_match[1]}`, scheme);
			const multiplier = num(`${slot}_chroma_scale`, scheme);
			if (hue === null || multiplier === null) return null;
			const stop = slot_match[2] as NumericScaleVariant;
			return opaque(slot_color(slot, hue, multiplier, stop, scheme, visited));
		}
		const neutral_match = NEUTRAL_STOP_MATCHER.exec(name);
		if (neutral_match) {
			const family = neutral_match[1] as 'shade' | 'text';
			const stop = neutral_match[2] as NumericScaleVariant;
			return opaque(neutral_color(family, stop, scheme, visited));
		}
		const extreme_match = EXTREME_MATCHER.exec(name);
		if (extreme_match) {
			// `max` is the far end from the ground - black in light - and a stance
			// renders its scheme's appearance in both
			const black = (extreme_match[1] === 'max') === ((stance ?? scheme) === 'light');
			return opaque(opaque_color(name, scheme, () => (black ? [0, 0, 0] : [1, 1, 1]), visited));
		}
		const border_match = BORDER_COLOR_STOP_MATCHER.exec(name);
		if (border_match) {
			const authored = authored_color(name, scheme, visited);
			if (authored !== undefined) return authored;
			const border_l = num('border_color_lightness', scheme);
			const border_c = num('border_color_chroma', scheme);
			const border_h = num('hue_neutral', scheme);
			if (border_l === null || border_c === null || border_h === null) return null;
			// the alpha is baked into the stop's rendered CSS, which a stance
			// mirrors into both schemes - so it follows the stance
			const stop = border_match[1] as NumericScaleVariant;
			const alpha = BORDER_COLOR_ALPHAS[stance ?? scheme][stop] / 100;
			return { rgb: oklch_to_srgb([border_l, border_c, border_h]), alpha };
		}
		const alias = ALIAS_DEFAULTS.get(name);
		if (alias !== undefined) {
			const authored = authored_color(name, scheme, visited);
			if (authored !== undefined) return authored;
			return color_of(alias, scheme, new Set(visited).add(name));
		}
		return undefined;
	};

	const contrast = (a: RgbUnit, b: RgbUnit): number =>
		wcag_contrast_ratio(clamp_rgb(a), clamp_rgb(b));

	const push_gamut = (subject: string, color: RgbUnit, scheme: ColorSchemeVariant): void => {
		const value = gamut_excess(color);
		entries.push({
			gate: 'gamut',
			scheme,
			subject,
			value,
			threshold: GATE_GAMUT_TOLERANCE,
			pass: value <= GATE_GAMUT_TOLERANCE
		});
	};

	const push_contrast = (
		subject: string,
		value: number,
		threshold: number,
		scheme: ColorSchemeVariant
	): void => {
		entries.push({ gate: 'contrast', scheme, subject, value, threshold, pass: value >= threshold });
	};

	const push_monotonicity = (family: RampFamily, scheme: ColorSchemeVariant): void => {
		const lightnesses: Array<number> = [];
		for (const stop of numeric_scale_variants) {
			const l = num(`${family}_lightness_${stop}`, scheme);
			if (l === null) return; // input unchecked; skip this family+scheme
			lightnesses.push(l);
		}
		const direction = Math.sign(lightnesses[lightnesses.length - 1]! - lightnesses[0]!);
		let min_step = Infinity;
		for (let i = 1; i < lightnesses.length; i++) {
			min_step = Math.min(min_step, (lightnesses[i]! - lightnesses[i - 1]!) * direction);
		}
		// direction 0 (degenerate ramp) yields min_step 0 and fails, as it should
		const value = direction === 0 ? 0 : min_step;
		entries.push({
			gate: 'monotonicity',
			scheme,
			subject: `${family}_lightness`,
			value,
			threshold: 0,
			pass: value > 0
		});
	};

	for (const scheme of color_scheme_variants) {
		const authored = (name: string): boolean => resolver.authored(name, scheme) !== undefined;

		// what a subject calls a painted color: the role once the theme authors
		// it, the stop it defaults to until then
		const label_of = (name: string): string => {
			const alias = ALIAS_DEFAULTS.get(name);
			return alias === undefined || authored(name) ? name : label_of(alias);
		};

		// one painted color against each of a gate's grounds, a translucent
		// color composited over the ground first
		const push_pairing = (gate: PairingGate, name: string): void => {
			const color = color_of(name, scheme);
			for (const stop of gate.grounds) {
				const ground = neutral_color('shade', stop, scheme);
				if (!color || !ground) continue;
				const ground_rgb = clamp_rgb(ground);
				const color_rgb = clamp_rgb(color.rgb);
				const ratio = wcag_contrast_ratio(
					color.alpha < 1 ? composite_over(color_rgb, color.alpha, ground_rgb) : color_rgb,
					ground_rgb
				);
				const subject = `${label_of(name)} ${gate.relation} shade_${stop}`;
				push_contrast(subject, ratio, gate.threshold, scheme);
			}
		};

		// gamut: palette letters × stops
		const letter_slots: Array<[letter: PaletteVariant, hue: number, multiplier: number]> = [];
		for (const letter of palette_variants) {
			const hue = num(`hue_${letter}`, scheme);
			const multiplier = num(`palette_${letter}_chroma_scale`, scheme);
			if (hue === null || multiplier === null) continue;
			letter_slots.push([letter, hue, multiplier]);
			for (const stop of numeric_scale_variants) {
				const color = slot_color(`palette_${letter}`, hue, multiplier, stop, scheme);
				if (color) push_gamut(`palette_${letter}_${stop}`, color, scheme);
			}
		}
		// gamut: each intent stop that renders differently from every letter's -
		// it folds into a letter's entry only when hue AND multiplier match and
		// neither stop is authored as its own color
		for (const intent of intent_variants) {
			const hue = num(`hue_${intent}`, scheme);
			const multiplier = num(`${intent}_chroma_scale`, scheme);
			if (hue === null || multiplier === null) continue;
			const twins = letter_slots.filter(
				([, h, m]) =>
					Math.abs(h - hue) < NUMERIC_EPSILON && Math.abs(m - multiplier) < NUMERIC_EPSILON
			);
			for (const stop of numeric_scale_variants) {
				if (
					!authored(`${intent}_${stop}`) &&
					twins.some(([letter]) => !authored(`palette_${letter}_${stop}`))
				) {
					continue;
				}
				const color = slot_color(intent, hue, multiplier, stop, scheme);
				if (color) push_gamut(`${intent}_${stop}`, color, scheme);
			}
		}
		// gamut: the neutral (shade/text) scales
		for (const family of ['shade', 'text'] as const) {
			for (const stop of numeric_scale_variants) {
				const color = neutral_color(family, stop, scheme);
				if (color) push_gamut(`${family}_${stop}`, color, scheme);
			}
		}

		// monotonicity: each lightness family
		for (const family of ['palette', 'shade', 'text'] as const) {
			push_monotonicity(family, scheme);
		}

		// contrast: the single-color pairings - body, selected, and subtle text,
		// borders, links, and the focus ring
		for (const gate of PAIRING_GATES) {
			const role_authored = authored(gate.color);
			if (gate.when_authored && !role_authored) continue;
			push_pairing(gate, gate.color);
			const alias = ALIAS_DEFAULTS.get(gate.color);
			if (gate.default_painted && role_authored && alias !== undefined) {
				push_pairing(gate, alias);
			}
		}

		// contrast: UI affordances - every letter and intent at stop 50, the
		// fill stop 60 selected buttons use, and the palette letters as label text
		const shade_00 = neutral_color('shade', '00', scheme);
		const text_00 = neutral_color('text', '00', scheme);
		const text_max = color_of('text_max', scheme)?.rgb ?? null;
		const fills: Array<[label: string, hue: number, multiplier: number, is_letter?: boolean]> = [];
		for (const letter of palette_variants) {
			const hue = num(`hue_${letter}`, scheme);
			const multiplier = num(`palette_${letter}_chroma_scale`, scheme);
			if (hue !== null && multiplier !== null) {
				fills.push([`palette_${letter}`, hue, multiplier, true]);
			}
		}
		for (const intent of intent_variants) {
			const hue = num(`hue_${intent}`, scheme);
			const multiplier = num(`${intent}_chroma_scale`, scheme);
			if (hue !== null && multiplier !== null) fills.push([intent, hue, multiplier]);
		}
		if (shade_00) {
			for (const [label, hue, multiplier, is_letter] of fills) {
				const fill = slot_color(label, hue, multiplier, '50', scheme);
				if (fill) {
					const ui = contrast(fill, shade_00);
					push_contrast(`${label}_50 vs shade_00`, ui, GATE_UI, scheme);
					if (text_max) {
						const on_fill = contrast(text_max, fill);
						push_contrast(`text_max on ${label}_50`, on_fill, GATE_FILL_TEXT, scheme);
					}
				}
				const stop_60 = slot_color(label, hue, multiplier, '60', scheme);
				if (!stop_60) continue;
				if (text_00) {
					const selected = contrast(text_00, stop_60);
					push_contrast(`text_00 on ${label}_60`, selected, GATE_SELECTED_TEXT, scheme);
				}
				if (!is_letter) continue;
				// the colored label on the page itself (colored text, `.plain`
				// buttons), on the `.palette_X` button's rest fill - a faint tint of
				// the label's own color over the page - and on the chip's stop-10 tint
				const on_page = contrast(stop_60, shade_00);
				push_contrast(`${label}_60 on shade_00`, on_page, GATE_PALETTE_TEXT, scheme);
				const label_rgb = clamp_rgb(stop_60);
				const button_fill = composite_over(label_rgb, BUTTON_FILL_ALPHA, clamp_rgb(shade_00));
				const on_button = wcag_contrast_ratio(label_rgb, button_fill);
				push_contrast(`${label}_60 on ${label} button fill`, on_button, GATE_PALETTE_TEXT, scheme);
				const tint = slot_color(label, hue, multiplier, '10', scheme);
				if (tint) {
					const on_tint = contrast(stop_60, tint);
					push_contrast(`${label}_60 on ${label}_10`, on_tint, GATE_PALETTE_TEXT, scheme);
				}
			}
		}
	}

	const ok = unchecked.length === 0 && entries.every((e) => e.pass);
	return { ok, entries, unchecked };
};

//
// compile_theme - recompute worst-hue caps for the theme's own hues.
//

// how far a recomputed cap must sit above the baked one to be worth emitting -
// reclaiming sub-JND chroma headroom isn't worth an override. A cap that
// tightens always emits: the gamut gate's tolerance is far finer than this,
// so any stop the baked table overshoots is a stop the gate reports
const CAP_EMIT_EPSILON = 0.002;

// the theme's effective hue set for cap recomputation: the palette letters
// plus any intent that resolves to a literal angle distinct from every letter.
// `null` when any hue fails to resolve - caps computed without it would claim
// headroom the missing hue may not have, so the compile step emits nothing
// (the re-check still reports the unresolvable pins)
const collect_hues = (
	resolver: ThemeResolver,
	scheme: ColorSchemeVariant
): Array<number> | null => {
	const hues: Array<number> = [];
	for (const letter of palette_variants) {
		const r = resolver.resolve(`hue_${letter}`, scheme);
		if (!r.ok) return null;
		hues.push(r.value);
	}
	for (const intent of intent_variants) {
		const r = resolver.resolve(`hue_${intent}`, scheme);
		if (!r.ok) return null;
		if (!hues.some((h) => Math.abs(h - r.value) < NUMERIC_EPSILON)) hues.push(r.value);
	}
	return hues;
};

/**
 * Recomputes a theme's per-stop worst-hue chroma caps from its own hues and
 * the palette lightness each stop resolves to, then emits `palette_chroma_NN`
 * overrides wherever the baked caps no longer fit - the fix for a theme
 * (rotated hues, a monochrome collapse, a moved lightness ramp) whose gamut
 * headroom the baked worst-hue table misjudges.
 *
 * Each stop's cap is computed at the lightness the resolution core resolves
 * for `palette_lightness_NN` in that scheme - a pinned intermediate stop when
 * the theme pins one, the endpoint-and-curve ramp otherwise - so the caps
 * describe the same colors `check_theme` gates.
 *
 * A stop is emitted when either scheme's recomputed cap is tighter than the
 * baked value, or looser by more than the emit epsilon, and the theme doesn't
 * already pin that stop. Nothing is emitted when a hue fails to resolve to a
 * number, since caps computed without it could overshoot its gamut, and a
 * stop whose lightness fails to resolve is skipped. An override emits both
 * slots together, so a one-scheme override can't silently kill the base
 * default's other slot by cascade-layer order, collapsing to a single slot
 * in the base position when the two rendered values coincide.
 *
 * A stanced theme's two schemes resolve to the stanced appearance through the
 * mirror, so its caps are baselined against the stanced scheme's baked table -
 * the values the mirror already re-slots - and a stance alone (hues and
 * lightness unmoved) emits nothing. Its overrides coincide across schemes and
 * emit single-slot unless the theme authors a dark slot that splits them. A
 * stanced theme's `scheme_mirror` is recomputed over the emitted variables,
 * so the output is render-ready even when the input wasn't resolved.
 *
 * The caps bound the requested chroma only: `chroma_scale` and the per-slot
 * `*_chroma_scale` multipliers apply above the clamp. A theme that raises one
 * past 1 clips by design - its gamut failures survive the compile, and a cap
 * the compile loosens can add to them, since the multiplier then pushes more
 * stops past the looser cap. The input theme is never mutated. The report re-checks the emitted theme, whose
 * compiled-cap overrides the resolution core recognizes.
 */
export const compile_theme = (theme: Theme): CompiledTheme => {
	const resolver = new ThemeResolver(theme);
	const stance = theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : null;

	const hues: Record<ColorSchemeVariant, Array<number> | null> = {
		light: collect_hues(resolver, 'light'),
		dark: collect_hues(resolver, 'dark')
	};
	// the gamut search is the expensive part, and a stanced theme resolves both
	// schemes to the same hues and lightness - so memoize by the search inputs
	const caps: Map<string, number> = new Map();
	const recompute = (stop: NumericScaleVariant, scheme: ColorSchemeVariant): number | null => {
		const scheme_hues = hues[scheme];
		// the stop's own lightness, so a pinned intermediate is honored
		const lightness = resolver.resolve(`palette_lightness_${stop}`, scheme);
		if (!scheme_hues || !lightness.ok) return null;
		const key = `${lightness.value}|${scheme_hues.join(',')}`;
		let cap = caps.get(key);
		if (cap === undefined) {
			cap = compute_worst_hue_chroma_cap(scheme_hues, lightness.value);
			caps.set(key, cap);
		}
		return cap;
	};
	// a stance baselines both schemes against the stanced scheme's baked caps:
	// those are what the mirror re-slots into the base position, so comparing
	// against the light table would emit no-op overrides duplicating the mirror
	// for every dark stance
	const baked: Record<ColorSchemeVariant, Record<NumericScaleVariant, number>> = {
		light: PALETTE_CHROMA_CAPS[stance ?? 'light'],
		dark: PALETTE_CHROMA_CAPS[stance ?? 'dark']
	};

	// tightening always emits, loosening only past the epsilon
	const cap_moved = (cap: number, baked_cap: number): boolean =>
		cap < baked_cap - NUMERIC_EPSILON || cap - baked_cap > CAP_EMIT_EPSILON;

	const cap_overrides: Array<StyleVariable> = [];
	for (const stop of hues.light && hues.dark ? numeric_scale_variants : []) {
		if (resolver.pinned(`palette_chroma_${stop}`)) continue; // respect the pin
		const light_cap = recompute(stop, 'light');
		const dark_cap = recompute(stop, 'dark');
		if (light_cap === null || dark_cap === null) continue;
		if (cap_moved(light_cap, baked.light[stop]) || cap_moved(dark_cap, baked.dark[stop])) {
			const light_value = render_chroma_stop_css(stop, light_cap);
			const dark_value = render_chroma_stop_css(stop, dark_cap);
			cap_overrides.push(
				light_value === dark_value
					? { name: `palette_chroma_${stop}`, light: light_value }
					: { name: `palette_chroma_${stop}`, light: light_value, dark: dark_value }
			);
		}
	}

	// spread to preserve the scheme stance (and any future fields)
	const compiled: Theme = { ...theme, variables: [...theme.variables, ...cap_overrides] };
	// the emitted variables shadow mirror entries, so recompute the mirror over
	// them; this also resolves a stanced input that skipped resolve_theme_stance
	if (stance) compiled.scheme_mirror = scheme_stance_variables(stance, compiled.variables);
	// lint the compiled output, not the input - compiling resolves the stance,
	// so an unresolved stanced input shouldn't surface the "resolve the theme"
	// warning the same call just fixed
	return { theme: compiled, report: check_theme(compiled), issues: validate_theme(compiled) };
};
