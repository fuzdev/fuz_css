/**
 * Base stylesheet parser for bundled CSS generation.
 *
 * Parses a base stylesheet - the fuz_css `style.css`, or whatever the
 * `base_css` generator option supplies - into a structured index that maps
 * its top-level rules to the HTML elements and classes they style, so the
 * bundled CSS generator includes only the rules a project uses.
 *
 * The contract is pass-through with shallow tree-shaking, for any CSS the
 * parser (`parseCss` from `svelte/compiler`) accepts:
 *
 * - Top-level style rules and top-level conditional group rules (`@media`,
 *   `@supports`, `@container`) are tree-shaken by the elements and classes
 *   they target. A group is one unit - it ships whole or not at all. A rule
 *   with a selector the index can't match always ships.
 * - Every other at-rule (`@keyframes`, `@font-face`, `@property`, `@scope`,
 *   ...) ships as written.
 * - Every `var()` reference in a rule that ships is tracked, however deeply
 *   it is nested, so the theme includes the variables it needs.
 * - The generator owns layering: everything lands in `fuz.base`, except the
 *   contents of a top-level `@layer fuz.preferences` block. Any other
 *   `@layer` rule is an error, as are `@import` and `@namespace`, which are
 *   invalid inside a layer block. An error never removes CSS - the construct
 *   ships as written with the rule it sits in.
 * - The one construct left out is `@charset`: an encoding marker that means
 *   nothing in a string, which preprocessors emit for non-ASCII output.
 *
 * @module
 */

import { parseCss, type AST } from 'svelte/compiler';

import {
	extract_css_variables,
	extract_declared_css_variables,
	extract_required_css_variables,
	strip_css_comments
} from './css_variable_utils.ts';
import { split_selector_list } from './css_ruleset_parser.ts';
import type { GenerationDiagnostic } from './diagnostics.ts';
import type { CacheDeps } from './deps.ts';
import { FUZ_LAYER_ORDER_STATEMENT } from './theme.ts';

/**
 * The cascade layer a rule is emitted into in bundled output. A base
 * stylesheet's rules land in `fuz.base`; the contents of a top-level
 * `@layer fuz.preferences` block keep that identity, because the OS
 * user-preference mappings must stay above the `fuz.base` defaults. No other
 * layer survives parsing - see `parse_style_css`.
 */
export type RuleLayer = 'fuz.base' | 'fuz.preferences';

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
	/**
	 * CSS variables referenced anywhere in the rule's text, nested rules
	 * included. Read from the raw text, so it can only over-include - which
	 * never leaves a `var()` undefined.
	 */
	variables_used: Set<string>;
	/**
	 * The subset of `variables_used` that something outside the rule must
	 * define: referenced with no fallback outside a comment, and not declared
	 * by the rule itself.
	 */
	variables_required: Set<string>;
	/**
	 * Custom properties the rule defines for the whole document: the ones a
	 * top-level style rule declares when a selector in its list is exactly
	 * `:root`, `:host`, `html`, `body`, or `*`. Empty for every other rule.
	 */
	variables_defined: Set<string>;
	/** Original order in the stylesheet (for preserving cascade) */
	order: number;
	/** The cascade layer this rule is emitted into in bundled output */
	layer: RuleLayer;
}

/**
 * Reasons a rule is considered "core" and always included. `conditional_core`
 * marks a conditional group rule (`@media`, `@supports`, `@container`) that
 * contains something which always ships on its own - a core rule or an
 * `at_rule`. `at_rule` marks every at-rule that is not a conditional group
 * (`@keyframes`, `@font-face`, `@property`, `@scope`, ...): detection has no
 * way to tell whether one is used, so it ships as written. `untargetable`
 * marks rules with a selector the index can't match - one that names no
 * element or class at all (pseudo-element or attribute selectors like
 * `::selection` and `[hidden]`), or one with an escaped or non-ASCII
 * identifier (`.md\:flex`, `.café`) - so tree-shaking would drop them
 * whether or not the project uses them.
 */
export type CoreReason =
	'universal' | 'root' | 'body' | 'conditional_core' | 'html' | 'host' | 'at_rule' | 'untargetable';

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
 * Discriminated union: check `is_core` to narrow to `CoreStyleRule` or `NonCoreStyleRule`.
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
	/**
	 * Problems found while parsing: constructs the stylesheet contains that
	 * don't belong in a base stylesheet (`base_css_layer`,
	 * `base_css_unsupported_at_rule`). `resolve_css` forwards them with its own
	 * diagnostics.
	 */
	diagnostics: Array<GenerationDiagnostic>;
}

/** The conditional group rules, which tree-shake as one unit by what they target. */
const CONDITIONAL_GROUP_AT_RULES: ReadonlySet<string> = new Set(['media', 'supports', 'container']);

/** At-rules that are invalid inside a layer block, where every base rule is emitted. */
const UNSUPPORTED_AT_RULES: ReadonlySet<string> = new Set(['import', 'namespace']);

/** The layer names of the shipped order statement, which the bundle emits itself. */
const SHIPPED_LAYER_ORDER = FUZ_LAYER_ORDER_STATEMENT.replace(/^@layer\s+|;$/g, '');

const normalize_layer_prelude = (prelude: string): string =>
	prelude
		.split(',')
		.map((name) => name.trim())
		.join(', ');

const is_conditional_group = (
	atrule: AST.CSS.Atrule
): atrule is AST.CSS.Atrule & { block: AST.CSS.Block } =>
	atrule.block !== null && CONDITIONAL_GROUP_AT_RULES.has(atrule.name.toLowerCase());

const DIAGNOSTIC_SNIPPET_LENGTH_MAX = 80;

/** Renders a rule's head for a diagnostic message: its selector, or an at-rule's name and prelude. */
const format_rule_head = (node: AST.CSS.Rule | AST.CSS.Atrule, css: string): string => {
	const text =
		node.type === 'Rule'
			? css.slice(node.prelude.start, node.prelude.end)
			: `@${node.name} ${node.prelude}`;
	const head = strip_css_comments(text).trim().replace(/\s+/g, ' ');
	return head.length > DIAGNOSTIC_SNIPPET_LENGTH_MAX
		? head.slice(0, DIAGNOSTIC_SNIPPET_LENGTH_MAX) + '...'
		: head;
};

/**
 * Collects the at-rules of a node that don't belong in a base stylesheet:
 * any `@layer`, and the at-rules invalid inside a layer block. Walks the
 * whole subtree, CSS nesting included.
 */
const collect_rejected_at_rules = (
	node: AST.CSS.Rule | AST.CSS.Atrule,
	found: Array<AST.CSS.Atrule>
): void => {
	if (node.type === 'Atrule') {
		const name = node.name.toLowerCase();
		if (name === 'layer' || UNSUPPORTED_AT_RULES.has(name)) {
			found.push(node);
		}
	}
	if (node.block) {
		for (const child of node.block.children) {
			if (child.type === 'Rule' || child.type === 'Atrule') {
				collect_rejected_at_rules(child, found);
			}
		}
	}
};

/**
 * Creates the error for an at-rule that doesn't belong in a base stylesheet,
 * naming it, its line, and the top-level rule it is nested in.
 *
 * @param atrule - the offending at-rule
 * @param container - the top-level rule `atrule` sits in, or `atrule` itself
 * @param css - the stylesheet text both were parsed from
 * @param layer - the cascade layer `container` is emitted into
 */
const create_rejected_at_rule_diagnostic = (
	atrule: AST.CSS.Atrule,
	container: AST.CSS.Rule | AST.CSS.Atrule,
	css: string,
	layer: RuleLayer
): GenerationDiagnostic => {
	const line = css.slice(0, atrule.start).split('\n').length;
	const where =
		atrule === container
			? `at line ${line},`
			: `at line ${line}, inside \`${format_rule_head(container, css)}\`,`;
	const head = `\`${format_rule_head(atrule, css)}\``;
	if (atrule.name.toLowerCase() === 'layer') {
		return {
			phase: 'generation',
			level: 'error',
			message: `base_css declares a cascade layer with ${head} ${
				where
			} but the generator owns layering - it ships as written, as a sublayer of ${layer}`,
			suggestion:
				'Remove the @layer rule: base_css lands in fuz.base, and only top-level `@layer fuz.base` and `@layer fuz.preferences` blocks are recognized. Styles that need their own layers belong in your own stylesheet.',
			identifier: 'base_css_layer',
			locations: null
		};
	}
	return {
		phase: 'generation',
		level: 'error',
		message: `base_css contains ${head} ${
			where
		} which is invalid inside the cascade layer base styles are emitted in - it ships as written and browsers ignore it`,
		suggestion: 'Move it to your own stylesheet.',
		identifier: 'base_css_unsupported_at_rule',
		locations: null
	};
};

/**
 * Parses a base stylesheet into a `StyleRuleIndex`.
 *
 * Each top-level style rule and at-rule becomes one indexed rule that ships
 * whole or not at all. A top-level `@layer fuz.base` or `@layer
 * fuz.preferences` block is unwrapped first, so its contents are top-level
 * too and bundled output re-layers the selected rules; the shipped layer
 * order statement is skipped because the bundle emits its own, and so is
 * `@charset`, which means nothing in a string. Every other `@layer` rule, and
 * each `@import`/`@namespace`, becomes an error in the index's `diagnostics`
 * and is still indexed as written - an error never removes CSS.
 *
 * @param css - raw CSS string (e.g., contents of `style.css`)
 * @returns `StyleRuleIndex` with rules, lookup maps, and diagnostics
 * @throws if `css` is not syntactically valid
 */
export const parse_style_css = (css: string): StyleRuleIndex => {
	// a byte order mark would read as part of the first selector
	if (css.charCodeAt(0) === 0xfeff) return parse_style_css(css.slice(1));

	const ast = parseCss(css);
	const rules: Array<StyleRule> = [];
	const by_element: Map<string, Array<number>> = new Map();
	const by_class: Map<string, Array<number>> = new Map();
	const diagnostics: Array<GenerationDiagnostic> = [];

	let order = 0;

	const index_rule = (rule: StyleRule): void => {
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
	};

	// `unwrapped` is true inside a shipped layer block, where no further
	// `@layer` is recognized - nesting one there would declare a sublayer
	const walk_children = (
		children: Iterable<AST.CSS.Node>,
		layer: RuleLayer,
		unwrapped: boolean
	): void => {
		for (const child of children) {
			if (child.type !== 'Rule' && child.type !== 'Atrule') continue;

			if (child.type === 'Atrule') {
				const name = child.name.toLowerCase();
				if (name === 'charset') continue;
				if (name === 'layer' && !unwrapped) {
					const prelude = normalize_layer_prelude(child.prelude);
					if (child.block) {
						if (prelude === 'fuz.base' || prelude === 'fuz.preferences') {
							walk_children(child.block.children, prelude, true);
							continue;
						}
					} else if (prelude === SHIPPED_LAYER_ORDER) {
						continue;
					}
				}
			}

			const rejected: Array<AST.CSS.Atrule> = [];
			collect_rejected_at_rules(child, rejected);
			for (const atrule of rejected) {
				diagnostics.push(create_rejected_at_rule_diagnostic(atrule, child, css, layer));
			}

			index_rule(
				child.type === 'Rule'
					? extract_style_rule(child, css, order++, layer)
					: extract_atrule(child, css, order++, layer)
			);
		}
	};

	// Walk the CSS AST
	walk_children(ast.children, 'fuz.base', false);

	return {
		rules,
		by_element,
		by_class,
		diagnostics
	};
};

/** Selectors that reach the whole document, so a custom property declared there is defined everywhere. */
const DOCUMENT_SELECTORS: ReadonlySet<string> = new Set([':root', ':host', 'html', 'body', '*']);

/**
 * The three variable sets of a rule. `variables_used` reads the raw text, so
 * a theme variable can only be over-included; the other two feed a diagnostic
 * and read the text with comments removed.
 *
 * @param rule_css - the rule's full text
 * @param selector_css - the selector list of a top-level style rule, or null for an at-rule
 */
const extract_rule_variables = (
	rule_css: string,
	selector_css: string | null
): Pick<StyleRuleBase, 'variables_used' | 'variables_required' | 'variables_defined'> => {
	const text = strip_css_comments(rule_css);
	const declared = extract_declared_css_variables(text);
	const variables_required = extract_required_css_variables(text);
	for (const v of declared) variables_required.delete(v);
	const defines_for_document =
		selector_css !== null &&
		split_selector_list(strip_css_comments(selector_css)).some((selector) =>
			DOCUMENT_SELECTORS.has(selector.trim().toLowerCase())
		);
	return {
		variables_used: extract_css_variables(rule_css),
		variables_required,
		variables_defined: defines_for_document ? declared : new Set()
	};
};

/**
 * Extracts a StyleRule from a CSS Rule AST node.
 */
const extract_style_rule = (
	rule: AST.CSS.Rule,
	css: string,
	order: number,
	layer: RuleLayer
): StyleRule => {
	const rule_css = css.slice(rule.start, rule.end);
	const elements: Set<string> = new Set();
	const classes: Set<string> = new Set();

	// Parse selectors from the prelude
	const selector_css = css.slice(rule.prelude.start, rule.prelude.end);
	const targetable = parse_selector_list(selector_css, elements, classes);

	// Determine if core rule; a rule with a selector the index can't match
	// would be dropped whether or not the project uses it, so it must always ship
	let { is_core, core_reason } = check_core_rule(selector_css, elements);
	if (!is_core && !targetable) {
		is_core = true;
		core_reason = 'untargetable';
	}

	// Type assertion needed because destructuring widens is_core to boolean
	return {
		css: rule_css,
		elements,
		classes,
		// from the whole rule, nested rules included
		...extract_rule_variables(rule_css, selector_css),
		order,
		layer,
		is_core,
		core_reason
	} as StyleRule;
};

/** What a conditional group's contents say about whether the group must ship. */
interface ConditionalGroupScan {
	elements: Set<string>;
	classes: Set<string>;
	/** Something inside always ships on its own: a core rule or a non-conditional at-rule. */
	has_core: boolean;
	/** A rule inside has a selector the index can't match, so detection alone would drop it. */
	has_untargetable: boolean;
}

/**
 * Walks a conditional group's block, recursing through nested conditional
 * groups, to collect the elements and classes its rules target and whether
 * anything inside would always ship as a top-level rule (e.g. a `:root`
 * block or `@keyframes` inside a media query).
 *
 * @mutates `scan` - adds the hooks found and sets its flags
 */
const scan_conditional_group = (
	block: AST.CSS.Block,
	css: string,
	scan: ConditionalGroupScan
): void => {
	for (const child of block.children) {
		if (child.type === 'Rule') {
			const selector_css = css.slice(child.prelude.start, child.prelude.end);
			const rule_elements: Set<string> = new Set();
			const targetable = parse_selector_list(selector_css, rule_elements, scan.classes);
			for (const e of rule_elements) scan.elements.add(e);
			if (check_core_rule(selector_css, rule_elements).is_core) {
				scan.has_core = true;
			} else if (!targetable) {
				scan.has_untargetable = true;
			}
		} else if (child.type === 'Atrule') {
			if (is_conditional_group(child)) {
				scan_conditional_group(child.block, css, scan);
			} else {
				scan.has_core = true;
			}
		}
	}
};

/**
 * Extracts a StyleRule from an at-rule. A conditional group (`@media`,
 * `@supports`, `@container`) tree-shakes as one unit by what its rules
 * target; every other at-rule always ships as written, the ones
 * `parse_style_css` reports as errors included.
 */
const extract_atrule = (
	atrule: AST.CSS.Atrule,
	css: string,
	order: number,
	layer: RuleLayer
): StyleRule => {
	const rule_css = css.slice(atrule.start, atrule.end);
	// the whole text, so references at any nesting depth are tracked
	const variables = extract_rule_variables(rule_css, null);

	if (!is_conditional_group(atrule)) {
		// detection can't tell whether `@keyframes`, `@font-face`, `@property`
		// and the rest are used - the stylesheets, utility classes, and scripts
		// that reference them by name aren't all visible here - and leaving one
		// out silently breaks whatever does
		return {
			css: rule_css,
			elements: new Set(),
			classes: new Set(),
			...variables,
			order,
			layer,
			is_core: true,
			core_reason: 'at_rule'
		};
	}

	const scan: ConditionalGroupScan = {
		elements: new Set(),
		classes: new Set(),
		has_core: false,
		has_untargetable: false
	};
	scan_conditional_group(atrule.block, css, scan);
	const { elements, classes } = scan;

	// the group ships whole when anything inside it would always ship on its
	// own - the OS user-preference mappings (`prefers-contrast`,
	// `prefers-reduced-motion`) target `:root`, so they ride the same rule as
	// bare `:root` blocks
	if (scan.has_core) {
		return {
			css: rule_css,
			elements,
			classes,
			...variables,
			order,
			layer,
			is_core: true,
			core_reason: 'conditional_core'
		};
	}

	// likewise for a rule with a selector the index can't match (e.g.
	// `::selection`), and for a group with no hooks at all - the same fallback
	// `extract_style_rule` applies at the top level
	if (scan.has_untargetable || (elements.size === 0 && classes.size === 0)) {
		return {
			css: rule_css,
			elements,
			classes,
			...variables,
			order,
			layer,
			is_core: true,
			core_reason: 'untargetable'
		};
	}

	return {
		css: rule_css,
		elements,
		classes,
		...variables,
		order,
		layer,
		is_core: false,
		core_reason: null
	};
};

/**
 * Matches a selector the element and class patterns can't read reliably: one
 * with an escape (`.md\:flex`) or a character outside printable ASCII
 * (`.café`).
 */
const UNINDEXABLE_SELECTOR_PATTERN = /\\|[^\t\n\r -~]/;

/**
 * Parses a selector list and extracts element names and class names.
 *
 * @param selector_css - CSS selector string (may contain commas)
 * @param elements - set to add element names to
 * @param classes - set to add class names to
 * @returns whether the index can match every selector in the list - `false` when one names no element or class, or holds an escape or non-ASCII character
 * @mutates `elements`, `classes` - adds parsed names to the sets
 */
const parse_selector_list = (
	selector_css: string,
	elements: Set<string>,
	classes: Set<string>
): boolean => {
	let targetable = true;

	// Split on commas, respecting parentheses
	for (const selector of split_selector_list(selector_css)) {
		const selector_elements: Set<string> = new Set();
		const selector_classes: Set<string> = new Set();
		parse_single_selector(selector.trim(), selector_elements, selector_classes);
		if (
			(selector_elements.size === 0 && selector_classes.size === 0) ||
			UNINDEXABLE_SELECTOR_PATTERN.test(selector)
		) {
			targetable = false;
		}
		for (const e of selector_elements) elements.add(e);
		for (const c of selector_classes) classes.add(c);
	}

	return targetable;
};

/**
 * Extracts the content of a functional pseudo-class starting at the given position.
 * Handles arbitrarily nested parentheses.
 *
 * @param selector - the full selector string
 * @param start - position after the opening parenthesis
 * @returns the inner content and the end position (after closing paren), or null if unbalanced
 */
const extract_functional_content = (
	selector: string,
	start: number
): { content: string; end: number } | null => {
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
		end: i
	};
};

/**
 * Parses a single selector to extract element and class names.
 * Handles :where(), :is(), :not(), :has() pseudo-classes with arbitrary nesting.
 */
const parse_single_selector = (
	selector: string,
	elements: Set<string>,
	classes: Set<string>
): void => {
	// Find all functional pseudo-classes and extract their content iteratively
	const functional_start_pattern = /:(?:where|is|not|has)\(/g;
	let match;
	const ranges_to_remove: Array<{ start: number; end: number }> = [];

	while ((match = functional_start_pattern.exec(selector)) !== null) {
		const content_start = match.index + match[0].length;
		const result = extract_functional_content(selector, content_start);
		if (result) {
			// Recursively parse the inner content
			parse_selector_list(result.content, elements, classes);
			ranges_to_remove.push({ start: match.index, end: result.end });
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
type CoreRuleCheck =
	{ is_core: true; core_reason: CoreReason } | { is_core: false; core_reason: null };

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
		return { is_core: true, core_reason: 'universal' };
	}

	// :root pseudo-class
	if (selector_css.includes(':root')) {
		return { is_core: true, core_reason: 'root' };
	}

	// :host pseudo-class (for web components)
	if (selector_css.includes(':host')) {
		return { is_core: true, core_reason: 'host' };
	}

	// body element
	if (elements.has('body')) {
		return { is_core: true, core_reason: 'body' };
	}

	// html element
	if (elements.has('html')) {
		return { is_core: true, core_reason: 'html' };
	}

	return { is_core: false, core_reason: null };
};

/**
 * Loads and parses the default `style.css` file.
 *
 * @param deps - filesystem deps for dependency injection
 * @param style_css_path - path to `style.css` (defaults to package's `style.css`)
 * @returns promise resolving to `StyleRuleIndex`
 */
export const load_style_rule_index = async (
	deps: CacheDeps,
	style_css_path?: string
): Promise<StyleRuleIndex> => parse_style_css(await load_default_style_css(deps, style_css_path));

/**
 * Creates a `StyleRuleIndex` from the stylesheet a `base_css` option
 * supplies, reporting a value that can't be parsed as a `base_css` problem.
 *
 * @param css - the `base_css` string, or the string its callback returned
 * @returns `StyleRuleIndex`
 * @throws if `css` is not syntactically valid CSS, with the parser's error as the `cause`
 */
export const create_style_rule_index = (css: string): StyleRuleIndex => {
	try {
		return parse_style_css(css);
	} catch (cause) {
		throw new Error(`base_css is not valid CSS: ${format_css_parse_error(cause)}`, { cause });
	}
};

/** Renders a CSS parser error as its first message line plus its position, when it has one. */
const format_css_parse_error = (error: unknown): string => {
	const message = (error instanceof Error ? error.message : String(error)).split('\n', 1)[0]!;
	const start = (error as { start?: { line?: unknown; column?: unknown } } | null)?.start;
	return typeof start?.line === 'number' && typeof start.column === 'number'
		? `${message} (line ${start.line}, column ${start.column})`
		: message;
};

/**
 * Loads the raw default `style.css` content.
 *
 * @param deps - filesystem deps for dependency injection
 * @param style_css_path - path to `style.css` (defaults to package's `style.css`)
 * @returns promise resolving to the CSS string
 */
export const load_default_style_css = async (
	deps: CacheDeps,
	style_css_path?: string
): Promise<string> => {
	const path = style_css_path ?? new URL('./style.css', import.meta.url).pathname;
	const r = await deps.read_text({ path });
	if (!r.ok) {
		throw new Error(`Failed to read style.css from ${path}: ${r.message}`);
	}
	return r.value;
};

/**
 * Gets rules that should be included based on detected elements and classes.
 *
 * @param index - the `StyleRuleIndex` to query
 * @param detected_elements - set of HTML element names found in source
 * @param detected_classes - set of CSS class names found in source
 * @returns set of rule indices to include
 */
export const get_matching_rules = (
	index: StyleRuleIndex,
	detected_elements: Set<string>,
	detected_classes: Set<string>
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
 * Generates CSS from a `StyleRuleIndex` with only the included rules,
 * partitioned by destination cascade layer in one sorted pass.
 *
 * @param index - the `StyleRuleIndex`
 * @param included_indices - set of rule indices to include
 * @returns per-layer CSS strings, each in original rule order
 */
export const generate_base_css_by_layer = (
	index: StyleRuleIndex,
	included_indices: Set<number>
): Record<RuleLayer, string> => {
	// Sort by order to preserve cascade
	const sorted_indices = Array.from(included_indices).sort((a, b) => a - b);

	const parts: Record<RuleLayer, Array<string>> = { 'fuz.base': [], 'fuz.preferences': [] };
	for (const idx of sorted_indices) {
		const rule = index.rules[idx]!;
		parts[rule.layer].push(rule.css);
	}

	return {
		'fuz.base': parts['fuz.base'].join('\n\n'),
		'fuz.preferences': parts['fuz.preferences'].join('\n\n')
	};
};

/**
 * Collects all CSS variables used by the included rules.
 *
 * @param index - the `StyleRuleIndex`
 * @param included_indices - set of rule indices to include
 * @returns set of variable names (without -- prefix)
 */
export const collect_rule_variables = (
	index: StyleRuleIndex,
	included_indices: Set<number>
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
