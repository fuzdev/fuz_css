import {test, assert, describe} from 'vitest';

import {default_themes, DEFAULT_THEME} from '$lib/themes.ts';
import {necromancer_theme} from '$lib/themes/necromancer.ts';
import {sunset_ember_theme} from '$lib/themes/sunset_ember.ts';
import {brutalist_theme} from '$lib/themes/brutalist.ts';
import {create_terminal_theme, terminal_green_theme} from '$lib/themes/terminal.ts';
import {default_variables} from '$lib/variables.ts';
import {StyleVariable} from '$lib/variable.ts';

/** Shipped exemplar themes that deliberately stay out of the registry. */
const exemplar_themes = [
	necromancer_theme,
	sunset_ember_theme,
	brutalist_theme,
	terminal_green_theme,
	create_terminal_theme(70), // amber, exercises the factory
];

describe('default_themes', () => {
	test('all themes have valid name', () => {
		for (const theme of default_themes) {
			assert.strictEqual(typeof theme.name, 'string');
			assert.isAbove(theme.name.length, 0);
		}
	});

	test('all theme variables pass StyleVariable validation', () => {
		for (const theme of default_themes) {
			for (const variable of theme.variables) {
				const result = StyleVariable.safeParse(variable);
				assert.isTrue(result.success, `Invalid variable ${variable.name} in theme ${theme.name}`);
			}
		}
	});

	test('DEFAULT_THEME has empty variables array', () => {
		assert.deepEqual(DEFAULT_THEME.variables, []);
	});

	test('DEFAULT_THEME is first in default_themes', () => {
		assert.strictEqual(default_themes[0], DEFAULT_THEME);
	});

	test('theme names are unique', () => {
		const names = default_themes.map((t) => t.name);
		const unique_names = new Set(names);
		assert.strictEqual(unique_names.size, names.length);
	});

	test('non-default themes have at least one variable', () => {
		const non_default_themes = default_themes.slice(1);
		for (const theme of non_default_themes) {
			assert.isAbove(
				theme.variables.length,
				0,
				`Theme "${theme.name}" should have at least one variable`,
			);
		}
	});

	test('default_themes contains expected themes', () => {
		const names = default_themes.map((t) => t.name);
		assert.include(names, 'base');
		assert.include(names, 'low contrast');
		assert.include(names, 'high contrast');
	});

	test('DEFAULT_THEME has name "base"', () => {
		assert.strictEqual(DEFAULT_THEME.name, 'base');
	});

	test('theme variable names exist in default_variables', () => {
		const known_names = new Set(default_variables.map((v) => v.name));
		for (const theme of default_themes) {
			for (const variable of theme.variables) {
				assert.isTrue(
					known_names.has(variable.name),
					`Theme "${theme.name}" overrides unknown variable "${variable.name}"`,
				);
			}
		}
	});
});

describe('exemplar themes', () => {
	test('exemplars stay out of the registry', () => {
		const registry_names = new Set(default_themes.map((t) => t.name));
		for (const theme of exemplar_themes) {
			assert.isFalse(registry_names.has(theme.name), `"${theme.name}" should not register`);
		}
	});

	test('all exemplar variables validate and exist in default_variables', () => {
		const known_names = new Set(default_variables.map((v) => v.name));
		for (const theme of exemplar_themes) {
			assert.isAbove(theme.variables.length, 0);
			for (const variable of theme.variables) {
				const result = StyleVariable.safeParse(variable);
				assert.isTrue(result.success, `Invalid variable ${variable.name} in theme ${theme.name}`);
				assert.isTrue(
					known_names.has(variable.name),
					`Theme "${theme.name}" overrides unknown variable "${variable.name}"`,
				);
			}
		}
	});
});
