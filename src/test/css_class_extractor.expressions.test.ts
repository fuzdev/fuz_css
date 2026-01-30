import {test, expect, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {class_names_equal} from './css_class_extractor_test_helpers.js';

describe('ternary expressions', () => {
	test('extracts both branches of ternary in class attribute', () => {
		const source = `<div class={large ? 'large' : 'small'}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['large', 'small']);
	});

	test('extracts CSS-literal classes from ternary', () => {
		const source = `<div class={expanded ? 'max-height:500px' : 'max-height:0'}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['max-height:500px', 'max-height:0']);
	});

	test('extracts from nested ternary', () => {
		const source = `<div class={a ? (b ? 'ab' : 'a-only') : 'none'}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['ab', 'a-only', 'none']);
	});
});

describe('logical expressions', () => {
	test('extracts classes from logical OR', () => {
		const source = `<div class={foo || 'fallback'}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['fallback']);
	});

	test('extracts classes from nullish coalescing', () => {
		const source = `<div class={foo ?? 'default'}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['default']);
	});

	test('extracts from combined logical expressions', () => {
		const source = `<div class={clsx(a && 'a', b || 'b-fallback', c ?? 'c-default')}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['a', 'b-fallback', 'c-default']);
	});
});

describe('clsx/cn function calls', () => {
	test('extracts classes from clsx() call', () => {
		const source = `<div class={clsx('foo', 'bar')}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar']);
	});

	test('extracts classes from cn() call', () => {
		const source = `<div class={cn('base', active && 'active')}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base', 'active']);
	});

	test('extracts classes from clsx() with object syntax', () => {
		const source = `<div class={clsx({ foo: true, bar: false })}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar']);
	});

	test('extracts CSS-literal classes from clsx() call', () => {
		const source = `<div class={clsx('display:flex', { 'hover:opacity:80%': hasHover })}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['display:flex', 'hover:opacity:80%']);
	});

	test('extracts classes from nested clsx arguments', () => {
		const source = `<div class={clsx('base', active && 'active', ['nested', condition && 'cond'])}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base', 'active', 'nested', 'cond']);
	});
});

describe('template literals', () => {
	test('extracts classes from template literal', () => {
		const source = `<div class={\`foo bar\`}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar']);
	});

	test('extracts static parts from template literal with expressions', () => {
		const source = `<div class={\`base \${active ? 'active' : 'inactive'} end\`}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base', 'end', 'active', 'inactive']);
	});

	test('extracts from multiline template literal', () => {
		const source = `<div class={\`
			first-line
			second-line
		\`}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['first-line', 'second-line']);
	});

	test('extracts from tagged template literals', () => {
		const source = `<div class={css\`styled-class\`}></div>`;
		const result = extract_from_svelte(source);
		// Tagged templates like css`...` are extracted for CSS-in-JS patterns
		class_names_equal(result, ['styled-class']);
	});

	test('does not extract prefix fragments from template literals', () => {
		const source = `<div class={\`icon-\${size}\`}></div>`;
		const result = extract_from_svelte(source);
		// 'icon-' is not a complete token (no trailing whitespace before expression)
		expect(result.classes).toBeNull();
	});

	test('does not extract suffix fragments from template literals', () => {
		const source = `<div class={\`\${prefix}-suffix\`}></div>`;
		const result = extract_from_svelte(source);
		// '-suffix' is not a complete token (no leading whitespace after expression)
		expect(result.classes).toBeNull();
	});

	test('extracts complete tokens surrounded by expressions', () => {
		const source = `<div class={\`\${a} middle \${b}\`}></div>`;
		const result = extract_from_svelte(source);
		// 'middle' is complete (whitespace on both sides)
		class_names_equal(result, ['middle']);
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

describe('other class utility functions', () => {
	test('extracts classes from cx() call', () => {
		const source = `<div class={cx('foo', 'bar')}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar']);
	});

	test('extracts classes from classNames() call', () => {
		const source = `<div class={classNames('base', { active: isActive })}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base', 'active']);
	});

	test('extracts classes from classnames() call (lowercase)', () => {
		const source = `<div class={classnames('one', 'two')}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['one', 'two']);
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

describe('spread props with class', () => {
	test('extracts classes from element with spread and class', () => {
		const source = `<Button {...props} class="explicit-class"></Button>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['explicit-class']);
	});

	test('extracts classes from element with spread and dynamic class', () => {
		const source = `<div {...rest} class={clsx('base', extra)}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['base']);
	});
});

describe('spaces in multi-value CSS-literal', () => {
	test('extracts CSS-literal with tilde space encoding', () => {
		const source = `<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['margin:0~auto', 'padding:var(--space_sm)~var(--space_lg)']);
	});
});

describe('complex modifiers', () => {
	test('extracts classes with complex modifier combinations', () => {
		const source = `<div class="md:dark:hover:before:opacity:80%"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['md:dark:hover:before:opacity:80%']);
	});

	test('extracts nth-child modifier classes', () => {
		const source = `<div class="nth-child(2n+1):background:var(--shade_20)"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['nth-child(2n+1):background:var(--shade_20)']);
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
