/**
 * Declarative modifier definitions for CSS-literal syntax.
 *
 * Modifiers enable responsive, state-based, and contextual styling:
 * - Media modifiers: `md:`, `print:`, `motion-safe:`
 * - Ancestor modifiers: `dark:`, `light:`
 * - State modifiers: `hover:`, `focus:`, `disabled:`
 * - Pseudo-element modifiers: `before:`, `after:`
 *
 * @see {@link https://github.com/fuzdev/fuz_css} for documentation
 * @module
 */

/**
 * Type of modifier determining its position in the class name and CSS output.
 *
 * Order in class names: `[media:][ancestor:][state...:][pseudo-element:]property:value`
 */
export type ModifierType = 'media' | 'ancestor' | 'state' | 'pseudo-element';

/**
 * A `media` modifier's viewport width bound. Width bounds order the emitted
 * rules: `min` ascending, then `max` descending, so the narrower range wins
 * where two overlap.
 */
export interface ModifierWidthBound {
	bound: 'min' | 'max';
	/** A CSS length, or a function like `calc()` (ordered after plain lengths). */
	value: string;
}

/**
 * Definition for a single modifier.
 */
export interface ModifierDefinition {
	/** The prefix used in class names (e.g., 'hover', 'md', 'dark') */
	name: string;
	/** Type determines position in modifier order and CSS output behavior */
	type: ModifierType;
	/**
	 * The CSS the modifier contributes: the media condition for `media`
	 * (`(width >= 48rem)`, `print`), the selector suffix for `state` and
	 * `pseudo-element` (`:hover`, `::before`), and the color scheme for
	 * `ancestor` (`dark`).
	 */
	css: string;
	/** The width bound of a breakpoint `media` modifier. */
	width?: ModifierWidthBound;
	/** Cascade order among `state` modifiers (LVFHA), emitted ascending. */
	order?: number;
}

/**
 * Builds a breakpoint `media` modifier from its width bound.
 */
const to_width_modifier = (
	name: string,
	bound: 'min' | 'max',
	value: string
): ModifierDefinition => ({
	name,
	type: 'media',
	css: to_width_condition(bound, value),
	width: { bound, value }
});

const to_width_condition = (bound: 'min' | 'max', value: string): string =>
	bound === 'min' ? `(width >= ${value})` : `(width < ${value})`;

/**
 * All modifier definitions in a single declarative structure.
 * Adding a new modifier requires only adding to this array.
 */
export const MODIFIERS: Array<ModifierDefinition> = [
	// Media modifiers - viewport breakpoints (mobile-first)
	to_width_modifier('sm', 'min', '40rem'),
	to_width_modifier('md', 'min', '48rem'),
	to_width_modifier('lg', 'min', '64rem'),
	to_width_modifier('xl', 'min', '80rem'),
	to_width_modifier('2xl', 'min', '96rem'),

	// Max-width variants (for targeting below a breakpoint)
	to_width_modifier('max-sm', 'max', '40rem'),
	to_width_modifier('max-md', 'max', '48rem'),
	to_width_modifier('max-lg', 'max', '64rem'),
	to_width_modifier('max-xl', 'max', '80rem'),
	to_width_modifier('max-2xl', 'max', '96rem'),

	// Media modifiers - feature queries
	{ name: 'print', type: 'media', css: 'print' },
	{ name: 'motion-safe', type: 'media', css: '(prefers-reduced-motion: no-preference)' },
	{ name: 'motion-reduce', type: 'media', css: '(prefers-reduced-motion: reduce)' },
	{ name: 'contrast-more', type: 'media', css: '(prefers-contrast: more)' },
	{ name: 'contrast-less', type: 'media', css: '(prefers-contrast: less)' },
	{ name: 'portrait', type: 'media', css: '(orientation: portrait)' },
	{ name: 'landscape', type: 'media', css: '(orientation: landscape)' },
	{ name: 'forced-colors', type: 'media', css: '(forced-colors: active)' },

	// Ancestor modifiers - color scheme, set by the root class or followed
	// from the OS preference (see `render_color_scheme_rules`)
	{ name: 'dark', type: 'ancestor', css: 'dark' },
	{ name: 'light', type: 'ancestor', css: 'light' },
	// State modifiers - interaction (ordered for proper cascade: LVFHA)
	{ name: 'any-link', type: 'state', css: ':any-link' },
	{ name: 'link', type: 'state', css: ':link' },
	{ name: 'visited', type: 'state', css: ':visited', order: 1 },
	{ name: 'focus-within', type: 'state', css: ':focus-within', order: 2 },
	{ name: 'focus', type: 'state', css: ':focus', order: 3 },
	{ name: 'focus-visible', type: 'state', css: ':focus-visible', order: 4 },
	{ name: 'hover', type: 'state', css: ':hover', order: 5 },
	{ name: 'active', type: 'state', css: ':active', order: 6 },
	{ name: 'target', type: 'state', css: ':target', order: 7 },

	// State modifiers - form states
	{ name: 'autofill', type: 'state', css: ':autofill' },
	{ name: 'blank', type: 'state', css: ':blank' },
	{ name: 'disabled', type: 'state', css: ':disabled' },
	{ name: 'enabled', type: 'state', css: ':enabled' },
	{ name: 'checked', type: 'state', css: ':checked' },
	{ name: 'indeterminate', type: 'state', css: ':indeterminate' },
	{ name: 'default', type: 'state', css: ':default' },
	{ name: 'required', type: 'state', css: ':required' },
	{ name: 'optional', type: 'state', css: ':optional' },
	{ name: 'valid', type: 'state', css: ':valid' },
	{ name: 'invalid', type: 'state', css: ':invalid' },
	{ name: 'user-valid', type: 'state', css: ':user-valid' },
	{ name: 'user-invalid', type: 'state', css: ':user-invalid' },
	{ name: 'in-range', type: 'state', css: ':in-range' },
	{ name: 'out-of-range', type: 'state', css: ':out-of-range' },
	{ name: 'placeholder-shown', type: 'state', css: ':placeholder-shown' },
	{ name: 'read-only', type: 'state', css: ':read-only' },
	{ name: 'read-write', type: 'state', css: ':read-write' },

	// State modifiers - structural
	{ name: 'first', type: 'state', css: ':first-child' },
	{ name: 'last', type: 'state', css: ':last-child' },
	{ name: 'only', type: 'state', css: ':only-child' },
	{ name: 'first-of-type', type: 'state', css: ':first-of-type' },
	{ name: 'last-of-type', type: 'state', css: ':last-of-type' },
	{ name: 'only-of-type', type: 'state', css: ':only-of-type' },
	{ name: 'odd', type: 'state', css: ':nth-child(odd)' },
	{ name: 'even', type: 'state', css: ':nth-child(even)' },
	{ name: 'empty', type: 'state', css: ':empty' },
	// Note: nth-child(N), nth-last-child(N), nth-of-type(N), nth-last-of-type(N) are handled dynamically

	// State modifiers - UI states
	{ name: 'fullscreen', type: 'state', css: ':fullscreen' },
	{ name: 'modal', type: 'state', css: ':modal' },
	{ name: 'open', type: 'state', css: ':open' },
	{ name: 'popover-open', type: 'state', css: ':popover-open' },

	// State modifiers - media states
	{ name: 'paused', type: 'state', css: ':paused' },
	{ name: 'playing', type: 'state', css: ':playing' },

	// Pseudo-element modifiers
	{ name: 'before', type: 'pseudo-element', css: '::before' },
	{ name: 'after', type: 'pseudo-element', css: '::after' },
	{ name: 'cue', type: 'pseudo-element', css: '::cue' },
	{ name: 'first-letter', type: 'pseudo-element', css: '::first-letter' },
	{ name: 'first-line', type: 'pseudo-element', css: '::first-line' },
	{ name: 'placeholder', type: 'pseudo-element', css: '::placeholder' },
	{ name: 'selection', type: 'pseudo-element', css: '::selection' },
	{ name: 'marker', type: 'pseudo-element', css: '::marker' },
	{ name: 'file', type: 'pseudo-element', css: '::file-selector-button' },
	{ name: 'backdrop', type: 'pseudo-element', css: '::backdrop' }
];

// Generated lookup maps for efficient access

/** Map of media modifier names to their CSS output */
export const MEDIA_MODIFIERS: Map<string, ModifierDefinition> = new Map();
/** Map of ancestor modifier names to their CSS output */
export const ANCESTOR_MODIFIERS: Map<string, ModifierDefinition> = new Map();
/** Map of state modifier names to their CSS output */
export const STATE_MODIFIERS: Map<string, ModifierDefinition> = new Map();
/** Map of pseudo-element modifier names to their CSS output */
export const PSEUDO_ELEMENT_MODIFIERS: Map<string, ModifierDefinition> = new Map();
/**
 * All modifier names for quick lookup.
 *
 * @internal The lookup behind `get_all_modifier_names`.
 */
export const ALL_MODIFIER_NAMES: Set<string> = new Set();

for (const m of MODIFIERS) {
	ALL_MODIFIER_NAMES.add(m.name);
	if (m.type === 'media') MEDIA_MODIFIERS.set(m.name, m);
	else if (m.type === 'ancestor') ANCESTOR_MODIFIERS.set(m.name, m);
	else if (m.type === 'state') STATE_MODIFIERS.set(m.name, m);
	else if (m.type === 'pseudo-element') PSEUDO_ELEMENT_MODIFIERS.set(m.name, m);
}

// the nth patterns take an An+B argument (`odd`, `even`, `2n+1`, `-n+3`,
// `+5`), the only form a browser accepts there; it renders verbatim into the
// selector, and the grammar keeps it from ending it
const AN_PLUS_B = String.raw`(odd|even|[+-]?\d*n(?:[+-]\d+)?|[+-]?\d+)`;

/**
 * Pattern for parameterized nth-child: `nth-child(2n+1):`
 *
 * @internal Read by `get_modifier`; exported for its tests.
 */
export const NTH_CHILD_PATTERN = new RegExp(`^nth-child\\(${AN_PLUS_B}\\)$`);

/**
 * Pattern for parameterized nth-last-child: `nth-last-child(2n+1):`
 *
 * @internal Read by `get_modifier`; exported for its tests.
 */
export const NTH_LAST_CHILD_PATTERN = new RegExp(`^nth-last-child\\(${AN_PLUS_B}\\)$`);

/**
 * Pattern for parameterized nth-of-type: `nth-of-type(2n):`
 *
 * @internal Read by `get_modifier`; exported for its tests.
 */
export const NTH_OF_TYPE_PATTERN = new RegExp(`^nth-of-type\\(${AN_PLUS_B}\\)$`);

/**
 * Pattern for parameterized nth-last-of-type: `nth-last-of-type(2n):`
 *
 * @internal Read by `get_modifier`; exported for its tests.
 */
export const NTH_LAST_OF_TYPE_PATTERN = new RegExp(`^nth-last-of-type\\(${AN_PLUS_B}\\)$`);

/**
 * Extracts content from balanced parentheses after a prefix.
 * Supports nested parens for calc(), clamp(), min(), max(), etc.
 *
 * @param segment - the full segment to parse (e.g., "min-width(calc(100vw - 200px))")
 * @param prefix - the prefix before the opening paren (e.g., "min-width")
 * @returns the content inside the balanced parens, or null if no match/unbalanced
 *
 * @example
 * ```ts
 * extract_balanced_parens("min-width(800px)", "min-width") // "800px"
 * extract_balanced_parens("min-width(calc(100vw - 20px))", "min-width") // "calc(100vw - 20px)"
 * extract_balanced_parens("min-width(calc(100vw)", "min-width") // null (unbalanced)
 * ```
 */
export const extract_balanced_parens = (segment: string, prefix: string): string | null => {
	const expected_start = prefix + '(';
	if (!segment.startsWith(expected_start)) return null;

	let depth = 1;
	const start = expected_start.length;

	for (let i = start; i < segment.length; i++) {
		const char = segment[i];
		if (char === '(') {
			depth++;
		} else if (char === ')') {
			depth--;
			if (depth === 0) {
				// Must be at end of string (no trailing characters)
				if (i !== segment.length - 1) return null;
				const content = segment.slice(start, i);
				// Return null for empty content
				return content || null;
			}
		}
	}

	// Unbalanced - never closed
	return null;
};

// class names can't hold spaces, so `~` stands for one, as in literal values
const decode_spaces = (value: string): string => value.replaceAll('~', ' ');

/**
 * The length units a breakpoint takes: absolute, font-relative, viewport, and
 * container units, lowercase as class names write them. Percentages aren't
 * lengths in a media query, so browsers and minifiers reject them there.
 */
const BREAKPOINT_LENGTH_UNITS: ReadonlySet<string> = new Set(
	(
		'px cm mm q in pt pc em rem ex rex cap rcap ch rch ic ric lh rlh ' +
		'vw vh vi vb vmin vmax svw svh svi svb svmin svmax lvw lvh lvi lvb lvmin lvmax ' +
		'dvw dvh dvi dvb dvmin dvmax cqw cqh cqi cqb cqmin cqmax'
	).split(' ')
);

// a plain breakpoint length: `800px`, `50rem`, `1.5em`, `.5rem`, or a unitless `0`
const BREAKPOINT_LENGTH_MATCHER = /^(?:0|(?:\d+(?:\.\d+)?|\.\d+)([a-z]+))$/;

// the math functions a breakpoint may open with
const BREAKPOINT_FUNCTION_MATCHER = /^(?:calc|clamp|min|max)\(/;

// one token of a breakpoint math function: whitespace, a function opening, a
// number with its sign and unit, or a symbol
const BREAKPOINT_TOKEN_MATCHER =
	/\s+|(calc|clamp|min|max)\(|([+-]?(?:\d+(?:\.\d+)?|\.\d+))([a-z]*)|[-+*/(),]/y;

type BreakpointToken =
	| { kind: 'function'; name: string; spaced: boolean }
	| { kind: 'number'; value: number; unit: string; spaced: boolean }
	| { kind: 'symbol'; symbol: string; spaced: boolean };

// a math node's type; a number-typed node is a constant (`var()` isn't
// admitted), so it carries its folded value
type BreakpointMath = { type: 'number'; value: number } | { type: 'length' };

// `spaced` marks a token that follows whitespace
const tokenize_breakpoint_math = (value: string): Array<BreakpointToken> | null => {
	const tokens: Array<BreakpointToken> = [];
	let spaced = false;
	BREAKPOINT_TOKEN_MATCHER.lastIndex = 0;
	while (BREAKPOINT_TOKEN_MATCHER.lastIndex < value.length) {
		const match = BREAKPOINT_TOKEN_MATCHER.exec(value);
		if (!match) return null;
		const [text, name, number, unit] = match;
		if (/^\s/.test(text)) {
			spaced = true;
			continue;
		}
		if (name !== undefined) tokens.push({ kind: 'function', name, spaced });
		else if (number !== undefined) {
			tokens.push({ kind: 'number', value: Math.fround(Number(number)), unit: unit ?? '', spaced });
		} else tokens.push({ kind: 'symbol', symbol: text, spaced });
		spaced = false;
	}
	return tokens;
};

const is_symbol = (token: BreakpointToken | undefined, symbol: string): boolean =>
	token?.kind === 'symbol' && token.symbol === symbol;

/**
 * Checks a breakpoint math function (`calc()`, `clamp()`, `min()`, `max()`)
 * against the CSS math grammar, typed so the whole is a length: sums of
 * products of numbers, lengths, parenthesized sums, and nested functions,
 * with whitespace around a binary `+` or `-` as CSS requires (a class writes
 * it as `~`), `calc()` taking one argument and `clamp()` three, and no
 * product of two lengths or division by a length or by a number that
 * evaluates to zero at single precision. The grammar admits only digits, units, operators,
 * parens, commas, and spaces, so the value can't end the media query it
 * renders into.
 */
const breakpoint_math_is_valid = (value: string): boolean => {
	if (!BREAKPOINT_FUNCTION_MATCHER.test(value)) return false;
	const tokens = tokenize_breakpoint_math(value);
	if (!tokens) return false;
	let i = 0;

	const parse_value = (): BreakpointMath | null => {
		const token = tokens[i++];
		if (!token) return null;
		if (token.kind === 'number') {
			if (!token.unit) return { type: 'number', value: token.value };
			return BREAKPOINT_LENGTH_UNITS.has(token.unit) ? { type: 'length' } : null;
		}
		if (token.kind === 'symbol') {
			if (token.symbol !== '(') return null;
			const node = parse_sum();
			return node && is_symbol(tokens[i++], ')') ? node : null;
		}
		const args: Array<BreakpointMath> = [];
		for (;;) {
			const node = parse_sum();
			if (!node) return null;
			args.push(node);
			const separator = tokens[i++];
			if (is_symbol(separator, ')')) break;
			if (!is_symbol(separator, ',')) return null;
		}
		const arity = token.name === 'calc' ? 1 : token.name === 'clamp' ? 3 : null;
		if (arity !== null && args.length !== arity) return null;
		if (!args.every((node) => node.type === args[0]!.type)) return null;
		if (args[0]!.type === 'length') return args[0]!;
		const values = args.map((node) => (node as { value: number }).value);
		const value =
			token.name === 'calc'
				? values[0]!
				: token.name === 'min'
					? Math.min(...values)
					: token.name === 'max'
						? Math.max(...values)
						: Math.max(values[0]!, Math.min(values[1]!, values[2]!));
		return { type: 'number', value: Math.fround(value) };
	};

	const parse_product = (): BreakpointMath | null => {
		let node = parse_value();
		while (node && (is_symbol(tokens[i], '*') || is_symbol(tokens[i], '/'))) {
			const divide = is_symbol(tokens[i++], '/');
			const right = parse_value();
			if (!right) return null;
			if (divide) {
				// a divisor must be a number, and one that folds to zero fails the
				// math (each step rounds to single precision, as minifiers evaluate it)
				if (right.type !== 'number' || right.value === 0) return null;
				if (node.type === 'number') {
					node = { type: 'number', value: Math.fround(node.value / right.value) };
				}
			} else if (node.type === 'number' && right.type === 'number') {
				node = { type: 'number', value: Math.fround(node.value * right.value) };
			} else if (node.type === 'length' && right.type === 'length') {
				return null;
			} else {
				node = { type: 'length' };
			}
		}
		return node;
	};

	const parse_sum = (): BreakpointMath | null => {
		let node = parse_product();
		if (!node) return null;
		while (is_symbol(tokens[i], '+') || is_symbol(tokens[i], '-')) {
			if (!tokens[i]!.spaced || !tokens[i + 1]?.spaced) return null;
			const subtract = is_symbol(tokens[i++], '-');
			const right = parse_product();
			if (!right || right.type !== node.type) return null;
			if (node.type === 'number' && right.type === 'number') {
				node = {
					type: 'number',
					value: Math.fround(subtract ? node.value - right.value : node.value + right.value)
				};
			}
		}
		return node;
	};

	return parse_value()?.type === 'length' && i === tokens.length;
};

/**
 * Checks if a value is valid for an arbitrary breakpoint: a length with a
 * known unit (`800px`, `50rem`, a unitless `0`) or a math function of
 * lengths (see `breakpoint_math_is_valid`). A unitless number, a
 * percentage, and `env()` or `var()` aren't valid in a media query.
 */
const is_valid_breakpoint_value = (value: string): boolean => {
	const decoded = decode_spaces(value);
	const length = BREAKPOINT_LENGTH_MATCHER.exec(decoded);
	if (length) return length[1] === undefined || BREAKPOINT_LENGTH_UNITS.has(length[1]);
	return breakpoint_math_is_valid(decoded);
};

/**
 * Parses an arbitrary breakpoint modifier into its width bound.
 * The value is a length or a `calc()`, `clamp()`, `min()`, or `max()` of
 * lengths, with `~` for spaces; anything else isn't a breakpoint, since
 * browsers drop a media query whose value isn't a length.
 *
 * @returns the width bound, or null if not an arbitrary breakpoint
 *
 * @example
 * ```ts
 * parse_arbitrary_breakpoint("min-width(800px)") // {bound: 'min', value: '800px'}
 * parse_arbitrary_breakpoint("max-width(calc(100vw~-~200px))") // {bound: 'max', value: 'calc(100vw - 200px)'}
 * parse_arbitrary_breakpoint("min-width(px)") // null (invalid - no number)
 * parse_arbitrary_breakpoint("min-width(800)") // null (invalid - no unit)
 * ```
 */
export const parse_arbitrary_breakpoint = (segment: string): ModifierWidthBound | null => {
	const min_value = extract_balanced_parens(segment, 'min-width');
	if (min_value !== null && is_valid_breakpoint_value(min_value)) {
		return { bound: 'min', value: decode_spaces(min_value) };
	}

	const max_value = extract_balanced_parens(segment, 'max-width');
	if (max_value !== null && is_valid_breakpoint_value(max_value)) {
		return { bound: 'max', value: decode_spaces(max_value) };
	}

	return null;
};

/**
 * Describes the argument a parameterized modifier takes, for a segment shaped
 * like one (`min-width(...)`, `nth-child(...)`) whose argument isn't valid.
 *
 * @returns the hint, or null for a segment of any other shape
 */
export const to_modifier_argument_hint = (segment: string): string | null => {
	if (/^(?:min|max)-width\(/.test(segment)) {
		return 'A breakpoint takes a length (`800px`, `50rem`) or a `calc()`, `clamp()`, `min()`, or `max()` of lengths, with `~` for spaces - CSS requires them around `+` and `-`';
	}
	if (/^nth-(?:last-)?(?:child|of-type)\(/.test(segment)) {
		return 'An nth modifier takes An+B: `odd`, `even`, `3`, `2n`, `2n+1`, or `-n+3`';
	}
	return null;
};

/**
 * Parses a parameterized state modifier (nth-child, nth-last-child, nth-of-type, nth-last-of-type).
 *
 * @returns object with name (including parameter) and CSS, or null if not parameterized
 */
export const parse_parameterized_state = (
	segment: string
): { name: string; css: string; type: 'state' } | null => {
	const nth_child_match = NTH_CHILD_PATTERN.exec(segment);
	if (nth_child_match) {
		return {
			name: segment,
			css: `:nth-child(${nth_child_match[1]})`,
			type: 'state'
		};
	}

	const nth_last_child_match = NTH_LAST_CHILD_PATTERN.exec(segment);
	if (nth_last_child_match) {
		return {
			name: segment,
			css: `:nth-last-child(${nth_last_child_match[1]})`,
			type: 'state'
		};
	}

	const nth_of_type_match = NTH_OF_TYPE_PATTERN.exec(segment);
	if (nth_of_type_match) {
		return {
			name: segment,
			css: `:nth-of-type(${nth_of_type_match[1]})`,
			type: 'state'
		};
	}

	const nth_last_of_type_match = NTH_LAST_OF_TYPE_PATTERN.exec(segment);
	if (nth_last_of_type_match) {
		return {
			name: segment,
			css: `:nth-last-of-type(${nth_last_of_type_match[1]})`,
			type: 'state'
		};
	}

	return null;
};

/**
 * Gets the modifier definition for a segment.
 * Handles both static modifiers and dynamic patterns (arbitrary breakpoints, parameterized states).
 *
 * @returns the modifier definition or null if not a known modifier
 */
export const get_modifier = (
	segment: string
): (ModifierDefinition & { is_arbitrary?: boolean }) | null => {
	// Check static modifiers first
	const media = MEDIA_MODIFIERS.get(segment);
	if (media) return media;

	const ancestor = ANCESTOR_MODIFIERS.get(segment);
	if (ancestor) return ancestor;

	const state = STATE_MODIFIERS.get(segment);
	if (state) return state;

	const pseudo = PSEUDO_ELEMENT_MODIFIERS.get(segment);
	if (pseudo) return pseudo;

	// Check arbitrary breakpoints
	const arbitrary = parse_arbitrary_breakpoint(segment);
	if (arbitrary) {
		return { ...to_width_modifier(segment, arbitrary.bound, arbitrary.value), is_arbitrary: true };
	}

	// Check parameterized state modifiers
	const parameterized = parse_parameterized_state(segment);
	if (parameterized) {
		return {
			...parameterized,
			is_arbitrary: true
		};
	}

	return null;
};

/**
 * A width bound's length in px for ordering, or null for a value that can't
 * be compared statically (`calc()` and the like). `rem` and `em` are taken at
 * 16px, the initial font size media queries resolve them against.
 */
const to_width_px = (value: string): number | null => {
	const match = /^(\d*\.?\d+)(px|rem|em)$/.exec(value);
	if (!match) return null;
	const n = Number(match[1]);
	return match[2] === 'px' ? n : n * 16;
};

/**
 * Orders `media` modifiers for emission, so the later rule wins where two
 * apply: none first, then `min` width bounds ascending, then `max` width
 * bounds descending, then feature queries in registration order. Width
 * values that can't be compared statically sort after the comparable ones
 * of their bound, by value.
 */
export const compare_media_modifiers = (
	a: ModifierDefinition | null,
	b: ModifierDefinition | null
): number => {
	if (a === b) return 0;
	if (!a) return -1;
	if (!b) return 1;
	const rank_a = to_media_rank(a);
	const rank_b = to_media_rank(b);
	if (rank_a !== rank_b) return rank_a - rank_b;
	if (a.width && b.width) {
		const px_a = to_width_px(a.width.value);
		const px_b = to_width_px(b.width.value);
		if (px_a !== null && px_b !== null && px_a !== px_b) {
			return a.width.bound === 'min' ? px_a - px_b : px_b - px_a;
		}
		if (px_a === null && px_b !== null) return 1;
		if (px_b === null && px_a !== null) return -1;
		return a.width.value.localeCompare(b.width.value);
	}
	return MEDIA_ORDER.get(a.name)! - MEDIA_ORDER.get(b.name)!;
};

// min-width bounds, then max-width bounds, then feature queries
const to_media_rank = (m: ModifierDefinition): number =>
	m.width ? (m.width.bound === 'min' ? 0 : 1) : 2;

// registration order of the feature-query media modifiers
const MEDIA_ORDER: Map<string, number> = new Map(
	MODIFIERS.filter((m) => m.type === 'media').map((m, i) => [m.name, i])
);

/**
 * Gets all modifier names for error message suggestions.
 */
export const get_all_modifier_names = (): Array<string> => {
	return Array.from(ALL_MODIFIER_NAMES).sort();
};
