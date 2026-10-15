import { test, describe, assert } from 'vitest';

import { generate_classes_css } from '#lib/css_class_generation.ts';
import { css_class_definitions } from '#lib/css_class_definitions.ts';
import { css_class_interpreters } from '#lib/css_class_interpreters.ts';
import { assert_css_order } from './test_helpers.ts';

const generate = (class_names: Array<string>): string =>
	generate_classes_css({
		class_names,
		class_definitions: css_class_definitions,
		interpreters: css_class_interpreters,
		css_properties: null
	}).css;

describe('generate_classes_css emission order', () => {
	test('wraps the output in the fuz.utilities layer', () => {
		const css = generate(['p_md']);
		assert.match(css, /^@layer fuz\.utilities \{\n/);
		assert.strictEqual(generate([]), '');
	});

	test('an unmodified class comes before its breakpoint forms', () => {
		// alphabetically `md:padding:1rem` sorts before `padding:0`, which used
		// to let the unprefixed rule win at every width
		const css = generate(['md:padding:1rem', 'padding:0']);
		assert_css_order(css, '.padding\\:0', '.md\\:padding\\:1rem');
	});

	test('min-width breakpoints ascend whatever their names', () => {
		const css = generate(['2xl:p_xl', 'sm:p_xl', 'lg:p_lg', 'md:p_md', 'xl:p_sm']);
		assert_css_order(
			css,
			'(width >= 40rem)',
			'(width >= 48rem)',
			'(width >= 64rem)',
			'(width >= 80rem)',
			'(width >= 96rem)'
		);
	});

	test('max-width breakpoints descend, so the narrower range wins', () => {
		const css = generate(['max-sm:p_xs', 'max-lg:p_md', 'max-md:p_sm']);
		assert_css_order(css, '(width < 64rem)', '(width < 48rem)', '(width < 40rem)');
	});

	test('min-width bounds come before max-width bounds', () => {
		const css = generate(['max-md:p_sm', 'md:p_md']);
		assert_css_order(css, '(width >= 48rem)', '(width < 48rem)');
	});

	test('arbitrary breakpoints order by width among the named ones', () => {
		const css = generate(['lg:p_lg', 'min-width(800px):p_md', 'md:p_sm']);
		// 800px is 50rem, between md (48rem) and lg (64rem)
		assert_css_order(css, '(width >= 48rem)', '(width >= 800px)', '(width >= 64rem)');
	});

	test('a width that cannot be compared statically comes after the comparable ones', () => {
		const css = generate(['min-width(calc(100vw~-~20px)):p_md', '2xl:p_sm']);
		assert_css_order(css, '(width >= 96rem)', 'calc(100vw - 20px)');
	});

	test('feature queries come after width queries', () => {
		const css = generate(['print:display:none', 'md:display:flex']);
		assert_css_order(css, '(width >= 48rem)', '@media print');
	});

	test('rules sharing a media query render in one block', () => {
		const css = generate(['md:p_md', 'md:display:flex', 'md:gap_sm']);
		assert.strictEqual(css.match(/@media \(width >= 48rem\)/g)?.length, 1);
	});

	test('an axis pair comes before a single longhand, so the longhand wins', () => {
		const css = generate(['pl_lg', 'px_md']);
		assert_css_order(css, '.px_md', '.pl_lg');
	});

	test('a shorthand comes before its longhands within a media query', () => {
		const css = generate(['md:pl_lg', 'md:p_md']);
		assert_css_order(css, '.md\\:p_md', '.md\\:pl_lg');
	});

	test('states order by LVFHA within a property rank', () => {
		const css = generate(['active:color_a_70', 'hover:color_a_60', 'focus:color_a_50']);
		assert_css_order(css, '.focus\\:', '.hover\\:', '.active\\:');
	});
});

describe('generate_classes_css color scheme modifiers', () => {
	test('dark: adds no specificity', () => {
		const css = generate(['dark:p_md']);
		assert.include(css, ':where(:root.dark) .dark\\:p_md { padding: var(--space_md); }');
	});

	test('dark: follows the OS preference when the root names no scheme', () => {
		const css = generate(['dark:p_md']);
		assert.include(css, '@media (prefers-color-scheme: dark) {');
		assert.include(css, ':where(:root:not(.light)) .dark\\:p_md');
	});

	test('light: follows the OS preference unless the root is .dark', () => {
		const css = generate(['light:p_md']);
		assert.include(css, ':where(:root.light) .light\\:p_md');
		assert.include(css, '@media (prefers-color-scheme: light) {');
		assert.include(css, ':where(:root:not(.dark)) .light\\:p_md');
	});

	test('a media query combines with the scheme preference', () => {
		const css = generate(['md:dark:p_md']);
		assert.include(css, '@media (width >= 48rem) {\n\t:where(:root.dark) .md\\:dark\\:p_md');
		assert.include(css, '@media (width >= 48rem) and (prefers-color-scheme: dark) {');
	});

	test('scheme rules come after unmodified and media rules, so they win', () => {
		const css = generate(['dark:p_sm', 'md:p_md', 'p_lg']);
		assert_css_order(css, '.p_lg', '.md\\:p_md', ':where(:root.dark) .dark\\:p_sm');
	});

	test('a hover rule still wins in dark mode by specificity', () => {
		// the hover rule's pseudo-class outweighs the zero-specificity scheme
		// prefix, so it needn't come later
		const css = generate(['dark:color_a_30', 'hover:color_a_70']);
		assert.include(css, '.hover\\:color_a_70:hover');
		assert.include(css, ':where(:root.dark) .dark\\:color_a_30 {');
	});
});

describe('generate_classes_css composites sublayer', () => {
	test('composites render in the composites sublayer, before single-purpose classes', () => {
		const css = generate(['shadow_md', 'panel']);
		assert_css_order(css, '@layer composites {', '.panel', '}\n.shadow_md');
	});

	test('a modified composite stays in the composites sublayer', () => {
		// a token on the same element wins over `md:panel` by layer order, not
		// by where the media query happens to land
		const css = generate(['md:panel', 'shadow_md']);
		const composites = css.slice(css.indexOf('@layer composites {'), css.indexOf('.shadow_md'));
		assert.include(composites, '.md\\:panel');
	});

	test('composes and ruleset definitions are composites by default', () => {
		const css = generate_classes_css({
			class_names: ['composed', 'seeded', 'ruled', 'plain'],
			class_definitions: {
				p_md: { declaration: 'padding: var(--space_md);' },
				composed: { composes: ['p_md'] },
				seeded: { composes: ['p_md'], declaration: 'margin: 0;' },
				ruled: { ruleset: '.ruled { color: red; } .ruled:hover { color: blue; }' },
				plain: { declaration: 'margin: 0; padding: 0;' }
			},
			interpreters: [],
			css_properties: null
		}).css;
		const composites = css.slice(css.indexOf('@layer composites {'), css.indexOf('.plain'));
		for (const name of ['.composed', '.seeded', '.ruled']) assert.include(composites, name);
		assert.notInclude(composites, '.plain');
	});

	test('single-property shortcuts in the composites registry stay single-purpose', () => {
		const css = generate(['circular', 'mb_flow']);
		assert.notInclude(css, '@layer composites');
	});

	test('a token wins a same-property tie with a single-property shortcut', () => {
		// registry order breaks the tie, not the class name
		const css = generate(['circular', 'border_radius_sm']);
		assert_css_order(css, '.circular', '.border_radius_sm');
	});

	test('a literal wins a same-property tie with a single-property shortcut', () => {
		// interpreted classes order after every static definition
		const css = generate(['circular', 'border-radius:0']);
		assert_css_order(css, '.circular', '.border-radius\\:0');
	});

	test('every multi-property declaration in the registry is flagged a composite', () => {
		for (const [name, definition] of Object.entries(css_class_definitions)) {
			if (!definition || !('declaration' in definition) || !definition.declaration) continue;
			const properties = new Set(
				[...definition.declaration.matchAll(/(?:^|;)\s*(-{0,2}[a-zA-Z][\w-]*)\s*:/g)].map(
					(m) => m[1]!
				)
			);
			const standard = [...properties].filter((p) => !p.startsWith('--'));
			// token classes pair a property with its custom-property companion, or
			// set an axis pair (`px_*`, `width_atmost_*`) - same purpose, one family
			const families = new Set(
				standard.map((p) => p.replace(/-(left|right|top|bottom)$|^(min|max)-/, ''))
			);
			if (families.size > 1) {
				assert.ok(definition.composite, `"${name}" sets ${standard.join(', ')}`);
			}
		}
	});
});

describe('generate_classes_css modifier resolution', () => {
	test('a base that starts with a modifier name still resolves', () => {
		// `marker` is both a pseudo-element modifier and a CSS property
		const css = generate(['marker:none']);
		assert.include(css, '.marker\\:none { marker: none; }');
	});

	test('a base named like a pseudo-element resolves after another pseudo-element', () => {
		const result = generate_classes_css({
			class_names: ['before:marker:none', 'dark:before:marker:none'],
			class_definitions: css_class_definitions,
			interpreters: css_class_interpreters,
			css_properties: null,
			explicit_classes: new Set(['before:marker:none', 'dark:before:marker:none'])
		});
		assert.deepEqual(result.diagnostics, []);
		assert.include(result.css, '.before\\:marker\\:none::before { marker: none; }');
		assert.include(
			result.css,
			':where(:root.dark) .dark\\:before\\:marker\\:none::before { marker: none; }'
		);
	});

	test.each(['before:after:x', 'marker:before:none'])(
		'%s still fails the grammar without a property set',
		(class_name) => {
			// only a pseudo-element also named like a property is reread as the
			// base, so with no property set to say `after` or `before` isn't one,
			// the doubled pseudo-element stays an error
			const result = generate_classes_css({
				class_names: [class_name],
				class_definitions: css_class_definitions,
				interpreters: css_class_interpreters,
				css_properties: null,
				explicit_classes: new Set([class_name])
			});
			assert.strictEqual(result.css, '');
			assert.lengthOf(result.diagnostics, 1);
			assert.strictEqual(result.diagnostics[0]!.level, 'error');
			assert.include(result.diagnostics[0]!.message, 'Multiple pseudo-element');
		}
	);

	test('the grammar backs off a pseudo-element only once', () => {
		// a second back-off would read `marker:` as the modifier and the defined
		// `cue:marker:x` as the base
		const result = generate_classes_css({
			class_names: ['marker:cue:marker:x'],
			class_definitions: { 'cue:marker:x': { declaration: 'color: red;' } },
			interpreters: css_class_interpreters,
			css_properties: null,
			explicit_classes: new Set(['marker:cue:marker:x'])
		});
		assert.strictEqual(result.css, '');
		assert.lengthOf(result.diagnostics, 1);
		assert.strictEqual(result.diagnostics[0]!.level, 'error');
		assert.include(result.diagnostics[0]!.message, 'Multiple pseudo-element');
	});

	test('a custom interpreter gets modifiers for free', () => {
		const css = generate_classes_css({
			class_names: ['md:hover:grid-cols-4'],
			class_definitions: {},
			interpreters: [
				{
					pattern: /^grid-cols-(\d+)$/,
					interpret: (matched) => ({
						declaration: `grid-template-columns: repeat(${matched[1]}, minmax(0, 1fr));`
					})
				}
			],
			css_properties: null
		}).css;
		assert.include(css, '@media (width >= 48rem)');
		assert.include(css, '.md\\:hover\\:grid-cols-4:hover { grid-template-columns');
	});

	test('a misordered modifier reports the ordering error', () => {
		const result = generate_classes_css({
			class_names: ['hover:md:p_md'],
			class_definitions: css_class_definitions,
			interpreters: css_class_interpreters,
			css_properties: null,
			explicit_classes: new Set(['hover:md:p_md'])
		});
		assert.strictEqual(result.css, '');
		assert.include(result.diagnostics[0]!.message, 'Media modifier must come before state');
	});

	test('a misordered class nobody named only warns - it may be another framework', () => {
		// Tailwind takes modifiers in any order
		const result = generate_classes_css({
			class_names: ['dark:md:flex'],
			class_definitions: css_class_definitions,
			interpreters: css_class_interpreters,
			css_properties: null
		});
		assert.strictEqual(result.css, '');
		assert.strictEqual(result.diagnostics[0]!.level, 'warning');
	});

	test('an unknown modifier on a class nobody named only warns', () => {
		// Tailwind's arbitrary variants
		const class_names = [
			'has-[:checked]:bg-x',
			'[&:hover]:x',
			'lg:[&:nth-child(3)]:hover:underline',
			'supports-[display:grid]:grid'
		];
		const result = generate_classes_css({
			class_names,
			class_definitions: css_class_definitions,
			interpreters: css_class_interpreters,
			css_properties: null
		});
		assert.strictEqual(result.css, '');
		assert.strictEqual(result.diagnostics.length, class_names.length);
		for (const diag of result.diagnostics) {
			assert.strictEqual(diag.level, 'warning', diag.identifier);
			assert.include(diag.message, 'Unknown modifier');
		}
	});

	test('an unknown modifier on an explicit class is an error', () => {
		const result = generate_classes_css({
			class_names: ['has-[:checked]:bg-x'],
			class_definitions: css_class_definitions,
			interpreters: css_class_interpreters,
			css_properties: null,
			explicit_classes: new Set(['has-[:checked]:bg-x'])
		});
		assert.strictEqual(result.diagnostics[0]!.level, 'error');
	});

	test('a diagnostic names the full class, not the stripped base', () => {
		const result = generate_classes_css({
			class_names: ['hover:dipslay:flex'],
			class_definitions: {},
			interpreters: css_class_interpreters,
			css_properties: new Set(['display'])
		});
		assert.strictEqual(result.diagnostics[0]!.identifier, 'hover:dipslay:flex');
	});
});
