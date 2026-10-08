/**
 * `validate_theme`, the structural lint for themes: the `Theme` schema, known
 * variable names, and advisory type/range warnings for the knob-tier
 * variables, plus the accent-separation and binding-pairing lints, all read
 * through the resolution core in `theme_resolver.ts`.
 *
 * @module
 */

import { Theme } from './variable.ts';
import { to_theme_stance } from './theme.ts';
import { default_variables } from './variables.ts';
import { theme_knob_by_name, theme_knob_hook_names, type ThemeKnob } from './knobs.ts';
import { palette_variants, intent_variants, color_scheme_variants } from './variable_data.ts';
import {
	CSS_NUMBER_PATTERN,
	INTENT_HUE_DEFAULT_BINDING,
	NUMERIC_EPSILON,
	PALETTE_LETTER_MATCHER,
	SCALED_VAR_MATCHER,
	ThemeResolver,
	VAR_MATCHER,
	parse_css_number
} from './theme_resolver.ts';

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

/**
 * The variable names a theme may set: the declared defaults plus the hook
 * knobs `style.css` consumes through `var()` fallbacks. The authoring-side
 * companion to `validate_theme`, for tooling that completes or checks names
 * before a theme is assembled.
 */
export const known_theme_variable_names: ReadonlySet<string> = new Set([
	...default_variables.map((v) => v.name),
	...theme_knob_hook_names
]);

//
// validate_theme - the structural lint.
//

const PERCENT_MATCHER = new RegExp(`^(${CSS_NUMBER_PATTERN})%$`, 'u');
const TIME_MATCHER = new RegExp(`^(${CSS_NUMBER_PATTERN})(s|ms)$`, 'u');

const validate_knob_value = (
	knob: ThemeKnob,
	value: string,
	variable: string,
	slot: string
): Array<ThemeIssue> => {
	const issues: Array<ThemeIssue> = [];
	const trimmed = value.trim();
	const number = parse_css_number(trimmed);
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
			if (number === null && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a numeric value`,
					variable
				});
			} else if (number !== null) {
				check_range(number);
			}
			break;
		}
		case 'percent': {
			// the CSS form (`60%`), which is what the defaults declare and the
			// editor writes; the range is in percent units
			const percent_match = PERCENT_MATCHER.exec(trimmed);
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
			if (number === null && !is_reference) {
				issues.push({
					level: 'warning',
					message: `${variable} ${slot} "${value}" is not a hue angle or var() binding`,
					variable
				});
			} else if (number !== null) {
				check_range(number);
			}
			break;
		}
		case 'time': {
			// seconds or milliseconds; the range is in seconds
			const time_match = TIME_MATCHER.exec(trimmed);
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
	const stance = to_theme_stance(scheme);
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
	issues.push(...validate_binding_pairing(resolver));
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
	const stance = to_theme_stance(theme.scheme);
	const schemes = stance ? [stance] : color_scheme_variants;
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
const validate_binding_pairing = (resolver: ThemeResolver): Array<ThemeIssue> => {
	const issues: Array<ThemeIssue> = [];
	for (const intent of intent_variants) {
		const hue_name = `hue_${intent}`;
		const default_letter = INTENT_HUE_DEFAULT_BINDING[hue_name]!.slice('hue_'.length);
		for (const scheme of color_scheme_variants) {
			// each scheme binds through its own effective slot, so a theme that
			// binds a muted letter in only one scheme still gets the warning
			const slot = resolver.authored(hue_name, scheme);
			// the reference form the resolver follows, so the lint sees every
			// binding the gates do
			const bound = slot === undefined ? undefined : VAR_MATCHER.exec(slot.trim())?.[1];
			const letter =
				slot === undefined
					? default_letter
					: bound === undefined
						? undefined
						: PALETTE_LETTER_MATCHER.exec(bound)?.[1];
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
