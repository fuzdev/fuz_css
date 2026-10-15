import { test, assert, describe } from 'vitest';

import {
	compose_themes,
	render_style_variables,
	render_theme_style,
	type RenderThemeStyleOptions
} from '#lib/theme.ts';
import type { StyleVariable, Theme } from '#lib/variable.ts';
import { resolve_theme_stance, scheme_stance_variables } from '#lib/theme_stance.ts';
import { scheme_adaptive_variables } from '#lib/scheme_adaptive_variables.ts';
import { default_variables } from '#lib/variables.ts';

// a scheme-adaptive default (dual slots) to observe the stance mirror through
const adaptive_default = default_variables.find((v) => v.name === 'shade_lightness_00')!;

/** Renders a theme the way it's meant to render: resolved, with its mirror beside it. */
const render_resolved = (theme: Theme): string => {
	const resolved = resolve_theme_stance(theme);
	return render_theme_style(resolved.theme, resolved);
};

/** Splits rendered CSS into the `:root` (light/base) and `:root.dark` sections. */
const split_schemes = (css: string): { light: string; dark: string } => {
	const dark_start = css.indexOf(':root.dark');
	return {
		light: dark_start === -1 ? css : css.slice(0, dark_start),
		dark: dark_start === -1 ? '' : css.slice(dark_start)
	};
};

describe('render_theme_style', () => {
	test('a theme named "base" with variables renders them', () => {
		// the special case keys on empty `variables`, not the name, so a theme
		// that carries variables always renders even when named 'base'
		const theme: Theme = { name: 'base', variables: [{ name: 'chroma_scale', base: '2' }] };
		const css = render_theme_style(theme);
		assert.include(css, '--chroma_scale: 2;');
	});

	test('an empty-variables theme renders nothing by default', () => {
		assert.strictEqual(render_theme_style({ name: 'my theme', variables: [] }), '');
		// the emptiness, not the name, drives the special case
		assert.strictEqual(render_theme_style({ name: 'base', variables: [] }), '');
	});

	test('the full defaults render as a variable set, internal names included', () => {
		// the renderer holds no variable data of its own, so the full default
		// set renders through `render_style_variables`, which keeps the ramp
		// intermediates a theme can't carry
		const css = render_style_variables(default_variables);
		assert.isAbove(css.length, 0);
		assert.include(css, '--_palette_chroma_50:');
		for (const v of default_variables) {
			if (v.base !== undefined) assert.include(css, `--${v.name}: ${v.base};`);
		}
	});

	test("a theme's internal names are dropped, the derived data's render", () => {
		const cap: StyleVariable = { name: '_palette_chroma_50', base: 'min(calc(1), 0.1)' };
		const css = render_theme_style(
			{ name: 't', variables: [cap, { name: 'chroma_scale', base: '2' }] },
			{ caps: [{ ...cap, base: 'min(calc(1), 0.2)' }] }
		);
		assert.include(css, '--chroma_scale: 2;');
		assert.notInclude(css, '0.1)');
		assert.include(css, '--_palette_chroma_50: min(calc(1), 0.2);');
		// the same entry renders as a variable set
		assert.include(render_style_variables([cap]), '--_palette_chroma_50: min(calc(1), 0.1);');
	});

	test('the mirror renders first, then the variables, then the caps', () => {
		const css = render_theme_style(
			{ name: 't', scheme: 'dark', variables: [{ name: 'b', base: '2' }] },
			{
				scheme_mirror: [
					{ name: 'a', base: '1' },
					{ name: 'b', base: 'mirrored' },
					{ name: 'c', base: 'mirrored' }
				],
				caps: [{ name: 'c', base: '3' }]
			}
		);
		assert.strictEqual(
			css,
			`@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;
@layer fuz.theme {
:root {
	color-scheme: dark;
	--a: 1;
	--b: 2;
	--c: 3;
}
}`
		);
	});

	test('an id scope renders dark slots for both scheme-class placements', () => {
		// the scheme class conventionally lives on the root element, so the dark
		// block must match :root.dark descendants, not only a class on the scope
		const css = render_theme_style(
			{ name: 't', variables: [{ name: 'shade_lightness_00', base: '0.9', dark: '0.2' }] },
			{ id: 'my_scope' }
		);
		assert.include(css, '#my_scope {');
		assert.include(css, '#my_scope.dark, :root.dark #my_scope:not(.light) {');
		assert.notInclude(css, ':root {');
	});

	test('a .light on the id scope keeps it light under an explicit or preferred dark root', () => {
		const css = render_theme_style(
			{ name: 't', variables: [{ name: 'shade_lightness_00', base: '0.9', dark: '0.2' }] },
			{ id: 'my_scope' }
		);
		// every root-placed dark selector excludes a light scope, the explicit
		// `:root.dark` and its `prefers-color-scheme` twin alike
		const dark_selectors = [
			...css.matchAll(/^\s*([^{}\n]+) \{\n\t*--shade_lightness_00: 0\.2;/gm)
		].flatMap((m) => m[1]!.split(', '));
		assert.deepEqual(dark_selectors, [
			'#my_scope.dark',
			':root.dark #my_scope:not(.light)',
			':root:not(.light) #my_scope:not(.light)'
		]);
	});

	test('an id is escaped into the selector', () => {
		const theme = { name: 't', variables: [{ name: 'shade_lightness_00', base: '0.9' }] };
		assert.include(render_theme_style(theme, { id: '1st' }), '#\\31 st {');
		const hostile = render_theme_style(theme, { id: 'x{}</style>' });
		assert.notInclude(hostile, '</style');
		assert.include(hostile, '#x\\7b \\7d \\3c \\2f style\\3e  {');
		// an empty id scopes nothing
		assert.include(render_theme_style(theme, { id: '' }), ':root {');
	});
});

describe('scheme stance', () => {
	test('a dark stance mirrors adaptive defaults into the base scheme', () => {
		const css = render_resolved({ name: 't', variables: [], scheme: 'dark' });
		const { light } = split_schemes(css);
		assert.include(light, 'color-scheme: dark;');
		// the dark slot's value renders in the :root block
		assert.include(light, `--${adaptive_default.name}: ${adaptive_default.dark};`);
	});

	test('a dark stance skips defaults the theme overrides', () => {
		const css = render_resolved({
			name: 't',
			variables: [{ name: adaptive_default.name, base: '0.5' }],
			scheme: 'dark'
		});
		const { light } = split_schemes(css);
		assert.include(light, `--${adaptive_default.name}: 0.5;`);
		assert.notInclude(light, `--${adaptive_default.name}: ${adaptive_default.dark};`);
	});

	test('a light stance mirrors light values into the base slot', () => {
		const css = render_resolved({ name: 't', variables: [], scheme: 'light' });
		const { light, dark } = split_schemes(css);
		assert.include(light, 'color-scheme: light;');
		// the light value renders in the :root block, which applies in both
		// schemes - fuz.theme beats the fuz.base :root.dark defaults by layer
		// order, and staying out of :root.dark keeps later same-block
		// declarations (overlays, compiled caps) winning by source order
		assert.include(light, `--${adaptive_default.name}: ${adaptive_default.base};`);
		assert.notInclude(dark, `--${adaptive_default.name}:`);
	});

	test('resolve_theme_stance wraps the theme, never editing it', () => {
		const theme: Theme = {
			name: 't',
			variables: [{ name: 'chroma_scale', base: '2' }],
			scheme: 'dark'
		};
		const resolved = resolve_theme_stance(theme);
		// the same reference, so persisting it persists only what was authored
		assert.strictEqual(resolved.theme, theme);
		assert.deepEqual(Object.keys(theme), ['name', 'variables', 'scheme']);
		assert.deepEqual(resolved.scheme_mirror, scheme_stance_variables('dark'));
		assert.isUndefined(resolved.caps);
	});

	test('the mirror depends on the stance alone, deduped at render', () => {
		const overriding = resolve_theme_stance({
			name: 't',
			variables: [{ name: 'shade_lightness_00', base: '0.2' }],
			scheme: 'dark'
		});
		// the mirror still holds the name - the renderer skips it
		assert.ok(overriding.scheme_mirror!.some((v) => v.name === 'shade_lightness_00'));
		const css = render_theme_style(overriding.theme, overriding);
		assert.strictEqual(css.match(/--shade_lightness_00:/g)?.length, 1);
		assert.include(css, '--shade_lightness_00: 0.2;');
	});

	test('resolve_theme_stance gives a dual-scheme theme no derived data', () => {
		const theme: Theme = { name: 't', variables: [], scheme: 'dual' };
		assert.deepEqual(resolve_theme_stance(theme), { theme });
		const bare: Theme = { name: 't', variables: [] };
		assert.strictEqual(resolve_theme_stance(bare).theme, bare);
	});

	test('an unresolved stanced theme still pins color-scheme', () => {
		// the renderer pins the stance on its own; only the mirror needs resolving
		const css = render_theme_style({ name: 't', variables: [], scheme: 'dark' });
		assert.include(css, 'color-scheme: dark;');
	});

	test('a dual theme passed a scheme_mirror renders without it', () => {
		// the mirror belongs to the stance - without one it would repaint the
		// light scheme with the other scheme's defaults and no color-scheme pin
		const resolved = resolve_theme_stance({ name: 't', variables: [], scheme: 'dark' });
		assert.isAbove(resolved.scheme_mirror!.length, 0);
		assert.strictEqual(
			render_theme_style({ ...resolved.theme, scheme: 'dual' }, { ...resolved }),
			''
		);
	});

	test('a dual or absent scheme renders no stance', () => {
		assert.strictEqual(render_theme_style({ name: 't', variables: [], scheme: 'dual' }), '');
		const css = render_theme_style({
			name: 't',
			variables: [{ name: 'chroma_scale', base: '2' }]
		});
		assert.notInclude(css, 'color-scheme:');
	});

	test('the generated mirror twin matches the dual-slot defaults', () => {
		// `gro gen --check` guards drift too; this states the invariant
		const adaptive = default_variables.filter((v) => v.dark !== undefined);
		assert.deepEqual(
			scheme_adaptive_variables.map((v) => v.name),
			adaptive.map((v) => v.name)
		);
		for (const v of scheme_adaptive_variables) {
			const source = adaptive.find((d) => d.name === v.name)!;
			assert.strictEqual(v.base, source.base);
			assert.strictEqual(v.dark, source.dark);
		}
	});

	test('scheme_stance_variables re-slots the dual-slot defaults alone', () => {
		const mirrored = scheme_stance_variables('dark');
		assert.strictEqual(mirrored.length, scheme_adaptive_variables.length);
		for (const v of mirrored) {
			const source = default_variables.find((d) => d.name === v.name)!;
			assert.isDefined(source.dark, `${v.name} mirrors a dual-slot default`);
			assert.strictEqual(v.base, source.dark);
			assert.isUndefined(v.dark);
		}
	});

	test('scheme_stance_variables mirrors a given variable set, skipping single-slot entries', () => {
		const mirrored = scheme_stance_variables('light', [
			{ name: 'a', base: '1', dark: '2' },
			{ name: 'b', base: '3' },
			{ name: 'c', dark: '4' }
		]);
		assert.deepEqual(mirrored, [{ name: 'a', base: '1' }]);
		assert.deepEqual(scheme_stance_variables('dark', [{ name: 'a', base: '1', dark: '2' }]), [
			{ name: 'a', base: '2' }
		]);
	});
});

describe('compose_themes', () => {
	const base: Theme = {
		name: 'my base',
		variables: [
			{ name: 'chroma_scale', base: '1.2' },
			{ name: 'shade_lightness_00', base: '0.95', dark: '0.2' }
		]
	};
	const overlay: Theme = {
		name: 'my overlay',
		variables: [
			{ name: 'shade_lightness_00', base: '1', dark: '0' },
			{ name: 'text_lightness_curve', base: '0.5' }
		]
	};

	test('no overlays returns the base unchanged', () => {
		assert.strictEqual(compose_themes(base), base);
	});

	test('an overlay variable keeps its summary under a stanced base', () => {
		const composed = compose_themes(
			{ ...base, scheme: 'dark' },
			{
				name: 'o',
				variables: [{ name: 'chroma_scale', base: '0.5', dark: '0.6', summary: 'eased' }]
			}
		);
		const v = composed.variables.find((v) => v.name === 'chroma_scale');
		// the stance slot is picked, single-slot, with the summary carried
		assert.deepEqual(v, { name: 'chroma_scale', base: '0.6', summary: 'eased' });
	});

	test("the base's summary carries through, the overlay's doesn't", () => {
		const composed = compose_themes(
			{ ...base, summary: 'the base' },
			{ ...overlay, summary: 'the overlay' }
		);
		assert.strictEqual(composed.summary, 'the base');
		assert.notProperty(compose_themes(base, overlay), 'summary');
	});

	test('flatten + last-wins: overlay variables replace same-named ones wholesale', () => {
		const composed = compose_themes(base, overlay);
		const shade = composed.variables.find((v) => v.name === 'shade_lightness_00');
		assert.deepEqual(shade, { name: 'shade_lightness_00', base: '1', dark: '0' });
		// untouched base variables survive
		assert.isDefined(composed.variables.find((v) => v.name === 'chroma_scale'));
		// overlay-only variables append
		assert.isDefined(composed.variables.find((v) => v.name === 'text_lightness_curve'));
		assert.strictEqual(composed.variables.length, 3);
	});

	test('a dark-only overlay keeps the base slot beneath it', () => {
		// a dark slot only shadows under `.dark`, so replacing wholesale would
		// drop the base's light-scheme value
		const composed = compose_themes(base, {
			name: 'dark tweak',
			variables: [{ name: 'shade_lightness_00', dark: '0.1' }]
		});
		const shade = composed.variables.find((v) => v.name === 'shade_lightness_00');
		assert.deepEqual(shade, { name: 'shade_lightness_00', base: '0.95', dark: '0.1' });
	});

	test('a dark-only overlay of a name the base lacks stays dark-only', () => {
		const composed = compose_themes(base, {
			name: 'dark tweak',
			variables: [{ name: 'neutral_chroma', dark: '0.04' }]
		});
		const neutral = composed.variables.find((v) => v.name === 'neutral_chroma');
		assert.deepEqual(neutral, { name: 'neutral_chroma', dark: '0.04' });
	});

	test('the composed name appends the overlay names', () => {
		assert.strictEqual(compose_themes(base, overlay).name, 'my base (my overlay)');
	});

	test('a single-scheme base re-slots dual-slot overlay variables to the stance', () => {
		const stanced: Theme = { ...base, scheme: 'dark' };
		const composed = compose_themes(stanced, overlay);
		assert.strictEqual(composed.scheme, 'dark');
		// the overlay's dark value lands in the base slot, single-slot
		const shade = composed.variables.find((v) => v.name === 'shade_lightness_00');
		assert.deepEqual(shade, { name: 'shade_lightness_00', base: '0' });
	});

	test('a light-stanced base takes overlay light values, dropping dark-only ones', () => {
		const stanced: Theme = { ...base, scheme: 'light' };
		const composed = compose_themes(stanced, {
			name: 'o',
			variables: [
				{ name: 'shade_lightness_00', base: '1', dark: '0' },
				{ name: 'text_lightness_curve', dark: '0.5' } // dark-only never renders under a light stance
			]
		});
		assert.deepEqual(
			composed.variables.find((v) => v.name === 'shade_lightness_00'),
			{ name: 'shade_lightness_00', base: '1' }
		);
		assert.isUndefined(composed.variables.find((v) => v.name === 'text_lightness_curve'));
	});

	test('a composed stanced theme renders its overlay over the mirror once resolved', () => {
		const composed = compose_themes(
			{ name: 's', variables: [], scheme: 'light' },
			{ name: 'o', variables: [{ name: adaptive_default.name, base: '0.123' }] }
		);
		// pure Theme → Theme: no derived data rides along
		assert.deepEqual(Object.keys(composed).sort(), ['name', 'scheme', 'variables']);
		// the overlay authors the variable, so the mirror cedes it at render -
		// the overlay's :root declaration must be the only one for the name
		const { light, dark } = split_schemes(render_resolved(composed));
		assert.include(light, `--${adaptive_default.name}: 0.123;`);
		assert.strictEqual(light.split(`--${adaptive_default.name}:`).length, 2);
		assert.notInclude(dark, `--${adaptive_default.name}:`);
	});

	test('rendering a composition applies the overlay over the base', () => {
		const css = render_theme_style(compose_themes(base, overlay));
		assert.include(css, '--shade_lightness_00: 1;');
		assert.include(css, '--chroma_scale: 1.2;');
	});
});

/**
 * Asserts rendered theme CSS is only what the renderer writes: nothing closes
 * the `<style>` element, every block is one of the renderer's own and closes,
 * and every declaration is a custom property or the stance's `color-scheme`.
 * Reads the structure with its own scan rather than the containment helpers,
 * so it can't inherit a mistake of theirs.
 */
const assert_theme_css_is_contained = (css: string): void => {
	assert.notMatch(css, /<\/style/i);
	const preludes: Array<string> = [];
	const declarations: Array<string> = [];
	let depth = 0;
	let paren_depth = 0;
	let text = '';
	for (let i = 0; i < css.length; i++) {
		const char = css[i]!;
		const url = /^url\([ \t\n\r\f]*(?!["'])/iu.exec(css.slice(i));
		if (url && !/[-\w\u{80}-\u{10FFFF}\\]/u.test(css[i - 1] ?? '')) {
			// an unquoted url reads raw to its `)` - a quote there is no string,
			// and anything that makes the token malformed is an escape
			const end = css.indexOf(')', i);
			assert.isAbove(end, -1, 'every url closes');
			assert.match(
				css.slice(i + url[0].length, end),
				/^[^"'(\\\s]*[ \t\n\r\f]*$/u,
				'every unquoted url is well-formed'
			);
			i = end;
		} else if (char === '\\') {
			assert.fail('no escape outside a string');
		} else if (char === '"' || char === "'") {
			// strings are inert - skip to the matching quote
			let end = i + 1;
			while (end < css.length && css[end] !== char) {
				assert.notMatch(css[end]!, /[\n\r\f]/, 'no string spans a line');
				end += css[end] === '\\' ? 2 : 1;
			}
			assert.isBelow(end, css.length, 'every string closes');
			i = end;
		} else if (char === '/' && css[i + 1] === '*') {
			const end = css.indexOf('*/', i + 2);
			assert.isAbove(end, -1, 'every comment closes');
			i = end + 1;
		} else if (char === '(' || char === '[') {
			paren_depth++;
		} else if (char === ')' || char === ']') {
			assert.isAbove(paren_depth--, 0, 'no stray closing bracket');
		} else if (paren_depth > 0) {
			// a block's brackets own everything inside them
		} else if (char === '{') {
			preludes.push(text.trim());
			text = '';
			depth++;
		} else if (char === '}') {
			assert.strictEqual(text.trim(), '', 'every declaration is terminated');
			assert.isAbove(depth--, 0, 'no stray closing brace');
		} else if (char === ';') {
			if (depth > 0) declarations.push(text.trim());
			text = '';
		} else {
			text += char;
		}
	}
	assert.strictEqual(depth, 0, 'every block closes');
	assert.strictEqual(paren_depth, 0, 'every bracket closes');
	for (const prelude of preludes) {
		// bracket contents are skipped, so the OS-preference twin reads `@media`
		// and `:root:not`
		// a layer is the default or any dotted name the renderer accepts
		if (/^@layer [a-z_][\w-]*(?:\.[a-z_][\w-]*)*$/iu.test(prelude)) continue;
		assert.include([':root', ':root.dark', '@media', ':root:not'], prelude);
	}
	for (const declaration of declarations) {
		assert.match(declaration, /^(--[\w-]+|color-scheme):/);
	}
};

describe('render_theme_style over malformed themes', () => {
	const WRAPPED_DARK_STANCE = `@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;
@layer fuz.theme {
:root {
	color-scheme: dark;
}
}`;
	const wrap_light = (
		declarations: string
	): string => `@layer fuz.base, fuz.preferences, fuz.theme, fuz.utilities;
@layer fuz.theme {
:root {
	${declarations}
}
}`;
	const variable = { name: 'a', base: '1' };

	// the derived data rides in the options, so it's malformed there
	const cases: Array<[shape: string, theme: unknown, expected: string, derived?: unknown]> = [
		['a null theme', null, ''],
		['a number theme', 1, ''],
		['a string theme', 'theme', ''],
		['an array theme', [variable], ''],
		['missing variables', { name: 't' }, ''],
		['null variables', { name: 't', variables: null }, ''],
		['object variables', { name: 't', variables: { 0: variable, length: 1 } }, ''],
		['string variables', { name: 't', variables: 'ab' }, ''],
		['number variables', { name: 't', variables: 1 }, ''],
		[
			'an object scheme_mirror under a stance',
			{ name: 't', scheme: 'dark', variables: [] },
			WRAPPED_DARK_STANCE,
			{ scheme_mirror: { length: 1 } }
		],
		[
			'a string scheme_mirror under a stance',
			{ name: 't', scheme: 'dark', variables: [] },
			WRAPPED_DARK_STANCE,
			{ scheme_mirror: 'ab' }
		],
		[
			'malformed caps',
			{ name: 't', variables: [] },
			'',
			{ caps: [null, 1, 'a', { name: ['a'], base: '1' }, { name: 'a', base: 1 }] }
		],
		[
			'object caps beside a variable',
			{ name: 't', variables: [variable] },
			wrap_light('--a: 1;'),
			{ caps: { 0: variable, length: 1 } }
		],
		[
			"a scheme_mirror on the theme, where it's no longer read",
			{ name: 't', scheme: 'dark', scheme_mirror: [variable], variables: [] },
			WRAPPED_DARK_STANCE
		],
		[
			'an internal name in the variables',
			{ name: 't', variables: [{ name: '_palette_chroma_50', base: '1' }] },
			''
		],
		['a non-string scheme', { name: 't', scheme: ['dark'], variables: [] }, ''],
		['a null entry', { name: 't', variables: [null] }, ''],
		['a number entry', { name: 't', variables: [1] }, ''],
		['a string entry', { name: 't', variables: ['light'] }, ''],
		['an array entry', { name: 't', variables: [[variable]] }, ''],
		['a number slot', { name: 't', variables: [{ name: 'a', base: 1 }] }, ''],
		['a boolean slot', { name: 't', variables: [{ name: 'a', base: true }] }, ''],
		['an array slot', { name: 't', variables: [{ name: 'a', base: ['1'] }] }, ''],
		['an object slot', { name: 't', variables: [{ name: 'a', base: { value: '1' } }] }, ''],
		['a missing name', { name: 't', variables: [{ base: '1' }] }, ''],
		['a null name', { name: 't', variables: [{ name: null, base: '1' }] }, ''],
		['a number name', { name: 't', variables: [{ name: 1, base: '1' }] }, ''],
		['an array name', { name: 't', variables: [{ name: ['a'], base: '1' }] }, ''],
		[
			'an array summary that would close its comment',
			{
				name: 't',
				variables: [{ ...variable, summary: ['*/ } body { display: none } /*'] }]
			},
			wrap_light('--a: 1;')
		],
		[
			'a number summary',
			{ name: 't', variables: [{ ...variable, summary: 1 }] },
			wrap_light('--a: 1;')
		],
		[
			'an object summary',
			{ name: 't', variables: [{ ...variable, summary: {} }] },
			wrap_light('--a: 1;')
		],
		[
			'malformed entries beside a well-formed one',
			{
				name: 't',
				variables: [null, { name: 'b', base: 2 }, variable, 'x', { name: ['c'], base: '3' }]
			},
			wrap_light('--a: 1;')
		]
	];

	test.each(cases)('%s renders as dropped', (_shape, theme, expected, derived) => {
		const css = render_theme_style(theme as Theme, {
			comments: true,
			...(derived as RenderThemeStyleOptions)
		});
		assert.strictEqual(css, expected);
		assert_theme_css_is_contained(css);
	});

	const option_cases: Array<[shape: string, options: unknown, expected: string]> = [
		['null options', null, wrap_light('--a: 1;')],
		['number options', 1, wrap_light('--a: 1;')],
		['string options', 'x', wrap_light('--a: 1;')],
		['an array of options', [{ layer: null }], wrap_light('--a: 1;')],
		['a layer that would end its rule', { layer: 'x { } body' }, wrap_light('--a: 1;')],
		['a layer closing the style element', { layer: '</style>' }, wrap_light('--a: 1;')],
		['a number layer', { layer: 1 }, wrap_light('--a: 1;')],
		['a number id', { id: 1 }, wrap_light('--a: 1;')],
		['a truthy non-boolean comments', { comments: 'yes' }, wrap_light('--a: 1;')],
		[
			'a dotted layer',
			{ layer: 'my.layer' },
			wrap_light('--a: 1;').replace('@layer fuz.theme {', '@layer my.layer {')
		]
	];

	test.each(option_cases)('%s render with the defaults', (_shape, options, expected) => {
		const theme = { name: 't', variables: [{ ...variable, summary: 'the summary' }] };
		const css = render_theme_style(theme, options as RenderThemeStyleOptions);
		assert.strictEqual(css, expected);
		assert_theme_css_is_contained(css);
	});

	test('a well-formed summary still renders', () => {
		const css = render_theme_style(
			{ name: 't', variables: [{ ...variable, summary: 'the summary' }] },
			{ comments: true }
		);
		assert.strictEqual(css, wrap_light('--a: 1; /* the summary */'));
	});

	test('the containment assertion catches what it claims to', () => {
		for (const css of [
			':root {\n\t--a: 1; } body { display: none;\n}',
			':root {\n\t--a: 1; /* */ } /* */\n}',
			':root {\n\t--a: 1; color: red;\n}',
			':root {\n\t--a: 1</style>;\n}',
			':root {\n\t--a: calc(1;\n}',
			':root {\n\t--a: "1;\n}',
			':root {\n\t--a: "\n} body { display: none; } b { --c: ";\n}',
			':root {\n\t--a: 1\n}',
			':root {\n\t--a: url(a"x)} body { display: none; } b { --c: ");\n}',
			':root {\n\t--a: \\75 rl(a);\n}'
		]) {
			assert.throws(() => assert_theme_css_is_contained(css), undefined, undefined, css);
		}
	});

	test('fuzzed JSON never throws or escapes', () => {
		// mulberry32, seeded so a failure reproduces
		let seed = 0x5eed;
		const random = (): number => {
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		const pick = <T>(items: ReadonlyArray<T>): T => items[Math.floor(random() * items.length)]!;

		const strings = [
			'',
			'"\n} body { display: none } b { --c: "',
			'a',
			'chroma_scale',
			'light',
			'dark',
			'dual',
			'1',
			'var(--hue_a)',
			'calc(1 + (2 * 3))',
			'url(data:image/png;base64,AAAA)',
			'"a; } b { /* ! */"',
			"it's",
			'the summary',
			'1; --b: 2',
			'1 } body { display: none',
			'red !important',
			'*/ } body { display: none } /*',
			'/* open',
			'</style><script>alert(1)</script>',
			'</STYLE >',
			'calc(1',
			'1)',
			'"unclosed',
			'trailing\\',
			'url(a"x)} body { display: none } b { --c: ")',
			"U\\72 L(a'x)} body { display: none } b { --c: ')",
			'url(a b)',
			'line\nbreak',
			'a: 1; } :root { --b'
		];
		const keys = [
			'name',
			'variables',
			'scheme',
			'scheme_mirror',
			'caps',
			'base',
			'dark',
			'summary',
			'comments',
			'layer'
		];
		// `id` stays out: its escaped selector is tested on its own, and the
		// containment assertion reads every backslash outside a string as an escape
		const random_json = (depth: number): unknown => {
			const roll = random();
			if (depth <= 0 || roll < 0.45) {
				return pick([null, true, false, 0, 1, -1.5, ...strings, ...strings]);
			}
			if (roll < 0.7) {
				return Array.from({ length: Math.floor(random() * 4) }, () => random_json(depth - 1));
			}
			return Object.fromEntries(
				Array.from({ length: Math.floor(random() * 5) }, () => [pick(keys), random_json(depth - 1)])
			);
		};
		// mostly the right shape with any JSON in each position, so the fuzz
		// reaches the declaration path instead of dying at the first read
		const maybe = (value: () => unknown): unknown => (random() < 0.75 ? value() : random_json(2));
		const random_variable = (): unknown =>
			maybe(() => ({
				name: maybe(() => pick(['a', 'b_1', 'chroma-scale'])),
				...(random() < 0.8 && { base: maybe(() => pick(strings)) }),
				...(random() < 0.5 && { dark: maybe(() => pick(strings)) }),
				...(random() < 0.5 && { summary: maybe(() => pick(strings)) })
			}));
		const random_variables = (): unknown =>
			maybe(() => Array.from({ length: Math.floor(random() * 5) }, random_variable));
		const random_theme = (): unknown =>
			maybe(() => ({
				name: maybe(() => 't'),
				...(random() < 0.5 && { scheme: maybe(() => pick(['dual', 'light', 'dark'])) }),
				...(random() < 0.9 && { variables: random_variables() })
			}));
		// the options carry the derived data, so they're as untrusted as the theme
		const random_options = (): unknown =>
			maybe(() => ({
				...(random() < 0.5 && { comments: maybe(() => random() < 0.5) }),
				...(random() < 0.5 && { layer: maybe(() => pick([null, 'fuz.theme', ...strings])) }),
				...(random() < 0.5 && { scheme_mirror: random_variables() }),
				...(random() < 0.5 && { caps: random_variables() })
			}));

		let rendered = 0;
		let commented = 0;
		for (let i = 0; i < 4000; i++) {
			const theme = random_theme();
			const options = random_options();
			let css: string;
			try {
				css = render_theme_style(theme as Theme, options as RenderThemeStyleOptions);
				assert_theme_css_is_contained(css);
			} catch (error) {
				throw new Error(`failed on ${JSON.stringify([theme, options])}`, { cause: error });
			}
			if (css) rendered++;
			if (css.includes('/*')) commented++;
		}
		// not vacuous: plenty of themes rendered declarations and comments
		assert.isAbove(rendered, 1000);
		assert.isAbove(commented, 100);
	});
});
