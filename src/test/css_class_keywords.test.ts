import { test, describe, assert } from 'vitest';

import { css_class_keywords } from '#lib/css_class_keywords.ts';
import { css_class_definitions } from '#lib/css_class_definitions.ts';
import { css_class_composites } from '#lib/css_class_composites.ts';
import { css_class_interpreters } from '#lib/css_class_interpreters.ts';
import { generate_classes_css } from '#lib/css_class_generation.ts';
import { generate_css } from '#lib/generate_css.ts';
import { load_css_properties } from '#lib/css_literal.ts';
import { get_modifier } from '#lib/modifiers.ts';

const webref = await import('@webref/css');
const webref_index = await webref.default.index();
const css_properties = await load_css_properties();

const generate = (class_names: Array<string>): ReturnType<typeof generate_classes_css> =>
	generate_classes_css({
		class_names,
		class_definitions: css_class_definitions,
		interpreters: css_class_interpreters,
		css_properties
	});

// the keywords a property's value grammar admits, following `<type>` references
const to_grammar_keywords = (property: string): Set<string> => {
	const keywords: Set<string> = new Set();
	const visited: Set<string> = new Set();
	const walk = (syntax: string): void => {
		// type references, skipping functional ones like `<running()>`
		for (const match of syntax.matchAll(/<([a-z][a-z-]*)(?:\s[^>]*)?>/g)) {
			const name = match[1]!;
			if (visited.has(name)) continue;
			visited.add(name);
			const type_syntax = webref_index.types[name]?.syntax;
			if (type_syntax) walk(type_syntax);
		}
		const without_types = syntax.replace(/<[^>]*>/g, ' ').replace(/'[^']*'/g, ' ');
		for (const match of without_types.matchAll(/(?<![\w-])[a-z][a-z-]*(?![\w-(])/g)) {
			keywords.add(match[0]);
		}
	};
	const syntax = webref_index.properties[property]?.syntax;
	assert.ok(syntax, `no syntax for ${property}`);
	walk(syntax);
	return keywords;
};

const DECLARATION_PATTERN = /^([a-z-]+): ([a-z-]+);$/;

describe('css_class_keywords', () => {
	test('each keyword class sets one property to its own name, a legal value of it', () => {
		for (const [name, definition] of Object.entries(css_class_keywords)) {
			if (name === 'hidden') continue;
			const matched = DECLARATION_PATTERN.exec(definition.declaration);
			assert.ok(matched, `"${name}" declares one property: ${definition.declaration}`);
			const [, property, value] = matched;
			assert.strictEqual(value, name);
			assert.ok(to_grammar_keywords(property!).has(name), `"${name}" is a ${property} keyword`);
			assert.notOk(definition.late, `"${name}" orders by rank alone`);
		}
	});

	test('the grammar walk rejects a keyword the property does not take', () => {
		assert.notOk(to_grammar_keywords('display').has('sticky'));
		assert.notOk(to_grammar_keywords('position').has('flex'));
		assert.ok(to_grammar_keywords('display').has('inline-block'));
		assert.ok(to_grammar_keywords('font-weight').has('bold'));
	});

	test('hidden mirrors the HTML attribute and orders late', () => {
		assert.deepEqual(css_class_keywords.hidden, { declaration: 'display: none;', late: true });
	});

	test('the slate', () => {
		assert.deepEqual(Object.keys(css_class_keywords), [
			'flex',
			'inline-flex',
			'grid',
			'inline-grid',
			'inline-block',
			'block',
			'flow-root',
			'relative',
			'absolute',
			'fixed',
			'sticky',
			'uppercase',
			'lowercase',
			'capitalize',
			'italic',
			'oblique',
			'bold',
			'bolder',
			'lighter',
			'underline',
			'overline',
			'line-through',
			'hidden'
		]);
	});

	test('no keyword class shares a name with a modifier or a composite', () => {
		for (const name of Object.keys(css_class_keywords)) {
			assert.notOk(get_modifier(name), `"${name}" is a modifier`);
			assert.notOk(name in css_class_composites, `"${name}" is a composite`);
		}
	});

	test('every keyword class reaches the registry unshadowed', () => {
		for (const [name, definition] of Object.entries(css_class_keywords)) {
			assert.strictEqual(css_class_definitions[name], definition, name);
		}
	});

	test('the composites keep their definitions', () => {
		for (const name of ['row', 'column', 'box']) {
			assert.strictEqual(css_class_definitions[name], css_class_composites[name]);
		}
	});

	test('keyword classes are single-purpose', () => {
		const { css, diagnostics } = generate(['flex', 'sticky', 'bold']);
		assert.notInclude(css, '@layer composites');
		assert.deepEqual(diagnostics, []);
	});

	test('keyword classes render their declarations verbatim', () => {
		const { css } = generate(['inline-flex', 'line-through', 'bold', 'hidden']);
		assert.include(css, '.inline-flex { display: inline-flex; }');
		assert.include(css, '.line-through { text-decoration-line: line-through; }');
		assert.include(css, '.bold { font-weight: bold; }');
		assert.include(css, '.hidden { display: none; }');
	});

	test('keyword classes take modifiers', () => {
		const { css, diagnostics } = generate(['hover:underline', 'md:flex', 'dark:italic']);
		assert.include(css, '.hover\\:underline:hover { text-decoration-line: underline; }');
		assert.include(css, '.md\\:flex { display: flex; }');
		assert.include(css, '.dark\\:italic');
		assert.deepEqual(diagnostics, []);
	});

	test('literals sharing a keyword prefix still interpret', () => {
		const { css, diagnostics } = generate(['flex:1', 'grid:auto~/~1fr', 'block-size:100%']);
		assert.include(css, '.flex\\:1 { flex: 1; }');
		assert.include(css, 'grid: auto / 1fr;');
		assert.include(css, '.block-size\\:100\\% { block-size: 100%; }');
		assert.deepEqual(diagnostics, []);
	});
});

describe('Tailwind-only names found implicitly', () => {
	// a Tailwind project's `flex` now resolves; its neighbors stay silent,
	// as they were before keyword classes
	test('generate nothing and report nothing', () => {
		const names = [
			'items-center',
			'justify-between',
			'flex-col',
			'flex-1',
			'font-semibold',
			'overflow-hidden',
			'text-center'
		];
		const { css, diagnostics } = generate(names);
		assert.strictEqual(css, '');
		assert.deepEqual(diagnostics, []);
	});

	test('beside a keyword class, only the keyword class renders', () => {
		const { css, diagnostics } = generate(['flex', 'items-center', 'justify-between']);
		assert.strictEqual(css, '@layer fuz.utilities {\n.flex { display: flex; }\n}\n');
		assert.deepEqual(diagnostics, []);
	});
});

describe('keyword classes in generated output', () => {
	test('only the keyword classes in use ship', () => {
		const result = generate_css({
			all_classes: new Set(['flex', 'hover:underline']),
			all_classes_with_locations: new Map(),
			explicit_classes: null,
			all_elements: new Set(),
			explicit_elements: null,
			explicit_variables: null,
			extraction_diagnostics: [],
			detected_css_variables: new Set(),
			class_definitions: css_class_definitions,
			interpreters: css_class_interpreters,
			css_properties,
			include_base: false,
			include_theme: false,
			resources: null
		});
		assert.include(result.css, '.flex { display: flex; }');
		assert.include(result.css, '.hover\\:underline:hover');
		for (const name of Object.keys(css_class_keywords)) {
			if (name === 'flex') continue;
			assert.notInclude(result.css, `.${name} `, name);
			assert.notInclude(result.css, `.${name}:`, name);
		}
		assert.notInclude(result.css, 'display: none');
	});
});
