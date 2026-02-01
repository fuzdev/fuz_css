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
 * Definition for a single modifier.
 */
export interface ModifierDefinition {
	/** The prefix used in class names (e.g., 'hover', 'md', 'dark') */
	name: string;
	/** Type determines position in modifier order and CSS output behavior */
	type: ModifierType;
	/** The CSS output - wrapper for media/ancestor, suffix for state/pseudo-element */
	css: string;
	/** Optional ordering within type (for breakpoints, sorted by this value) */
	order?: number;
}

/**
 * All modifier definitions in a single declarative structure.
 * Adding a new modifier requires only adding to this array.
 */
export const MODIFIERS: Array<ModifierDefinition> = [
	// Media modifiers - viewport breakpoints (mobile-first)
	{name: 'sm', type: 'media', css: '@media (width >= 40rem)', order: 1},
	{name: 'md', type: 'media', css: '@media (width >= 48rem)', order: 2},
	{name: 'lg', type: 'media', css: '@media (width >= 64rem)', order: 3},
	{name: 'xl', type: 'media', css: '@media (width >= 80rem)', order: 4},
	{name: '2xl', type: 'media', css: '@media (width >= 96rem)', order: 5},

	// Max-width variants (for targeting below a breakpoint)
	{name: 'max-sm', type: 'media', css: '@media (width < 40rem)', order: 11},
	{name: 'max-md', type: 'media', css: '@media (width < 48rem)', order: 12},
	{name: 'max-lg', type: 'media', css: '@media (width < 64rem)', order: 13},
	{name: 'max-xl', type: 'media', css: '@media (width < 80rem)', order: 14},
	{name: 'max-2xl', type: 'media', css: '@media (width < 96rem)', order: 15},

	// Media modifiers - feature queries
	{name: 'print', type: 'media', css: '@media print'},
	{name: 'motion-safe', type: 'media', css: '@media (prefers-reduced-motion: no-preference)'},
	{name: 'motion-reduce', type: 'media', css: '@media (prefers-reduced-motion: reduce)'},
	{name: 'contrast-more', type: 'media', css: '@media (prefers-contrast: more)'},
	{name: 'contrast-less', type: 'media', css: '@media (prefers-contrast: less)'},
	{name: 'portrait', type: 'media', css: '@media (orientation: portrait)'},
	{name: 'landscape', type: 'media', css: '@media (orientation: landscape)'},
	{name: 'forced-colors', type: 'media', css: '@media (forced-colors: active)'},

	// Ancestor modifiers - color scheme
	{name: 'dark', type: 'ancestor', css: ':root.dark'},
	{name: 'light', type: 'ancestor', css: ':root.light'},

	// State modifiers - interaction (ordered for proper cascade: LVFHA)
	{name: 'any-link', type: 'state', css: ':any-link'},
	{name: 'link', type: 'state', css: ':link'},
	{name: 'visited', type: 'state', css: ':visited', order: 1},
	{name: 'focus-within', type: 'state', css: ':focus-within', order: 2},
	{name: 'focus', type: 'state', css: ':focus', order: 3},
	{name: 'focus-visible', type: 'state', css: ':focus-visible', order: 4},
	{name: 'hover', type: 'state', css: ':hover', order: 5},
	{name: 'active', type: 'state', css: ':active', order: 6},
	{name: 'target', type: 'state', css: ':target', order: 7},

	// State modifiers - form states
	{name: 'autofill', type: 'state', css: ':autofill'},
	{name: 'blank', type: 'state', css: ':blank'},
	{name: 'disabled', type: 'state', css: ':disabled'},
	{name: 'enabled', type: 'state', css: ':enabled'},
	{name: 'checked', type: 'state', css: ':checked'},
	{name: 'indeterminate', type: 'state', css: ':indeterminate'},
	{name: 'default', type: 'state', css: ':default'},
	{name: 'required', type: 'state', css: ':required'},
	{name: 'optional', type: 'state', css: ':optional'},
	{name: 'valid', type: 'state', css: ':valid'},
	{name: 'invalid', type: 'state', css: ':invalid'},
	{name: 'user-valid', type: 'state', css: ':user-valid'},
	{name: 'user-invalid', type: 'state', css: ':user-invalid'},
	{name: 'in-range', type: 'state', css: ':in-range'},
	{name: 'out-of-range', type: 'state', css: ':out-of-range'},
	{name: 'placeholder-shown', type: 'state', css: ':placeholder-shown'},
	{name: 'read-only', type: 'state', css: ':read-only'},
	{name: 'read-write', type: 'state', css: ':read-write'},

	// State modifiers - structural
	{name: 'first', type: 'state', css: ':first-child'},
	{name: 'last', type: 'state', css: ':last-child'},
	{name: 'only', type: 'state', css: ':only-child'},
	{name: 'first-of-type', type: 'state', css: ':first-of-type'},
	{name: 'last-of-type', type: 'state', css: ':last-of-type'},
	{name: 'only-of-type', type: 'state', css: ':only-of-type'},
	{name: 'odd', type: 'state', css: ':nth-child(odd)'},
	{name: 'even', type: 'state', css: ':nth-child(even)'},
	{name: 'empty', type: 'state', css: ':empty'},
	// Note: nth-child(N), nth-last-child(N), nth-of-type(N), nth-last-of-type(N) are handled dynamically

	// State modifiers - UI states
	{name: 'fullscreen', type: 'state', css: ':fullscreen'},
	{name: 'modal', type: 'state', css: ':modal'},
	{name: 'open', type: 'state', css: ':open'},
	{name: 'popover-open', type: 'state', css: ':popover-open'},

	// State modifiers - media states
	{name: 'paused', type: 'state', css: ':paused'},
	{name: 'playing', type: 'state', css: ':playing'},

	// Pseudo-element modifiers
	{name: 'before', type: 'pseudo-element', css: '::before'},
	{name: 'after', type: 'pseudo-element', css: '::after'},
	{name: 'cue', type: 'pseudo-element', css: '::cue'},
	{name: 'first-letter', type: 'pseudo-element', css: '::first-letter'},
	{name: 'first-line', type: 'pseudo-element', css: '::first-line'},
	{name: 'placeholder', type: 'pseudo-element', css: '::placeholder'},
	{name: 'selection', type: 'pseudo-element', css: '::selection'},
	{name: 'marker', type: 'pseudo-element', css: '::marker'},
	{name: 'file', type: 'pseudo-element', css: '::file-selector-button'},
	{name: 'backdrop', type: 'pseudo-element', css: '::backdrop'},
];

// Generated lookup maps for efficient access

/** Map of media modifier names to their CSS output */
export const MEDIA_MODIFIERS: Map<string, ModifierDefinition> = new Map(
	MODIFIERS.filter((m) => m.type === 'media').map((m) => [m.name, m]),
);

/** Map of ancestor modifier names to their CSS output */
export const ANCESTOR_MODIFIERS: Map<string, ModifierDefinition> = new Map(
	MODIFIERS.filter((m) => m.type === 'ancestor').map((m) => [m.name, m]),
);

/** Map of state modifier names to their CSS output */
export const STATE_MODIFIERS: Map<string, ModifierDefinition> = new Map(
	MODIFIERS.filter((m) => m.type === 'state').map((m) => [m.name, m]),
);

/** Map of pseudo-element modifier names to their CSS output */
export const PSEUDO_ELEMENT_MODIFIERS: Map<string, ModifierDefinition> = new Map(
	MODIFIERS.filter((m) => m.type === 'pseudo-element').map((m) => [m.name, m]),
);

/** All modifier names for quick lookup */
export const ALL_MODIFIER_NAMES: Set<string> = new Set(MODIFIERS.map((m) => m.name));

/**
 * Pattern for parameterized nth-child: `nth-child(2n+1):`
 */
export const NTH_CHILD_PATTERN = /^nth-child\(([^)]+)\)$/;

/**
 * Pattern for parameterized nth-last-child: `nth-last-child(2n+1):`
 */
export const NTH_LAST_CHILD_PATTERN = /^nth-last-child\(([^)]+)\)$/;

/**
 * Pattern for parameterized nth-of-type: `nth-of-type(2n):`
 */
export const NTH_OF_TYPE_PATTERN = /^nth-of-type\(([^)]+)\)$/;

/**
 * Pattern for parameterized nth-last-of-type: `nth-last-of-type(2n):`
 */
export const NTH_LAST_OF_TYPE_PATTERN = /^nth-last-of-type\(([^)]+)\)$/;

/**
 * Extracts content from balanced parentheses after a prefix.
 * Supports nested parens for calc(), clamp(), min(), max(), etc.
 *
 * @param segment - The full segment to parse (e.g., "min-width(calc(100vw - 200px))")
 * @param prefix - The prefix before the opening paren (e.g., "min-width")
 * @returns The content inside the balanced parens, or null if no match/unbalanced
 *
 * @example
 * extract_balanced_parens("min-width(800px)", "min-width") // "800px"
 * extract_balanced_parens("min-width(calc(100vw - 20px))", "min-width") // "calc(100vw - 20px)"
 * extract_balanced_parens("min-width(calc(100vw)", "min-width") // null (unbalanced)
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

/**
 * Known CSS functions that are valid in media query values.
 * These don't start with digits but are valid starts for breakpoint values.
 *
 * Note: `var()` is intentionally excluded - CSS custom properties are NOT
 * supported in media queries (they're evaluated before variables resolve).
 */
const CSS_FUNCTION_PREFIXES = ['calc(', 'clamp(', 'min(', 'max(', 'env('];

/**
 * Checks if a value is valid for an arbitrary breakpoint.
 * Must start with a digit or a known CSS function.
 */
const is_valid_breakpoint_value = (value: string): boolean => {
	if (!value) return false;
	// Allow values starting with a digit (e.g., "800px", "50rem")
	if (/^\d/.test(value)) return true;
	// Allow known CSS functions (e.g., "calc(...)", "clamp(...)")
	return CSS_FUNCTION_PREFIXES.some((prefix) => value.startsWith(prefix));
};

/**
 * Parses an arbitrary breakpoint modifier.
 * Supports nested parentheses for calc(), clamp(), min(), max(), var().
 * Requires value to start with a digit or known CSS function to catch obvious mistakes.
 *
 * @returns The CSS media query or null if not an arbitrary breakpoint
 *
 * @example
 * parse_arbitrary_breakpoint("min-width(800px)") // "@media (width >= 800px)"
 * parse_arbitrary_breakpoint("min-width(calc(100vw - 200px))") // "@media (width >= calc(100vw - 200px))"
 * parse_arbitrary_breakpoint("min-width(px)") // null (invalid - no digit or function)
 */
export const parse_arbitrary_breakpoint = (segment: string): string | null => {
	const min_value = extract_balanced_parens(segment, 'min-width');
	if (min_value !== null && is_valid_breakpoint_value(min_value)) {
		return `@media (width >= ${min_value})`;
	}

	const max_value = extract_balanced_parens(segment, 'max-width');
	if (max_value !== null && is_valid_breakpoint_value(max_value)) {
		return `@media (width < ${max_value})`;
	}

	return null;
};

/**
 * Parses a parameterized state modifier (nth-child, nth-last-child, nth-of-type, nth-last-of-type).
 *
 * @returns Object with name (including parameter) and CSS, or null if not parameterized
 */
export const parse_parameterized_state = (
	segment: string,
): {name: string; css: string; type: 'state'} | null => {
	const nth_child_match = NTH_CHILD_PATTERN.exec(segment);
	if (nth_child_match) {
		return {
			name: segment,
			css: `:nth-child(${nth_child_match[1]})`,
			type: 'state',
		};
	}

	const nth_last_child_match = NTH_LAST_CHILD_PATTERN.exec(segment);
	if (nth_last_child_match) {
		return {
			name: segment,
			css: `:nth-last-child(${nth_last_child_match[1]})`,
			type: 'state',
		};
	}

	const nth_of_type_match = NTH_OF_TYPE_PATTERN.exec(segment);
	if (nth_of_type_match) {
		return {
			name: segment,
			css: `:nth-of-type(${nth_of_type_match[1]})`,
			type: 'state',
		};
	}

	const nth_last_of_type_match = NTH_LAST_OF_TYPE_PATTERN.exec(segment);
	if (nth_last_of_type_match) {
		return {
			name: segment,
			css: `:nth-last-of-type(${nth_last_of_type_match[1]})`,
			type: 'state',
		};
	}

	return null;
};

/**
 * Gets the modifier definition for a segment.
 * Handles both static modifiers and dynamic patterns (arbitrary breakpoints, parameterized states).
 *
 * @returns The modifier definition or null if not a known modifier
 */
export const get_modifier = (
	segment: string,
): (ModifierDefinition & {is_arbitrary?: boolean}) | null => {
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
	const arbitrary_css = parse_arbitrary_breakpoint(segment);
	if (arbitrary_css) {
		return {
			name: segment,
			type: 'media',
			css: arbitrary_css,
			is_arbitrary: true,
		};
	}

	// Check parameterized state modifiers
	const parameterized = parse_parameterized_state(segment);
	if (parameterized) {
		return {
			...parameterized,
			is_arbitrary: true,
		};
	}

	return null;
};

/**
 * Gets all modifier names for error message suggestions.
 */
export const get_all_modifier_names = (): Array<string> => {
	return Array.from(ALL_MODIFIER_NAMES).sort();
};
