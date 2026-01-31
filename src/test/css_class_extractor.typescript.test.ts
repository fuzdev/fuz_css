import {test, describe} from 'vitest';

import {extract_from_ts, extract_css_classes} from '$lib/css_class_extractor.js';

import {
	class_names_equal,
	class_set_equal,
	assert_diagnostic,
} from './css_class_extractor_test_helpers.js';

describe('TypeScript extraction', () => {
	const ts_extraction_cases = [
		{
			name: 'extracts classes from TypeScript file',
			source: `
const buttonClasses = 'btn primary hover:opacity:80%';
export const cardClass = 'card';
`,
			expected: ['btn', 'primary', 'hover:opacity:80%', 'card'],
		},
		{
			name: 'extracts classes from clsx in TypeScript',
			source: `
const classes = clsx('base', active && 'active', { 'display:flex': true });
`,
			expected: ['base', 'active', 'display:flex'],
		},
		{
			name: 'extracts classes from object with class property',
			source: `
const props = { class: 'foo bar' };
const config = { className: 'baz' };
`,
			expected: ['foo', 'bar', 'baz'],
		},
		{
			name: 'extracts classes from object with double-quoted string literal keys',
			source: `
const config = {
	"class": "dq-class",
	"className": "dq-classname",
	"buttonClasses": "dq-btn primary",
	"foo-classes": "dq-foo"
};
`,
			expected: ['dq-class', 'dq-classname', 'dq-btn', 'primary', 'dq-foo'],
		},
		{
			name: 'extracts classes from object with single-quoted string literal keys',
			source: `
const config = {
	'class': 'sq-class',
	'className': 'sq-classname',
	'buttonClasses': 'sq-btn secondary',
	'bar-classes': 'sq-bar'
};
`,
			expected: ['sq-class', 'sq-classname', 'sq-btn', 'secondary', 'sq-bar'],
		},
		{
			name: 'extracts classes from mixed identifier and string literal keys',
			source: `
const config = {
	class: "id-class",
	"className": "str-classname",
	containerClasses: "id-container",
	"wrapper-classes": "str-wrapper"
};
`,
			expected: ['id-class', 'str-classname', 'id-container', 'str-wrapper'],
		},
	];

	test.each(ts_extraction_cases)('$name', ({source, expected}) => {
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, expected);
	});

	test('handles malformed TypeScript gracefully with diagnostic', () => {
		const source = `const x = { broken`;
		const result = extract_from_ts(source, 'test.ts');
		assert_diagnostic(result, 'warning', 'parse', 'test.ts');
	});
});

describe('unified extraction function', () => {
	test('extract_css_classes auto-detects Svelte files', () => {
		const source = `<div class="foo bar"></div>`;
		const result = extract_css_classes(source, {filename: 'test.svelte'});
		class_set_equal(result, ['foo', 'bar']);
	});

	test('extract_css_classes auto-detects TypeScript files', () => {
		const source = `const buttonClasses = 'btn primary';`;
		const result = extract_css_classes(source, {filename: 'test.ts'});
		class_set_equal(result, ['btn', 'primary']);
	});

	test('extract_css_classes auto-detects HTML files', () => {
		const source = `
<!DOCTYPE html>
<html>
<body>
	<div class="container p_lg">
		<button class="btn hover:opacity:80%">Click</button>
	</div>
	<!-- @fuz-classes dynamic-class -->
</body>
</html>`;
		const result = extract_css_classes(source, {filename: 'page.html'});
		class_set_equal(result, ['dynamic-class', 'container', 'p_lg', 'btn', 'hover:opacity:80%']);
	});
});

describe('@fuz-classes in TypeScript', () => {
	test('extracts @fuz-classes from TypeScript files with single-line comment', () => {
		const source = `
// @fuz-classes ts_class_1 ts_class_2
const foo = 'bar';
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['ts_class_1', 'ts_class_2']);
	});

	test('extracts @fuz-classes from TypeScript files with multi-line comment', () => {
		const source = `
/* @fuz-classes ts_multi_1 ts_multi_2 */
const foo = 'bar';
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['ts_multi_1', 'ts_multi_2']);
	});
});
