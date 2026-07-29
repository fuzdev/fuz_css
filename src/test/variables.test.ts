import { test, assert } from 'vitest';

import { default_variables } from '$lib/variables.ts';
import * as exported_variables from '$lib/variables.ts';
import { StyleVariable } from '$lib/variable.ts';
import { PALETTE_CHROMA_MULTIPLIERS } from '$lib/ramps.ts';
import { palette_variants, intent_variants } from '$lib/variable_data.ts';

test('all variables pass schema validation', () => {
	for (const v of default_variables) {
		const result = StyleVariable.safeParse(v);
		assert.isTrue(
			result.success,
			`variable "${v.name}" failed validation: ${JSON.stringify(result.error?.issues)}`
		);
	}
});

test('variables have no duplicates', () => {
	const names = new Set();
	for (const v of default_variables) {
		assert.isFalse(
			names.has(v.name),
			`variable "${v.name}" is duplicated in \`default_variables\``
		);
		names.add(v.name);
	}
});

test('variable names match their identifiers', () => {
	for (const v of default_variables) {
		assert.isTrue(
			v.name in exported_variables,
			`default variable with name "${v.name}" has no matching exported identifier`
		);
	}
});

test('variable identifiers are all included in `default_variables`', () => {
	for (const identifier in exported_variables) {
		const exported = (exported_variables as any)[identifier];
		if (!is_style_variable(exported)) continue;
		assert.strictEqual(
			identifier,
			exported.name,
			`variable identifier "${identifier}" does not match its name ${exported.name}`
		);
		assert.isTrue(
			default_variables.some((v) => v.name === identifier),
			`exported variable with identifier "${identifier}" is not included in \`default_variables\``
		);
	}
});

const is_style_variable = (v: unknown): v is StyleVariable => StyleVariable.safeParse(v).success;

test('per-slot chroma multiplier defaults pin the numeric twin', () => {
	// the emitted CSS falls back to 1 when the variable is absent, so the
	// declared defaults are what keep the CSS and the numeric-twin gates
	// agreeing - brown's 0.55 mute in particular
	const by_name = new Map(default_variables.map((v) => [v.name, v]));
	for (const letter of palette_variants) {
		const v = by_name.get(`palette_${letter}_chroma_scale`);
		assert(v, `palette_${letter}_chroma_scale is declared`);
		assert.strictEqual(v.light, String(PALETTE_CHROMA_MULTIPLIERS[letter]), v.name);
		assert.isUndefined(v.dark, `${v.name} is scheme-agnostic`);
	}
	for (const intent of intent_variants) {
		const v = by_name.get(`${intent}_chroma_scale`);
		assert(v, `${intent}_chroma_scale is declared`);
		assert.strictEqual(v.light, '1', v.name);
	}
});
