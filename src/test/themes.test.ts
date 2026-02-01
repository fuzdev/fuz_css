import {test, expect, describe} from 'vitest';

import {default_themes, DEFAULT_THEME} from '$lib/themes.js';
import {StyleVariable} from '$lib/variable.js';

describe('default_themes', () => {
	test('all themes have valid name', () => {
		for (const theme of default_themes) {
			expect(typeof theme.name).toBe('string');
			expect(theme.name.length).toBeGreaterThan(0);
		}
	});

	test('all theme variables pass StyleVariable validation', () => {
		for (const theme of default_themes) {
			for (const variable of theme.variables) {
				const result = StyleVariable.safeParse(variable);
				expect(result.success, `Invalid variable ${variable.name} in theme ${theme.name}`).toBe(
					true,
				);
			}
		}
	});

	test('DEFAULT_THEME has empty variables array', () => {
		expect(DEFAULT_THEME.variables).toEqual([]);
	});

	test('DEFAULT_THEME is first in default_themes', () => {
		expect(default_themes[0]).toBe(DEFAULT_THEME);
	});

	test('theme names are unique', () => {
		const names = default_themes.map((t) => t.name);
		const unique_names = new Set(names);
		expect(unique_names.size).toBe(names.length);
	});

	test('non-default themes have at least one variable', () => {
		const non_default_themes = default_themes.slice(1);
		for (const theme of non_default_themes) {
			expect(
				theme.variables.length,
				`Theme "${theme.name}" should have at least one variable`,
			).toBeGreaterThan(0);
		}
	});

	test('default_themes contains expected themes', () => {
		const names = default_themes.map((t) => t.name);
		expect(names).toContain('base');
		expect(names).toContain('low contrast');
		expect(names).toContain('high contrast');
	});

	test('DEFAULT_THEME has name "base"', () => {
		expect(DEFAULT_THEME.name).toBe('base');
	});
});
