import {test, assert, describe} from 'vitest';

import {render_theme_style, type Theme} from '$lib/theme.ts';
import {default_variables} from '$lib/variables.ts';

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
