/**
 * Style.css rule parser for bundled CSS generation.
 *
 * Parses the fuz_css style.css file into a structured index that maps
 * CSS rules to the HTML elements and classes they style. This enables
 * the bundled CSS generator to include only the rules needed for
 * elements actually used in the project.
 *
 * @module
 */

import {parseCss, type AST} from 'svelte/compiler';
import {hash_secure} from '@fuzdev/fuz_util/hash.js';

import {extract_css_variables} from './css_variable_utils.js';
import type {CacheOperations} from './operations.js';
import type {BaseCssOption} from './css_plugin_options.js';

/**
 * Base fields shared by all style rules.
 */
export interface StyleRuleBase {
	/** The full CSS text for this rule (including selector and declarations) */
	css: string;
	/** HTML element names this rule targets (e.g., 'button', 'input') */
	elements: Set<string>;
	/** CSS class names this rule targets (e.g., 'unstyled', 'selected') */
	classes: Set<string>;
	/** CSS variables referenced in declarations */
	variables_used: Set<string>;
	/** Original order in style.css (for preserving cascade) */
	order: number;
}

/**
 * Reasons a rule is considered "core" and always included.
 */
export type CoreReason =
	| 'universal'
	| 'root'
	| 'body'
	| 'media_query'
	| 'html'
	| 'host'
	| 'font_face';

/**
 * A core style rule that is always included in output.
 */
export interface CoreStyleRule extends StyleRuleBase {
	is_core: true;
	core_reason: CoreReason;
}

/**
 * A non-core style rule included only when its elements/classes are detected.
 */
export interface NonCoreStyleRule extends StyleRuleBase {
	is_core: false;
	core_reason: null;
}

/**
 * A parsed style rule with metadata for filtering.
 * Discriminated union: check `is_core` to narrow to CoreStyleRule or NonCoreStyleRule.
 * All rules have a consistent shape - `core_reason` is null for non-core rules.
 */
export type StyleRule = CoreStyleRule | NonCoreStyleRule;

/**
 * Index of parsed style rules for efficient lookup.
 */
export interface StyleRuleIndex {
	/** All rules in original order */
	rules: Array<StyleRule>;
	/** Rules indexed by element name */
	by_element: Map<string, Array<number>>;
	/** Rules indexed by class name */
	by_class: Map<string, Array<number>>;
	/** Content hash for cache invalidation */
	content_hash: string;
}

/**
 * Parses a CSS stylesheet into a StyleRuleIndex.
 *
 * @param css - Raw CSS string (e.g., contents of style.css)
 * @param content_hash - Hash of the CSS for cache invalidation
 * @returns StyleRuleIndex with rules and lookup maps
 */
export const parse_style_css = (css: string, content_hash: string): StyleRuleIndex => {
	const ast = parseCss(css);
	const rules: Array<StyleRule> = [];
	const by_element: Map<string, Array<number>> = new Map();
	const by_class: Map<string, Array<number>> = new Map();

	let order = 0;

	// Walk the CSS AST
	for (const child of ast.children) {
		if (child.type === 'Rule') {
			const rule = extract_style_rule(child, css, order++);
			const index = rules.length;
			rules.push(rule);

			// Index by element
			for (const element of rule.elements) {
				const arr = by_element.get(element);
				if (arr) {
					arr.push(index);
				} else {
					by_element.set(element, [index]);
				}
			}

			// Index by class
			for (const cls of rule.classes) {
				const arr = by_class.get(cls);
				if (arr) {
					arr.push(index);
				} else {
					by_class.set(cls, [index]);
				}
			}
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		} else if (child.type === 'Atrule') {
			// Handle @media and other at-rules
			const rule = extract_atrule(child, css, order++);
			if (rule) {
				const index = rules.length;
				rules.push(rule);

				// Index by element
				for (const element of rule.elements) {
					const arr = by_element.get(element);
					if (arr) {
						arr.push(index);
					} else {
						by_element.set(element, [index]);
					}
				}

				// Index by class
				for (const cls of rule.classes) {
					const arr = by_class.get(cls);
					if (arr) {
						arr.push(index);
					} else {
						by_class.set(cls, [index]);
					}
				}
			}
		}
	}

	return {
		rules,
		by_element,
		by_class,
		content_hash,
	};
};

/**
 * Extracts a StyleRule from a CSS Rule AST node.
 */
const extract_style_rule = (rule: AST.CSS.Rule, css: string, order: number): StyleRule => {
	const rule_css = css.slice(rule.start, rule.end);
	const elements: Set<string> = new Set();
	const classes: Set<string> = new Set();

	// Parse selectors from the prelude
	const selector_css = css.slice(rule.prelude.start, rule.prelude.end);
	parse_selector_list(selector_css, elements, classes);

	// Extract variables from declarations
	const block_css = css.slice(rule.block.start, rule.block.end);
	const variables_used = extract_css_variables(block_css);

	// Determine if core rule
	const {is_core, core_reason} = check_core_rule(selector_css, elements);

	// Type assertion needed because destructuring widens is_core to boolean
	return {
		css: rule_css,
		elements,
		classes,
		variables_used,
		order,
		is_core,
		core_reason,
	} as StyleRule;
};

/**
 * Walks nested rules in an at-rule block to extract elements, classes, and variables.
 */
const extract_nested_rules = (
	block: AST.CSS.Block,
	css: string,
	elements: Set<string>,
	classes: Set<string>,
	variables_used: Set<string>,
): void => {
	for (const child of block.children) {
		if (child.type === 'Rule') {
			const selector_css = css.slice(child.prelude.start, child.prelude.end);
			parse_selector_list(selector_css, elements, classes);

			const block_css = css.slice(child.block.start, child.block.end);
			for (const v of extract_css_variables(block_css)) {
				variables_used.add(v);
			}
		}
	}
};

/**
 * Extracts a StyleRule from an at-rule (e.g., @media, @supports, @container, @layer).
 */
const extract_atrule = (atrule: AST.CSS.Atrule, css: string, order: number): StyleRule | null => {
	const rule_css = css.slice(atrule.start, atrule.end);
	const elements: Set<string> = new Set();
	const classes: Set<string> = new Set();
	const variables_used: Set<string> = new Set();

	// Handle conditional group rules that contain nested rules
	if (
		(atrule.name === 'media' ||
			atrule.name === 'supports' ||
			atrule.name === 'container' ||
			atrule.name === 'layer') &&
		atrule.block
	) {
		extract_nested_rules(atrule.block, css, elements, classes, variables_used);

		// prefers-reduced-motion media queries are core (accessibility)
		if (atrule.name === 'media' && atrule.prelude.includes('prefers-reduced-motion')) {
			return {
				css: rule_css,
				elements,
				classes,
				variables_used,
				order,
				is_core: true,
				core_reason: 'media_query',
			} as const;
		}

		return {
			css: rule_css,
			elements,
			classes,
			variables_used,
			order,
			is_core: false,
			core_reason: null,
		} as const;
	}

	// Handle @keyframes - include it if any rules reference animations
	// We extract variables but don't index by element/class since keyframes don't use selectors
	if (atrule.name === 'keyframes' && atrule.block) {
		// Extract variables from keyframe rules
		const block_css = css.slice(atrule.block.start, atrule.block.end);
		for (const v of extract_css_variables(block_css)) {
			variables_used.add(v);
		}

		return {
			css: rule_css,
			elements, // Empty - keyframes don't target elements
			classes, // Empty - keyframes don't target classes
			variables_used,
			order,
			is_core: false,
			core_reason: null,
		} as const;
	}

	// Handle @font-face - global rule that should always be included
	if (atrule.name === 'font-face' && atrule.block) {
		// Extract variables from font-face declarations (e.g., custom font paths)
		const block_css = css.slice(atrule.block.start, atrule.block.end);
		for (const v of extract_css_variables(block_css)) {
			variables_used.add(v);
		}

		return {
			css: rule_css,
			elements, // Empty - font-face doesn't target elements
			classes, // Empty - font-face doesn't target classes
			variables_used,
			order,
			is_core: true,
			core_reason: 'font_face',
		} as const;
	}

	// Skip other at-rules (@charset, @import, @namespace, @page, etc.)
	// These are typically global and would need different handling
	return null;
};

/**
 * Parses a selector list and extracts element names and class names.
 *
 * @param selector_css - CSS selector string (may contain commas)
 * @param elements - Set to add element names to
 * @param classes - Set to add class names to
 * @mutates elements, classes
 */
const parse_selector_list = (
	selector_css: string,
	elements: Set<string>,
	classes: Set<string>,
): void => {
	// Split on commas, respecting parentheses
	const selectors = split_selector_list(selector_css);

	for (const selector of selectors) {
		parse_single_selector(selector.trim(), elements, classes);
	}
};

/**
 * Splits a selector list by commas, respecting parentheses.
 */
const split_selector_list = (selector_group: string): Array<string> => {
	const selectors: Array<string> = [];
	let current = '';
	let paren_depth = 0;
	let bracket_depth = 0;

	for (let i = 0; i < selector_group.length; i++) {
		const char = selector_group[i]!;

		if (char === '(') {
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
 * Extracts the content of a functional pseudo-class starting at the given position.
 * Handles arbitrarily nested parentheses.
 *
 * @param selector - The full selector string
 * @param start - Position after the opening parenthesis
 * @returns The inner content and the end position (after closing paren), or null if unbalanced
 */
const extract_functional_content = (
	selector: string,
	start: number,
): {content: string; end: number} | null => {
	let depth = 1;
	let i = start;

	while (i < selector.length && depth > 0) {
		const char = selector[i]!;
		if (char === '(') depth++;
		else if (char === ')') depth--;
		i++;
	}

	if (depth !== 0) return null;

	return {
		content: selector.slice(start, i - 1),
		end: i,
	};
};

/**
 * Parses a single selector to extract element and class names.
 * Handles :where(), :is(), :not(), :has() pseudo-classes with arbitrary nesting.
 */
const parse_single_selector = (
	selector: string,
	elements: Set<string>,
	classes: Set<string>,
): void => {
	// Find all functional pseudo-classes and extract their content iteratively
	const functional_start_pattern = /:(?:where|is|not|has)\(/g;
	let match;
	const ranges_to_remove: Array<{start: number; end: number}> = [];

	while ((match = functional_start_pattern.exec(selector)) !== null) {
		const content_start = match.index + match[0].length;
		const result = extract_functional_content(selector, content_start);
		if (result) {
			// Recursively parse the inner content
			parse_selector_list(result.content, elements, classes);
			ranges_to_remove.push({start: match.index, end: result.end});
			// Update the regex lastIndex to continue after this match
			functional_start_pattern.lastIndex = result.end;
		}
	}

	// Remove functional pseudo-classes from selector for simpler parsing
	// Process in reverse order to preserve indices
	let simplified = selector;
	for (let i = ranges_to_remove.length - 1; i >= 0; i--) {
		const range = ranges_to_remove[i]!;
		simplified = simplified.slice(0, range.start) + simplified.slice(range.end);
	}

	// Extract element names (unqualified identifiers at start or after combinators)
	// Matches: div, button, input[type], etc.
	const element_pattern = /(?:^|[\s>+~])([a-zA-Z][a-zA-Z0-9-]*)/g;
	while ((match = element_pattern.exec(simplified)) !== null) {
		const element = match[1]!.toLowerCase();
		// Filter out pseudo-elements (::before), pseudo-classes (:hover), and vendor prefixes (-webkit)
		if (!element.startsWith('-') && !element.startsWith(':')) {
			elements.add(element);
		}
	}

	// Extract class names
	const class_pattern = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
	while ((match = class_pattern.exec(selector)) !== null) {
		classes.add(match[1]!);
	}
};

/**
 * Result from core rule check - discriminated union for type safety.
 * Both variants include `core_reason` for consistent object shape.
 */
type CoreRuleCheck = {is_core: true; core_reason: CoreReason} | {is_core: false; core_reason: null};

/**
 * Checks if a rule is a "core" rule that should always be included.
 * Core rules include:
 * - Universal selector (*) rules
 * - :root and :host rules
 * - body rules
 * - html rules
 */
const check_core_rule = (selector_css: string, elements: Set<string>): CoreRuleCheck => {
	// Universal selector
	if (selector_css.includes('*')) {
		return {is_core: true, core_reason: 'universal'};
	}

	// :root pseudo-class
	if (selector_css.includes(':root')) {
		return {is_core: true, core_reason: 'root'};
	}

	// :host pseudo-class (for web components)
	if (selector_css.includes(':host')) {
		return {is_core: true, core_reason: 'host'};
	}

	// body element
	if (elements.has('body')) {
		return {is_core: true, core_reason: 'body'};
	}

	// html element
	if (elements.has('html')) {
		return {is_core: true, core_reason: 'html'};
	}

	return {is_core: false, core_reason: null};
};

/**
 * Loads and parses the default style.css file.
 *
 * @param ops - Filesystem operations for dependency injection
 * @param style_css_path - Path to style.css (defaults to package's style.css)
 * @returns Promise resolving to StyleRuleIndex
 */
export const load_style_rule_index = async (
	ops: CacheOperations,
	style_css_path?: string,
): Promise<StyleRuleIndex> => {
	const path = style_css_path ?? new URL('./style.css', import.meta.url).pathname;
	const css = await ops.read_text({path});
	if (css === null) {
		throw new Error(`Failed to read style.css from ${path}`);
	}
	const content_hash = await hash_secure(css);
	return parse_style_css(css, content_hash);
};

/**
 * Creates a StyleRuleIndex from a custom CSS string.
 * Use this to parse user-provided base styles instead of loading from file.
 *
 * @param css - Raw CSS string to parse
 * @returns Promise resolving to StyleRuleIndex
 */
export const create_style_rule_index = async (css: string): Promise<StyleRuleIndex> => {
	const content_hash = await hash_secure(css);
	return parse_style_css(css, content_hash);
};

/**
 * Loads the raw default style.css content.
 *
 * @param ops - Filesystem operations for dependency injection
 * @param style_css_path - Path to style.css (defaults to package's style.css)
 * @returns Promise resolving to the CSS string
 */
export const load_default_style_css = async (
	ops: CacheOperations,
	style_css_path?: string,
): Promise<string> => {
	const path = style_css_path ?? new URL('./style.css', import.meta.url).pathname;
	const css = await ops.read_text({path});
	if (css === null) {
		throw new Error(`Failed to read style.css from ${path}`);
	}
	return css;
};

/**
 * Resolves a base_css option to a StyleRuleIndex.
 * Handles all option forms: undefined (defaults), null (disabled), string, or callback.
 *
 * @param base_css - The base_css option from generator config
 * @param ops - Filesystem operations for loading default CSS
 * @returns Promise resolving to StyleRuleIndex, or null if disabled
 */
export const resolve_base_css_option = async (
	base_css: BaseCssOption,
	ops: CacheOperations,
): Promise<StyleRuleIndex | null> => {
	// null = disabled
	if (base_css === null) {
		return null;
	}

	// undefined = use defaults
	if (base_css === undefined) {
		return load_style_rule_index(ops);
	}

	// string = custom CSS (replacement)
	if (typeof base_css === 'string') {
		return create_style_rule_index(base_css);
	}

	// function = callback to modify defaults
	const default_css = await load_default_style_css(ops);
	const modified_css = base_css(default_css);
	return create_style_rule_index(modified_css);
};

/**
 * Gets rules that should be included based on detected elements and classes.
 *
 * @param index - The StyleRuleIndex to query
 * @param detected_elements - Set of HTML element names found in source
 * @param detected_classes - Set of CSS class names found in source
 * @returns Set of rule indices to include
 */
export const get_matching_rules = (
	index: StyleRuleIndex,
	detected_elements: Set<string>,
	detected_classes: Set<string>,
): Set<number> => {
	const included: Set<number> = new Set();

	// Always include core rules
	for (let i = 0; i < index.rules.length; i++) {
		if (index.rules[i]!.is_core) {
			included.add(i);
		}
	}

	// Include rules matching detected elements
	for (const element of detected_elements) {
		const rule_indices = index.by_element.get(element);
		if (rule_indices) {
			for (const idx of rule_indices) {
				included.add(idx);
			}
		}
	}

	// Include rules matching detected classes
	for (const cls of detected_classes) {
		const rule_indices = index.by_class.get(cls);
		if (rule_indices) {
			for (const idx of rule_indices) {
				included.add(idx);
			}
		}
	}

	return included;
};

/**
 * Generates CSS from a StyleRuleIndex with only the included rules.
 *
 * @param index - The StyleRuleIndex
 * @param included_indices - Set of rule indices to include
 * @returns CSS string with only included rules, in original order
 */
export const generate_base_css = (index: StyleRuleIndex, included_indices: Set<number>): string => {
	// Sort by order to preserve cascade
	const sorted_indices = Array.from(included_indices).sort((a, b) => a - b);

	const parts: Array<string> = [];
	for (const idx of sorted_indices) {
		parts.push(index.rules[idx]!.css);
	}

	return parts.join('\n\n');
};

/**
 * Collects all CSS variables used by the included rules.
 *
 * @param index - The StyleRuleIndex
 * @param included_indices - Set of rule indices to include
 * @returns Set of variable names (without -- prefix)
 */
export const collect_rule_variables = (
	index: StyleRuleIndex,
	included_indices: Set<number>,
): Set<string> => {
	const variables: Set<string> = new Set();

	for (const idx of included_indices) {
		const rule = index.rules[idx]!;
		for (const v of rule.variables_used) {
			variables.add(v);
		}
	}

	return variables;
};
