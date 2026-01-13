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

	// State modifiers - interaction
	{name: 'hover', type: 'state', css: ':hover'},
	{name: 'focus', type: 'state', css: ':focus'},
	{name: 'focus-visible', type: 'state', css: ':focus-visible'},
	{name: 'focus-within', type: 'state', css: ':focus-within'},
	{name: 'active', type: 'state', css: ':active'},
	{name: 'visited', type: 'state', css: ':visited'},
	{name: 'target', type: 'state', css: ':target'},

	// State modifiers - form states
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
	{name: 'odd', type: 'state', css: ':nth-child(odd)'},
	{name: 'even', type: 'state', css: ':nth-child(even)'},
	{name: 'empty', type: 'state', css: ':empty'},
	// Note: nth-child(N) and nth-of-type(N) are handled dynamically via parse_parameterized_state

	// State modifiers - UI states
	{name: 'fullscreen', type: 'state', css: ':fullscreen'},
	{name: 'modal', type: 'state', css: ':modal'},
	{name: 'popover-open', type: 'state', css: ':popover-open'},

	// Pseudo-element modifiers
	{name: 'before', type: 'pseudo-element', css: '::before'},
	{name: 'after', type: 'pseudo-element', css: '::after'},
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
 * Pattern for arbitrary min-width breakpoints: `min-width(800px):`
 */
export const ARBITRARY_MIN_WIDTH_PATTERN = /^min-width\(([^)]+)\)$/;

/**
 * Pattern for arbitrary max-width breakpoints: `max-width(600px):`
 */
export const ARBITRARY_MAX_WIDTH_PATTERN = /^max-width\(([^)]+)\)$/;

/**
 * Pattern for parameterized nth-child: `nth-child(2n+1):`
 */
export const NTH_CHILD_PATTERN = /^nth-child\(([^)]+)\)$/;

/**
 * Pattern for parameterized nth-of-type: `nth-of-type(2n):`
 */
export const NTH_OF_TYPE_PATTERN = /^nth-of-type\(([^)]+)\)$/;

/**
 * Parses an arbitrary breakpoint modifier.
 *
 * @returns The CSS media query or null if not an arbitrary breakpoint
 */
export const parse_arbitrary_breakpoint = (segment: string): string | null => {
	const min_match = ARBITRARY_MIN_WIDTH_PATTERN.exec(segment);
	if (min_match) {
		return `@media (width >= ${min_match[1]})`;
	}

	const max_match = ARBITRARY_MAX_WIDTH_PATTERN.exec(segment);
	if (max_match) {
		return `@media (width < ${max_match[1]})`;
	}

	return null;
};

/**
 * Parses a parameterized state modifier (nth-child, nth-of-type).
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

	const nth_of_type_match = NTH_OF_TYPE_PATTERN.exec(segment);
	if (nth_of_type_match) {
		return {
			name: segment,
			css: `:nth-of-type(${nth_of_type_match[1]})`,
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
