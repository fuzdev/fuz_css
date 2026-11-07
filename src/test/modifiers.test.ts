import { test, assert, describe } from 'vitest';

import { MODIFIERS, get_modifier } from '#lib/modifiers.ts';

/**
 * Loads CSS selectors from @webref/css for validation.
 */
const load_webref_selectors = async (): Promise<Set<string>> => {
	const data = await import('@webref/css/css.json');
	const selectors: Array<{ name: string }> = (data as any).default.selectors;
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
				assert.isFalse(names.has(m.name), `modifier name "${m.name}" is duplicated`);
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
						`"${m.name}" maps to "${m.css}" (base: "${base_selector}") which is not in CSS spec`
					);
				}
			}

			assert.strictEqual(
				failures.length,
				0,
				`The following modifiers are not in the CSS spec:\n  ${failures.join('\n  ')}`
			);
		});
	});

	describe('CSS value format', () => {
		test('media modifiers are media conditions, not wrapped', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'media') {
					assert.notInclude(m.css, '@media', `media modifier "${m.name}" is a bare condition`);
					assert.match(m.css, /^(\(|print$)/, `media modifier "${m.name}" is a condition`);
				}
			}
		});

		test('width modifiers declare their bound', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'media' && m.css.startsWith('(width')) {
					assert.ok(m.width, `width modifier "${m.name}" declares its bound`);
				}
			}
		});

		test('ancestor modifiers name a color scheme', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'ancestor') {
					assert.include(['light', 'dark'], m.css, `ancestor modifier "${m.name}"`);
				}
			}
		});

		test('state modifiers start with : but not ::', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'state') {
					assert.isTrue(m.css.startsWith(':'), `state modifier "${m.name}" should start with ":"`);
					assert.isFalse(
						m.css.startsWith('::'),
						`state modifier "${m.name}" should not start with "::"`
					);
				}
			}
		});

		test('pseudo-element modifiers start with ::', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'pseudo-element') {
					assert.isTrue(
						m.css.startsWith('::'),
						`pseudo-element modifier "${m.name}" should start with "::"`
					);
				}
			}
		});
	});

	describe('state order', () => {
		test('every state modifier has a cascade order', () => {
			for (const m of MODIFIERS) {
				if (m.type === 'state') {
					assert.isNumber(m.order, `state modifier "${m.name}" should have an order`);
				}
			}
			const nth = get_modifier('nth-child(2n)');
			assert.isNumber(nth?.order, 'a parameterized state should have an order');
		});

		test('only disabled and enabled order after the interaction states', () => {
			const order_of = (name: string): number => get_modifier(name)!.order!;
			const interaction = [
				'link',
				'visited',
				'focus-within',
				'focus',
				'focus-visible',
				'hover',
				'active',
				'target'
			].map(order_of);
			const last_interaction = Math.max(...interaction);
			const first_interaction = Math.min(...interaction);
			for (const name of ['disabled', 'enabled']) {
				assert.isAbove(
					order_of(name),
					last_interaction,
					`"${name}" should order after the interaction states`
				);
			}
			for (const name of [
				'checked',
				'invalid',
				'placeholder-shown',
				'first',
				'odd',
				'open',
				'paused',
				'nth-of-type(3)'
			]) {
				assert.strictEqual(
					order_of(name),
					first_interaction,
					`"${name}" should order with \`link\`, before the other interaction states`
				);
			}
		});
	});
});
