import { test, describe, assert } from 'vitest';

import { css_class_definitions } from '#lib/css_class_definitions.ts';
import { default_variables } from '#lib/variables.ts';
import {
	border_radius_variants,
	icon_size_variants,
	intensity_variants,
	intent_variants
} from '#lib/variable_data.ts';

const declared_names = new Set(default_variables.map((v) => v.name));

const to_declaration = (name: string): string => {
	const definition = css_class_definitions[name];
	assert.ok(definition && 'declaration' in definition && definition.declaration, name);
	return definition.declaration;
};

describe('intent twins of the palette-letter families', () => {
	// each intent family is its palette-letter family with `--palette_a_NN`
	// read as `--{intent}_NN`
	test.each(['border', 'outline', 'shadow'])('%s_{intent}_NN mirrors %s_a_NN', (prefix) => {
		for (const intent of intent_variants) {
			for (const intensity of intensity_variants) {
				assert.strictEqual(
					to_declaration(`${prefix}_${intent}_${intensity}`),
					to_declaration(`${prefix}_a_${intensity}`).replaceAll(
						`--palette_a_${intensity}`,
						`--${intent}_${intensity}`
					)
				);
			}
		}
	});

	test('the twins set the property and its contextual variable', () => {
		assert.strictEqual(
			to_declaration('border_positive_50'),
			'border-color: var(--positive_50); --border_color: var(--positive_50);'
		);
		assert.strictEqual(
			to_declaration('outline_accent_60'),
			'outline-color: var(--accent_60); --outline_color: var(--accent_60);'
		);
		assert.strictEqual(to_declaration('shadow_negative_40'), '--shadow_color: var(--negative_40);');
	});

	test('every variable a twin reads is a default variable', () => {
		for (const prefix of ['border', 'outline', 'shadow']) {
			for (const intent of intent_variants) {
				for (const intensity of intensity_variants) {
					const declaration = to_declaration(`${prefix}_${intent}_${intensity}`);
					for (const [, name] of declaration.matchAll(/var\(--([\w-]+)\)/g)) {
						assert.ok(declared_names.has(name!), `${prefix}_${intent}_${intensity}: ${name}`);
					}
				}
			}
		}
	});
});

describe('zero steps', () => {
	test('gap, column_gap, and row_gap take a 0 step', () => {
		assert.strictEqual(to_declaration('gap_0'), 'gap: 0;');
		assert.strictEqual(to_declaration('column_gap_0'), 'column-gap: 0;');
		assert.strictEqual(to_declaration('row_gap_0'), 'row-gap: 0;');
	});

	test('border_radius and its corners take a 0 step', () => {
		assert.strictEqual(to_declaration('border_radius_0'), 'border-radius: 0;');
		for (const corner of ['top_left', 'top_right', 'bottom_left', 'bottom_right']) {
			assert.strictEqual(
				to_declaration(`border_${corner}_radius_0`),
				`border-${corner.replace('_', '-')}-radius: 0;`
			);
		}
	});

	test('the other radius steps read their variables', () => {
		for (const v of border_radius_variants) {
			assert.strictEqual(
				to_declaration(`border_radius_${v}`),
				`border-radius: var(--border_radius_${v});`
			);
			assert.ok(declared_names.has(`border_radius_${v}`));
		}
	});
});

describe('icon_size classes', () => {
	test('set the font size and the --icon_size hook', () => {
		for (const v of icon_size_variants) {
			assert.strictEqual(
				to_declaration(`icon_size_${v}`),
				`font-size: var(--icon_size_${v}); --font_size: var(--icon_size_${v}); --icon_size: var(--icon_size_${v});`
			);
		}
	});
});
