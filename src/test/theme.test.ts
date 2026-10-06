import { test, assert, describe } from 'vitest';

import { compose_themes, render_theme_style } from '$lib/theme.ts';
import type { Theme } from '$lib/variable.ts';
import { resolve_theme_stance, scheme_stance_variables } from '$lib/theme_stance.ts';
import { scheme_adaptive_variables } from '$lib/scheme_adaptive_variables.ts';
import { default_variables } from '$lib/variables.ts';

// a scheme-adaptive default (dual slots) to observe the stance mirror through
const adaptive_default = default_variables.find((v) => v.name === 'shade_lightness_00')!;

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
		const theme: Theme = { name: 'base', variables: [{ name: 'chroma_scale', light: '2' }] };
		const css = render_theme_style(theme);
		assert.include(css, '--chroma_scale: 2;');
	});

	test('an empty-variables theme renders nothing by default', () => {
		assert.strictEqual(render_theme_style({ name: 'my theme', variables: [] }), '');
		// the emptiness, not the name, drives the special case
		assert.strictEqual(render_theme_style({ name: 'base', variables: [] }), '');
	});

	test('the full defaults render when passed explicitly', () => {
		// the renderer holds no variable data of its own, so rendering the full
		// default set is an ordinary call with the defaults as the theme
		const css = render_theme_style({ name: 'anything', variables: default_variables });
		assert.isAbove(css.length, 0);
		for (const v of default_variables) {
			if (v.light !== undefined) assert.include(css, `--${v.name}: ${v.light};`);
		}
	});

	test('an id scope renders dark slots for both scheme-class placements', () => {
		// the scheme class conventionally lives on the root element, so the dark
		// block must match :root.dark descendants, not only a class on the scope
		const css = render_theme_style(
			{ name: 't', variables: [{ name: 'shade_lightness_00', light: '0.9', dark: '0.2' }] },
			{ id: 'my_scope' }
		);
		assert.include(css, '#my_scope {');
		assert.include(css, '#my_scope.dark, :root.dark #my_scope {');
		assert.notInclude(css, ':root {');
	});
});

describe('scheme stance', () => {
	test('a dark stance mirrors adaptive defaults into the base scheme', () => {
		const css = render_theme_style(
			resolve_theme_stance({ name: 't', variables: [], scheme: 'dark' })
		);
		const { light } = split_schemes(css);
		assert.include(light, 'color-scheme: dark;');
		// the dark slot's value renders in the :root block
		assert.include(light, `--${adaptive_default.name}: ${adaptive_default.dark};`);
	});

	test('a dark stance skips defaults the theme overrides', () => {
		const theme = resolve_theme_stance({
			name: 't',
			variables: [{ name: adaptive_default.name, light: '0.5' }],
			scheme: 'dark'
		});
		const { light } = split_schemes(render_theme_style(theme));
		assert.include(light, `--${adaptive_default.name}: 0.5;`);
		assert.notInclude(light, `--${adaptive_default.name}: ${adaptive_default.dark};`);
	});

	test('a light stance mirrors light values into the base slot', () => {
		const css = render_theme_style(
			resolve_theme_stance({ name: 't', variables: [], scheme: 'light' })
		);
		const { light, dark } = split_schemes(css);
		assert.include(light, 'color-scheme: light;');
		// the light value renders in the :root block, which applies in both
		// schemes - fuz.theme beats the fuz.base :root.dark defaults by layer
		// order, and staying out of :root.dark keeps later same-block
		// declarations (overlays, compiled caps) winning by source order
		assert.include(light, `--${adaptive_default.name}: ${adaptive_default.light};`);
		assert.notInclude(dark, `--${adaptive_default.name}:`);
	});

	test('resolve_theme_stance keeps the mirror out of the authored variables', () => {
		const theme = resolve_theme_stance({
			name: 't',
			variables: [{ name: 'chroma_scale', light: '2' }],
			scheme: 'dark'
		});
		// authored knobs stay distinguishable from the derived mirror
		assert.lengthOf(theme.variables, 1);
		assert.isAbove(theme.scheme_mirror!.length, 0);
	});

	test('resolve_theme_stance leaves a dual-scheme theme unchanged', () => {
		const theme: Theme = { name: 't', variables: [], scheme: 'dual' };
		assert.strictEqual(resolve_theme_stance(theme), theme);
		const bare: Theme = { name: 't', variables: [] };
		assert.strictEqual(resolve_theme_stance(bare), bare);
	});

	test('an unresolved stanced theme still pins color-scheme', () => {
		// the renderer pins the stance on its own; only the mirror needs resolving
		const css = render_theme_style({ name: 't', variables: [], scheme: 'dark' });
		assert.include(css, 'color-scheme: dark;');
	});

	test('a dual theme carrying a scheme_mirror renders without it', () => {
		// the mirror belongs to the stance - without one it would repaint the
		// light scheme with the other scheme's defaults and no color-scheme pin
		const resolved = resolve_theme_stance({ name: 't', variables: [], scheme: 'dark' });
		assert.isAbove(resolved.scheme_mirror!.length, 0);
		assert.strictEqual(render_theme_style({ ...resolved, scheme: 'dual' }), '');
	});

	test('a dual or absent scheme renders no stance', () => {
		assert.strictEqual(render_theme_style({ name: 't', variables: [], scheme: 'dual' }), '');
		const css = render_theme_style({
			name: 't',
			variables: [{ name: 'chroma_scale', light: '2' }]
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
			assert.strictEqual(v.light, source.light);
			assert.strictEqual(v.dark, source.dark);
		}
	});

	test('scheme_stance_variables excludes overridden names and single-slot defaults', () => {
		const mirrored = scheme_stance_variables('dark', [
			{ name: adaptive_default.name, light: '0.5' }
		]);
		assert.isAbove(mirrored.length, 0);
		assert.isFalse(mirrored.some((v) => v.name === adaptive_default.name));
		for (const v of mirrored) {
			const source = default_variables.find((d) => d.name === v.name)!;
			assert.isDefined(source.dark, `${v.name} mirrors a dual-slot default`);
			assert.strictEqual(v.light, source.dark);
			assert.isUndefined(v.dark);
		}
	});
});

describe('compose_themes', () => {
	const base: Theme = {
		name: 'my base',
		variables: [
			{ name: 'chroma_scale', light: '1.2' },
			{ name: 'shade_lightness_00', light: '0.95', dark: '0.2' }
		]
	};
	const overlay: Theme = {
		name: 'my overlay',
		variables: [
			{ name: 'shade_lightness_00', light: '1', dark: '0' },
			{ name: 'text_lightness_curve', light: '0.5' }
		]
	};

	test('no overlays returns the base unchanged', () => {
		assert.strictEqual(compose_themes(base), base);
	});

	test('flatten + last-wins: overlay variables replace same-named ones wholesale', () => {
		const composed = compose_themes(base, overlay);
		const shade = composed.variables.find((v) => v.name === 'shade_lightness_00');
		assert.deepEqual(shade, { name: 'shade_lightness_00', light: '1', dark: '0' });
		// untouched base variables survive
		assert.isDefined(composed.variables.find((v) => v.name === 'chroma_scale'));
		// overlay-only variables append
		assert.isDefined(composed.variables.find((v) => v.name === 'text_lightness_curve'));
		assert.strictEqual(composed.variables.length, 3);
	});

	test('a dark-only overlay keeps the light slot beneath it', () => {
		// a dark slot only shadows under `.dark`, so replacing wholesale would
		// drop the base's light-scheme value
		const composed = compose_themes(base, {
			name: 'dark tweak',
			variables: [{ name: 'shade_lightness_00', dark: '0.1' }]
		});
		const shade = composed.variables.find((v) => v.name === 'shade_lightness_00');
		assert.deepEqual(shade, { name: 'shade_lightness_00', light: '0.95', dark: '0.1' });
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
		assert.deepEqual(shade, { name: 'shade_lightness_00', light: '0' });
	});

	test('a light-stanced base takes overlay light values, dropping dark-only ones', () => {
		const stanced: Theme = { ...base, scheme: 'light' };
		const composed = compose_themes(stanced, {
			name: 'o',
			variables: [
				{ name: 'shade_lightness_00', light: '1', dark: '0' },
				{ name: 'text_lightness_curve', dark: '0.5' } // dark-only never renders under a light stance
			]
		});
		assert.deepEqual(
			composed.variables.find((v) => v.name === 'shade_lightness_00'),
			{ name: 'shade_lightness_00', light: '1' }
		);
		assert.isUndefined(composed.variables.find((v) => v.name === 'text_lightness_curve'));
	});

	test('composing over a resolved stanced base drops overlaid names from the mirror', () => {
		// resolve first, like the shipped stanced exemplars arrive
		const stanced = resolve_theme_stance({ name: 's', variables: [], scheme: 'light' });
		assert(stanced.scheme_mirror);
		assert.isTrue(stanced.scheme_mirror.some((v) => v.name === adaptive_default.name));
		const composed = compose_themes(stanced, {
			name: 'o',
			variables: [{ name: adaptive_default.name, light: '0.123' }]
		});
		// the overlay now authors the variable, so the mirror cedes it - the
		// overlay's :root declaration must be the only one for the name
		assert.isFalse(composed.scheme_mirror!.some((v) => v.name === adaptive_default.name));
		const css = render_theme_style(composed);
		const { light, dark } = split_schemes(css);
		assert.include(light, `--${adaptive_default.name}: 0.123;`);
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
		if (char === '"' || char === "'") {
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
		assert.include(['@layer fuz.theme', ':root', ':root.dark'], prelude);
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
	const variable = { name: 'a', light: '1' };

	const cases: Array<[shape: string, theme: unknown, expected: string]> = [
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
			{ name: 't', scheme: 'dark', scheme_mirror: { length: 1 }, variables: [] },
			WRAPPED_DARK_STANCE
		],
		[
			'a string scheme_mirror under a stance',
			{ name: 't', scheme: 'dark', scheme_mirror: 'ab', variables: [] },
			WRAPPED_DARK_STANCE
		],
		['a non-string scheme', { name: 't', scheme: ['dark'], variables: [] }, ''],
		['a null entry', { name: 't', variables: [null] }, ''],
		['a number entry', { name: 't', variables: [1] }, ''],
		['a string entry', { name: 't', variables: ['light'] }, ''],
		['an array entry', { name: 't', variables: [[variable]] }, ''],
		['a number slot', { name: 't', variables: [{ name: 'a', light: 1 }] }, ''],
		['a boolean slot', { name: 't', variables: [{ name: 'a', light: true }] }, ''],
		['an array slot', { name: 't', variables: [{ name: 'a', light: ['1'] }] }, ''],
		['an object slot', { name: 't', variables: [{ name: 'a', light: { value: '1' } }] }, ''],
		['a missing name', { name: 't', variables: [{ light: '1' }] }, ''],
		['a null name', { name: 't', variables: [{ name: null, light: '1' }] }, ''],
		['a number name', { name: 't', variables: [{ name: 1, light: '1' }] }, ''],
		['an array name', { name: 't', variables: [{ name: ['a'], light: '1' }] }, ''],
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
				variables: [null, { name: 'b', light: 2 }, variable, 'x', { name: ['c'], light: '3' }]
			},
			wrap_light('--a: 1;')
		]
	];

	test.each(cases)('%s renders as dropped', (_shape, theme, expected) => {
		const css = render_theme_style(theme as Theme, { comments: true });
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
			':root {\n\t--a: 1\n}'
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
			'line\nbreak',
			'a: 1; } :root { --b'
		];
		const keys = ['name', 'variables', 'scheme', 'scheme_mirror', 'light', 'dark', 'summary'];
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
				...(random() < 0.8 && { light: maybe(() => pick(strings)) }),
				...(random() < 0.5 && { dark: maybe(() => pick(strings)) }),
				...(random() < 0.5 && { summary: maybe(() => pick(strings)) })
			}));
		const random_variables = (): unknown =>
			maybe(() => Array.from({ length: Math.floor(random() * 5) }, random_variable));
		const random_theme = (): unknown =>
			maybe(() => ({
				name: maybe(() => 't'),
				...(random() < 0.5 && { scheme: maybe(() => pick(['dual', 'light', 'dark'])) }),
				...(random() < 0.5 && { scheme_mirror: random_variables() }),
				...(random() < 0.9 && { variables: random_variables() })
			}));

		let rendered = 0;
		let commented = 0;
		for (let i = 0; i < 4000; i++) {
			const theme = random_theme();
			const options = { comments: random() < 0.5, layer: random() < 0.5 ? null : undefined };
			let css: string;
			try {
				css = render_theme_style(theme as Theme, options);
				assert_theme_css_is_contained(css);
			} catch (error) {
				throw new Error(`failed on ${JSON.stringify(theme)}`, { cause: error });
			}
			if (css) rendered++;
			if (css.includes('/*')) commented++;
		}
		// not vacuous: plenty of themes rendered declarations and comments
		assert.isAbove(rendered, 1000);
		assert.isAbove(commented, 100);
	});
});
