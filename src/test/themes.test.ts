import { test, assert, describe } from 'vitest';

import { default_themes, DEFAULT_THEME, contrast_modifiers } from '$lib/themes.ts';
import { StyleVariable, type Theme } from '$lib/variable.ts';
import { validate_theme } from '$lib/theme_validate.ts';
import { theme_knob_by_name } from '$lib/knobs.ts';
import { compose_themes, to_theme_stance } from '$lib/theme.ts';
import { create_theme_resolver } from '$lib/theme_resolver.ts';
import { color_scheme_variants } from '$lib/variable_data.ts';
import { low_contrast_theme } from '$lib/themes/low_contrast.ts';
import { high_contrast_theme } from '$lib/themes/high_contrast.ts';
import { shipped_themes, shipped_base_themes } from './theme_test_helpers.ts';

const registry_names = new Set(default_themes.map((t) => t.name));

/** Shipped exemplar themes: outside the registry and not contrast modifiers. */
const exemplar_themes = shipped_base_themes.filter((t) => !registry_names.has(t.name));

describe('default_themes', () => {
	test('all shipped themes have valid names', () => {
		for (const theme of shipped_themes) {
			assert.strictEqual(typeof theme.name, 'string');
			assert.isAbove(theme.name.length, 0);
		}
	});

	test('all shipped theme variables pass StyleVariable validation', () => {
		for (const theme of shipped_themes) {
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

	test('shipped theme names are unique across every module', () => {
		const names = shipped_themes.map((t) => t.name);
		const unique_names = new Set(names);
		assert.strictEqual(unique_names.size, names.length);
	});

	test('default_themes contains expected themes', () => {
		const names = default_themes.map((t) => t.name);
		assert.deepEqual(names, ['base', 'ledger']);
	});

	test('contrast is a modifier, not a registry theme', () => {
		const names = contrast_modifiers.map((t) => t.name);
		assert.include(names, 'low contrast');
		assert.include(names, 'high contrast');
		const registry = new Set(default_themes.map((t) => t.name));
		for (const name of names) assert.isFalse(registry.has(name));
	});

	test('contrast modifiers validate with no errors', () => {
		for (const modifier of contrast_modifiers) {
			const errors = validate_theme(modifier).filter((issue) => issue.level === 'error');
			assert.deepEqual(errors, [], `Modifier "${modifier.name}" has validation errors`);
		}
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
		for (const exemplar of [
			'zine',
			'pebble',
			'parchment',
			'phosphor',
			'guestbook',
			'marquee',
			'signage'
		]) {
			assert.include(names, exemplar);
		}
	});

	test('every pickable theme carries a summary for pickers', () => {
		for (const theme of shipped_base_themes) {
			assert.ok(theme.summary?.trim(), `${theme.name} has a summary`);
		}
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

describe('theme tiers', () => {
	const sets_palette_tier = (theme: Theme): boolean =>
		theme.variables.some((v) => theme_knob_by_name.get(v.name)?.tier === 'palette');

	test('registry themes and modifiers stay in the semantic tier', () => {
		for (const theme of [...default_themes, ...contrast_modifiers]) {
			assert.isFalse(sets_palette_tier(theme), `"${theme.name}" moves a palette-tier knob`);
		}
	});

	test('marquee is the only palette-tier exemplar', () => {
		const palette_tier = exemplar_themes.filter(sets_palette_tier).map((t) => t.name);
		assert.deepEqual(palette_tier, ['marquee']);
	});
});

describe('contrast modifiers over shipped themes', () => {
	test("every theme's own ground sits between its low and high contrast compositions", () => {
		// otherwise a modifier moves the ground the wrong way - high contrast
		// lifting a darker dark ground lowers the contrast it names
		const ground = (theme: Theme, scheme: 'light' | 'dark'): number =>
			create_theme_resolver(theme).resolve('shade_lightness_00', scheme)!;
		for (const theme of shipped_base_themes) {
			const stance = to_theme_stance(theme.scheme);
			for (const scheme of stance ? [stance] : color_scheme_variants) {
				const own = ground(theme, scheme);
				const low = ground(compose_themes(theme, low_contrast_theme), scheme);
				const high = ground(compose_themes(theme, high_contrast_theme), scheme);
				const label = `${theme.name} ${scheme}: low ${low}, own ${own}, high ${high}`;
				assert.isAtLeast(own, Math.min(low, high), label);
				assert.isAtMost(own, Math.max(low, high), label);
			}
		}
	});
});
