import {test, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {class_names_equal, assert_no_classes} from './css_class_extractor_test_helpers.js';

describe('clsx/cn function calls', () => {
	const clsx_cases = [
		{
			name: 'extracts classes from clsx() call',
			source: `<div class={clsx('foo', 'bar')}></div>`,
			expected: ['foo', 'bar'],
		},
		{
			name: 'extracts classes from cn() call',
			source: `<div class={cn('base', active && 'active')}></div>`,
			expected: ['base', 'active'],
		},
		{
			name: 'extracts classes from clsx() with object syntax',
			source: `<div class={clsx({ foo: true, bar: false })}></div>`,
			expected: ['foo', 'bar'],
		},
		{
			name: 'extracts CSS-literal classes from clsx() call',
			source: `<div class={clsx('display:flex', { 'hover:opacity:80%': hasHover })}></div>`,
			expected: ['display:flex', 'hover:opacity:80%'],
		},
		{
			name: 'extracts classes from nested clsx arguments',
			source: `<div class={clsx('base', active && 'active', ['nested', condition && 'cond'])}></div>`,
			expected: ['base', 'active', 'nested', 'cond'],
		},
	];

	test.each(clsx_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('other class utility functions', () => {
	const utility_cases = [
		{
			name: 'extracts classes from cx() call',
			source: `<div class={cx('foo', 'bar')}></div>`,
			expected: ['foo', 'bar'],
		},
		{
			name: 'extracts classes from classNames() call',
			source: `<div class={classNames('base', { active: isActive })}></div>`,
			expected: ['base', 'active'],
		},
		{
			name: 'extracts classes from classnames() call (lowercase)',
			source: `<div class={classnames('one', 'two')}></div>`,
			expected: ['one', 'two'],
		},
	];

	test.each(utility_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('deeply nested utility function calls', () => {
	test('extracts classes from deeply nested clsx calls', () => {
		const source = `<div class={clsx('outer', clsx('inner', cond && 'deep'))}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['outer', 'inner', 'deep']);
	});

	test('extracts classes from cn inside array', () => {
		const source = `<div class={clsx(['base', cn('nested', { active: true })])}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base', 'nested', 'active']);
	});
});

describe('template literals', () => {
	const template_cases = [
		{
			name: 'extracts classes from template literal',
			source: `<div class={\`foo bar\`}></div>`,
			expected: ['foo', 'bar'],
		},
		{
			name: 'extracts static parts from template literal with expressions',
			source: `<div class={\`base \${active ? 'active' : 'inactive'} end\`}></div>`,
			expected: ['base', 'end', 'active', 'inactive'],
		},
		{
			name: 'extracts from multiline template literal',
			source: `<div class={\`
			first-line
			second-line
		\`}></div>`,
			expected: ['first-line', 'second-line'],
		},
		{
			name: 'extracts from tagged template literals',
			source: `<div class={css\`styled-class\`}></div>`,
			expected: ['styled-class'],
		},
		{
			name: 'extracts complete tokens surrounded by expressions',
			source: `<div class={\`\${a} middle \${b}\`}></div>`,
			expected: ['middle'],
		},
	];

	test.each(template_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});

	test('does not extract prefix fragments from template literals', () => {
		const source = `<div class={\`icon-\${size}\`}></div>`;
		const result = extract_from_svelte(source);
		// 'icon-' is not a complete token (no trailing whitespace before expression)
		assert_no_classes(result);
	});

	test('does not extract suffix fragments from template literals', () => {
		const source = `<div class={\`\${prefix}-suffix\`}></div>`;
		const result = extract_from_svelte(source);
		// '-suffix' is not a complete token (no leading whitespace after expression)
		assert_no_classes(result);
	});
});
