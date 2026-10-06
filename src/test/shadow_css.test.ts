import { test, assert } from 'vitest';

import { render_shadow_css, type ShadowShape } from '$lib/shadow_css.ts';
import { default_variables } from '$lib/variables.ts';
import {
	shadow_variant_prefixes,
	shadow_size_variants,
	shadow_semantic_values,
	shadow_alpha_variants
} from '$lib/variable_data.ts';

test('render_shadow_css composes a geometry token with a mixed-down shadow color', () => {
	assert.strictEqual(
		render_shadow_css('shadow_bottom', 'md', 'umbra', '50'),
		'var(--shadow_bottom_md) color-mix(in oklab, var(--shadow_color_umbra) var(--shadow_alpha_50), transparent)'
	);
	assert.strictEqual(
		render_shadow_css('shadow_inset', 'xs', 'glow', '05'),
		'var(--shadow_inset_xs) color-mix(in oklab, var(--shadow_color_glow) var(--shadow_alpha_05), transparent)'
	);
});

test('every token render_shadow_css can name is a declared variable', () => {
	const names = new Set(default_variables.map((v) => v.name));
	// the shapes are the geometry prefixes without their trailing separator
	const shapes = shadow_variant_prefixes.map((prefix) => prefix.slice(0, -1) as ShadowShape);
	for (const shape of shapes) {
		for (const size of shadow_size_variants) {
			for (const color of shadow_semantic_values) {
				for (const alpha of shadow_alpha_variants) {
					const css = render_shadow_css(shape, size, color, alpha);
					for (const match of css.matchAll(/var\(--([\w-]+)\)/g)) {
						assert.isTrue(names.has(match[1]!), `${css}: --${match[1]}`);
					}
				}
			}
		}
	}
});

test('the declared surface and button shadows are built from it', () => {
	const by_name = new Map(default_variables.map((v) => [v.name, v]));
	assert.strictEqual(
		by_name.get('pane_shadow')?.light,
		render_shadow_css('shadow_bottom', 'md', 'umbra', '50')
	);
	assert.strictEqual(
		by_name.get('button_shadow')?.light,
		[
			render_shadow_css('shadow_inset_bottom', 'xs', 'umbra', '30'),
			render_shadow_css('shadow_inset_top', 'xs', 'highlight', '30')
		].join(', ')
	);
});
