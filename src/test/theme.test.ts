import {test, assert, describe} from 'vitest';

import {render_theme_style, scheme_stance_variables, type Theme} from '$lib/theme.ts';
import {default_variables} from '$lib/variables.ts';

// a scheme-adaptive default (dual slots) to observe the stance mirror through
const adaptive_default = default_variables.find((v) => v.name === 'shade_lightness_00')!;

/** Splits rendered CSS into the `:root` (light/base) and `:root.dark` sections. */
const split_schemes = (css: string): {light: string; dark: string} => {
	const dark_start = css.indexOf(':root.dark');
	return {
		light: dark_start === -1 ? css : css.slice(0, dark_start),
		dark: dark_start === -1 ? '' : css.slice(dark_start),
	};
};

describe('render_theme_style', () => {
	test('a theme named "base" with variables renders them', () => {
		// the special case keys on empty `variables`, not the name, so a theme
		// that carries variables always renders even when named 'base'
		const theme: Theme = {name: 'base', variables: [{name: 'chroma_scale', light: '2'}]};
		const css = render_theme_style(theme);
		assert.include(css, '--chroma_scale: 2;');
	});

	test('an empty-variables theme renders nothing by default', () => {
		assert.strictEqual(render_theme_style({name: 'my theme', variables: []}), '');
		// the emptiness, not the name, drives the special case
		assert.strictEqual(render_theme_style({name: 'base', variables: []}), '');
	});

	test('an empty-variables theme with empty_default_theme false renders the full defaults', () => {
		const css = render_theme_style({name: 'anything', variables: []}, {empty_default_theme: false});
		assert.isAbove(css.length, 0);
		for (const v of default_variables) {
			if (v.light !== undefined) assert.include(css, `--${v.name}: ${v.light};`);
		}
	});
});

describe('scheme stance', () => {
	test('a dark stance mirrors adaptive defaults into the base scheme', () => {
		const css = render_theme_style({name: 't', variables: [], scheme: 'dark'});
		const {light} = split_schemes(css);
		assert.include(light, 'color-scheme: dark;');
		// the dark slot's value renders in the :root block
		assert.include(light, `--${adaptive_default.name}: ${adaptive_default.dark};`);
	});

	test('a dark stance skips defaults the theme overrides', () => {
		const theme: Theme = {
			name: 't',
			variables: [{name: adaptive_default.name, light: '0.5'}],
			scheme: 'dark',
		};
		const {light} = split_schemes(render_theme_style(theme));
		assert.include(light, `--${adaptive_default.name}: 0.5;`);
		assert.notInclude(light, `--${adaptive_default.name}: ${adaptive_default.dark};`);
	});

	test('a light stance mirrors light values into the dark scheme', () => {
		const css = render_theme_style({name: 't', variables: [], scheme: 'light'});
		const {light, dark} = split_schemes(css);
		assert.include(light, 'color-scheme: light;');
		// the light slot's value renders in the :root.dark block, defeating base dark
		assert.include(dark, `--${adaptive_default.name}: ${adaptive_default.light};`);
	});

	test('a dual or absent scheme renders no stance', () => {
		assert.strictEqual(render_theme_style({name: 't', variables: [], scheme: 'dual'}), '');
		const css = render_theme_style({name: 't', variables: [{name: 'chroma_scale', light: '2'}]});
		assert.notInclude(css, 'color-scheme:');
	});

	test('scheme_stance_variables excludes overridden names and single-slot defaults', () => {
		const mirrored = scheme_stance_variables('dark', [{name: adaptive_default.name, light: '0.5'}]);
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
