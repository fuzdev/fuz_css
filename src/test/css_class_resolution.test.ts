import {test, expect, describe} from 'vitest';

import {resolve_composes, resolve_class_definition} from '$lib/css_class_resolution.js';
import type {CssClassDefinition, CssClassDefinitionStatic} from '$lib/css_class_generation.js';
import {
	expect_ok,
	expect_error,
	expect_resolved_declaration,
	expect_resolution_error,
} from './test_helpers.js';

/**
 * Common definitions used across multiple tests.
 */
const BASE_DEFS: Record<string, CssClassDefinition> = {
	p_lg: {declaration: 'padding: var(--space_lg);'},
	m_md: {declaration: 'margin: var(--space_md);'},
	rounded: {declaration: 'border-radius: var(--border_radius_md);'},
	shadow_md: {declaration: 'box-shadow: var(--shadow_md);'},
	gap_sm: {declaration: 'gap: var(--space_sm);'},
};

describe('resolve_composes', () => {
	describe('simple token class references', () => {
		test('resolves a single token class', () => {
			const result = resolve_composes(['p_lg'], BASE_DEFS, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(result, 'padding: var(--space_lg);');
			if (result.ok) {
				expect(result.warnings).toBe(null);
			}
		});

		test('resolves multiple token classes', () => {
			const result = resolve_composes(
				['p_lg', 'm_md', 'gap_sm'],
				BASE_DEFS,
				new Set(),
				new Set(),
				'test_class',
			);
			expect_resolved_declaration(
				result,
				'padding: var(--space_lg); margin: var(--space_md); gap: var(--space_sm);',
			);
		});
	});

	describe('composite class references', () => {
		test('resolves a composite with declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex; flex-direction: column;'},
			};
			const result = resolve_composes(['box'], definitions, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(result, 'display: flex; flex-direction: column;');
		});
	});

	describe('nested composes resolution', () => {
		test('resolves nested composes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				...BASE_DEFS,
				panel_base: {composes: ['p_lg', 'rounded']},
			};
			const result = resolve_composes(
				['panel_base'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);
			expect_resolved_declaration(
				result,
				'padding: var(--space_lg); border-radius: var(--border_radius_md);',
			);
		});

		test('resolves deeply nested composes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				...BASE_DEFS,
				panel_base: {composes: ['p_lg', 'rounded']},
				panel: {composes: ['panel_base', 'shadow_md']},
			};
			const result = resolve_composes(['panel'], definitions, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(
				result,
				'padding: var(--space_lg); border-radius: var(--border_radius_md); box-shadow: var(--shadow_md);',
			);
		});
	});

	describe('composes + declaration combination', () => {
		test('resolves composes with additional declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				...BASE_DEFS,
				card: {composes: ['p_lg', 'rounded'], declaration: '--card-bg: var(--shade_10);'},
			};
			const result = resolve_composes(['card'], definitions, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(
				result,
				'padding: var(--space_lg); border-radius: var(--border_radius_md); --card-bg: var(--shade_10);',
			);
		});
	});

	describe('cycle detection', () => {
		// Table-driven cycle detection tests
		const cycle_cases: Array<[string, Record<string, CssClassDefinition>, string, string]> = [
			[
				'direct cycle (a → b → a)',
				{a: {composes: ['b']}, b: {composes: ['a']}},
				'a → b → a',
				'detects direct cycle',
			],
			[
				'self-reference',
				{self_ref: {composes: ['self_ref']}},
				'Circular reference detected',
				'detects self-reference',
			],
			[
				'longer cycle (a → b → c → a)',
				{a: {composes: ['b']}, b: {composes: ['c']}, c: {composes: ['a']}},
				'a → b → c → a',
				'detects longer cycle',
			],
		];

		test.each(cycle_cases)('%s', (_name, definitions, expectedMessage) => {
			const firstClass = Object.keys(definitions)[0]!;
			const result = resolve_composes(
				[firstClass],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Circular reference detected');
				expect(result.error.message).toContain(expectedMessage);
			}
		});
	});

	describe('unknown class in composes error', () => {
		test('returns error for unknown class', () => {
			const result = resolve_composes(
				['p_lg', 'unknown_class'],
				BASE_DEFS,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Unknown class "unknown_class" in composes array');
				expect(result.error.class_name).toBe('test_class');
			}
		});

		test('returns error for unknown nested composes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				wrapper: {composes: ['nonexistent']},
			};
			const result = resolve_composes(['wrapper'], definitions, new Set(), new Set(), 'test_class');

			expect_resolution_error(result, 'Unknown class "nonexistent" in composes array');
		});
	});

	describe('ruleset class in composes error', () => {
		test('returns error for ruleset class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				clickable: {
					ruleset: `.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }`,
				},
			};
			const result = resolve_composes(
				['clickable'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain(
					'Cannot reference ruleset class "clickable" in composes array',
				);
				expect(result.error.suggestion).toContain('multiple selectors');
			}
		});
	});

	describe('interpreter pattern in composes error', () => {
		test('returns error for interpreter pattern', () => {
			const definitions: Record<string, CssClassDefinition> = {
				'hover:*': {
					pattern: /^hover:(.+)$/,
					interpret: () => null,
				},
			};
			const result = resolve_composes(['hover:*'], definitions, new Set(), new Set(), 'test_class');

			expect_resolution_error(result, 'Cannot reference interpreter pattern');
		});
	});

	describe('empty composes array', () => {
		test('handles empty composes array', () => {
			const result = resolve_composes([], {}, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('');
				expect(result.warnings).toBe(null);
			}
		});
	});

	describe('composes-only definition', () => {
		test('resolves composes-only definition', () => {
			const definitions: Record<string, CssClassDefinition> = {
				...BASE_DEFS,
				flex_center: {composes: ['p_lg']},
			};
			const result = resolve_composes(
				['flex_center'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);
			expect_resolved_declaration(result, 'padding: var(--space_lg);');
		});
	});

	describe('diamond-shaped dependencies', () => {
		test('deduplicates diamond dependency silently', () => {
			// A → B, A → C, B → D, C → D (D reached twice via different paths)
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {composes: ['d'], declaration: 'padding: 10px;'},
				c: {composes: ['d'], declaration: 'margin: 10px;'},
				a: {composes: ['b', 'c']},
			};
			const result = resolve_composes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px; margin: 10px;');
				expect(result.warnings).toBe(null);
			}
		});

		test('deduplicates deeper diamond silently', () => {
			const definitions: Record<string, CssClassDefinition> = {
				e: {declaration: 'font-size: 16px;'},
				d: {composes: ['e'], declaration: 'color: blue;'},
				f: {composes: ['e'], declaration: 'color: green;'},
				c: {composes: ['d', 'f']},
			};
			const result = resolve_composes(['c'], definitions, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('font-size: 16px; color: blue; color: green;');
				expect(result.warnings).toBe(null);
			}
		});

		test('warns on redundant class included by sibling', () => {
			// b depends on d, so listing d after b is redundant
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {composes: ['d'], declaration: 'padding: 10px;'},
				a: {composes: ['b', 'd']}, // d is redundant
			};
			const result = resolve_composes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px;');
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "d" is redundant');
				expect(result.warnings?.[0]?.suggestion).toBe(
					'Already included by another class in this definition',
				);
			}
		});

		test('warns on all redundant classes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {composes: ['d'], declaration: 'padding: 10px;'},
				a: {composes: ['b', 'd', 'b']}, // both d and second b are redundant
			};
			const result = resolve_composes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px;');
				expect(result.warnings?.length).toBe(2);
				expect(result.warnings?.[0]?.message).toBe('Class "d" is redundant');
				expect(result.warnings?.[1]?.message).toBe('Class "b" is redundant');
			}
		});

		test('warns on explicit duplicate in composes array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				dup: {composes: ['p_lg', 'p_lg']},
			};
			const result = resolve_composes(['dup'], definitions, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg);');
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "p_lg" is redundant');
			}
		});

		test('warns on explicit class after diamond deps include it', () => {
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {composes: ['d'], declaration: 'padding: 10px;'},
				c: {composes: ['d'], declaration: 'margin: 10px;'},
				a: {composes: ['b', 'c', 'd']}, // explicit d is redundant
			};
			const result = resolve_composes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px; margin: 10px;');
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "d" is redundant');
			}
		});
	});

	describe('empty nested composes array', () => {
		test('handles class with empty composes array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				empty_classes: {composes: []},
			};
			const result = resolve_composes(
				['empty_classes'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('');
			}
		});

		test('handles class with empty composes array and declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				with_decl: {composes: [], declaration: 'color: blue;'},
			};
			const result = resolve_composes(
				['with_decl'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);
			expect_resolved_declaration(result, 'color: blue;');
		});
	});

	describe('multi-level nested composes with declarations', () => {
		test('resolves nested composes with declarations at each level', () => {
			const definitions: Record<string, CssClassDefinition> = {
				c: {declaration: 'color: red;'},
				b: {composes: ['c'], declaration: 'padding: 10px;'},
				a: {composes: ['b'], declaration: 'margin: 20px;'},
			};
			const result = resolve_composes(['a'], definitions, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(result, 'color: red; padding: 10px; margin: 20px;');
		});
	});

	describe('duplicate properties via composition', () => {
		test('keeps duplicate properties for CSS cascade', () => {
			const definitions: Record<string, CssClassDefinition> = {
				base_padding: {declaration: 'padding: 10px;'},
				override_padding: {composes: ['base_padding'], declaration: 'padding: 20px;'},
			};
			const result = resolve_composes(
				['override_padding'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);
			expect_resolved_declaration(result, 'padding: 10px; padding: 20px;');
		});
	});

	describe('whitespace handling', () => {
		test('trims whitespace from declarations', () => {
			const definitions: Record<string, CssClassDefinition> = {
				spaced: {declaration: '  padding: 10px;  '},
			};
			const result = resolve_composes(['spaced'], definitions, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(result, 'padding: 10px;');
		});

		test('joins declarations with single space', () => {
			const definitions: Record<string, CssClassDefinition> = {
				a: {declaration: 'color: red;'},
				b: {declaration: 'padding: 10px;'},
			};
			const result = resolve_composes(['a', 'b'], definitions, new Set(), new Set(), 'test_class');
			expect_resolved_declaration(result, 'color: red; padding: 10px;');
		});

		test('trims whitespace-only declarations and warns', () => {
			const definitions: Record<string, CssClassDefinition> = {
				whitespace_only: {declaration: '   '},
			};
			const result = resolve_composes(
				['whitespace_only'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.[0]?.message).toContain('empty declaration');
			}
		});
	});

	describe('pre-populated resolution stack', () => {
		test('detects cycle with pre-populated stack', () => {
			const definitions: Record<string, CssClassDefinition> = {
				inner: {declaration: 'color: red;'},
			};
			// Simulate being called mid-resolution where 'outer' is already in stack
			const result = resolve_composes(
				['inner', 'outer'],
				definitions,
				new Set(['outer']),
				new Set(),
				'test_class',
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('Circular reference detected');
				expect(result.error.message).toContain('outer');
			}
		});
	});

	describe('deep nested ruleset error', () => {
		test('propagates ruleset error from deeply nested class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				clickable: {ruleset: '.clickable { cursor: pointer; }'},
				wrapper: {composes: ['clickable']},
				outer: {composes: ['wrapper']},
			};
			const result = resolve_composes(['outer'], definitions, new Set(), new Set(), 'test_class');

			expect_resolution_error(result, 'Cannot reference ruleset class "clickable" in composes array');
		});
	});

	describe('empty declaration string', () => {
		test('warns about empty declaration string', () => {
			const definitions: Record<string, CssClassDefinition> = {
				empty_decl: {declaration: ''},
			};
			const result = resolve_composes(
				['empty_decl'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.[0]?.level).toBe('warning');
				expect(result.warnings?.[0]?.message).toContain('empty declaration');
				expect(result.warnings?.[0]?.class_name).toBe('empty_decl');
			}
		});

		test('skips empty declarations when joining and warns', () => {
			const definitions: Record<string, CssClassDefinition> = {
				empty: {declaration: ''},
				filled: {declaration: 'color: red;'},
			};
			const result = resolve_composes(
				['empty', 'filled'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red;');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.class_name).toBe('empty');
			}
		});

		test('collects multiple empty declaration warnings', () => {
			const definitions: Record<string, CssClassDefinition> = {
				empty1: {declaration: ''},
				empty2: {declaration: '   '},
				filled: {declaration: 'color: red;'},
			};
			const result = resolve_composes(
				['empty1', 'filled', 'empty2'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red;');
				expect(result.warnings?.length).toBe(2);
				expect(result.warnings?.[0]?.class_name).toBe('empty1');
				expect(result.warnings?.[1]?.class_name).toBe('empty2');
			}
		});
	});

	describe('fail-fast behavior', () => {
		test('fails on first invalid class in array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				valid: {declaration: 'color: red;'},
				ruleset_class: {ruleset: '.ruleset_class { cursor: pointer; }'},
			};
			const result = resolve_composes(
				['valid', 'ruleset_class', 'valid'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect_error(result);
			if (!result.ok) {
				expect(result.error.message).toContain('ruleset_class');
			}
		});
	});
});

describe('resolve_class_definition', () => {
	describe('declaration-only definitions', () => {
		test('returns declaration directly', () => {
			const def: CssClassDefinitionStatic = {declaration: 'color: red;'};
			const result = resolve_class_definition(def, 'test', {});

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('color: red;');
				expect(result.warnings).toBe(null);
			}
		});

		test('trims declaration whitespace', () => {
			const def: CssClassDefinitionStatic = {declaration: '  color: red;  '};
			const result = resolve_class_definition(def, 'test', {});
			expect_resolved_declaration(result, 'color: red;');
		});

		test('warns about empty declaration', () => {
			const def: CssClassDefinitionStatic = {declaration: ''};
			const result = resolve_class_definition(def, 'test', {});

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.[0]?.message).toContain('empty declaration');
			}
		});
	});

	describe('composes-only definitions', () => {
		test('resolves composes array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionStatic = {composes: ['p_lg']};
			const result = resolve_class_definition(def, 'test', definitions);
			expect_resolved_declaration(result, 'padding: var(--space_lg);');
		});
	});

	describe('composes + declaration definitions', () => {
		test('combines resolved composes with declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionStatic = {
				composes: ['p_lg'],
				declaration: 'margin: 10px;',
			};
			const result = resolve_class_definition(def, 'test', definitions);
			expect_resolved_declaration(result, 'padding: var(--space_lg); margin: 10px;');
		});

		test('trims declaration in combined output', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionStatic = {
				composes: ['p_lg'],
				declaration: '  margin: 10px;  ',
			};
			const result = resolve_class_definition(def, 'test', definitions);
			expect_resolved_declaration(result, 'padding: var(--space_lg); margin: 10px;');
		});

		test('warns about empty declaration with composes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionStatic = {
				composes: ['p_lg'],
				declaration: '',
			};
			const result = resolve_class_definition(def, 'test', definitions);

			expect_ok(result);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg);');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.[0]?.message).toContain('empty declaration');
			}
		});
	});

	describe('ruleset definitions', () => {
		test('returns empty declaration for ruleset', () => {
			const def: CssClassDefinitionStatic = {ruleset: '.test { color: red; }'};
			const result = resolve_class_definition(def, 'test', {});
			expect_resolved_declaration(result, '');
		});
	});

	describe('self-reference prevention', () => {
		test('detects self-reference in composes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				self_ref: {composes: ['self_ref']},
			};
			const def: CssClassDefinitionStatic = {composes: ['self_ref']};
			const result = resolve_class_definition(def, 'self_ref', definitions);

			expect_resolution_error(result, 'Circular reference');
		});
	});

	describe('error propagation', () => {
		test('propagates unknown class error', () => {
			const def: CssClassDefinitionStatic = {composes: ['nonexistent']};
			const result = resolve_class_definition(def, 'test', {});

			expect_resolution_error(result, 'Unknown class "nonexistent" in composes array');
		});
	});
});
