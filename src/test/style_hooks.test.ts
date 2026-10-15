import { test, assert, describe } from 'vitest';
import { parseCss, type AST } from 'svelte/compiler';

import { style_hooks, style_hook_by_name } from '#lib/style_hooks.ts';
import { theme_knob_hook_names, theme_knob_by_name } from '#lib/knobs.ts';
import { default_variables } from '#lib/variables.ts';
import { css_class_definitions } from '#lib/css_class_definitions.ts';
import { load_default_style_css } from '#lib/style_rule_parser.ts';
import { default_cache_deps } from '#lib/deps_defaults.ts';
import { split_selector_list } from '#lib/css_ruleset_parser.ts';

const declared_names = new Set(default_variables.map((v) => v.name));

// the CSS the base styles and the class definitions ship, each as a
// stylesheet - a declaration under its class
const load_sources = async (): Promise<Array<string>> => {
	const sources = [await load_default_style_css(default_cache_deps)];
	for (const [name, definition] of Object.entries(css_class_definitions)) {
		if (definition && 'declaration' in definition && definition.declaration) {
			sources.push(`.${name} { ${definition.declaration} }`);
		}
		if (definition && 'ruleset' in definition && definition.ruleset) {
			sources.push(definition.ruleset);
		}
	}
	return sources;
};

interface FlatRule {
	/**
	 * The selector list with `:where()` unwrapped and the `.unstyled` opt-out
	 * dropped, so its compounds compare as text.
	 */
	selector: string;
	declarations: Array<{ property: string; value: string }>;
	/** Whether an at-rule other than `@layer` encloses the declarations. */
	conditional: boolean;
}

// replaces each `:where(x)` with `x`, which matches the same elements, and
// drops `:not(.unstyled)`, which every base rule carries
const normalize_selector = (selector: string): string => {
	let result = selector;
	for (let i = result.indexOf(':where('); i !== -1; i = result.indexOf(':where(')) {
		let depth = 0;
		let end = i + ':where('.length;
		for (; end < result.length; end++) {
			if (result[end] === '(') depth++;
			else if (result[end] === ')') {
				if (depth === 0) break;
				depth--;
			}
		}
		result = result.slice(0, i) + result.slice(i + ':where('.length, end) + result.slice(end + 1);
	}
	return result.replaceAll(':not(.unstyled)', '').replace(/\s+/gu, ' ').trim();
};

// one entry per declaration block - a rule's own, and each at-rule nested in
// it under the rule's selector
const flatten_rules = (css: string): Array<FlatRule> => {
	const rules: Array<FlatRule> = [];
	const to_declarations = (nodes: Array<AST.CSS.Node>): FlatRule['declarations'] =>
		nodes.flatMap((n) =>
			n.type === 'Declaration' ? [{ property: n.property, value: n.value }] : []
		);
	const visit = (nodes: Array<AST.CSS.Node>, selector: string | null, conditional: boolean) => {
		for (const node of nodes) {
			if (node.type === 'Rule') {
				// a nested style rule would need its selector resolved against the parent
				assert.isNull(selector, `nested rule under ${selector}`);
				const rule_selector = normalize_selector(css.slice(node.prelude.start, node.prelude.end));
				rules.push({
					selector: rule_selector,
					declarations: to_declarations(node.block.children),
					conditional
				});
				visit(node.block.children, rule_selector, conditional);
			} else if (node.type === 'Atrule' && node.block) {
				const inner_conditional = conditional || node.name !== 'layer';
				if (selector !== null) {
					rules.push({
						selector,
						declarations: to_declarations(node.block.children),
						conditional: inner_conditional
					});
				}
				visit(node.block.children, selector, inner_conditional);
			}
		}
	};
	visit(parseCss(css).children, null, false);
	return rules;
};

const VAR_READ_MATCHER = /var\(\s*--([a-z_][a-z0-9_]*)\s*([,)])/g;

// every read of an undeclared variable, with its fallback text (`null` for none)
const collect_hook_reads = (sources: Array<string>): Map<string, Array<string | null>> => {
	const reads: Map<string, Array<string | null>> = new Map();
	for (const source of sources) {
		for (const match of source.matchAll(VAR_READ_MATCHER)) {
			const name = match[1]!;
			if (declared_names.has(name)) continue;
			let fallback: string | null = null;
			if (match[2] === ',') {
				const start = match.index + match[0].length;
				let depth = 0;
				let end = start;
				for (; end < source.length; end++) {
					const char = source[end];
					if (char === '(') depth++;
					else if (char === ')') {
						if (depth === 0) break;
						depth--;
					}
				}
				fallback = source.slice(start, end).trim();
			}
			let list = reads.get(name);
			if (!list) reads.set(name, (list = []));
			list.push(fallback);
		}
	}
	return reads;
};

const sources = await load_sources();
const reads = collect_hook_reads(sources);
const rules = sources.flatMap(flatten_rules);

const to_read_matcher = (name: string): RegExp => new RegExp(`var\\(\\s*--${name}\\s*[,)]`, 'u');

// the rules whose declarations read the hook, and those that set it
const rules_reading = (name: string): Array<FlatRule> => {
	const matcher = to_read_matcher(name);
	return rules.filter((r) => r.declarations.some((d) => matcher.test(d.value)));
};
const rules_setting = (name: string): Array<FlatRule> =>
	rules.filter((r) => r.declarations.some((d) => d.property === `--${name}`));

// the `read_by` labels that name a group of elements rather than a selector
const READ_BY_GROUPS: Record<string, RegExp> = {
	headings: /(?<![\w.#-])h[1-6](?![\w-])/u,
	'block elements': /(?<![\w.#-])(?:p|section)(?![\w-])/u
};

// a label matches a rule whose selector names it as a compound (a `*` in a
// class label stands for a variant suffix), so `button` matches
// `button:hover` and `p button` but not `.button_x`
const to_label_matcher = (label: string): RegExp => {
	const group = READ_BY_GROUPS[label];
	if (group) return group;
	const pattern = label
		.split('*')
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'))
		.join('[a-z0-9_]+');
	return new RegExp(`${/^[a-z]/u.test(label) ? '(?<![\\w.#-])' : ''}${pattern}(?![\\w-])`, 'u');
};

// whether `rest` adds a combinator outside parentheses and brackets
const has_combinator = (rest: string): boolean => {
	let depth = 0;
	for (const char of rest) {
		if (char === '(' || char === '[') depth++;
		else if (char === ')' || char === ']') depth--;
		else if (depth === 0 && /[\s>+~]/u.test(char)) return true;
	}
	return false;
};

// whether `declaring` sets a value on every element `reading` matches: each
// of the reading selectors refines one of the declaring compounds - more
// qualifiers on the same element, or one of its pseudo-elements, which
// inherit from it - so no ancestor's value can reach the read
const declares_for = (declaring: FlatRule, reading: FlatRule): boolean => {
	const compounds = split_selector_list(declaring.selector);
	return split_selector_list(reading.selector).every((selector) =>
		compounds.some(
			(compound) =>
				selector === compound ||
				(selector.startsWith(compound) &&
					/^[:.[]/u.test(selector.slice(compound.length)) &&
					!has_combinator(selector.slice(compound.length)))
		)
	);
};

describe('style_hooks', () => {
	test('every undeclared variable the shipped CSS reads is cataloged', () => {
		// a new read needs a `style_hooks` entry (or a declared default)
		const uncataloged = [...reads.keys()].filter(
			(name) => !style_hook_by_name.has(name) && !theme_knob_hook_names.has(name)
		);
		assert.deepEqual(uncataloged, []);
	});

	test('every cataloged hook is read, undeclared, and not a knob', () => {
		for (const hook of style_hooks) {
			assert.isTrue(reads.has(hook.name), `${hook.name} is never read - remove its entry`);
			assert.isFalse(declared_names.has(hook.name), `${hook.name} is declared`);
			assert.isFalse(theme_knob_by_name.has(hook.name), `${hook.name} is a knob`);
		}
	});

	test('hook names are unique', () => {
		assert.strictEqual(style_hook_by_name.size, style_hooks.length);
	});

	test('each hook lists exactly the fallbacks its reads carry', () => {
		for (const hook of style_hooks) {
			const fallbacks = (reads.get(hook.name) ?? []).filter((f) => f !== null);
			assert.sameMembers([...new Set(fallbacks)], [...hook.fallbacks], hook.name);
		}
	});

	test('each hook lists exactly the rules that read it', () => {
		// a rule that only sets the hook doesn't belong in `read_by`
		for (const hook of style_hooks) {
			const reading = rules_reading(hook.name);
			const matchers = hook.read_by.map(to_label_matcher);
			hook.read_by.forEach((label, i) => {
				assert.isTrue(
					reading.some((r) => matchers[i]!.test(r.selector)),
					`${hook.name}: no rule ${label} reads it`
				);
			});
			for (const rule of reading) {
				assert.isTrue(
					matchers.some((m) => m.test(rule.selector)),
					`${hook.name}: ${rule.selector} reads it but read_by doesn't list it`
				);
			}
		}
	});

	test('a declaration covers a read only on the same element', () => {
		const rule = (selector: string): FlatRule => ({
			selector,
			declarations: [],
			conditional: false
		});
		const declaring = rule('button, .selectable');
		for (const reading of ['button', 'button:hover', '.selectable.selected', 'button::before']) {
			assert.isTrue(declares_for(declaring, rule(reading)), reading);
		}
		assert.isTrue(declares_for(declaring, rule('button:active, .selectable[aria-pressed]')));
		// a descendant takes an ancestor's value, and a longer name is another class
		for (const reading of [
			'button .icon',
			'.selectables',
			'p button',
			'button:hover, .chip',
			'button:hover .icon',
			'button.x > span',
			'button:not(.a) span'
		]) {
			assert.isFalse(declares_for(declaring, rule(reading)), reading);
		}
	});

	test('a fallback-less read is a local hook the reading rule declares', () => {
		// a hook read with no fallback and declared nowhere is invalid at
		// computed-value time wherever nothing sets it, and one declared only on
		// an ancestor takes whatever value the ancestor's context gives it
		for (const hook of style_hooks) {
			const hook_reads = reads.get(hook.name) ?? [];
			if (hook.local) {
				assert.isTrue(
					hook_reads.every((f) => f === null),
					`${hook.name} is local but a read carries a fallback`
				);
				// a declaration under a condition (forced colors, a breakpoint) doesn't
				// reach the read when the condition is false
				const setting = rules_setting(hook.name).filter((r) => !r.conditional);
				for (const reading of rules_reading(hook.name)) {
					assert.isTrue(
						setting.some((declaring) => declares_for(declaring, reading)),
						`${hook.name} is local but ${reading.selector} reads it without declaring it`
					);
				}
			} else {
				assert.isTrue(
					hook_reads.every((f) => f !== null),
					`${hook.name} has a read with no fallback - give it one or mark the hook local`
				);
			}
		}
	});
});
