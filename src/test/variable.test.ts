import {test, assert} from 'vitest';

import {StyleVariable} from '$lib/variable.js';

test('StyleVariable validates light-only', () => {
	const result = StyleVariable.safeParse({name: 'foo', light: '10px'});
	assert.ok(result.success);
});

test('StyleVariable validates dark-only', () => {
	const result = StyleVariable.safeParse({name: 'foo', dark: '10px'});
	assert.ok(result.success);
});

test('StyleVariable validates different light and dark', () => {
	const result = StyleVariable.safeParse({name: 'foo', light: '10px', dark: '20px'});
	assert.ok(result.success);
});

test('StyleVariable rejects missing light and dark', () => {
	const result = StyleVariable.safeParse({name: 'foo'});
	assert.ok(!result.success);
	assert.ok(result.error.issues.some((i) => i.message.includes('at least one')));
});

test('StyleVariable rejects identical light and dark', () => {
	const result = StyleVariable.safeParse({name: 'foo', light: '10px', dark: '10px'});
	assert.ok(!result.success);
	assert.ok(result.error.issues.some((i) => i.message.includes('must differ')));
});
