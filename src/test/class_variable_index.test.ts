import {test, expect, describe} from 'vitest';

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

		expect(index.by_class.get('text_lg')?.has('font_size_lg')).toBe(true);
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

		expect(vars.has('text_color')).toBe(true);
		expect(vars.has('bg_color')).toBe(true);
		expect(vars.has('border_width')).toBe(true);
	});

	test('declaration without variables', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			flex: {declaration: 'display: flex;'},
		};

		const index = build_class_variable_index(definitions);

		// Should not have an entry (no variables)
		expect(index.by_class.has('flex')).toBe(false);
	});

	test('ruleset with variables', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			card: {
				ruleset: `.card { padding: var(--space_md); border: 1px solid var(--border_color); }`,
			},
		};

		const index = build_class_variable_index(definitions);
		const vars = index.by_class.get('card')!;

		expect(vars.has('space_md')).toBe(true);
		expect(vars.has('border_color')).toBe(true);
	});

	test('composes-only definition', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			box: {composes: ['flex', 'center']},
		};

		const index = build_class_variable_index(definitions);

		// Composes-only definitions don't have direct variables
		// (composed classes' variables are resolved at generation time)
		expect(index.by_class.has('box')).toBe(false);
	});

	test('undefined definition', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			exists: {declaration: 'color: var(--text);'},
			missing: undefined,
		};

		const index = build_class_variable_index(definitions);

		expect(index.by_class.has('exists')).toBe(true);
		expect(index.by_class.has('missing')).toBe(false);
	});

	test('with default definitions', () => {
		const index = build_class_variable_index(css_class_definitions);

		// Should have many classes
		expect(index.by_class.size).toBeGreaterThan(50);

		// Common classes should have expected variables
		const p_md_vars = index.by_class.get('p_md');
		expect(p_md_vars).toBeDefined();
		expect(p_md_vars!.has('space_md')).toBe(true);

		// Font size classes should reference font_size_* variables
		const font_size_lg_vars = index.by_class.get('font_size_lg');
		expect(font_size_lg_vars).toBeDefined();
		expect(font_size_lg_vars!.has('font_size_lg')).toBe(true);
	});

	test('color classes', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			color_a_50: {declaration: 'color: var(--color_a_50); --text_color: var(--color_a_50);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = index.by_class.get('color_a_50')!;
		expect(vars.has('color_a_50')).toBe(true);
	});

	test('nested var fallback', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			custom: {declaration: 'padding: var(--custom, var(--fallback));'},
		};
		const index = build_class_variable_index(definitions);

		const vars = index.by_class.get('custom')!;
		expect(vars.has('custom')).toBe(true);
		expect(vars.has('fallback')).toBe(true);
	});
});

describe('get_class_variables', () => {
	test('existing class', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			p_md: {declaration: 'padding: var(--space_md);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = get_class_variables(index, 'p_md');

		expect(vars).not.toBeNull();
		expect(vars!.has('space_md')).toBe(true);
	});

	test('missing class returns null', () => {
		const index = build_class_variable_index({});

		const vars = get_class_variables(index, 'nonexistent');

		expect(vars).toBeNull();
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

		expect(vars.has('space_md')).toBe(true);
		expect(vars.has('space_lg')).toBe(true);
		expect(vars.has('font_size_sm')).toBe(false);
	});

	test('with unknown classes', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			known: {declaration: 'color: var(--text);'},
		};
		const index = build_class_variable_index(definitions);

		const vars = collect_class_variables(index, ['known', 'unknown']);

		expect(vars.has('text')).toBe(true);
		expect(vars.size).toBe(1);
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

		expect(classes).toContain('p_md');
		expect(classes).toContain('m_md');
		expect(classes).not.toContain('text_lg');
	});

	test('unused variable returns empty array', () => {
		const definitions: Record<string, CssClassDefinition | undefined> = {
			p_md: {declaration: 'padding: var(--space_md);'},
		};
		const index = build_class_variable_index(definitions);

		const classes = get_classes_using_variable(index, 'unused_variable');

		expect(classes.length).toBe(0);
	});
});
