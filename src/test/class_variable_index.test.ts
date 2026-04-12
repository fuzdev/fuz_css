import {test, assert, describe} from 'vitest';

import {
	build_class_variable_index,
	get_class_variables,
	collect_class_variables,
	get_classes_using_variable,
} from '../lib/class_variable_index.js';
import {css_class_definitions} from '../lib/css_class_definitions.js';
import type {CssClassDefinition} from '../lib/css_class_generation.js';

describe('build_class_variable_index', () => {
	test('declaration with variable', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			text_lg: {declaration: 'font-size: var(--font_size_lg);'},
		};

		const index = build_class_variable_index(definitions);

		assert.isTrue(index.by_class.get('text_lg')?.has('font_size_lg'));
	});

	test('declaration with multiple variables', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			button: {
				declaration:
					'color: var(--text_color); background: var(--bg_color); border: var(--border_width) solid;',
			},
		};

		const index = build_class_variable_index(definitions);
		const vars = index.by_class.get('button')!;

		assert.isTrue(vars.has('text_color'));
		assert.isTrue(vars.has('bg_color'));
		assert.isTrue(vars.has('border_width'));
	});

	test('declaration without variables', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			flex: {declaration: 'display: flex;'},
		};

		const index = build_class_variable_index(definitions);

		// Should not have an entry (no variables)
		assert.isFalse(index.by_class.has('flex'));
	});

	test('ruleset with variables', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			card: {
				ruleset: `.card { padding: var(--space_md); border: 1px solid var(--border_color); }`,
			},
		};

		const index = build_class_variable_index(definitions);
		const vars = index.by_class.get('card')!;

		assert.isTrue(vars.has('space_md'));
		assert.isTrue(vars.has('border_color'));
	});

	test('composes-only definition', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			box: {composes: ['flex', 'center']},
		};

		const index = build_class_variable_index(definitions);

		// Composes-only definitions don't have direct variables
		// (composed classes' variables are resolved at generation time)
		assert.isFalse(index.by_class.has('box'));
	});

	test('undefined definition', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			exists: {declaration: 'color: var(--text);'},
			missing: undefined,
		};

		const index = build_class_variable_index(definitions);

		assert.isTrue(index.by_class.has('exists'));
		assert.isFalse(index.by_class.has('missing'));
	});

	test('with default definitions', () => {
		const index = build_class_variable_index(css_class_definitions);

		// Should have many classes
		assert.isAbove(index.by_class.size, 50);

		// Common classes should have expected variables
		const p_md_vars = index.by_class.get('p_md');
		assert.isDefined(p_md_vars);
		assert.isTrue(p_md_vars.has('space_md'));

		// Font size classes should reference font_size_* variables
		const font_size_lg_vars = index.by_class.get('font_size_lg');
		assert.isDefined(font_size_lg_vars);
		assert.isTrue(font_size_lg_vars.has('font_size_lg'));
	});

	test('color classes', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			color_a_50: {declaration: 'color: var(--color_a_50); --text_color: var(--color_a_50);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = index.by_class.get('color_a_50')!;
		assert.isTrue(vars.has('color_a_50'));
	});

	test('nested var fallback', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			custom: {declaration: 'padding: var(--custom, var(--fallback));'},
		};
		const index = build_class_variable_index(definitions);

		const vars = index.by_class.get('custom')!;
		assert.isTrue(vars.has('custom'));
		assert.isTrue(vars.has('fallback'));
	});
});

describe('get_class_variables', () => {
	test('existing class', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			p_md: {declaration: 'padding: var(--space_md);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = get_class_variables(index, 'p_md');

		assert.isNotNull(vars);
		assert.isTrue(vars.has('space_md'));
	});

	test('missing class returns null', () => {
		const index = build_class_variable_index({});

		const vars = get_class_variables(index, 'nonexistent');

		assert.isNull(vars);
	});
});

describe('collect_class_variables', () => {
	test('multiple classes', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			p_md: {declaration: 'padding: var(--space_md);'},
			m_lg: {declaration: 'margin: var(--space_lg);'},
			text_sm: {declaration: 'font-size: var(--font_size_sm);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = collect_class_variables(index, ['p_md', 'm_lg']);

		assert.isTrue(vars.has('space_md'));
		assert.isTrue(vars.has('space_lg'));
		assert.isFalse(vars.has('font_size_sm'));
	});

	test('with unknown classes', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			known: {declaration: 'color: var(--text);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = collect_class_variables(index, ['known', 'unknown']);

		assert.isTrue(vars.has('text'));
		assert.strictEqual(vars.size, 1);
	});
});

describe('get_classes_using_variable', () => {
	test('finds classes using a variable', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			p_md: {declaration: 'padding: var(--space_md);'},
			m_md: {declaration: 'margin: var(--space_md);'},
			text_lg: {declaration: 'font-size: var(--font_size_lg);'},
		};
		const index = build_class_variable_index(definitions);

		const classes = get_classes_using_variable(index, 'space_md');

		assert.include(classes, 'p_md');
		assert.include(classes, 'm_md');
		assert.notInclude(classes, 'text_lg');
	});

	test('unused variable returns empty array', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			p_md: {declaration: 'padding: var(--space_md);'},
		};
		const index = build_class_variable_index(definitions);

		const classes = get_classes_using_variable(index, 'unused_variable');

		assert.strictEqual(classes.length, 0);
	});
});
