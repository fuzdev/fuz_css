import { test, assert, describe } from 'vitest';

import { parse_ci_value } from '#lib/ci.ts';

describe('parse_ci_value', () => {
	test('unset, empty, false, and 0 are not CI', () => {
		for (const value of [undefined, '', '  ', 'false', 'FALSE', 'False', ' false ', '0', ' 0']) {
			assert.isFalse(parse_ci_value(value), JSON.stringify(value));
		}
	});

	test('any other value is CI', () => {
		for (const value of ['true', 'TRUE', '1', 'yes', 'on', 'github', '00', 'falsey']) {
			assert.isTrue(parse_ci_value(value), value);
		}
	});
});
