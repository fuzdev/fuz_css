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
 *   theme's own hues and lightness ramp and emits `palette_chroma_NN`
 *   overrides where the baked caps no longer fit, then re-checks.
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
 * - Derived ramp stops use a pinned numeric value when the theme pins one,
 *   fall back to the `ramps.ts` formulas with the resolved knobs otherwise,
 *   and mark the touching gates `unchecked` when a pin is unresolvable.
 * - A few gate inputs do NOT resolve through the theme and are fixed to the
 *   shipped design: `text_min`/`text_max` (assumed pure black/white),
 *   `border_color_NN` alphas (`BORDER_COLOR_ALPHAS`), the control-border
 *   gate's `--border_color` (assumed its `shade_30` default), and the
 *   `chroma_shape_NN` intermediates (recomputed from the curve knob, so a
 *   theme pinning a shape stop directly checks against the unpinned shape).
 *   A theme moving those can render differently than it checks.
 *
 * The effective-value merge mirrors the renderer's cascade-layer semantics
 * (`theme.ts` `render_theme_style`, `theme_editor_state.svelte.ts`
 * `display_value`): light = `theme.light`; dark = `theme.dark ?? theme.light`,
 * falling back to the numeric-twin default for the scheme. A single-scheme
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
	PALETTE_LIGHTNESS_KNOBS,
	LIGHTNESS_KNOBS,
	PALETTE_CHROMA_KNOBS,
	PALETTE_CHROMA_CAPS,
	NEUTRAL_CHROMA,
	BORDER_COLOR_LIGHTNESS,
	BORDER_CHROMA_MULTIPLIER,
	BORDER_COLOR_ALPHAS,
	ramp_lightness,
	ramp_chroma,
	ramp_chroma_shape,
	ramp_color_oklch,
	neutral_color_oklch,
	compute_palette_chroma_caps,
	render_chroma_stop_css,
	type LightnessRampKnobs,
	type RampFamily,
	type ChromaRampKnobs
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
import { oklch_to_srgb, type Oklch, type RgbUnit } from './oklch.ts';
import { wcag_contrast_ratio } from './wcag.ts';

//
// Gate thresholds - the WCAG levels the derived palette is designed to clear.
//

/** AAA body text: `text_80` on `shade_00`/`05`/`10`. */
export const GATE_BODY_TEXT = 7;
/** Disabled/secondary floor: `text_50` on `shade_00`. */
export const GATE_SUBTLE_TEXT = 3;
/** AA link default: the accent hue at stop 60 on `shade_00`. */
export const GATE_LINK = 4.5;
/** WCAG 1.4.11 non-text: every hue at stop 50 vs `shade_00`. */
export const GATE_UI = 3;
/** Large-text floor: `text_max` on every stop-50 fill. */
export const GATE_FILL_TEXT = 3;
/**
 * Selected-control inverse text: `text_00` on `shade_50` and on every stop-50
 * fill - the selected-button pairings in `style.css` (`.selected` fills with
 * `shade_50`, `.palette_X.selected` with `palette_X_50`). The endpoint stop is
 * immune to `text_lightness_curve` bends, so this gate moves only when a theme
 * moves the endpoints, the fill ramps, or the hues.
 */
export const GATE_SELECTED_TEXT = 3;
/**
 * Control borders: `shade_30` (the `--border_color` default) vs `shade_00`.
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
 * Gamut gate: how far outside sRGB (summed channel excess) a stop may sit and
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

/** A gate input that couldn't be resolved to a number, so its gate was skipped. */
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

	/** Resolves `name` for `scheme`, memoized per name+scheme. */
	resolve(name: string, scheme: ColorSchemeVariant): Resolved {
		const key = `${scheme}|${name}`;
		const cached = this.#memo.get(key);
		if (cached) return cached;
		const result = this.#resolve(name, scheme, new Set());
		this.#memo.set(key, result);
		return result;
	}

	// the theme-authored value for a slot, honoring the dark → light fallback
	#authored(name: string, scheme: ColorSchemeVariant): string | undefined {
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
		const authored = this.#authored(name, scheme);
		if (authored !== undefined) return this.#parse(name, authored, scheme, next);
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
		const stop = m[1] as NumericScaleVariant;
		const literal = Number(m[2]);
		const chroma_min = this.#resolve('palette_chroma_min', scheme, visited);
		if (!chroma_min.ok) return chroma_min;
		const chroma_max = this.#resolve('palette_chroma_max', scheme, visited);
		if (!chroma_max.ok) return chroma_max;
		const curve = this.#resolve('chroma_curve', scheme, visited);
		if (!curve.ok) return curve;
		const shape = ramp_chroma_shape(stop, curve.value);
		const requested = chroma_min.value + (chroma_max.value - chroma_min.value) * shape;
		return { ok: true, value: Math.min(requested, literal) };
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
		// derived palette chroma stops - the capped knob curve
		const chroma_match = PALETTE_CHROMA_STOP_MATCHER.exec(name);
		if (chroma_match) {
			const stop = chroma_match[1] as NumericScaleVariant;
			const knobs = this.#chroma_knobs(scheme, visited);
			if (!knobs.ok) return knobs.error;
			const value = ramp_chroma(stop, knobs.value, PALETTE_CHROMA_CAPS[scheme][stop]);
			return { ok: true, value };
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

	#chroma_knobs(
		scheme: ColorSchemeVariant,
		visited: Set<string>
	): { ok: true; value: ChromaRampKnobs } | { ok: false; error: Resolved } {
		const r = this.#resolve_all(
			['palette_chroma_min', 'palette_chroma_max', 'chroma_curve'],
			scheme,
			visited
		);
		if (!r.ok) return r;
		const [chroma_min, chroma_max, curve] = r.values;
		return { ok: true, value: { chroma_min: chroma_min!, chroma_max: chroma_max!, curve: curve! } };
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
	const numeric = trimmed !== '' && Number.isFinite(Number(trimmed));
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
			// a literal angle, or a var(--hue_X) binding (legal CSS regardless of `bindable`)
			const is_binding = HUE_BINDING_MATCHER.test(trimmed);
			if (!numeric && !is_binding) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a hue angle or var(--hue_X) binding`,
					variable
				});
			} else if (numeric) {
				check_range(Number(trimmed));
			}
			break;
		}
		case 'time': {
			const time_match = /^(-?\d*\.?\d+)s$/u.exec(trimmed);
			if (!time_match) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a CSS time value like 0.2s`,
					variable
				});
			} else {
				check_range(Number(time_match[1]));
			}
			break;
		}
		case 'enum': {
			if (knob.values && !knob.values.includes(trimmed)) {
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
		const entry: unknown = Array.isArray(list) && typeof index === 'number' ? list[index] : undefined;
		const name =
			typeof entry === 'object' && entry !== null && typeof (entry as { name?: unknown }).name === 'string'
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
 * chroma character is otherwise silently dropped). Value validation is
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
	issues.push(...validate_binding_pairing(theme));
	return issues;
};

// the pairing lint: an intent hue bound to a palette letter (authored
// `var(--hue_X)` or the default binding) shares only the angle, so warn when
// the letter's chroma multiplier and the intent's twin disagree - the theme
// probably meant the character to follow the binding (the neutral is exempt:
// its character is `--neutral_chroma` by design)
const validate_binding_pairing = (theme: Theme): Array<ThemeIssue> => {
	const issues: Array<ThemeIssue> = [];
	const resolver = new ThemeResolver(theme);
	for (const intent of intent_variants) {
		const hue_name = `hue_${intent}`;
		const authored = theme.variables.find((v) => v.name === hue_name);
		let letter: string | null = null;
		if (authored) {
			for (const slot of [authored.light, authored.dark]) {
				const m = slot === undefined ? null : HUE_BINDING_MATCHER.exec(slot.trim());
				if (m) letter = m[1]!;
			}
		} else {
			letter = INTENT_HUE_DEFAULT_BINDING[hue_name]!.slice('hue_'.length);
		}
		if (!letter) continue;
		for (const scheme of color_scheme_variants) {
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

/**
 * Runs the gamut, monotonicity, and contrast gates against a theme, resolving
 * its authored CSS back to numbers through the resolution core. Report-only:
 * failures land in `entries` (with `pass: false`), inputs that can't be
 * resolved land in `unchecked`, and `ok` is true only when every entry passes
 * and nothing is unchecked. Never throws.
 *
 * An intent hue that resolves to the same angle as a palette letter (the
 * default for every intent) folds into that letter's entries rather than
 * duplicating them, so reports for letter-bound themes list fewer subjects
 * than the full letters × intents grid.
 */
export const check_theme = (theme: Theme): ThemeCheckReport => {
	const resolver = new ThemeResolver(theme);
	const stance = theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : null;
	const entries: Array<ThemeGateEntry> = [];
	const unchecked: Array<ThemeUncheckedEntry> = [];
	const seen_unchecked: Set<string> = new Set();

	const record = (r: Extract<Resolved, { ok: false }>): null => {
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

	// a palette/intent ramp color at a stop for a given hue angle and the
	// slot's chroma multiplier
	const ramp_color = (
		hue: number,
		stop: NumericScaleVariant,
		scheme: ColorSchemeVariant,
		multiplier = 1
	): Oklch | null => {
		const lightness = num(`palette_lightness_${stop}`, scheme);
		const chroma_stop = num(`palette_chroma_${stop}`, scheme);
		const chroma_scale = num('chroma_scale', scheme);
		if (lightness === null || chroma_stop === null || chroma_scale === null) {
			return null;
		}
		return ramp_color_oklch(lightness, chroma_stop, hue, chroma_scale, multiplier);
	};

	// a neutral (shade/text) ramp color at a stop
	const neutral_color = (
		family: 'shade' | 'text',
		stop: NumericScaleVariant,
		scheme: ColorSchemeVariant
	): Oklch | null => {
		const lightness = num(`${family}_lightness_${stop}`, scheme);
		const neutral_c = num('neutral_chroma', scheme);
		const curve = num('chroma_curve', scheme);
		const neutral_hue = num('hue_neutral', scheme);
		if (lightness === null || neutral_c === null || curve === null || neutral_hue === null) {
			return null;
		}
		return neutral_color_oklch(lightness, neutral_c, ramp_chroma_shape(stop, curve), neutral_hue);
	};

	const contrast = (a: RgbUnit, b: RgbUnit): number =>
		wcag_contrast_ratio(clamp_rgb(a), clamp_rgb(b));

	const push_gamut = (subject: string, color: Oklch, scheme: ColorSchemeVariant): void => {
		const value = gamut_excess(oklch_to_srgb(color));
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

	const push_monotonicity = (
		family: RampFamily,
		scheme: ColorSchemeVariant
	): void => {
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
		// gamut: palette letters × 13 stops
		const letter_slots: Array<[hue: number, multiplier: number]> = [];
		for (const letter of palette_variants) {
			const hue = num(`hue_${letter}`, scheme);
			const multiplier = num(`palette_${letter}_chroma_scale`, scheme);
			if (hue === null || multiplier === null) continue;
			letter_slots.push([hue, multiplier]);
			for (const stop of numeric_scale_variants) {
				const color = ramp_color(hue, stop, scheme, multiplier);
				if (color) push_gamut(`palette_${letter}_${stop}`, color, scheme);
			}
		}
		// gamut: each intent that renders differently from every letter - an
		// intent folds into a letter's entries only when hue AND multiplier match
		for (const intent of intent_variants) {
			const hue = num(`hue_${intent}`, scheme);
			const multiplier = num(`${intent}_chroma_scale`, scheme);
			if (hue === null || multiplier === null) continue;
			if (
				letter_slots.some(
					([h, m]) => Math.abs(h - hue) < NUMERIC_EPSILON && Math.abs(m - multiplier) < NUMERIC_EPSILON
				)
			) {
				continue;
			}
			for (const stop of numeric_scale_variants) {
				const color = ramp_color(hue, stop, scheme, multiplier);
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

		// contrast: body text - text_80 on shade_00/05/10
		const text_80 = neutral_color('text', '80', scheme);
		for (const stop of ['00', '05', '10'] as const) {
			const surface = neutral_color('shade', stop, scheme);
			if (!text_80 || !surface) continue;
			const ratio = contrast(oklch_to_srgb(text_80), oklch_to_srgb(surface));
			push_contrast(`text_80 on shade_${stop}`, ratio, GATE_BODY_TEXT, scheme);
		}

		const shade_00 = neutral_color('shade', '00', scheme);

		// contrast: selected-control inverse text - text_00 on shade_50
		const text_00 = neutral_color('text', '00', scheme);
		const shade_50 = neutral_color('shade', '50', scheme);
		if (text_00 && shade_50) {
			const ratio = contrast(oklch_to_srgb(text_00), oklch_to_srgb(shade_50));
			push_contrast('text_00 on shade_50', ratio, GATE_SELECTED_TEXT, scheme);
		}

		// contrast: subtle text - text_50 on shade_00
		const text_50 = neutral_color('text', '50', scheme);
		if (text_50 && shade_00) {
			const ratio = contrast(oklch_to_srgb(text_50), oklch_to_srgb(shade_00));
			push_contrast('text_50 on shade_00', ratio, GATE_SUBTLE_TEXT, scheme);
		}

		// contrast: control borders - shade_30 (the --border_color default) vs shade_00
		const shade_30 = neutral_color('shade', '30', scheme);
		if (shade_30 && shade_00) {
			const ratio = contrast(oklch_to_srgb(shade_30), oklch_to_srgb(shade_00));
			push_contrast('shade_30 vs shade_00', ratio, GATE_BORDER, scheme);
		}

		// contrast: divider borders - border_color_30 alpha-composited over shade_00
		const border_l = num('border_color_lightness', scheme);
		const border_c = num('border_color_chroma', scheme);
		const border_h = num('hue_neutral', scheme);
		if (border_l !== null && border_c !== null && border_h !== null && shade_00) {
			const border_rgb = clamp_rgb(oklch_to_srgb([border_l, border_c, border_h]));
			const bg_rgb = clamp_rgb(oklch_to_srgb(shade_00));
			// the alpha is baked into border_color_30's rendered CSS, which a
			// stance mirrors into both schemes - so it follows the stance
			const alpha = BORDER_COLOR_ALPHAS[stance ?? scheme]['30'] / 100;
			// gamma-space compositing, matching how browsers stack backgrounds
			const composited: RgbUnit = [
				alpha * border_rgb[0] + (1 - alpha) * bg_rgb[0],
				alpha * border_rgb[1] + (1 - alpha) * bg_rgb[1],
				alpha * border_rgb[2] + (1 - alpha) * bg_rgb[2]
			];
			const ratio = wcag_contrast_ratio(composited, bg_rgb);
			push_contrast('border_color_30 over shade_00', ratio, GATE_BORDER_DIVIDER, scheme);
		}

		// contrast: link - the accent hue at stop 60 on shade_00 (resolved through bindings)
		const accent_hue = num('hue_accent', scheme);
		const accent_multiplier = num('accent_chroma_scale', scheme);
		if (accent_hue !== null && accent_multiplier !== null && shade_00) {
			const link = ramp_color(accent_hue, '60', scheme, accent_multiplier);
			if (link) {
				const ratio = contrast(oklch_to_srgb(link), oklch_to_srgb(shade_00));
				push_contrast('accent_60 on shade_00', ratio, GATE_LINK, scheme);
			}
		}

		// contrast: UI affordances - every letter and intent fill at stop 50;
		// a stance renders its scheme's appearance in both, so text_max follows it
		const text_max: RgbUnit = (stance ?? scheme) === 'light' ? [0, 0, 0] : [1, 1, 1];
		const fills: Array<[string, number, number]> = [];
		for (const letter of palette_variants) {
			const hue = num(`hue_${letter}`, scheme);
			const multiplier = num(`palette_${letter}_chroma_scale`, scheme);
			if (hue !== null && multiplier !== null) {
				fills.push([`palette_${letter}`, hue, multiplier]);
			}
		}
		for (const intent of intent_variants) {
			const hue = num(`hue_${intent}`, scheme);
			const multiplier = num(`${intent}_chroma_scale`, scheme);
			if (hue !== null && multiplier !== null) fills.push([intent, hue, multiplier]);
		}
		if (shade_00) {
			for (const [label, hue, multiplier] of fills) {
				const fill = ramp_color(hue, '50', scheme, multiplier);
				if (!fill) continue;
				const fill_rgb = oklch_to_srgb(fill);
				const ui = contrast(fill_rgb, oklch_to_srgb(shade_00));
				push_contrast(`${label}_50 vs shade_00`, ui, GATE_UI, scheme);
				const on_fill = contrast(text_max, fill_rgb);
				push_contrast(`text_max on ${label}_50`, on_fill, GATE_FILL_TEXT, scheme);
				if (text_00) {
					const selected = contrast(oklch_to_srgb(text_00), fill_rgb);
					push_contrast(`text_00 on ${label}_50`, selected, GATE_SELECTED_TEXT, scheme);
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

// the difference at which a recomputed cap is worth emitting; below this the
// baked table's ~1e-3 search slack would produce no-op overrides, and sub-JND
// chroma isn't worth an override
const CAP_EMIT_EPSILON = 0.002;

// the theme's effective hue set for cap recomputation: 10 letters plus any
// intent that resolves to a literal angle distinct from every letter
const collect_hues = (resolver: ThemeResolver, scheme: ColorSchemeVariant): Array<number> => {
	const hues: Array<number> = [];
	for (const letter of palette_variants) {
		const r = resolver.resolve(`hue_${letter}`, scheme);
		if (r.ok) hues.push(r.value);
	}
	for (const intent of intent_variants) {
		const r = resolver.resolve(`hue_${intent}`, scheme);
		if (r.ok && !hues.some((h) => Math.abs(h - r.value) < NUMERIC_EPSILON)) hues.push(r.value);
	}
	// with no resolvable hue at all, an empty set would yield Infinity caps and
	// emit garbage CSS - fall back to the default hues (the re-check still
	// reports the unresolvable pins)
	return hues.length ? hues : Object.values(PALETTE_HUES);
};

const resolve_lightness_knobs = (
	resolver: ThemeResolver,
	scheme: ColorSchemeVariant
): LightnessRampKnobs => {
	const l00 = resolver.resolve('palette_lightness_00', scheme);
	const l100 = resolver.resolve('palette_lightness_100', scheme);
	const curve = resolver.resolve('palette_lightness_curve', scheme);
	const fallback = PALETTE_LIGHTNESS_KNOBS[scheme];
	return {
		lightness_00: l00.ok ? l00.value : fallback.lightness_00,
		lightness_100: l100.ok ? l100.value : fallback.lightness_100,
		curve: curve.ok ? curve.value : fallback.curve
	};
};

/**
 * Recomputes a theme's per-stop worst-hue chroma caps from its own hues and
 * palette lightness ramp, then emits `palette_chroma_NN` overrides wherever
 * the baked caps no longer fit - the fix for a theme (rotated hues, a
 * monochrome collapse, a dark-only mirror) whose gamut headroom the baked
 * worst-hue table misjudges.
 *
 * A stop is emitted only when either scheme's recomputed cap drifts from the
 * baked value by more than the emit epsilon and the theme doesn't already pin
 * that stop. For a stanced theme both schemes resolve to the stanced
 * appearance, so the caps are computed once and baselined against the stanced
 * scheme's baked table - the values the stance mirror already re-slots - and
 * a stance alone (hues and lightness ramp unmoved) emits nothing. A dual theme's overrides emit both slots together so a
 * one-scheme override can't silently kill the base default's other slot by
 * cascade-layer order; a stanced theme's emit single-slot in the base
 * position (its two schemes resolve identically through the mirror), as do
 * slots whose rendered values coincide. A stanced theme's `scheme_mirror` is
 * recomputed over the emitted variables, so the output is render-ready even
 * when the input wasn't resolved. The input theme is never mutated. The
 * report re-checks the emitted theme, whose compiled-cap overrides the
 * resolution core recognizes.
 */
export const compile_theme = (theme: Theme): CompiledTheme => {
	const resolver = new ThemeResolver(theme);
	const stance = theme.scheme === 'light' || theme.scheme === 'dark' ? theme.scheme : null;

	const recompute = (scheme: ColorSchemeVariant): Record<NumericScaleVariant, number> =>
		compute_palette_chroma_caps(
			collect_hues(resolver, scheme),
			resolve_lightness_knobs(resolver, scheme)
		);
	// a stanced theme resolves both schemes to the stanced appearance through
	// the mirror, so compute the (expensive) gamut search once - and baseline
	// against the stanced scheme's baked caps: those are what the mirror
	// re-slots into the base position, so comparing against the light table
	// would emit no-op overrides duplicating the mirror for every dark stance
	const stance_caps = stance ? recompute(stance) : null;
	const recomputed: Record<ColorSchemeVariant, Record<NumericScaleVariant, number>> = {
		light: stance_caps ?? recompute('light'),
		dark: stance_caps ?? recompute('dark')
	};
	const baked: Record<ColorSchemeVariant, Record<NumericScaleVariant, number>> = {
		light: PALETTE_CHROMA_CAPS[stance ?? 'light'],
		dark: PALETTE_CHROMA_CAPS[stance ?? 'dark']
	};

	const cap_overrides: Array<StyleVariable> = [];
	for (const stop of numeric_scale_variants) {
		if (resolver.pinned(`palette_chroma_${stop}`)) continue; // respect the pin
		const light_cap = recomputed.light[stop];
		const dark_cap = recomputed.dark[stop];
		const light_drift = Math.abs(light_cap - baked.light[stop]);
		const dark_drift = Math.abs(dark_cap - baked.dark[stop]);
		if (light_drift > CAP_EMIT_EPSILON || dark_drift > CAP_EMIT_EPSILON) {
			const light_value = render_chroma_stop_css(stop, light_cap);
			const dark_value = render_chroma_stop_css(stop, dark_cap);
			cap_overrides.push(
				stance || light_value === dark_value
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
