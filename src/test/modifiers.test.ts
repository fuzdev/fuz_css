import {test, expect, describe} from 'vitest';

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

describe('MODIFIERS', () => {
	describe('uniqueness', () => {
		test('modifier names are unique', () => {
			const names: Set<string> = new Set();
			for (const m of MODIFIERS) {
				expect(names.has(m.name), `modifier name "${m.name}" is duplicated`).toBe(false);
				names.add(m.name);
			}
		});
	});

	describe('CSS spec compliance', () => {
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

			expect(
				failures.length,
				`The following modifiers are not in the CSS spec:\n  ${failures.join('\n  ')}`,
			).toBe(0);
		});
	});

	describe('CSS value format', () => {
		test('media modifiers start with @media', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'media') {
					expect(
						m.css.startsWith('@media '),
						`media modifier "${m.name}" should start with "@media "`,
					).toBe(true);
				}
			}
		});

		test('ancestor modifiers start with :root.', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'ancestor') {
					expect(
						m.css.startsWith(':root.'),
						`ancestor modifier "${m.name}" should start with ":root."`,
					).toBe(true);
				}
			}
		});

		test('state modifiers start with : but not ::', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'state') {
					expect(m.css.startsWith(':'), `state modifier "${m.name}" should start with ":"`).toBe(
						true,
					);
					expect(
						m.css.startsWith('::'),
						`state modifier "${m.name}" should not start with "::"`,
					).toBe(false);
				}
			}
		});

		test('pseudo-element modifiers start with ::', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'pseudo-element') {
					expect(
						m.css.startsWith('::'),
						`pseudo-element modifier "${m.name}" should start with "::"`,
					).toBe(true);
				}
			}
		});
	});
});
