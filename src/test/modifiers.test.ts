import {test, assert} from 'vitest';

import {MODIFIERS} from '$lib/modifiers.js';

/**
 * Loads CSS selectors from @webref/css for validation.
 */
const load_webref_selectors = async (): Promise<Set<string>> => {
	const data = await import('@webref/css/css.json');
	const selectors: Array<{name: string}> = (data as any).default.selectors;
	return new Set(selectors.map((s) => s.name));
};

/**
 * Extracts the base selector from a CSS string.
 * Handles parameterized selectors like `:nth-child(odd)` → `:nth-child()`.
 */
const extract_base_selector = (css: string): string => {
	// Handle pseudo-elements and pseudo-classes
	const match = /^(::?[\w-]+)(?:\([^)]*\))?$/.exec(css);
	if (match) {
		const base = match[1]!;
		// If original had parentheses, add empty parens for webref lookup
		if (css.includes('(')) {
			return base + '()';
		}
		return base;
	}
	return css;
};

test('modifier names are unique', () => {
	const names: Set<string> = new Set();
	for (const m of MODIFIERS) {
		assert.ok(!names.has(m.name), `modifier name "${m.name}" is duplicated`);
		names.add(m.name);
	}
});

test('state and pseudo-element modifiers map to valid CSS spec selectors', async () => {
	const webref_selectors = await load_webref_selectors();

	const failures: Array<string> = [];

	for (const m of MODIFIERS) {
		// Skip media and ancestor modifiers - they use @media and ancestor selectors, not pseudo-classes
		if (m.type === 'media' || m.type === 'ancestor') continue;

		const base_selector = extract_base_selector(m.css);

		if (!webref_selectors.has(base_selector)) {
			failures.push(
				`"${m.name}" maps to "${m.css}" (base: "${base_selector}") which is not in CSS spec`,
			);
		}
	}

	assert.strictEqual(
		failures.length,
		0,
		`The following modifiers are not in the CSS spec:\n  ${failures.join('\n  ')}`,
	);
});

test('modifier css values are well-formed', () => {
	for (const m of MODIFIERS) {
		switch (m.type) {
			case 'media':
				assert.ok(
					m.css.startsWith('@media '),
					`media modifier "${m.name}" should start with "@media "`,
				);
				break;
			case 'ancestor':
				assert.ok(
					m.css.startsWith(':root.'),
					`ancestor modifier "${m.name}" should start with ":root."`,
				);
				break;
			case 'state':
				assert.ok(m.css.startsWith(':'), `state modifier "${m.name}" should start with ":"`);
				assert.ok(!m.css.startsWith('::'), `state modifier "${m.name}" should not start with "::"`);
				break;
			case 'pseudo-element':
				assert.ok(
					m.css.startsWith('::'),
					`pseudo-element modifier "${m.name}" should start with "::"`,
				);
				break;
		}
	}
});
