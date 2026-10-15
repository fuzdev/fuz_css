import { test, describe, assert } from 'vitest';
import { transform } from 'lightningcss';

import { generate_classes_css } from '#lib/css_class_generation.ts';
import { css_class_definitions } from '#lib/css_class_definitions.ts';
import { css_class_interpreters } from '#lib/css_class_interpreters.ts';
import { load_css_properties } from '#lib/css_literal.ts';

// lightningcss is Vite's minifier, so CSS it rejects fails a production build -
// a class found in source must generate CSS it accepts or nothing at all

const css_properties = await load_css_properties();

const generate = (class_name: string, explicit: boolean): ReturnType<typeof generate_classes_css> =>
	generate_classes_css({
		class_names: [class_name],
		class_definitions: css_class_definitions,
		interpreters: css_class_interpreters,
		css_properties,
		explicit_classes: explicit ? new Set([class_name]) : null
	});

// throws on CSS lightningcss can't parse, as its minify pass does in a build
const minify = (css: string): string =>
	transform({ filename: 'generated.css', code: Buffer.from(css), minify: true }).code.toString();

describe('generated CSS parses as valid CSS', () => {
	test.each([
		'2xl:p_md',
		'2xl:hover:display:flex',
		'max-2xl:p_md',
		'nth-child(odd):color:red',
		'nth-child(even):color:red',
		'nth-child(2n+1):color:red',
		'nth-child(-n+3):color:red',
		'nth-child(n):color:red',
		'nth-child(+5):color:red',
		'nth-last-child(3n):color:red',
		'nth-of-type(-2n-1):color:red',
		'nth-last-of-type(+n+3):p_md',
		'min-width(0):color:red',
		'min-width(800px):color:red',
		'min-width(1.5em):color:red',
		'min-width(.5rem):color:red',
		'max-width(40ch):p_md',
		'min-width(48dvw):color:red',
		'min-width(50cqw):color:red',
		'min-width(calc(100vw~-~20px)):color:red',
		'min-width(calc(2~*~1px)):color:red',
		'min-width(calc(10rem/2)):color:red',
		'min-width(calc(10rem/(3~-~1))):color:red',
		'min-width(calc(10rem/max(0,~2))):color:red',
		'min-width(calc(1px)~):color:red',
		'min-width(calc(1px~-~-2px)):color:red',
		'min-width(clamp(300px,~50vw,~800px)):color:red',
		'min-width(min(100vw,1200px)):color:red',
		'max-width(calc(min(100vw,~1200px)~-~2rem)):color:red',
		'content:"a\u0001b"',
		"content:'a\u001fb'",
		'content:"a\u007fb"',
		'--aé:1',
		'--Δx:1'
	])('%j', (class_name) => {
		const { css, diagnostics } = generate(class_name, true);
		assert.notStrictEqual(css, '');
		assert.isFalse(diagnostics.some((d) => d.level === 'error'));
		assert.doesNotThrow(() => minify(css));
	});
});

describe('invalid modifier arguments generate nothing', () => {
	test.each([
		'min-width(800):color:red',
		'min-width(800):p_md',
		'min-width(100%):color:red',
		'min-width(48rme):color:red',
		'min-width(1px~2px):color:red',
		'min-width(calc(1px+2px)):color:red',
		'min-width(calc(1px~"x")):color:red',
		'min-width(calc(100%~-~4rem)):color:red',
		'min-width(calc(1px~*~1px)):color:red',
		'min-width(calc(10rem/(1~-~1))):color:red',
		'min-width(calc(10rem/(0))):color:red',
		'min-width(max(50vw~/~calc(min(0)))):color:red',
		'min-width(calc(1cqw/calc(0.0))):color:red',
		'min-width(calc(10rem/0.0000000000000000000000000000000000000000000001)):color:red',
		'min-width(calc(10rem/(0.1~+~0.2~-~0.3))):color:red',
		'min-width(calc(10rem/min(0,~1))):color:red',
		'min-width(calc(10rem/(0.00000000000000000000001*0.00000000000000000000001))):color:red',
		'min-width(calc(10rem/(0.00000000000000000000001/100000000000000000000000))):color:red',
		'min-width(min(1px,~2)):color:red',
		'min-width(env(safe-area-inset-left)):color:red',
		'nth-child(foo):color:red',
		'nth-child(1a):color:red',
		'nth-child(2n1):color:red',
		'nth-child(1+):color:red',
		'nth-of-type(1;x):color:red',
		'nth-last-child("x):color:red'
	])('%s', (class_name) => {
		// each would fail a build if it rendered
		const implicit = generate(class_name, false);
		assert.strictEqual(implicit.css, '');
		assert.isAbove(implicit.diagnostics.length, 0);
		assert.isTrue(implicit.diagnostics.every((d) => d.level === 'warning'));
		const explicit = generate(class_name, true);
		assert.strictEqual(explicit.css, '');
		assert.isTrue(explicit.diagnostics.some((d) => d.level === 'error'));
	});

	test.each([
		['min-width(800):color:red', 'A breakpoint takes a length'],
		['min-width(800):p_md', 'A breakpoint takes a length'],
		['min-width(100%):row', 'A breakpoint takes a length'],
		['nth-child(foo):p_md', 'An nth modifier takes An+B'],
		['nth-child(foo):color:red', 'An nth modifier takes An+B']
	])('%s says what the argument takes', (class_name, hint) => {
		const [diagnostic] = generate(class_name, true).diagnostics;
		assert.include(diagnostic?.suggestion, hint);
	});
});

test('a class name with a space renders one selector', () => {
	// a class listed by hand can carry a space no source class can, and an
	// unescaped one would turn the rule into a descendant selector
	const { css } = generate('display:flex a', true);
	assert.include(css, '.display\\:flex\\ a {');
});
