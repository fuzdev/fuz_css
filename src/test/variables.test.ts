import {test, assert} from 'vitest';

import {default_variables, absolute_color_variables} from '$lib/variables.js';
import * as exported_variables from '$lib/variables.js';
import {is_style_variable_name, type StyleVariable} from '$lib/variable.js';

// Create a set of absolute color variable names for quick lookup (these are dynamically generated)
const absolute_color_variable_names = new Set(absolute_color_variables.map((v) => v.name));

test('variable names are valid', () => {
	for (const v of default_variables) {
		assert.ok(is_style_variable_name(v.name), `variable name "${v.name}" is valid`);
	}
});

test('variables have no duplicates', () => {
	const names = new Set();
	for (const v of default_variables) {
		assert.ok(!names.has(v.name), `variable "${v.name}" is duplicated in \`default_variables\``);
		names.add(v.name);
	}
});

test('variable names match their identifiers', () => {
	for (const v of default_variables) {
		// Skip dynamically generated absolute color variables (they're not individually exported)
		if (absolute_color_variable_names.has(v.name)) continue;
		assert.ok(
			v.name in exported_variables,
			`default variable with name "${v.name}" has no matching exported identifier`,
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
			`variable identifier "${identifier}" does not match its name ${exported.name}`,
		);
		assert.ok(
			default_variables.some((v) => v.name === identifier),
			`exported variable with identifier "${identifier}" is not included in \`default_variables\``,
		);
	}
});

// TODO extract?
const is_style_variable = (v: any): v is StyleVariable => typeof v === 'object' && 'name' in v;
