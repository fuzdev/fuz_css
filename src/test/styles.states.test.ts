/**
 * @vitest-environment jsdom
 */
import { describe, test, assert } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCss, type AST } from 'svelte/compiler';

import { css_class_composites } from '#lib/css_class_composites.ts';

// the interaction and accessibility states in the base styles and composites,
// checked by matching their selectors against elements in jsdom - jsdom has no
// hover, focus, or forced colors, so those become attributes the rewritten
// selectors match instead

const main_stylesheet_text = readFileSync('./src/lib/style.css', 'utf8');

const FORCED_COLORS = '(forced-colors: active)';

interface FlatRule {
	selector: string;
	/** The preludes of the `@media` rules enclosing the declarations, outermost first. */
	media: Array<string>;
	declarations: Map<string, string>;
}

const to_declarations = (nodes: Array<AST.CSS.Node>): Map<string, string> =>
	new Map(nodes.flatMap((n) => (n.type === 'Declaration' ? [[n.property, n.value] as const] : [])));

/**
 * Flattens a stylesheet's style rules, layers and `@media` included, into one
 * entry per declaration block, so a `@media` nested in a rule (the composites'
 * forced-colors rules) is its own entry under the rule's selector.
 */
const flatten_rules = (css: string): Array<FlatRule> => {
	const rules: Array<FlatRule> = [];
	const visit = (nodes: Array<AST.CSS.Node>, selector: string | null, media: Array<string>) => {
		for (const node of nodes) {
			if (node.type === 'Rule') {
				const rule_selector = css.slice(node.prelude.start, node.prelude.end);
				rules.push({
					selector: rule_selector,
					media,
					declarations: to_declarations(node.block.children)
				});
				visit(node.block.children, rule_selector, media);
			} else if (node.type === 'Atrule' && node.block) {
				const next_media = node.name === 'media' ? [...media, node.prelude] : media;
				if (selector !== null) {
					rules.push({
						selector,
						media: next_media,
						declarations: to_declarations(node.block.children)
					});
				}
				visit(node.block.children, selector, next_media);
			}
		}
	};
	visit(parseCss(css).children, null, []);
	return rules;
};

/** A composite's CSS as a stylesheet: its ruleset, or its declaration under its class. */
const composite_css = (name: string): string => {
	const definition = css_class_composites[name];
	assert(definition, name);
	if ('ruleset' in definition && definition.ruleset) return definition.ruleset;
	assert('declaration' in definition && definition.declaration, name);
	return `.${name} { ${definition.declaration} }`;
};

const base_rules = flatten_rules(main_stylesheet_text);

const UNREWRITTEN_STATE_MATCHER = /:(?:hover|active|focus(?:-visible|-within)?)(?![\w-])/;

/**
 * Rewrites the states jsdom can't enter as attributes the test elements set.
 * Throws on an interaction pseudo-class left unrewritten, which jsdom can't
 * match either and fails on with an unrelated error.
 */
const to_matchable = (selector: string): string => {
	const rewritten = selector
		.replaceAll(':focus-visible', '[data-focus-visible]')
		.replaceAll(':focus-within', '[data-focus-within]')
		.replaceAll(':hover', '[data-hover]')
		.replaceAll(':active', '[data-active]');
	const unrewritten = UNREWRITTEN_STATE_MATCHER.exec(rewritten);
	if (unrewritten) {
		throw Error(
			`no rewrite for \`${unrewritten[0]}\` in \`${selector}\` - add one to \`to_matchable\``
		);
	}
	return rewritten;
};

const create_element = (html: string): Element => {
	const template = document.createElement('template');
	template.innerHTML = html;
	const element = template.content.firstElementChild;
	assert(element, html);
	return element;
};

const matches = (rule: FlatRule, html: string): boolean =>
	create_element(html).matches(to_matchable(rule.selector));

/** Finds the one rule outside any `@media` that declares `property: value`. */
const find_rule = (rules: Array<FlatRule>, property: string, value: string): FlatRule => {
	const found = rules.filter((r) => r.media.length === 0 && r.declarations.get(property) === value);
	assert.strictEqual(found.length, 1, `one rule declaring ${property}: ${value}`);
	return found[0]!;
};

/** The longhands each shorthand in the compared rules resets - `outline` leaves `outline-offset`. */
const SHORTHAND_LONGHANDS: Record<string, Array<string>> = {
	outline: ['outline-color', 'outline-style', 'outline-width'],
	border: ['border-color', 'border-style', 'border-width', 'border-image'],
	'border-color': [
		'border-top-color',
		'border-right-color',
		'border-bottom-color',
		'border-left-color'
	]
};

/**
 * Merges the declarations of the rules matching `html` under `media` (`null`
 * for the rules outside any `@media`) in source order, ignoring specificity,
 * so the rules it compares must keep their equal-specificity overrides in
 * source order - true of the base styles, whose selectors are all `:where()`,
 * and of the composites' forced-colors rules. A shorthand in
 * `SHORTHAND_LONGHANDS` clears the longhands set before it, as it does in the
 * cascade.
 */
const resolve_declarations = (
	rules: Array<FlatRule>,
	media: string | null,
	html: string
): Map<string, string> => {
	const element = create_element(html);
	const resolved: Map<string, string> = new Map();
	for (const rule of rules) {
		const in_media = media === null ? rule.media.length === 0 : rule.media.includes(media);
		if (!in_media || !element.matches(to_matchable(rule.selector))) continue;
		for (const [property, value] of rule.declarations) {
			for (const longhand of SHORTHAND_LONGHANDS[property] ?? []) resolved.delete(longhand);
			resolved.set(property, value);
		}
	}
	return resolved;
};

describe('button states', () => {
	test('the hover fill is hover-only, with no focus or aria-expanded branch', () => {
		const rule = find_rule(base_rules, '--button_fill', 'var(--button_fill_hover)');
		assert.notInclude(rule.selector, 'focus');
		assert.notInclude(rule.selector, 'aria-expanded');
		assert.isTrue(matches(rule, '<button data-hover></button>'));
		assert.isFalse(matches(rule, '<button data-focus-visible></button>'));
		assert.isFalse(matches(rule, '<button aria-expanded="true"></button>'));
		assert.isFalse(matches(rule, '<button disabled data-hover></button>'));
		assert.isFalse(matches(rule, '<button aria-disabled="true" data-hover></button>'));
	});

	test('a pressed or deselectable selected button lightens its label on hover, a settled one keeps it', () => {
		const rule = find_rule(base_rules, '--button_text_color', 'var(--text_min)');
		assert.isTrue(matches(rule, '<button aria-pressed="true" data-hover></button>'));
		assert.isTrue(matches(rule, '<button class="selected deselectable" data-hover></button>'));
		assert.isTrue(
			matches(
				rule,
				'<button class="selected deselectable" aria-pressed="true" data-hover></button>'
			)
		);
		// the settled `.selected` (cord's join page, a view-mode toggle) pairs with aria-pressed
		assert.isFalse(
			matches(rule, '<button class="selected" aria-pressed="true" data-hover></button>')
		);
		assert.isFalse(matches(rule, '<button class="selected" data-hover></button>'));
		assert.isFalse(matches(rule, '<button aria-pressed="true" disabled data-hover></button>'));
		assert.isFalse(matches(rule, '<button aria-pressed="true"></button>'));
	});
});

describe('selected composites', () => {
	// `.menuitem` and `.selectable` paint their selected state as a light tint
	// over the base button's solid selected fill, so the label can't stay the
	// base rules' inverse. The composites render in a layer above the base
	// styles, so a composite's label wins over every base rule whatever the
	// specificity - the label is the base rules' resolution with the
	// composite's laid over it
	const LABEL = '--button_text_color';
	const label_rules = (rules: Array<FlatRule>) => rules.filter((r) => r.declarations.has(LABEL));
	const base_label_rules = label_rules(base_rules);
	const label = (html: string, composite: string): string | undefined =>
		resolve_declarations(label_rules(flatten_rules(composite_css(composite))), null, html).get(
			LABEL
		) ?? resolve_declarations(base_label_rules, null, html).get(LABEL);
	const STATES = ['', 'data-hover', 'data-active', 'data-hover data-active', 'data-focus-visible'];
	/** Adds attributes to the outermost element of `html`. */
	const with_attrs = (html: string, attrs: string): string =>
		attrs ? html.replace(/^<(\w+)/, `<$1 ${attrs}`) : html;

	test('the base selected button keeps its inverse label, the case the composites reset', () => {
		for (const state of STATES) {
			const html = with_attrs('<button class="selected"></button>', state);
			assert.strictEqual(
				resolve_declarations(base_label_rules, null, html).get(LABEL),
				'var(--text_00)',
				html
			);
		}
	});

	test('a selected or pressed .menuitem or .selectable button labels in the text color', () => {
		const cases: Array<[string, Array<string>]> = [
			[
				'menuitem',
				[
					'<button class="menuitem selected"></button>',
					'<button class="menuitem selected deselectable"></button>',
					'<button class="menuitem" aria-pressed="true"></button>',
					'<button class="menuitem deselectable" aria-pressed="true"></button>',
					'<button class="menuitem selected" aria-pressed="true"></button>',
					'<button class="menuitem plain selected"></button>',
					'<button class="menuitem plain" aria-pressed="true"></button>',
					'<button class="menuitem palette_a selected"></button>'
				]
			],
			[
				'selectable',
				[
					'<button class="selectable selected"></button>',
					'<button class="selectable selected deselectable"></button>',
					'<button class="selectable" aria-pressed="true"></button>',
					'<button class="selectable selected" aria-pressed="true"></button>',
					'<button class="plain selectable selected"></button>',
					'<button class="selectable palette_a selected"></button>'
				]
			]
		];
		for (const [name, elements] of cases) {
			for (const element of elements) {
				for (const state of STATES) {
					const html = with_attrs(element, state);
					assert.strictEqual(label(html, name), 'var(--text_color)', html);
				}
			}
			// unselected, the composite leaves the label to the base rules
			for (const state of STATES) {
				const html = with_attrs(`<button class="${name}"></button>`, state);
				assert.isUndefined(
					resolve_declarations(label_rules(flatten_rules(composite_css(name))), null, html).get(
						LABEL
					),
					html
				);
			}
		}
	});

	test('a pressed .menuitem or .selectable takes the selected tint in every state, but not its settled cursor', () => {
		for (const name of ['menuitem', 'selectable']) {
			// the composite's own rules, which outrank every base rule from their layer
			const rules = flatten_rules(composite_css(name));
			const resolve = (html: string) => {
				const declarations = resolve_declarations(rules, null, html);
				const cursor = declarations.get('cursor');
				declarations.delete('cursor');
				return { declarations, cursor };
			};
			for (const shape of ['button', 'li', 'div']) {
				const element = (classes: string, attrs: string) =>
					`<${shape} class="${classes}" ${attrs}></${shape}>`;
				for (const state of STATES) {
					const selected = resolve(element(`${name} selected`, state));
					for (const [classes, attrs] of [
						[name, 'aria-pressed="true"'],
						[`${name} deselectable`, 'aria-pressed="true"']
					] as const) {
						const html = element(classes, `${attrs} ${state}`);
						const pressed = resolve(html);
						assert.deepEqual(pressed.declarations, selected.declarations, html);
						// a pressed toggle can be unpressed, so it keeps the pointer
						assert.strictEqual(pressed.cursor, 'pointer', html);
					}
					// a settled selected item can't be clicked again
					assert.strictEqual(selected.cursor, 'default', element(`${name} selected`, state));
				}
			}
		}
	});

	test('a pressed .plain button keeps the selected fill and edge', () => {
		const rules = flatten_rules(composite_css('plain'));
		for (const html of [
			'<button class="plain" aria-pressed="true"></button>',
			'<button class="plain selected"></button>',
			'<button class="menuitem plain" aria-pressed="true"></button>'
		]) {
			assert.strictEqual(resolve_declarations(rules, null, html).size, 0, html);
		}
		const unselected = resolve_declarations(rules, null, '<button class="plain"></button>');
		assert.strictEqual(unselected.get('--button_fill'), 'transparent');
		assert.strictEqual(unselected.get('--border_color'), 'transparent');
	});
});

describe('ARIA states', () => {
	test('aria-current takes the selected link look, unless false', () => {
		const rule = find_rule(base_rules, '--text_color', 'var(--link_color_selected)');
		assert.isTrue(matches(rule, '<a class="selected"></a>'));
		assert.isTrue(matches(rule, '<a aria-current="page"></a>'));
		assert.isTrue(matches(rule, '<a aria-current="true"></a>'));
		assert.isFalse(matches(rule, '<a aria-current="false"></a>'));
		assert.isFalse(matches(rule, '<a></a>'));
	});

	test('aria-invalid turns the border and the focus ring negative on form controls', () => {
		const rule = find_rule(base_rules, '--outline_color', 'var(--negative_50)');
		assert.strictEqual(rule.declarations.get('--border_color'), 'var(--negative_50)');
		for (const tag of ['input', 'textarea', 'select']) {
			assert.isTrue(matches(rule, `<${tag} aria-invalid="true"></${tag}>`), tag);
			assert.isFalse(matches(rule, `<${tag} aria-invalid="false"></${tag}>`), tag);
			assert.isFalse(matches(rule, `<${tag}></${tag}>`), tag);
		}
		assert.isFalse(matches(rule, '<button aria-invalid="true"></button>'));
	});

	test('no rule styles aria-expanded', () => {
		assert.notInclude(main_stylesheet_text, 'aria-expanded');
	});
});

describe('form controls', () => {
	test('the select chevron draws on single selects only', () => {
		const rule = find_rule(base_rules, '--select_arrow_size', '0.35em');
		assert.isTrue(matches(rule, '<select></select>'));
		assert.isTrue(matches(rule, '<select size="1"></select>'));
		assert.isFalse(matches(rule, '<select multiple></select>'));
		assert.isFalse(matches(rule, '<select size="4"></select>'));
		assert.isFalse(matches(rule, '<select class="unstyled"></select>'));
	});

	test('text size adjustment is 100%, leaving the reader text scaling', () => {
		const root = base_rules.find(
			(r) => r.media.length === 0 && r.selector.includes(':root') && r.declarations.has('font-size')
		);
		assert(root);
		for (const property of [
			'text-size-adjust',
			'-webkit-text-size-adjust',
			'-moz-text-size-adjust'
		]) {
			assert.strictEqual(root.declarations.get(property), '100%', property);
		}
	});
});

describe('forced colors', () => {
	// selection is a Highlight band inside the edge, a focused selected item a
	// double Highlight ring outside it, and no rule opts out with
	// `forced-color-adjust: none`, which would hand the children's colors back
	const assert_selected = (declarations: Map<string, string>, label: string) => {
		assert.strictEqual(declarations.get('border-color'), 'Highlight', label);
		assert.strictEqual(
			declarations.get('outline'),
			'var(--outline_width_focus) solid Highlight',
			label
		);
		assert.strictEqual(
			declarations.get('outline-offset'),
			'calc(-1 * (var(--border_width) + var(--outline_width_focus)))',
			label
		);
	};
	const assert_focused_selected = (declarations: Map<string, string>, label: string) => {
		assert.strictEqual(
			declarations.get('outline'),
			'calc(2 * var(--outline_width_focus)) double Highlight',
			label
		);
		assert.strictEqual(declarations.get('outline-offset'), 'var(--outline_offset)', label);
	};
	const assert_disabled_selected = (declarations: Map<string, string>, label: string) => {
		assert.strictEqual(declarations.get('border-color'), 'GrayText', label);
		assert.strictEqual(declarations.get('outline-color'), 'GrayText', label);
	};
	// a focus ring alone takes the text color, leaving Highlight to selection
	const assert_focused = (declarations: Map<string, string>, label: string) => {
		assert.strictEqual(declarations.get('outline-color'), 'CanvasText', label);
		assert.isFalse(declarations.has('outline'), label);
	};
	/** Adds attributes to the outermost element of `html`. */
	const with_attrs = (html: string, attrs: string): string =>
		html.replace(/^<(\w+)/, `<$1 ${attrs}`);

	test('nothing opts out of forced colors', () => {
		const sources = [main_stylesheet_text, ...Object.keys(css_class_composites).map(composite_css)];
		for (const css of sources) {
			for (const rule of flatten_rules(css)) {
				assert.isFalse(rule.declarations.has('forced-color-adjust'), rule.selector);
			}
		}
	});

	test('selected and pressed buttons mark selection apart from focus', () => {
		const resolve = (html: string) => resolve_declarations(base_rules, FORCED_COLORS, html);
		for (const state of ['class="selected"', 'aria-pressed="true"']) {
			assert_selected(resolve(`<button ${state}></button>`), state);
			assert_selected(resolve(`<button ${state} data-hover></button>`), state);
			assert_focused_selected(resolve(`<button ${state} data-focus-visible></button>`), state);
			assert_disabled_selected(resolve(`<button ${state} disabled></button>`), state);
			assert_disabled_selected(resolve(`<button ${state} aria-disabled="true"></button>`), state);
			// focus moves the ring out, but a disabled one stays GrayText
			const focused_disabled = resolve(
				`<button ${state} aria-disabled="true" data-focus-visible></button>`
			);
			assert_focused_selected(focused_disabled, state);
			assert_disabled_selected(focused_disabled, state);
		}
		for (const tag of ['button', 'input', 'select', 'textarea']) {
			const focused = resolve(`<${tag} data-focus-visible></${tag}>`);
			assert_focused(focused, tag);
			assert.strictEqual(focused.get('border-color'), 'CanvasText', tag);
			assert.isFalse(resolve(`<${tag}></${tag}>`).has('outline-color'), tag);
			// a focused aria-disabled control rings in the text color and keeps its GrayText edge
			const focused_disabled = resolve(`<${tag} aria-disabled="true" data-focus-visible></${tag}>`);
			assert_focused(focused_disabled, tag);
			assert.strictEqual(focused_disabled.get('border-color'), 'GrayText', tag);
			assert.strictEqual(focused_disabled.get('color'), 'GrayText', tag);
		}
	});

	test('a focused link rings in the text color', () => {
		const resolve = (html: string) => resolve_declarations(base_rules, FORCED_COLORS, html);
		for (const html of ['<a href="#"></a>', '<a href="#" aria-current="page"></a>']) {
			assert_focused(resolve(with_attrs(html, 'data-focus-visible')), html);
			assert.strictEqual(resolve(html).size, 0, html);
		}
		assert.strictEqual(resolve('<a class="unstyled" data-focus-visible></a>').size, 0);
	});

	test('.selectable and .menuitem restate the selection cue inside their rules', () => {
		const cases: Array<[string, Array<string>]> = [
			[
				'selectable',
				[
					'<button class="selectable selected"></button>',
					'<button class="selectable" aria-pressed="true"></button>',
					'<li class="selectable selected"></li>'
				]
			],
			[
				'menuitem',
				[
					'<button class="menuitem selected"></button>',
					'<button class="menuitem" aria-pressed="true"></button>',
					'<li class="menuitem selected"></li>',
					'<li class="menuitem" aria-pressed="true"></li>',
					'<li class="menuitem plain selectable selected"></li>'
				]
			]
		];
		for (const [name, elements] of cases) {
			const rules = flatten_rules(composite_css(name));
			const resolve = (html: string) => resolve_declarations(rules, FORCED_COLORS, html);
			for (const html of elements) {
				const focused = with_attrs(html, 'data-focus-visible');
				const disabled = with_attrs(html, 'aria-disabled="true"');
				const focused_disabled = with_attrs(disabled, 'data-focus-visible');
				const hovered = with_attrs(html, 'data-hover');
				assert_selected(resolve(html), html);
				assert_selected(resolve(hovered), hovered);
				assert_focused_selected(resolve(focused), focused);
				assert.isFalse(resolve(focused).has('outline-color'), focused);
				assert_disabled_selected(resolve(disabled), disabled);
				// focus moves the ring out, but a disabled one stays GrayText
				assert_focused_selected(resolve(focused_disabled), focused_disabled);
				assert_disabled_selected(resolve(focused_disabled), focused_disabled);
			}
			for (const html of [
				`<button class="${name}"></button>`,
				`<div class="${name}" tabindex="0"></div>`,
				'<li class="menuitem plain selectable" tabindex="0"></li>'
			]) {
				assert.strictEqual(resolve(html).size, 0, html);
				assert_focused(resolve(with_attrs(html, 'data-focus-visible')), html);
				assert_focused(resolve(with_attrs(html, 'data-focus-visible data-hover')), html);
			}
			if (name === 'selectable') {
				// `.selectable` declares `border-color`, which outranks the base rules'
				// forced edge, so it restates the focused and aria-disabled edges itself
				for (const html of [
					'<button class="selectable"></button>',
					'<div class="selectable" tabindex="0"></div>'
				]) {
					const focused = with_attrs(html, 'data-focus-visible');
					assert.strictEqual(resolve(focused).get('border-color'), 'CanvasText', focused);
					const disabled = with_attrs(html, 'aria-disabled="true"');
					assert.strictEqual(resolve(disabled).get('border-color'), 'GrayText', disabled);
					const focused_disabled = with_attrs(disabled, 'data-focus-visible');
					assert.strictEqual(
						resolve(focused_disabled).get('border-color'),
						'GrayText',
						focused_disabled
					);
					assert_focused(resolve(focused_disabled), focused_disabled);
				}
			}
		}
	});

	test('.panel and .pane draw their edge, which forced colors otherwise strip', () => {
		for (const name of ['panel', 'pane']) {
			const forced = flatten_rules(composite_css(name)).filter((r) =>
				r.media.includes(FORCED_COLORS)
			);
			assert.strictEqual(forced.length, 1, name);
			assert.strictEqual(
				forced[0]!.declarations.get('border'),
				'var(--border_width) solid CanvasText',
				name
			);
		}
	});
});
