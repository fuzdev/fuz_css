import {test, assert, describe} from 'vitest';

import type {Theme} from '$lib/theme.ts';
import {default_themes, DEFAULT_THEME} from '$lib/themes.ts';
import {create_terminal_theme} from '$lib/themes/terminal.ts';
import {StyleVariable} from '$lib/variable.ts';
import {validate_theme} from '$lib/theme_check.ts';

// every theme module ships from themes/, so discover them by glob — a new
// module can't silently skip validation by being left off a hand-list
const theme_modules = import.meta.glob('../lib/themes/*.ts', {eager: true});

const is_theme = (value: unknown): value is Theme =>
	value !== null &&
	typeof value === 'object' &&
	'name' in value &&
	'variables' in value &&
	Array.isArray((value as Theme).variables);

/** Every theme exported from a `themes/` module, registry and exemplar alike. */
const shipped_themes: Array<Theme> = Object.values(theme_modules).flatMap((mod) =>
	Object.values(mod as Record<string, unknown>).filter(is_theme),
);

const registry_names = new Set(default_themes.map((t) => t.name));

/** Shipped exemplar themes that deliberately stay out of the registry. */
const exemplar_themes = [
	...shipped_themes.filter((t) => !registry_names.has(t.name)),
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

	test('themes validate with no errors', () => {
		for (const theme of default_themes) {
			const errors = validate_theme(theme).filter((issue) => issue.level === 'error');
			assert.deepEqual(errors, [], `Theme "${theme.name}" has validation errors`);
		}
	});
});

describe('shipped themes', () => {
	test('the glob discovers the registry and the known exemplars', () => {
		const names = shipped_themes.map((t) => t.name);
		for (const registered of default_themes) {
			assert.include(names, registered.name);
		}
		assert.include(names, 'necromancer');
		assert.include(names, 'sunset ember');
		assert.include(names, 'brutalish');
		assert.include(names, 'terminal green');
	});

	test('all exemplar variables validate and exist in default_variables', () => {
		assert.isAbove(exemplar_themes.length, 0);
		for (const theme of exemplar_themes) {
			assert.isAbove(theme.variables.length, 0);
			for (const variable of theme.variables) {
				const result = StyleVariable.safeParse(variable);
				assert.isTrue(result.success, `Invalid variable ${variable.name} in theme ${theme.name}`);
			}
			const errors = validate_theme(theme).filter((issue) => issue.level === 'error');
			assert.deepEqual(errors, [], `Exemplar "${theme.name}" has validation errors`);
		}
	});
});
