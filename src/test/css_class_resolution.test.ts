import {test, expect, describe} from 'vitest';

import {resolve_classes, resolve_class_definition} from '$lib/css_class_resolution.js';
import type {CssClassDefinition, CssClassDefinitionItem} from '$lib/css_class_generation.js';

describe('resolve_classes', () => {
	describe('simple token class references', () => {
		test('resolves a single token class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};

			const result = resolve_classes(['p_lg'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg);');
				expect(result.warnings).toBe(null);
			}
		});

		test('resolves multiple token classes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				m_md: {declaration: 'margin: var(--space_md);'},
				gap_sm: {declaration: 'gap: var(--space_sm);'},
			};

			const result = resolve_classes(
				['p_lg', 'm_md', 'gap_sm'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe(
					'padding: var(--space_lg); margin: var(--space_md); gap: var(--space_sm);',
				);
				expect(result.warnings).toBe(null);
			}
		});
	});

	describe('composite class references', () => {
		test('resolves a composite with declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				box: {declaration: 'display: flex; flex-direction: column;'},
			};

			const result = resolve_classes(['box'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('display: flex; flex-direction: column;');
			}
		});
	});

	describe('nested classes resolution', () => {
		test('resolves nested classes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				panel_base: {classes: ['p_lg', 'rounded']},
			};

			const result = resolve_classes(
				['panel_base'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe(
					'padding: var(--space_lg); border-radius: var(--border_radius_md);',
				);
			}
		});

		test('resolves deeply nested classes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				shadow_md: {declaration: 'box-shadow: var(--shadow_md);'},
				panel_base: {classes: ['p_lg', 'rounded']},
				panel: {classes: ['panel_base', 'shadow_md']},
			};

			const result = resolve_classes(['panel'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe(
					'padding: var(--space_lg); border-radius: var(--border_radius_md); box-shadow: var(--shadow_md);',
				);
			}
		});
	});

	describe('classes + declaration combination', () => {
		test('resolves classes with additional declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {classes: ['p_lg', 'rounded'], declaration: '--card-bg: var(--bg_1);'},
			};

			const result = resolve_classes(['card'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				// Note: The resolved classes come first, then the declaration
				expect(result.declaration).toBe(
					'padding: var(--space_lg); border-radius: var(--border_radius_md); --card-bg: var(--bg_1);',
				);
			}
		});
	});

	describe('cycle detection', () => {
		test('detects direct cycle', () => {
			const definitions: Record<string, CssClassDefinition> = {
				a: {classes: ['b']},
				b: {classes: ['a']},
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Circular reference detected');
				expect(result.error.message).toContain('a → b → a');
			}
		});

		test('detects self-reference cycle', () => {
			const definitions: Record<string, CssClassDefinition> = {
				self_ref: {classes: ['self_ref']},
			};

			const result = resolve_classes(['self_ref'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Circular reference detected');
			}
		});

		test('detects longer cycle', () => {
			const definitions: Record<string, CssClassDefinition> = {
				a: {classes: ['b']},
				b: {classes: ['c']},
				c: {classes: ['a']},
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Circular reference detected');
				expect(result.error.message).toContain('a → b → c → a');
			}
		});
	});

	describe('unknown class error', () => {
		test('returns error for unknown class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};

			const result = resolve_classes(
				['p_lg', 'unknown_class'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Unknown class "unknown_class"');
				expect(result.error.class_name).toBe('test_class');
			}
		});

		test('returns error for unknown nested class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				wrapper: {classes: ['nonexistent']},
			};

			const result = resolve_classes(['wrapper'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Unknown class "nonexistent"');
			}
		});
	});

	describe('ruleset class error', () => {
		test('returns error for ruleset class', () => {
			const definitions: Record<string, CssClassDefinition> = {
				clickable: {
					ruleset: `.clickable { cursor: pointer; }
.clickable:hover { opacity: 0.8; }`,
				},
			};

			const result = resolve_classes(
				['clickable'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Cannot reference ruleset class "clickable"');
				expect(result.error.suggestion).toContain('multiple selectors');
			}
		});
	});

	describe('interpreter pattern error', () => {
		test('returns error for interpreter pattern', () => {
			const definitions: Record<string, CssClassDefinition> = {
				'hover:*': {
					pattern: /^hover:(.+)$/,
					interpret: () => null,
				},
			};

			const result = resolve_classes(['hover:*'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.level).toBe('error');
				expect(result.error.message).toContain('Cannot reference interpreter pattern');
			}
		});
	});

	describe('empty classes array', () => {
		test('handles empty classes array', () => {
			const definitions: Record<string, CssClassDefinition> = {};

			const result = resolve_classes([], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('');
				expect(result.warnings).toBe(null);
			}
		});
	});

	describe('classes-only definition', () => {
		test('resolves classes-only definition', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				flex_center: {classes: ['p_lg']}, // No declaration, just classes
			};

			const result = resolve_classes(
				['flex_center'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg);');
			}
		});
	});

	describe('diamond-shaped dependencies', () => {
		test('deduplicates diamond dependency silently', () => {
			// A → B, A → C, B → D, C → D (D reached twice via different paths)
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {classes: ['d'], declaration: 'padding: 10px;'},
				c: {classes: ['d'], declaration: 'margin: 10px;'},
				a: {classes: ['b', 'c']},
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				// D is only included once (first encounter via B), then skipped via C
				expect(result.declaration).toBe('color: red; padding: 10px; margin: 10px;');
				// No warning for diamond dependencies (natural composition)
				expect(result.warnings).toBe(null);
			}
		});

		test('deduplicates deeper diamond silently', () => {
			// E at bottom, D and F both depend on E, C depends on D and F
			const definitions: Record<string, CssClassDefinition> = {
				e: {declaration: 'font-size: 16px;'},
				d: {classes: ['e'], declaration: 'color: blue;'},
				f: {classes: ['e'], declaration: 'color: green;'},
				c: {classes: ['d', 'f']},
			};

			const result = resolve_classes(['c'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				// E only included once via D
				expect(result.declaration).toBe('font-size: 16px; color: blue; color: green;');
				// No warning for diamond dependencies
				expect(result.warnings).toBe(null);
			}
		});

		test('warns on redundant class included by sibling', () => {
			// b depends on d, so listing d after b is redundant
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {classes: ['d'], declaration: 'padding: 10px;'},
				a: {classes: ['b', 'd']}, // d is redundant - already included by b
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px;');
				// Warning for redundant d
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "d" is redundant');
				expect(result.warnings?.[0]?.suggestion).toBe(
					'Already included by another class in this definition',
				);
			}
		});

		test('warns on all redundant classes', () => {
			// b depends on d, then a references b, d (redundant), and b again (redundant)
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {classes: ['d'], declaration: 'padding: 10px;'},
				a: {classes: ['b', 'd', 'b']}, // both d and second b are redundant
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px;');
				// Two warnings: d and b are both redundant
				expect(result.warnings?.length).toBe(2);
				expect(result.warnings?.[0]?.message).toBe('Class "d" is redundant');
				expect(result.warnings?.[1]?.message).toBe('Class "b" is redundant');
			}
		});

		test('warns on explicit duplicate in classes array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				dup: {classes: ['p_lg', 'p_lg']}, // Explicit duplicate
			};

			const result = resolve_classes(['dup'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				// Only one declaration
				expect(result.declaration).toBe('padding: var(--space_lg);');
				// Warning about redundant class
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "p_lg" is redundant');
			}
		});

		test('warns on explicit class after diamond deps include it', () => {
			// Both b and c include d (diamond), then d is explicitly listed (redundant)
			const definitions: Record<string, CssClassDefinition> = {
				d: {declaration: 'color: red;'},
				b: {classes: ['d'], declaration: 'padding: 10px;'},
				c: {classes: ['d'], declaration: 'margin: 10px;'},
				a: {classes: ['b', 'c', 'd']}, // d via c is diamond, explicit d is redundant
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				// d only included once
				expect(result.declaration).toBe('color: red; padding: 10px; margin: 10px;');
				// Only one warning: for the explicit 'd', not for the diamond via 'c'
				expect(result.warnings?.length).toBe(1);
				expect(result.warnings?.[0]?.message).toBe('Class "d" is redundant');
			}
		});
	});

	describe('empty nested classes array', () => {
		test('handles class with empty classes array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				empty_classes: {classes: []},
			};

			const result = resolve_classes(
				['empty_classes'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('');
			}
		});

		test('handles class with empty classes array and declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				with_decl: {classes: [], declaration: 'color: blue;'},
			};

			const result = resolve_classes(
				['with_decl'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('color: blue;');
			}
		});
	});

	describe('multi-level nested classes with declarations', () => {
		test('resolves nested classes with declarations at each level', () => {
			const definitions: Record<string, CssClassDefinition> = {
				c: {declaration: 'color: red;'},
				b: {classes: ['c'], declaration: 'padding: 10px;'},
				a: {classes: ['b'], declaration: 'margin: 20px;'},
			};

			const result = resolve_classes(['a'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				// Order: C's declaration, B's declaration, A's declaration
				expect(result.declaration).toBe('color: red; padding: 10px; margin: 20px;');
			}
		});
	});

	describe('duplicate properties via composition', () => {
		test('keeps duplicate properties for CSS cascade', () => {
			const definitions: Record<string, CssClassDefinition> = {
				base_padding: {declaration: 'padding: 10px;'},
				override_padding: {classes: ['base_padding'], declaration: 'padding: 20px;'},
			};

			const result = resolve_classes(
				['override_padding'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
			if (result.ok) {
				// Both paddings kept - CSS cascade will use the last one
				expect(result.declaration).toBe('padding: 10px; padding: 20px;');
			}
		});
	});

	describe('whitespace handling', () => {
		test('trims whitespace from declarations', () => {
			const definitions: Record<string, CssClassDefinition> = {
				spaced: {declaration: '  padding: 10px;  '},
			};

			const result = resolve_classes(['spaced'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: 10px;');
			}
		});

		test('joins declarations with single space', () => {
			const definitions: Record<string, CssClassDefinition> = {
				a: {declaration: 'color: red;'},
				b: {declaration: 'padding: 10px;'},
			};

			const result = resolve_classes(['a', 'b'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('color: red; padding: 10px;');
			}
		});

		test('trims whitespace-only declarations and warns', () => {
			const definitions: Record<string, CssClassDefinition> = {
				whitespace_only: {declaration: '   '},
			};

			const result = resolve_classes(
				['whitespace_only'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
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
			const result = resolve_classes(
				['inner', 'outer'],
				definitions,
				new Set(['outer']),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(false);
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
				wrapper: {classes: ['clickable']},
				outer: {classes: ['wrapper']},
			};

			const result = resolve_classes(['outer'], definitions, new Set(), new Set(), 'test_class');

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Cannot reference ruleset class "clickable"');
			}
		});
	});

	describe('empty declaration string', () => {
		test('warns about empty declaration string', () => {
			const definitions: Record<string, CssClassDefinition> = {
				empty_decl: {declaration: ''},
			};

			const result = resolve_classes(
				['empty_decl'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
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

			const result = resolve_classes(
				['empty', 'filled'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
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

			const result = resolve_classes(
				['empty1', 'filled', 'empty2'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(true);
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

			// valid comes first, then ruleset_class, then another valid
			const result = resolve_classes(
				['valid', 'ruleset_class', 'valid'],
				definitions,
				new Set(),
				new Set(),
				'test_class',
			);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('ruleset_class');
			}
		});
	});
});

describe('resolve_class_definition', () => {
	describe('declaration-only definitions', () => {
		test('returns declaration directly', () => {
			const def: CssClassDefinitionItem = {declaration: 'color: red;'};
			const definitions: Record<string, CssClassDefinition> = {};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('color: red;');
				expect(result.warnings).toBe(null);
			}
		});

		test('trims declaration whitespace', () => {
			const def: CssClassDefinitionItem = {declaration: '  color: red;  '};
			const definitions: Record<string, CssClassDefinition> = {};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('color: red;');
			}
		});

		test('warns about empty declaration', () => {
			const def: CssClassDefinitionItem = {declaration: ''};
			const definitions: Record<string, CssClassDefinition> = {};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.[0]?.message).toContain('empty declaration');
			}
		});
	});

	describe('classes-only definitions', () => {
		test('resolves classes array', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionItem = {classes: ['p_lg']};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg);');
			}
		});
	});

	describe('classes + declaration definitions', () => {
		test('combines resolved classes with declaration', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionItem = {
				classes: ['p_lg'],
				declaration: 'margin: 10px;',
			};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg); margin: 10px;');
			}
		});

		test('trims declaration in combined output', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionItem = {
				classes: ['p_lg'],
				declaration: '  margin: 10px;  ',
			};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg); margin: 10px;');
			}
		});

		test('warns about empty declaration with classes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
			};
			const def: CssClassDefinitionItem = {
				classes: ['p_lg'],
				declaration: '',
			};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('padding: var(--space_lg);');
				expect(result.warnings).not.toBe(null);
				expect(result.warnings?.[0]?.message).toContain('empty declaration');
			}
		});
	});

	describe('ruleset definitions', () => {
		test('returns empty declaration for ruleset', () => {
			const def: CssClassDefinitionItem = {ruleset: '.test { color: red; }'};
			const definitions: Record<string, CssClassDefinition> = {};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.declaration).toBe('');
			}
		});
	});

	describe('self-reference prevention', () => {
		test('detects self-reference in classes', () => {
			const definitions: Record<string, CssClassDefinition> = {
				self_ref: {classes: ['self_ref']},
			};
			const def: CssClassDefinitionItem = {classes: ['self_ref']};

			// Note: resolve_class_definition adds the class name to the stack
			const result = resolve_class_definition(def, 'self_ref', definitions);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Circular reference');
			}
		});
	});

	describe('error propagation', () => {
		test('propagates unknown class error', () => {
			const definitions: Record<string, CssClassDefinition> = {};
			const def: CssClassDefinitionItem = {classes: ['nonexistent']};

			const result = resolve_class_definition(def, 'test', definitions);

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error.message).toContain('Unknown class "nonexistent"');
			}
		});
	});
});
