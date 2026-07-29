import { test, assert, describe } from 'vitest';

import { compose_themes, render_theme_style, type Theme } from '$lib/theme.ts';
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

	test('a light stance mirrors light values into the dark scheme', () => {
		const css = render_theme_style(
			resolve_theme_stance({ name: 't', variables: [], scheme: 'light' })
		);
		const { light, dark } = split_schemes(css);
		assert.include(light, 'color-scheme: light;');
		// the light slot's value renders in the :root.dark block, defeating base dark
		assert.include(dark, `--${adaptive_default.name}: ${adaptive_default.light};`);
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

	test('rendering a composition applies the overlay over the base', () => {
		const css = render_theme_style(compose_themes(base, overlay));
		assert.include(css, '--shade_lightness_00: 1;');
		assert.include(css, '--chroma_scale: 1.2;');
	});
});
