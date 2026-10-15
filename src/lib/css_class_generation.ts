/**
 * CSS class generation utilities.
 *
 * Produces CSS output from class definitions, handles interpretation of
 * dynamic classes, and provides collection management for extracted classes.
 *
 * @module
 */

import type { Logger } from '@fuzdev/fuz_util/log.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';

import {
	type BaseDiagnostic,
	type SourceLocation,
	type InterpreterDiagnostic,
	type GenerationDiagnostic,
	create_generation_diagnostic
} from './diagnostics.ts';
import {
	parse_ruleset,
	is_single_selector_ruleset,
	ruleset_contains_class,
	modify_ruleset,
	split_selector_list,
	type SkippedModifierInfo
} from './css_ruleset_parser.ts';
import { resolve_class_definition } from './css_class_resolution.ts';
import { compare_media_modifiers, get_modifier, type ModifierDefinition } from './modifiers.ts';
import {
	extract_segments,
	extract_and_validate_modifiers,
	type ExtractedModifiers
} from './css_literal.ts';
import { extract_css_variables } from './css_variable_utils.ts';
import { COLOR_SCHEME_ROOTS, render_color_scheme_rules } from './theme.ts';

//
// CSS Utilities
//

/**
 * Escapes special characters in a CSS class name for use in a selector.
 * CSS selectors require escaping of characters like `:`, `%`, `(`, `)`, etc.
 *
 * @example
 * ```ts
 * escape_css_selector('display:flex') // 'display\\:flex'
 * escape_css_selector('opacity:80%') // 'opacity\\:80\\%'
 * escape_css_selector('nth-child(2n)') // 'nth-child\\(2n\\)'
 * ```
 */
export const escape_css_selector = (name: string): string => {
	return name.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
};

/**
 * Shorthands whose longhands don't extend their name, ranked below them.
 * Every other property ranks by its name's depth (see `to_property_rank`).
 */
const SHORTHAND_RANKS: Record<string, number> = {
	all: -2, // every property
	inset: -1, // top, right, bottom, left
	'contain-intrinsic-size': 1, // contain-intrinsic-width, contain-intrinsic-height
	'place-content': 0, // align-content, justify-content
	'place-items': 0, // align-items, justify-items
	'place-self': 0, // align-self, justify-self
	'flex-flow': 0, // flex-direction, flex-wrap
	'grid-area': 0 // grid-row, grid-column
};

/**
 * The cascade rank of a CSS property, so a shorthand emits before the
 * longhands it sets and a longhand class wins where both apply: the depth of
 * its name (`padding` 0, `padding-left` 1, `border-top-color` 2), vendor
 * prefix ignored, with `SHORTHAND_RANKS` for the shorthands whose longhands
 * don't extend their name. Custom properties rank 0. Properties that aren't
 * shorthand-related can share a rank harmlessly - they never overlap.
 *
 * @example
 * ```ts
 * to_property_rank('padding') // 0
 * to_property_rank('padding-left') // 1
 * to_property_rank('inset') // -1, below `top`
 * ```
 */
export const to_property_rank = (property: string): number => {
	if (property.startsWith('--')) return 0;
	const known = SHORTHAND_RANKS[property];
	if (known !== undefined) return known;
	const unprefixed = property.startsWith('-') ? property.replace(/^-[a-z]+-/, '') : property;
	let depth = 0;
	for (const char of unprefixed) if (char === '-') depth++;
	return depth;
};

const DECLARED_PROPERTY_PATTERN = /(?:^|;)\s*(-{0,2}[a-zA-Z][\w-]*)\s*:/g;

// the lowest rank among a declaration block's standard properties, so a class
// setting a longhand and its custom-property companion ranks by the longhand.
// A block setting several properties ranks half a step lower, so an axis pair
// (`px_md`: padding-left and padding-right) comes before a single longhand
// (`pl_lg`) and the longhand wins where both apply
const to_declaration_rank = (declaration: string): number => {
	let rank: number | null = null;
	const properties: Set<string> = new Set();
	for (const match of declaration.matchAll(DECLARED_PROPERTY_PATTERN)) {
		const property = match[1]!.toLowerCase();
		if (property.startsWith('--')) continue;
		properties.add(property);
		const property_rank = to_property_rank(property);
		if (rank === null || property_rank < rank) rank = property_rank;
	}
	return (rank ?? 0) - (properties.size > 1 ? 0.5 : 0);
};

//
// Class Definitions
//

export interface CssClassDefinitionBase {
	comment?: string;
	/**
	 * Whether the class is a composite, rendered in the
	 * `fuz.utilities.composites` sublayer beneath every single-purpose class,
	 * so a token or literal class on the same element always wins over the
	 * composite's declaration of the same property. Defaults to `true` for
	 * `composes` and `ruleset` definitions, `false` for a `declaration`
	 * without `composes`.
	 */
	composite?: boolean;
}

/** Pure utility composition (composes only). */
export interface CssClassDefinitionComposition extends CssClassDefinitionBase {
	composes: Array<string>;
	declaration?: never;
	ruleset?: never;
}

/** Custom CSS declaration (optionally seeded with composes). */
export interface CssClassDefinitionDeclaration extends CssClassDefinitionBase {
	declaration: string;
	composes?: Array<string>;
	ruleset?: never;
}

/** Full ruleset with selectors. */
export interface CssClassDefinitionRuleset extends CssClassDefinitionBase {
	ruleset: string;
	composes?: never;
	declaration?: never;
}

/** Static definitions (not interpreter-based). */
export type CssClassDefinitionStatic =
	CssClassDefinitionComposition | CssClassDefinitionDeclaration | CssClassDefinitionRuleset;

/** Full union including interpreters. */
export type CssClassDefinition = CssClassDefinitionStatic | CssClassDefinitionInterpreter;

/**
 * Context passed to CSS class interpreters.
 * Provides access to logging, diagnostics collection, and the class registry.
 */
export interface CssClassInterpreterContext {
	/** Optional logger for warnings/errors */
	log?: Logger;
	/** Diagnostics array to collect warnings and errors */
	diagnostics: Array<InterpreterDiagnostic>;
	/** All known CSS class definitions (token + composite classes) */
	class_definitions: Record<string, CssClassDefinition | undefined>;
	/** Valid CSS properties for literal validation, or null to skip validation */
	css_properties: Set<string> | null;
}

/**
 * Interpreter for dynamic CSS class generation based on pattern matching.
 *
 * An interpreter sees a class name with its modifiers already stripped -
 * `md:hover:grid-cols-4` reaches it as `grid-cols-4` - and returns a
 * definition like a static one, so modifiers, ordering, and layering apply to
 * what it returns the same as to a static class. A `ruleset` names the class
 * it was given; the generator renames it to the full modified class.
 *
 * Leading segments named like modifiers are stripped greedily, and the
 * generator backs off one at a time, so an interpreter is offered the
 * shortest base first: `marker:none` arrives as `none` before the full
 * literal, since `marker` is also a pseudo-element modifier (`cue` likewise).
 * A broad pattern shouldn't claim such a sub-base.
 */
export interface CssClassDefinitionInterpreter extends CssClassDefinitionBase {
	pattern: RegExp;
	/**
	 * @mutates `ctx.diagnostics` - implementations push errors/warnings to the diagnostics array
	 */
	interpret: (
		matched: RegExpMatchArray,
		ctx: CssClassInterpreterContext
	) => CssClassDefinitionStatic | null;
}

//
// CSS Generation
//

/**
 * Result from CSS class generation.
 */
export interface GenerateClassesCssResult {
	css: string;
	diagnostics: Array<GenerationDiagnostic>;
	/** CSS variables used by the generated classes (without -- prefix) */
	variables_used: Set<string>;
}

export interface GenerateClassesCssOptions {
	class_names: Iterable<string>;
	class_definitions: Record<string, CssClassDefinition | undefined>;
	interpreters: Array<CssClassDefinitionInterpreter>;
	/** Valid CSS properties for literal validation, or null to skip validation */
	css_properties: Set<string> | null;
	log?: Logger;
	class_locations?: Map<string, Array<SourceLocation> | null>;
	/**
	 * Classes that were explicitly annotated (via `@fuz-classes` or `additional_classes`).
	 * An explicit class that no definition or interpreter resolves is an error,
	 * unless `is_base_style_class` claims it.
	 */
	explicit_classes?: Set<string> | null;
	/**
	 * Whether the bundled base styles target a class, so an explicit class
	 * with no utility definition still resolves - its base rules ship instead.
	 * Null when no base styles are bundled (utility-only mode or
	 * `base_css: null`), where such a class errors.
	 */
	is_base_style_class?: ((class_name: string) => boolean) | null;
}

/**
 * Generates the utility CSS for a set of class names, wrapped in the
 * `fuz.utilities` cascade layer.
 *
 * Each class resolves to a structured rule - a definition plus the modifiers
 * stripped from its name - and the emitted order comes from that structure,
 * not from what the names say: composites render in the
 * `fuz.utilities.composites` sublayer beneath every single-purpose class, and
 * within each tier rules sort by color scheme, then media query
 * (`compare_media_modifiers`), then property rank (shorthands before
 * longhands, `to_property_rank`; definition order for composites), then
 * state order (LVFHA), then registry order (interpreted classes after static
 * ones), and only then by name, between interpreted classes of equal rank.
 * Rules sharing a color scheme and
 * media query render in one block. `dark:` and `light:` add no
 * specificity (`:where()`), so they win by that order, and follow the OS
 * preference when the root names no scheme (`render_color_scheme_rules`).
 */
export const generate_classes_css = (
	options: GenerateClassesCssOptions
): GenerateClassesCssResult => {
	const {
		class_names,
		class_definitions,
		interpreters,
		css_properties,
		log,
		class_locations,
		explicit_classes,
		is_base_style_class
	} = options;
	const diagnostics: Array<GenerationDiagnostic> = [];
	const variables_used: Set<string> = new Set();

	const definition_indexes: Map<string, number> = new Map();
	const keys = Object.keys(class_definitions);
	for (let i = 0; i < keys.length; i++) definition_indexes.set(keys[i]!, i);

	const composite_rules: Array<CssClassRule> = [];
	const atomic_rules: Array<CssClassRule> = [];

	for (const class_name of class_names) {
		const locations = class_locations?.get(class_name) ?? null;
		const resolved = resolve_class_name(class_name, {
			log,
			class_definitions,
			interpreters,
			css_properties
		});

		// convert the resolution diagnostics, naming the full class. A class
		// nobody asked for by name may belong to another CSS system, so an
		// unknown property or modifier (Tailwind's arbitrary variants like
		// `has-[:checked]:`) or misordered modifiers (Tailwind takes them in
		// any order) only warn for it; other errors - an interpreter reporting
		// a broken definition - stay errors
		const is_explicit = explicit_classes?.has(class_name) ?? false;
		for (const diag of resolved.diagnostics) {
			const is_foreign_shape =
				diag.level === 'error' &&
				((!resolved.ok && resolved.malformed) ||
					diag.message.startsWith('Unknown CSS property') ||
					diag.message.startsWith('Unknown modifier'));
			const level = is_foreign_shape && !is_explicit ? 'warning' : diag.level;
			diagnostics.push(
				create_generation_diagnostic({ ...diag, identifier: class_name, level }, locations)
			);
		}

		if (!resolved.ok) {
			// an explicit class nothing resolves is an error, unless an attempt
			// already reported why or the bundled base styles target it
			if (is_explicit && !resolved.diagnostics.length && !is_base_style_class?.(class_name)) {
				diagnostics.push({
					phase: 'generation',
					level: 'error',
					message: 'No matching class definition found',
					identifier: class_name,
					suggestion: is_base_style_class
						? 'Check spelling or add a custom class definition'
						: 'Check spelling or add a custom class definition - a class only base styles define (like `selected`) resolves only when base styles are bundled (base_css not null)',
					locations
				});
			}
			continue;
		}

		const rule = to_class_rule(
			class_name,
			resolved,
			class_definitions,
			css_properties,
			resolved.from_interpreter
				? keys.length
				: (definition_indexes.get(resolved.base_class_name) ?? keys.length),
			(diag) =>
				diagnostics.push({
					phase: 'generation',
					level: diag.level,
					message: diag.message,
					suggestion: diag.suggestion,
					identifier: class_name,
					locations
				})
		);
		if (!rule) continue;
		for (const variable of extract_css_variables(to_rule_body_css(rule.body))) {
			variables_used.add(variable);
		}
		(rule.composite ? composite_rules : atomic_rules).push(rule);
	}

	const composites_css = render_class_rules(composite_rules.sort(compare_class_rules));
	const atomic_css = render_class_rules(atomic_rules.sort(compare_class_rules));
	const layered = [composites_css ? `@layer composites {\n${composites_css}\n}` : '', atomic_css]
		.filter(Boolean)
		.join('\n');
	const css = layered ? `@layer fuz.utilities {\n${layered}\n}\n` : '';

	return { css, diagnostics, variables_used };
};

/**
 * A utility class resolved to the rule it renders, before it's written as
 * CSS - what `generate_classes_css` orders, groups, and layers.
 */
export interface CssClassRule {
	class_name: string;
	modifiers: ExtractedModifiers;
	/** Renders in the `fuz.utilities.composites` sublayer. */
	composite: boolean;
	/**
	 * Order within a color scheme and media query: the definition index for a
	 * composite, the property rank (`to_property_rank`) otherwise.
	 */
	rank: number;
	/**
	 * The definition's position in the registry, after every static definition
	 * for an interpreted class, breaking ties between rules of equal rank.
	 */
	definition_index: number;
	body: CssClassRuleBody;
	comment: string | null;
}

/**
 * What a class rule renders: a declaration block on the class selector, a
 * set of rules with their selectors already rewritten for the class and its
 * state and pseudo-element modifiers, or an unmodified ruleset as written
 * (which may hold at-rules of its own).
 */
export type CssClassRuleBody =
	| { type: 'declaration'; selector: string; declaration: string }
	| { type: 'rules'; rules: Array<{ selector: string; declarations: string }> }
	| { type: 'verbatim'; css: string };

// the pseudo-element modifiers whose names are also CSS properties, for
// backing off when no property set is loaded
const PSEUDO_ELEMENT_PROPERTY_NAMES: ReadonlySet<string> = new Set(['cue', 'marker']);

const NO_MODIFIERS: ExtractedModifiers = {
	media: null,
	ancestor: null,
	states: [],
	pseudo_element: null
};

type ResolveClassNameResult =
	| {
			ok: true;
			definition: CssClassDefinitionStatic;
			base_class_name: string;
			modifiers: ExtractedModifiers;
			from_interpreter: boolean;
			diagnostics: Array<InterpreterDiagnostic>;
	  }
	| {
			ok: false;
			diagnostics: Array<InterpreterDiagnostic>;
			/** Whether the class failed the modifier grammar (misordered modifiers). */
			malformed: boolean;
	  };

interface ResolveClassNameContext {
	log?: Logger;
	class_definitions: Record<string, CssClassDefinition | undefined>;
	interpreters: Array<CssClassDefinitionInterpreter>;
	css_properties: Set<string> | null;
}

/**
 * Resolves a class name by the grammar `[modifier:]*base`, where the base is
 * a static definition or what an interpreter returns for it. Leading segments
 * are taken as modifiers greedily, backing off one at a time when the base
 * doesn't resolve, so a base that starts with a modifier's name - the
 * `marker` property in `marker:none` or `before:marker:none` - still
 * resolves. Modifiers in the wrong order fail outright. When nothing
 * resolves, the diagnostics are those of the first attempt that reported any.
 */
const resolve_class_name = (
	class_name: string,
	ctx: ResolveClassNameContext
): ResolveClassNameResult => {
	const static_definition = ctx.class_definitions[class_name];
	if (static_definition && !('pattern' in static_definition)) {
		return {
			ok: true,
			definition: static_definition,
			base_class_name: class_name,
			modifiers: NO_MODIFIERS,
			from_interpreter: false,
			diagnostics: []
		};
	}

	const segments = extract_segments(class_name);
	let modifier_count = 0;
	while (modifier_count < segments.length - 1 && get_modifier(segments[modifier_count]!)) {
		modifier_count++;
	}

	let first_diagnostics: Array<InterpreterDiagnostic> | null = null;
	let grammar_error: InterpreterDiagnostic | null = null;
	for (let k = modifier_count; k >= 0; k--) {
		const attempt_diagnostics: Array<InterpreterDiagnostic> = [];
		let modifiers = NO_MODIFIERS;
		if (k > 0) {
			const extracted = extract_and_validate_modifiers(segments.slice(0, k), class_name);
			if (!extracted.ok) {
				// a pseudo-element's name can also be a property's (`marker` in
				// `before:marker:none`), so back off once to read it as the base;
				// otherwise the modifiers are in the wrong order, and backing off
				// would only reread a modifier as part of the base
				const segment = segments[k - 1]!;
				if (
					grammar_error ||
					get_modifier(segment)?.type !== 'pseudo-element' ||
					!(ctx.css_properties ?? PSEUDO_ELEMENT_PROPERTY_NAMES).has(segment)
				) {
					return { ok: false, diagnostics: [grammar_error ?? extracted.error], malformed: true };
				}
				grammar_error = extracted.error;
				continue;
			}
			modifiers = extracted.modifiers;
		}
		const base_class_name = k > 0 ? segments.slice(k).join(':') : class_name;
		const base = resolve_base_class(base_class_name, ctx, attempt_diagnostics);
		if (base) {
			return {
				ok: true,
				definition: base.definition,
				base_class_name,
				modifiers,
				from_interpreter: base.from_interpreter,
				diagnostics: attempt_diagnostics
			};
		}
		if (attempt_diagnostics.length) first_diagnostics ??= attempt_diagnostics;
	}
	if (grammar_error) return { ok: false, diagnostics: [grammar_error], malformed: true };
	return { ok: false, diagnostics: first_diagnostics ?? [], malformed: false };
};

// a base class name's static definition, or the first interpreter's result for it
const resolve_base_class = (
	base_class_name: string,
	ctx: ResolveClassNameContext,
	diagnostics: Array<InterpreterDiagnostic>
): { definition: CssClassDefinitionStatic; from_interpreter: boolean } | null => {
	const static_definition = ctx.class_definitions[base_class_name];
	if (static_definition && !('pattern' in static_definition)) {
		return { definition: static_definition, from_interpreter: false };
	}
	const interpreter_ctx: CssClassInterpreterContext = {
		log: ctx.log,
		diagnostics,
		class_definitions: ctx.class_definitions,
		css_properties: ctx.css_properties
	};
	for (const interpreter of ctx.interpreters) {
		const matched = base_class_name.match(interpreter.pattern);
		if (!matched) continue;
		const definition = interpreter.interpret(matched, interpreter_ctx);
		if (definition) {
			return {
				definition: {
					comment: interpreter.comment,
					composite: interpreter.composite,
					...definition
				},
				from_interpreter: true
			};
		}
	}
	return null;
};

// the rule a resolved class renders, or null after reporting why it renders nothing
const to_class_rule = (
	class_name: string,
	resolved: Extract<ResolveClassNameResult, { ok: true }>,
	class_definitions: Record<string, CssClassDefinition | undefined>,
	css_properties: Set<string> | null,
	definition_index: number,
	report: (diag: BaseDiagnostic) => void
): CssClassRule | null => {
	const { definition, base_class_name, modifiers, from_interpreter } = resolved;
	const escaped = escape_css_selector(class_name);
	const composite =
		definition.composite ?? ('ruleset' in definition || definition.composes !== undefined);
	const comment = definition.comment?.trim() || null;
	const selector_suffix =
		modifiers.states.map((s) => s.css).join('') + (modifiers.pseudo_element?.css ?? '');

	if ('ruleset' in definition && definition.ruleset !== undefined) {
		if (!definition.ruleset.trim()) {
			report({
				level: 'warning',
				message: `Ruleset "${base_class_name}" is empty`,
				suggestion: `Add CSS rules or remove the empty ruleset definition`
			});
			return null;
		}
		let parsed;
		try {
			parsed = parse_ruleset(definition.ruleset);
		} catch (e) {
			report({
				level: 'warning',
				message: `Failed to parse ruleset for "${base_class_name}": ${to_error_message(e)}`,
				suggestion: 'Check for CSS syntax errors in the ruleset'
			});
			return null;
		}
		// validated against the definition's own class name, before any
		// modifier renames it
		const escaped_base = escape_css_selector(base_class_name);
		if (!ruleset_contains_class(parsed.rules, escaped_base)) {
			report({
				level: 'warning',
				message: `Ruleset "${base_class_name}" has no selectors containing ".${base_class_name}"`,
				suggestion: `Ensure at least one selector uses ".${base_class_name}" so the class works when applied`
			});
		}
		const without_comments = definition.ruleset.replace(/\/\*[\s\S]*?\*\//g, '').trim();
		if (
			!from_interpreter &&
			!without_comments.startsWith('@') &&
			is_single_selector_ruleset(parsed.rules, escaped_base)
		) {
			report({
				level: 'warning',
				message: `Ruleset "${base_class_name}" has a single selector and could be converted to declaration format for modifier support`,
				suggestion: `Convert to: { declaration: '${parsed.rules[0]?.declarations
					.replace(/\s+/g, ' ')
					.trim()}' }`
			});
		}
		const modified = class_name !== base_class_name;
		if (!modified) {
			return {
				class_name,
				modifiers,
				composite,
				rank: composite ? definition_index : 0,
				definition_index,
				body: { type: 'verbatim', css: definition.ruleset.trim() },
				comment
			};
		}
		const { rules, skipped_modifiers } = modify_ruleset(
			definition.ruleset,
			base_class_name,
			escaped,
			modifiers.states.map((s) => s.css),
			modifiers.pseudo_element?.css ?? ''
		);
		if (skipped_modifiers) {
			for (const skipped of skipped_modifiers) report(to_skipped_diagnostic(skipped));
		}
		return {
			class_name,
			modifiers,
			composite,
			rank: composite ? definition_index : 0,
			definition_index,
			body: { type: 'rules', rules },
			comment
		};
	}

	const resolution = resolve_class_definition(
		definition,
		base_class_name,
		class_definitions,
		css_properties
	);
	if (!resolution.ok) {
		report(resolution.error);
		return null;
	}
	if (resolution.warnings) {
		for (const warning of resolution.warnings) report(warning);
	}
	if (!resolution.declaration) return null;
	return {
		class_name,
		modifiers,
		composite,
		rank: composite ? definition_index : to_declaration_rank(resolution.declaration),
		definition_index,
		body: {
			type: 'declaration',
			selector: `.${escaped}${selector_suffix}`,
			declaration: resolution.declaration
		},
		comment
	};
};

const to_skipped_diagnostic = (skipped: SkippedModifierInfo): BaseDiagnostic => ({
	level: 'warning',
	message:
		skipped.reason === 'pseudo_element_conflict'
			? `Rule "${skipped.selector}" already contains a pseudo-element; "${skipped.conflicting_modifier}" modifier was not applied`
			: `Rule "${skipped.selector}" already contains "${skipped.conflicting_modifier}"; modifier was not applied to avoid redundancy`,
	suggestion: `The rule is included with just the class renamed`
});

const to_rule_body_css = (body: CssClassRuleBody): string => {
	switch (body.type) {
		case 'declaration':
			return body.declaration;
		case 'rules':
			return body.rules.map((r) => r.declarations).join('\n');
		case 'verbatim':
			return body.css;
	}
};

// the cascade order among a rule's states, its latest LVFHA state winning
const to_state_order = (rule: CssClassRule): number => {
	let order = 0;
	for (const state of rule.modifiers.states) {
		if (state.order !== undefined && state.order > order) order = state.order;
	}
	return order;
};

const compare_ancestors = (a: ModifierDefinition | null, b: ModifierDefinition | null): number => {
	if (a?.name === b?.name) return 0;
	if (!a) return -1;
	if (!b) return 1;
	return a.name.localeCompare(b.name);
};

/**
 * Orders class rules for emission, the later winning where two apply with
 * equal specificity: color scheme, media query, rank, state order, then
 * registry order (so a token or literal wins a same-property tie with a
 * single-property shortcut like `circular`), then the class name by code
 * units, a deterministic last resort that decides only between interpreted
 * classes of equal rank (two literals of one property, like
 * `opacity:50% opacity:80%`, conflict by name).
 */
const compare_class_rules = (a: CssClassRule, b: CssClassRule): number =>
	compare_ancestors(a.modifiers.ancestor, b.modifiers.ancestor) ||
	compare_media_modifiers(a.modifiers.media, b.modifiers.media) ||
	a.rank - b.rank ||
	to_state_order(a) - to_state_order(b) ||
	a.definition_index - b.definition_index ||
	(a.class_name < b.class_name ? -1 : a.class_name > b.class_name ? 1 : 0);

// renders sorted rules, one block per run sharing a color scheme and media query
const render_class_rules = (rules: Array<CssClassRule>): string => {
	const blocks: Array<string> = [];
	let i = 0;
	while (i < rules.length) {
		const { ancestor, media } = rules[i]!.modifiers;
		let j = i + 1;
		while (
			j < rules.length &&
			rules[j]!.modifiers.ancestor?.name === ancestor?.name &&
			rules[j]!.modifiers.media?.css === media?.css
		) {
			j++;
		}
		blocks.push(render_rule_group(rules.slice(i, j), ancestor, media));
		i = j;
	}
	return blocks.join('\n');
};

const render_rule_group = (
	rules: Array<CssClassRule>,
	ancestor: ModifierDefinition | null,
	media: ModifierDefinition | null
): string => {
	if (ancestor) {
		const scheme = ancestor.css as 'light' | 'dark';
		// comments once, on the explicit-class rendering
		return render_color_scheme_rules(
			scheme,
			(root) =>
				rules
					.map((rule) =>
						render_class_rule(
							rule,
							`:where(${root}) `,
							root === COLOR_SCHEME_ROOTS[scheme].explicit
						)
					)
					.join('\n'),
			media?.css ?? null
		);
	}
	const css = rules.map((rule) => render_class_rule(rule, '', true)).join('\n');
	return media ? `@media ${media.css} {\n${css.replace(/^(?=.)/gm, '\t')}\n}` : css;
};

const render_class_rule = (
	rule: CssClassRule,
	selector_prefix: string,
	with_comment: boolean
): string => {
	const comment =
		with_comment && rule.comment
			? rule.comment.includes('\n')
				? `/*\n${rule.comment
						.split('\n')
						.map((line) => line.trim())
						.join('\n')}\n*/\n`
				: `/* ${rule.comment} */\n`
			: '';
	const { body } = rule;
	switch (body.type) {
		case 'declaration':
			return `${comment}${selector_prefix}${body.selector} { ${body.declaration} }`;
		case 'rules':
			return (
				comment +
				body.rules
					.map(
						(r) =>
							`${split_selector_list(r.selector)
								.map((s) => selector_prefix + s.trim())
								.join(',\n')} { ${r.declarations} }`
					)
					.join('\n')
			);
		case 'verbatim':
			return comment + body.css;
	}
};
