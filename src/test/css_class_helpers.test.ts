import {test, assert} from 'vitest';

import {escape_css_selector, generate_classes_css} from '$lib/css_class_helpers.js';

// CSS selector escaping tests
const escape_values: Array<[input: string, expected: string]> = [
	// Basic cases - no escaping needed
	['foo', 'foo'],
	['foo_bar', 'foo_bar'],
	['foo-bar', 'foo-bar'],

	// CSS-literal syntax - colons need escaping
	['display:flex', 'display\\:flex'],
	['display:none', 'display\\:none'],
	['justify-content:center', 'justify-content\\:center'],

	// Percent signs
	['opacity:80%', 'opacity\\:80\\%'],
	['width:100%', 'width\\:100\\%'],

	// Parentheses
	['nth-child(2n)', 'nth-child\\(2n\\)'],
	['min-width(800px)', 'min-width\\(800px\\)'],
	['calc(100%-20px)', 'calc\\(100\\%-20px\\)'],

	// Tilde (space encoding)
	['margin:0~auto', 'margin\\:0\\~auto'],
	['padding:10px~20px', 'padding\\:10px\\~20px'],

	// Combined - CSS-literal with modifiers
	['hover:opacity:80%', 'hover\\:opacity\\:80\\%'],
	['md:display:flex', 'md\\:display\\:flex'],
	['md:hover:opacity:80%', 'md\\:hover\\:opacity\\:80\\%'],
	['dark:color:white', 'dark\\:color\\:white'],

	// Complex cases
	['nth-child(3n+1):color:red', 'nth-child\\(3n\\+1\\)\\:color\\:red'],
	['min-width(800px):display:flex', 'min-width\\(800px\\)\\:display\\:flex'],
	['background:url(data:image/png)', 'background\\:url\\(data\\:image\\/png\\)'],

	// All special characters that need escaping
	['a!b', 'a\\!b'],
	['a"b', 'a\\"b'],
	['a#b', 'a\\#b'],
	['a$b', 'a\\$b'],
	['a%b', 'a\\%b'],
	['a&b', 'a\\&b'],
	["a'b", "a\\'b"],
	['a(b', 'a\\(b'],
	['a)b', 'a\\)b'],
	['a*b', 'a\\*b'],
	['a+b', 'a\\+b'],
	['a,b', 'a\\,b'],
	['a.b', 'a\\.b'],
	['a/b', 'a\\/b'],
	['a:b', 'a\\:b'],
	['a;b', 'a\\;b'],
	['a<b', 'a\\<b'],
	['a=b', 'a\\=b'],
	['a>b', 'a\\>b'],
	['a?b', 'a\\?b'],
	['a@b', 'a\\@b'],
	['a[b', 'a\\[b'],
	['a\\b', 'a\\\\b'],
	['a]b', 'a\\]b'],
	['a^b', 'a\\^b'],
	['a`b', 'a\\`b'],
	['a{b', 'a\\{b'],
	['a|b', 'a\\|b'],
	['a}b', 'a\\}b'],
	['a~b', 'a\\~b'],
];

for (const [input, expected] of escape_values) {
	test(`escape_css_selector escapes "${input}" to "${expected}"`, () => {
		assert.equal(escape_css_selector(input), expected);
	});
}

// Test that generate_classes_css uses escaping
test('generate_classes_css escapes class names with special characters', () => {
	const classes = ['display:flex', 'opacity:80%'];
	const classes_by_name: Record<string, {declaration: string}> = {
		'display:flex': {declaration: 'display: flex;'},
		'opacity:80%': {declaration: 'opacity: 80%;'},
	};

	const result = generate_classes_css(classes, classes_by_name, []);

	assert.include(result.css, '.display\\:flex { display: flex; }');
	assert.include(result.css, '.opacity\\:80\\% { opacity: 80%; }');
	// Should NOT contain unescaped versions
	assert.notInclude(result.css, '.display:flex {');
	assert.notInclude(result.css, '.opacity:80% {');
});

test('generate_classes_css escapes complex CSS-literal class names', () => {
	const classes = ['hover:opacity:80%', 'nth-child(2n):color:red'];
	const classes_by_name: Record<string, {declaration: string}> = {
		'hover:opacity:80%': {declaration: 'opacity: 80%;'},
		'nth-child(2n):color:red': {declaration: 'color: red;'},
	};

	const result = generate_classes_css(classes, classes_by_name, []);

	assert.include(result.css, '.hover\\:opacity\\:80\\%');
	assert.include(result.css, '.nth-child\\(2n\\)\\:color\\:red');
});
