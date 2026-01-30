import {test, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {
	class_names_equal,
	assert_no_classes,
	assert_diagnostic,
	assert_diagnostic_count,
} from './css_class_extractor_test_helpers.js';

describe('basic string class attributes', () => {
	const string_attr_cases = [
		{
			name: 'extracts classes from class="string" attribute',
			source: `<div class="foo bar baz"></div>`,
			expected: ['foo', 'bar', 'baz'],
		},
		{
			name: 'extracts CSS-literal classes from class attribute',
			source: `<div class="display:flex hover:opacity:80%"></div>`,
			expected: ['display:flex', 'hover:opacity:80%'],
		},
		{
			name: 'extracts classes with responsive modifiers',
			source: `<div class="md:display:flex lg:flex-direction:row"></div>`,
			expected: ['md:display:flex', 'lg:flex-direction:row'],
		},
	];

	test.each(string_attr_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('array-style class attributes (Svelte 5.16+)', () => {
	const array_attr_cases = [
		{
			name: 'extracts classes from class={[...]} array syntax',
			source: `<div class={['foo', 'bar']}></div>`,
			expected: ['foo', 'bar'],
		},
		{
			name: 'extracts classes from conditional array syntax',
			source: `<div class={[cond && 'active', 'base']}></div>`,
			expected: ['active', 'base'],
		},
		{
			name: 'extracts classes from complex array with CSS-literal syntax',
			source: `<div class={[faded && 'saturate-0 opacity-50', large && 'scale-200']}></div>`,
			expected: ['saturate-0', 'opacity-50', 'scale-200'],
		},
		{
			name: 'extracts CSS-literal classes from array syntax',
			source: `<div class={[cond && 'box', 'display:flex']}></div>`,
			expected: ['box', 'display:flex'],
		},
	];

	test.each(array_attr_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('object-style class attributes (Svelte 5.16+)', () => {
	const object_attr_cases = [
		{
			name: 'extracts classes from class={{...}} object syntax',
			source: `<div class={{ cool, lame: !cool }}></div>`,
			expected: ['cool', 'lame'],
		},
		{
			name: 'extracts CSS-literal classes from object keys',
			source: `<div class={{ 'display:flex': isActive, 'hover:opacity:80%': hasHover }}></div>`,
			expected: ['display:flex', 'hover:opacity:80%'],
		},
		{
			name: 'extracts classes from mixed object with identifiers and strings',
			source: `<div class={{ active, 'hover:color:red': true }}></div>`,
			expected: ['active', 'hover:color:red'],
		},
	];

	test.each(object_attr_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('class: directive', () => {
	const directive_cases = [
		{
			name: 'extracts class from class:name directive',
			source: `<div class:active={isActive}></div>`,
			expected: ['active'],
		},
		{
			name: 'extracts class from shorthand class:name directive',
			source: `<div class:cool></div>`,
			expected: ['cool'],
		},
		{
			name: 'extracts multiple class directives',
			source: `<div class:foo class:bar={cond} class:baz></div>`,
			expected: ['foo', 'bar', 'baz'],
		},
	];

	test.each(directive_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('component attributes', () => {
	const component_cases = [
		{
			name: 'extracts classes from Component class prop',
			source: `<Button class="custom-button hover:scale:1.05"></Button>`,
			expected: ['custom-button', 'hover:scale:1.05'],
		},
		{
			name: 'extracts classes from Component with complex class prop',
			source: `<Card class={clsx('card', selected && 'border:2px~solid~blue')}></Card>`,
			expected: ['card', 'border:2px~solid~blue'],
		},
	];

	test.each(component_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('edge cases', () => {
	const empty_cases = [
		{name: 'handles empty class attribute', source: `<div class=""></div>`},
		{name: 'handles class attribute with only whitespace', source: `<div class="   "></div>`},
		{name: 'handles empty class array', source: `<div class={[]}></div>`},
		{name: 'handles empty class object', source: `<div class={{}}></div>`},
	];

	test.each(empty_cases)('$name', ({source}) => {
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});

	test('handles unicode class names', () => {
		const source = `<div class="日本語 кириллица émoji-🎉"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['日本語', 'кириллица', 'émoji-🎉']);
	});

	test('handles class names with hyphens and underscores', () => {
		const source = `<div class="my-class my_class my--double my__double"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['my-class', 'my_class', 'my--double', 'my__double']);
	});

	test('handles parenthesized expressions', () => {
		const source = `<div class={('parenthesized')}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['parenthesized']);
	});

	test('handles spread in arrays (extracts static elements only)', () => {
		const source = `<div class={[...baseClasses, 'static-class']}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['static-class']);
	});

	test('handles spread in objects (extracts static keys only)', () => {
		const source = `<div class={{...baseClasses, 'static-key': true}}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['static-key']);
	});

	test('handles malformed Svelte gracefully with diagnostic', () => {
		const source = `<div class="foo" <broken>`;
		const result = extract_from_svelte(source, 'test.svelte');
		assert_no_classes(result);
		assert_diagnostic(result, 'warning', 'parse', 'test.svelte');
	});
});

describe('no false positives', () => {
	const false_positive_cases = [
		{
			name: 'does not extract from non-class attributes',
			source: `
<a href="mailto:someone@fuz.dev">Email</a>
<div data-value="foo:bar"></div>
<img src="http://fuz.dev/image.png" alt="test">
`,
		},
		{
			name: 'does not extract from string variables without class-like names',
			source: `
<script>
	const url = 'http://fuz.dev';
	const styles = 'display:flex';
</script>
<div></div>
`,
		},
		{
			name: 'does not extract from script string literals without class context',
			source: `
<script>
	const message = 'hello world';
	const config = { type: 'primary', size: 'large' };
</script>
<div></div>
`,
		},
	];

	test.each(false_positive_cases)('$name', ({source}) => {
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});

	test('does not extract from style blocks', () => {
		const source = `
<style>
	.not-extracted { color: red; }
	.also-not-extracted { background: blue; }
</style>
<div class="actual-class"></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['actual-class']);
	});

	test('does not extract from inline style attribute', () => {
		const source = `<div style="display:flex" class="real-class"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['real-class']);
	});
});

describe('multiple elements', () => {
	test('extracts classes from multiple elements', () => {
		const source = `
<div class="container">
	<header class={{ 'header': true, 'sticky': isSticky }}></header>
	<main class={['main', theme && 'themed']}></main>
	<footer class:active={isActive}></footer>
</div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['container', 'header', 'sticky', 'main', 'themed', 'active']);
	});
});

describe('Svelte control flow blocks', () => {
	const control_flow_cases = [
		{
			name: 'extracts classes inside {#each} blocks',
			source: `
{#each items as item}
	<div class="list-item">{item.name}</div>
{/each}
`,
			expected: ['list-item'],
		},
		{
			name: 'extracts classes inside {#if} blocks',
			source: `
{#if condition}
	<div class="shown"></div>
{:else}
	<div class="hidden"></div>
{/if}
`,
			expected: ['shown', 'hidden'],
		},
		{
			name: 'extracts classes inside {#snippet} blocks',
			source: `
{#snippet row(item)}
	<tr class="table-row">
		<td class="table-cell">{item.name}</td>
	</tr>
{/snippet}
`,
			expected: ['table-row', 'table-cell'],
		},
		{
			name: 'extracts classes from {#await} blocks',
			source: `
{#await promise}
	<div class="loading"></div>
{:then value}
	<div class="success"></div>
{:catch error}
	<div class="error"></div>
{/await}
`,
			expected: ['loading', 'success', 'error'],
		},
		{
			name: 'extracts classes from nested control flow',
			source: `
{#each items as item}
	{#if item.visible}
		<div class="nested-visible"></div>
	{/if}
{/each}
`,
			expected: ['nested-visible'],
		},
	];

	test.each(control_flow_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('module scripts', () => {
	const module_script_cases = [
		{
			name: 'extracts classes from script context="module" (Svelte 4 syntax)',
			source: `
<script context="module">
	export const sharedClasses = 'module-class shared';
</script>
<script>
	const localClasses = 'local-class';
</script>
<div></div>
`,
			expected: ['local-class', 'module-class', 'shared'],
		},
		{
			name: 'extracts classes from script module (Svelte 5 syntax)',
			source: `
<script module>
	export const exportedClasses = 'exported-one exported-two';
</script>
<script>
	const instanceClasses = 'instance-class';
</script>
<div></div>
`,
			expected: ['instance-class', 'exported-one', 'exported-two'],
		},
	];

	test.each(module_script_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});
});

describe('@fuz-classes comment extraction', () => {
	const fuz_classes_cases = [
		{
			name: 'extracts classes from single-line @fuz-classes comment',
			source: `
<script>
	// @fuz-classes outline_width_focus outline_width_active
</script>
<div></div>
`,
			expected: ['outline_width_focus', 'outline_width_active'],
		},
		{
			name: 'extracts classes from multi-line @fuz-classes comment',
			source: `
<script>
	/* @fuz-classes dynamic_class_1 dynamic_class_2 */
</script>
<div></div>
`,
			expected: ['dynamic_class_1', 'dynamic_class_2'],
		},
		{
			name: 'extracts classes from multiple @fuz-classes comments',
			source: `
<script>
	// @fuz-classes class_a class_b
	// @fuz-classes class_c class_d
</script>
<div></div>
`,
			expected: ['class_a', 'class_b', 'class_c', 'class_d'],
		},
		{
			name: 'combines @fuz-classes with regular class extraction',
			source: `
<script>
	// @fuz-classes dynamic_class
	const buttonClasses = 'static_class';
</script>
<div class="attribute_class"></div>
`,
			expected: ['attribute_class', 'dynamic_class', 'static_class'],
		},
		{
			name: 'extracts classes from HTML comment @fuz-classes',
			source: `
<!-- @fuz-classes html-comment-class another-class -->
<div></div>
`,
			expected: ['html-comment-class', 'another-class'],
		},
	];

	test.each(fuz_classes_cases)('$name', ({source, expected}) => {
		const result = extract_from_svelte(source);
		class_names_equal(result, expected);
	});

	test('extracts @fuz-classes with colon variant and emits warning', () => {
		const source = `
<script>
	// @fuz-classes: colon_class_1 colon_class_2
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['colon_class_1', 'colon_class_2']);
		assert_diagnostic_count(result, 1);
		assert_diagnostic(result, 'warning', 'unnecessary');
	});

	test('handles @fuz-classes with only whitespace after it', () => {
		const source = `
<script>
	// @fuz-classes
	const foo = 'bar';
</script>
`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});

	test('ignores @fuz-class without "es" suffix', () => {
		const source = `
<script>
	// @fuz-class not-extracted
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});
});
