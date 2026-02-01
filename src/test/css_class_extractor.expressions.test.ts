import {test, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {class_names_equal} from './css_class_extractor_test_helpers.js';

describe('ternary expressions', () => {
	const ternary_cases = [
		{
			name: 'extracts both branches of ternary in class attribute',
			source: `<div class={large ? 'large' : 'small'}></div>`,
			expected: ['large', 'small'],
		},
		{
			name: 'extracts CSS-literal classes from ternary',
			source: `<div class={expanded ? 'max-height:500px' : 'max-height:0'}></div>`,
			expected: ['max-height:500px', 'max-height:0'],
		},
		{
			name: 'extracts from nested ternary',
			source: `<div class={a ? (b ? 'ab' : 'a-only') : 'none'}></div>`,
			expected: ['ab', 'a-only', 'none'],
		},
	];

	test.each(ternary_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('logical expressions', () => {
	const logical_cases = [
		{
			name: 'extracts classes from logical OR',
			source: `<div class={foo || 'fallback'}></div>`,
			expected: ['fallback'],
		},
		{
			name: 'extracts classes from nullish coalescing',
			source: `<div class={foo ?? 'default'}></div>`,
			expected: ['default'],
		},
		{
			name: 'extracts from combined logical expressions',
			source: `<div class={clsx(a && 'a', b || 'b-fallback', c ?? 'c-default')}></div>`,
			expected: ['a', 'b-fallback', 'c-default'],
		},
	];

	test.each(logical_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('mixed expressions', () => {
	test('extracts classes from mixed expression types', () => {
		const source = `
<script>
	let isActive = false;
</script>
<div class={clsx(
	'base',
	isActive && 'active',
	{ disabled: false },
	['nested']
)}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base', 'active', 'disabled', 'nested']);
	});
});

describe('spread props with class', () => {
	const spread_cases = [
		{
			name: 'extracts classes from element with spread and class',
			source: `<Button {...props} class="explicit-class"></Button>`,
			expected: ['explicit-class'],
		},
		{
			name: 'extracts classes from element with spread and dynamic class',
			source: `<div {...rest} class={clsx('base', extra)}></div>`,
			expected: ['base'],
		},
	];

	test.each(spread_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('CSS-literal syntax', () => {
	const css_literal_cases = [
		{
			name: 'extracts CSS-literal with tilde space encoding',
			source: `<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)"></div>`,
			expected: ['margin:0~auto', 'padding:var(--space_sm)~var(--space_lg)'],
		},
		{
			name: 'extracts classes with complex modifier combinations',
			source: `<div class="md:dark:hover:before:opacity:80%"></div>`,
			expected: ['md:dark:hover:before:opacity:80%'],
		},
		{
			name: 'extracts nth-child modifier classes',
			source: `<div class="nth-child(2n+1):background:var(--shade_20)"></div>`,
			expected: ['nth-child(2n+1):background:var(--shade_20)'],
		},
	];

	test.each(css_literal_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('real-world patterns from Svelte 5.16+ docs', () => {
	test('extracts from Button component pattern', () => {
		const source = `
<script lang="ts">
	let props = $props();
</script>

<button {...props} class={['cool-button', props.class]}>
	{@render props.children?.()}
</button>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['cool-button']);
	});

	test('extracts from App component with object class', () => {
		const source = `
<script>
	import Button from './Button.svelte';
	let useTailwind = $state(false);
</script>

<Button
	onclick={() => useTailwind = true}
	class={{ 'bg-blue-700 sm:w-1/2': useTailwind }}
>
	Accept
</Button>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['bg-blue-700', 'sm:w-1/2']);
	});
});
