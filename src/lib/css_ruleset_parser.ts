/**
 * CSS ruleset parser using Svelte's CSS parser.
 *
 * Parses CSS rulesets to extract selectors and declarations with position information.
 * Used for:
 * - Phase 0a: Detecting single-selector rulesets that could be converted to declaration format
 * - Phase 2: Modifying selectors for modifier support on composite classes
 *
 * @module
 */

import {escape_regexp} from '@fuzdev/fuz_util/regexp.js';
import {parseCss, type AST} from 'svelte/compiler';

//
// Parsing
//

/**
 * A parsed CSS rule with its components and positions.
 */
export interface ParsedRule {
	/** Full selector string (e.g., ".box", ".selectable:hover") */
	selector: string;
	/** Start position of selector in original CSS (0-indexed) */
	selector_start: number;
	/** End position of selector in original CSS */
	selector_end: number;
	/** The declarations block (without braces) */
	declarations: string;
	/** Start position of the entire rule */
	rule_start: number;
	/** End position of the entire rule */
	rule_end: number;
}

/**
 * Result of parsing a CSS ruleset.
 */
export interface ParsedRuleset {
	/** All rules in the ruleset */
	rules: Array<ParsedRule>;
}

/**
 * Parses a CSS ruleset string using Svelte's CSS parser.
 *
 * @param css - raw CSS string (e.g., ".box { display: flex; }")
 * @returns `ParsedRuleset` with structured rule data and positions
 */
export const parse_ruleset = (css: string): ParsedRuleset => {
	const ast = parseCss(css);
	const rules: Array<ParsedRule> = [];

	// Walk the CSS AST to find rules
	walk_css_children(ast, css, rules);

	return {rules};
};

/**
 * Walks CSS AST children to extract rules.
 * @mutates rules - pushes extracted rules to the array
 */
const walk_css_children = (
	node: Omit<AST.CSS.StyleSheet, 'attributes' | 'content'> | AST.CSS.Atrule,
	original_css: string,
	rules: Array<ParsedRule>,
): void => {
	const children = 'children' in node ? node.children : [];

	for (const child of children) {
		if (child.type === 'Rule') {
			extract_rule(child, original_css, rules);
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		} else if (child.type === 'Atrule' && child.block) {
			// Recurse into at-rules (like @media) - rules are in block.children
			walk_css_block(child.block, original_css, rules);
		}
	}
};

/**
 * Walks a CSS block (from an at-rule) to extract rules.
 * @mutates rules - pushes extracted rules to the array
 */
const walk_css_block = (
	block: AST.CSS.Block,
	original_css: string,
	rules: Array<ParsedRule>,
): void => {
	for (const child of block.children) {
		if (child.type === 'Rule') {
			extract_rule(child, original_css, rules);
		} else if (child.type === 'Atrule' && child.block) {
			// Handle nested at-rules
			walk_css_block(child.block, original_css, rules);
		}
	}
};

/**
 * Extracts a single rule from the AST.
 * @mutates rules - pushes the extracted rule to the array
 */
const extract_rule = (rule: AST.CSS.Rule, original_css: string, rules: Array<ParsedRule>): void => {
	const prelude = rule.prelude;

	// Get the full selector text from the original CSS
	const selector_start = prelude.start;
	const selector_end = prelude.end;
	const selector = original_css.slice(selector_start, selector_end);

	// Get declarations from the block
	const block = rule.block;
	const block_start = block.start;
	const block_end = block.end;

	// Extract just the declarations (content between braces)
	const block_content = original_css.slice(block_start, block_end);
	const declarations = block_content.slice(1, -1).trim(); // Remove { } and trim

	rules.push({
		selector,
		selector_start,
		selector_end,
		declarations,
		rule_start: rule.start,
		rule_end: rule.end,
	});
};

/**
 * Checks if a ruleset has only a single simple selector (just the class name).
 * Used to detect rulesets that could be converted to declaration format.
 *
 * @param rules - parsed rules from the ruleset
 * @param escaped_class_name - the CSS-escaped class name (e.g., "box" or "hover\\:card")
 * @returns true if there's exactly one rule with selector ".class_name"
 */
export const is_single_selector_ruleset = (
	rules: Array<ParsedRule>,
	escaped_class_name: string,
): boolean => {
	if (rules.length !== 1) return false;

	const rule = rules[0]!;
	const expected_selector = `.${escaped_class_name}`;

	// Normalize whitespace in selector for comparison
	const normalized_selector = rule.selector.trim();

	return normalized_selector === expected_selector;
};

/**
 * Checks if any selector in the ruleset contains the expected class name.
 * Used to validate that ruleset definitions match their key.
 *
 * @param rules - parsed rules from the ruleset
 * @param escaped_class_name - the CSS-escaped class name (e.g., "clickable" or "hover\\:card")
 * @returns true if at least one selector contains ".class_name"
 */
export const ruleset_contains_class = (
	rules: Array<ParsedRule>,
	escaped_class_name: string,
): boolean => {
	// Match .class_name but not as part of another class (e.g., .class_name_foo)
	const pattern = new RegExp(`\\.${escape_regexp(escaped_class_name)}(?![\\w-])`);
	return rules.some((rule) => pattern.test(rule.selector));
};

/**
 * Extracts the CSS comment from a ruleset (if any).
 * Looks for comments before the first rule.
 *
 * @param css - raw CSS string
 * @param rules - parsed rules
 * @returns comment text without delimiters, or null if no comment
 */
export const extract_css_comment = (css: string, rules: Array<ParsedRule>): string | null => {
	if (rules.length === 0) return null;

	const first_rule_start = rules[0]!.rule_start;
	const before_rule = css.slice(0, first_rule_start).trim();

	// Check for /* */ comment
	const comment_pattern = /\/\*\s*([\s\S]*?)\s*\*\//;
	const comment_match = comment_pattern.exec(before_rule);
	if (comment_match) {
		return comment_match[1]!.trim();
	}

	return null;
};

//
// Selector Modification
//

/**
 * Information about a modifier that was skipped for a selector during ruleset modification.
 * The selector is still included in output, just without the conflicting modifier applied.
 */
export interface SkippedModifierInfo {
	/** The specific selector where the modifier was skipped (not the full selector list) */
	selector: string;
	/** Reason the modifier was skipped */
	reason: 'pseudo_element_conflict' | 'state_conflict';
	/** The conflicting modifier that was not applied (e.g., "::before" or ":hover") */
	conflicting_modifier: string;
}

/**
 * Result from modifying a selector group with conflict detection.
 *
 * Uses `| null` for skipped_modifiers to avoid allocating empty arrays.
 * Callers should use a guard pattern: `if (result.skipped_modifiers) { ... }`
 */
export interface ModifiedSelectorGroupResult {
	/** The modified selector list as a string */
	selector: string;
	/** Information about modifiers skipped for specific selectors, or null if none */
	skipped_modifiers: Array<SkippedModifierInfo> | null;
}

/**
 * Result from generating a modified ruleset.
 *
 * Uses `| null` for skipped_modifiers to avoid allocating empty arrays.
 * Callers should use a guard pattern: `if (result.skipped_modifiers) { ... }`
 */
export interface ModifiedRulesetResult {
	/** The generated CSS */
	css: string;
	/** Information about modifiers that were skipped for certain rules, or null if none */
	skipped_modifiers: Array<SkippedModifierInfo> | null;
}

/**
 * Skips an identifier (class name, pseudo-class name, etc.) starting at `start`.
 *
 * @returns new position after the identifier
 */
const skip_identifier = (selector: string, start: number): number => {
	let pos = start;
	while (pos < selector.length && /[\w-]/.test(selector[pos]!)) {
		pos++;
	}
	return pos;
};

/**
 * CSS2 pseudo-elements that use single-colon syntax.
 * CSS3 uses double-colon (::before) but CSS2 syntax (:before) is still valid.
 */
const CSS2_PSEUDO_ELEMENTS = /:(before|after|first-letter|first-line)(?![\w-])/;

/**
 * Checks if a selector contains a pseudo-element (::before, ::after, etc.).
 * Also detects CSS2 single-colon syntax (:before, :after, :first-letter, :first-line).
 */
const selector_has_pseudo_element = (selector: string): boolean => {
	return selector.includes('::') || CSS2_PSEUDO_ELEMENTS.test(selector);
};

/**
 * Checks if a selector already contains a specific state pseudo-class.
 * Handles functional pseudo-classes like :not(:hover) by checking for the state
 * both as a direct pseudo-class and within functional pseudo-classes.
 *
 * Uses regex to avoid false positives where a state is a prefix of another state:
 * - `:focus` should NOT match `:focus-within` or `:focus-visible`
 * - `:hover` should NOT match `[data-hover="true"]` (attribute value)
 *
 * @param selector - the CSS selector to check
 * @param state - the state to look for (e.g., ":hover", ":focus")
 * @returns true if the selector already contains this state
 */
const selector_has_state = (selector: string, state: string): boolean => {
	// Match the state exactly, not when followed by word characters or hyphens
	// e.g., `:focus` matches `:focus` and `:focus)` but not `:focus-within`
	const pattern = new RegExp(escape_regexp(state) + '(?![\\w-])');
	return pattern.test(selector);
};

/**
 * Splits a selector list by commas, respecting parentheses, brackets, and quoted strings.
 *
 * @example
 * ```ts
 * split_selector_list('.a, .b') // → ['.a', '.b']
 * split_selector_list('.a:not(.b), .c') // → ['.a:not(.b)', '.c']
 * split_selector_list('.a[data-x="a,b"], .c') // → ['.a[data-x="a,b"]', '.c']
 * ```
 */
export const split_selector_list = (selector_group: string): Array<string> => {
	const selectors: Array<string> = [];
	let current = '';
	let paren_depth = 0;
	let bracket_depth = 0;
	let in_string: '"' | "'" | null = null;

	for (let i = 0; i < selector_group.length; i++) {
		const char = selector_group[i]!;
		const prev_char = i > 0 ? selector_group[i - 1] : '';

		// Handle string boundaries (but not escaped quotes)
		if ((char === '"' || char === "'") && prev_char !== '\\') {
			if (in_string === null) {
				in_string = char;
			} else if (in_string === char) {
				in_string = null;
			}
			current += char;
		} else if (in_string !== null) {
			// Inside a string - just accumulate
			current += char;
		} else if (char === '(') {
			paren_depth++;
			current += char;
		} else if (char === ')') {
			paren_depth--;
			current += char;
		} else if (char === '[') {
			bracket_depth++;
			current += char;
		} else if (char === ']') {
			bracket_depth--;
			current += char;
		} else if (char === ',' && paren_depth === 0 && bracket_depth === 0) {
			selectors.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		selectors.push(current.trim());
	}

	return selectors;
};

/**
 * Finds the end position of the compound selector containing the class at class_pos.
 * A compound selector is a sequence of simple selectors without combinators.
 *
 * @param selector - the CSS selector string
 * @param class_pos - position of the `.` in `.class_name`
 * @returns position where state modifiers should be inserted (before any pseudo-element)
 */
export const find_compound_end = (selector: string, class_pos: number): number => {
	let pos = class_pos + 1; // Skip the dot
	pos = skip_identifier(selector, pos); // Skip the class name

	// Continue scanning while we see parts of the same compound selector
	while (pos < selector.length) {
		const char = selector[pos]!;

		if (char === '.') {
			// Another class - skip it
			pos++;
			pos = skip_identifier(selector, pos);
		} else if (char === '#') {
			// ID selector - skip it
			pos++;
			pos = skip_identifier(selector, pos);
		} else if (char === '[') {
			// Attribute selector - find matching ], respecting quoted strings
			pos++; // Skip [
			let in_string: '"' | "'" | null = null;
			while (pos < selector.length) {
				const c = selector[pos]!;
				const prev = pos > 0 ? selector[pos - 1] : '';
				if ((c === '"' || c === "'") && prev !== '\\') {
					if (in_string === null) {
						in_string = c;
					} else if (in_string === c) {
						in_string = null;
					}
				} else if (c === ']' && in_string === null) {
					pos++; // Skip ]
					break;
				}
				pos++;
			}
		} else if (char === ':') {
			// Pseudo-class or pseudo-element
			if (selector[pos + 1] === ':') {
				// CSS3 pseudo-element (::before) - stop here (state comes before pseudo-element)
				break;
			}
			// Check for CSS2 pseudo-elements (:before, :after, :first-letter, :first-line)
			const rest = selector.slice(pos);
			if (CSS2_PSEUDO_ELEMENTS.test(rest)) {
				// CSS2 pseudo-element - stop here
				break;
			}
			// Pseudo-class - skip it (including functional ones like :not())
			pos++; // Skip :
			pos = skip_identifier(selector, pos);
			if (pos < selector.length && selector[pos] === '(') {
				// Functional pseudo-class - find matching )
				let paren_depth = 1;
				pos++;
				while (pos < selector.length && paren_depth > 0) {
					if (selector[pos] === '(') paren_depth++;
					else if (selector[pos] === ')') paren_depth--;
					pos++;
				}
			}
		} else {
			// Hit whitespace, combinator, or something else - compound ends here
			break;
		}
	}

	return pos;
};

/**
 * Modifies a single CSS selector to add modifiers.
 *
 * @param selector - a single CSS selector (not a selector list)
 * @param original_class - the base class name (e.g., "menu_item")
 * @param new_class_escaped - the escaped new class name (e.g., "hover\\:menu_item")
 * @param state_css - state modifier CSS to insert (e.g., ":hover")
 * @param pseudo_element_css - pseudo-element modifier CSS to insert (e.g., "::before")
 * @returns modified selector
 *
 * @example
 * ```ts
 * modify_single_selector('.menu_item', 'menu_item', 'hover\\:menu_item', ':hover', '')
 * // → '.hover\\:menu_item:hover'
 *
 * modify_single_selector('.menu_item .icon', 'menu_item', 'hover\\:menu_item', ':hover', '')
 * // → '.hover\\:menu_item:hover .icon'
 *
 * modify_single_selector('.menu_item.selected', 'menu_item', 'hover\\:menu_item', ':hover', '')
 * // → '.hover\\:menu_item.selected:hover'
 * ```
 */
export const modify_single_selector = (
	selector: string,
	original_class: string,
	new_class_escaped: string,
	state_css: string,
	pseudo_element_css: string,
): string => {
	// Find the target class (must match the class name exactly, not as part of another class)
	const class_pattern = new RegExp(`\\.${escape_regexp(original_class)}(?![\\w-])`);
	const match = class_pattern.exec(selector);
	if (!match) return selector; // Class not in this selector

	const class_pos = match.index;

	// Find where the compound selector ends (where to insert state)
	const compound_end = find_compound_end(selector, class_pos);

	// Build the modified selector
	// Insert state and pseudo-element at compound_end (before any existing pseudo-element)
	const suffix = state_css + pseudo_element_css;
	let result = selector.slice(0, compound_end) + suffix + selector.slice(compound_end);

	// Replace the class name with the new escaped name
	result = result.replace(class_pattern, `.${new_class_escaped}`);

	return result;
};

/**
 * Modifies a selector list (comma-separated selectors) to add modifiers.
 * Handles conflicts per-selector: if one selector in a list has a conflict,
 * only that selector skips the modifier; other selectors still get it.
 *
 * @param selector_group - CSS selector list (may contain commas)
 * @param original_class - the base class name
 * @param new_class_escaped - the escaped new class name
 * @param states_to_add - individual state modifiers (e.g., [":hover", ":focus"])
 * @param pseudo_element_css - pseudo-element modifier CSS to insert (e.g., "::before")
 * @returns result with modified selector list and information about skipped modifiers
 */
export const modify_selector_group = (
	selector_group: string,
	original_class: string,
	new_class_escaped: string,
	states_to_add: Array<string>,
	pseudo_element_css: string,
): ModifiedSelectorGroupResult => {
	const selectors = split_selector_list(selector_group);
	let skipped_modifiers: Array<SkippedModifierInfo> | null = null;
	const adding_pseudo_element = pseudo_element_css !== '';

	const modified_selectors = selectors.map((selector) => {
		const trimmed = selector.trim();

		// Check pseudo-element conflict for this specific selector
		const has_pseudo_element_conflict =
			adding_pseudo_element && selector_has_pseudo_element(trimmed);

		// Check state conflicts for this specific selector - filter to non-conflicting states
		const non_conflicting_states: Array<string> = [];
		for (const state of states_to_add) {
			if (selector_has_state(trimmed, state)) {
				// Record the skip for this specific selector
				(skipped_modifiers ??= []).push({
					selector: trimmed,
					reason: 'state_conflict',
					conflicting_modifier: state,
				});
			} else {
				non_conflicting_states.push(state);
			}
		}

		// Record pseudo-element skip for this specific selector
		if (has_pseudo_element_conflict) {
			(skipped_modifiers ??= []).push({
				selector: trimmed,
				reason: 'pseudo_element_conflict',
				conflicting_modifier: pseudo_element_css,
			});
		}

		// Build effective modifiers for this selector
		const effective_state_css = non_conflicting_states.join('');
		const effective_pseudo_element_css = has_pseudo_element_conflict ? '' : pseudo_element_css;

		return modify_single_selector(
			trimmed,
			original_class,
			new_class_escaped,
			effective_state_css,
			effective_pseudo_element_css,
		);
	});

	return {
		selector: modified_selectors.join(',\n'),
		skipped_modifiers,
	};
};

/**
 * Generates CSS for a modified ruleset with applied modifiers.
 *
 * Conflict handling is per-selector within selector lists:
 * - For `.plain:hover, .plain:active` with `hover:` modifier, only `.plain:hover` skips
 *   the `:hover` addition; `.plain:active` still gets `:hover` appended.
 * - For multiple states like `:hover:focus`, each is checked individually; conflicting
 *   states are skipped while non-conflicting ones are still applied.
 *
 * @param original_ruleset - the original CSS ruleset string
 * @param original_class - the base class name
 * @param new_class_escaped - the escaped new class name with modifiers
 * @param state_css - state modifier CSS (e.g., ":hover" or ":hover:focus")
 * @param pseudo_element_css - pseudo-element modifier CSS (e.g., "::before")
 * @param media_wrapper - media query wrapper (e.g., "@media (width >= 48rem)")
 * @param ancestor_wrapper - ancestor wrapper (e.g., ":root.dark")
 * @returns result with generated CSS and information about skipped modifiers
 */
export const generate_modified_ruleset = (
	original_ruleset: string,
	original_class: string,
	new_class_escaped: string,
	state_css: string,
	pseudo_element_css: string,
	media_wrapper: string | null,
	ancestor_wrapper: string | null,
): ModifiedRulesetResult => {
	const parsed = parse_ruleset(original_ruleset);
	let skipped_modifiers: Array<SkippedModifierInfo> | null = null;

	// Extract individual states for per-selector conflict detection (e.g., ":hover:focus" → [":hover", ":focus"])
	const states_to_add = state_css.match(/:[a-z-]+/g) ?? [];

	let css = '';
	let indent = '';

	// Open media wrapper if present
	if (media_wrapper) {
		css += `${media_wrapper} {\n`;
		indent = '\t';
	}

	// Open ancestor wrapper if present
	if (ancestor_wrapper) {
		css += `${indent}${ancestor_wrapper} {\n`;
		indent += '\t';
	}

	// Generate each rule with modified selector (conflict detection happens per-selector in modify_selector_group)
	for (const rule of parsed.rules) {
		const result = modify_selector_group(
			rule.selector,
			original_class,
			new_class_escaped,
			states_to_add,
			pseudo_element_css,
		);

		// Collect skip info from per-selector conflict detection
		if (result.skipped_modifiers) {
			(skipped_modifiers ??= []).push(...result.skipped_modifiers);
		}

		css += `${indent}${result.selector} { ${rule.declarations} }\n`;
	}

	// Close ancestor wrapper
	if (ancestor_wrapper) {
		indent = indent.slice(0, -1);
		css += `${indent}}\n`;
	}

	// Close media wrapper
	if (media_wrapper) {
		css += '}\n';
	}

	return {css, skipped_modifiers};
};
