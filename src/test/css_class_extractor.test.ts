import {test, expect} from 'vitest';

import {
	extract_from_svelte,
	extract_from_ts,
	extract_css_classes,
} from '$lib/css_class_extractor.js';

// Test basic string class attributes

test('extracts classes from class="string" attribute', () => {
	const source = `<div class="foo bar baz"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar', 'baz']));
});

test('extracts CSS-literal classes from class attribute', () => {
	const source = `<div class="display:flex hover:opacity:80%"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['display:flex', 'hover:opacity:80%']));
});

test('extracts classes with responsive modifiers', () => {
	const source = `<div class="md:display:flex lg:flex-direction:row"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['md:display:flex', 'lg:flex-direction:row']));
});

// Test array-style class attributes (Svelte 5.16+)

test('extracts classes from class={[...]} array syntax', () => {
	const source = `<div class={['foo', 'bar']}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar']));
});

test('extracts classes from conditional array syntax', () => {
	const source = `<div class={[cond && 'active', 'base']}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['active', 'base']));
});

test('extracts classes from complex array with CSS-literal syntax', () => {
	const source = `<div class={[faded && 'saturate-0 opacity-50', large && 'scale-200']}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['saturate-0', 'opacity-50', 'scale-200']));
});

test('extracts CSS-literal classes from array syntax', () => {
	const source = `<div class={[cond && 'box', 'display:flex']}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['box', 'display:flex']));
});

// Test object-style class attributes (Svelte 5.16+)

test('extracts classes from class={{...}} object syntax', () => {
	const source = `<div class={{ cool, lame: !cool }}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['cool', 'lame']));
});

test('extracts CSS-literal classes from object keys', () => {
	const source = `<div class={{ 'display:flex': isActive, 'hover:opacity:80%': hasHover }}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['display:flex', 'hover:opacity:80%']));
});

test('extracts classes from mixed object with identifiers and strings', () => {
	const source = `<div class={{ active, 'hover:color:red': true }}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['active', 'hover:color:red']));
});

// Test class: directive

test('extracts class from class:name directive', () => {
	const source = `<div class:active={isActive}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['active']));
});

test('extracts class from shorthand class:name directive', () => {
	const source = `<div class:cool></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['cool']));
});

test('extracts multiple class directives', () => {
	const source = `<div class:foo class:bar={cond} class:baz></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar', 'baz']));
});

// Test ternary expressions

test('extracts both branches of ternary in class attribute', () => {
	const source = `<div class={large ? 'large' : 'small'}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['large', 'small']));
});

test('extracts CSS-literal classes from ternary', () => {
	const source = `<div class={expanded ? 'max-height:500px' : 'max-height:0'}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['max-height:500px', 'max-height:0']));
});

// Test clsx/cn function calls

test('extracts classes from clsx() call', () => {
	const source = `<div class={clsx('foo', 'bar')}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar']));
});

test('extracts classes from cn() call', () => {
	const source = `<div class={cn('base', active && 'active')}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['base', 'active']));
});

test('extracts classes from clsx() with object syntax', () => {
	const source = `<div class={clsx({ foo: true, bar: false })}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar']));
});

test('extracts CSS-literal classes from clsx() call', () => {
	const source = `<div class={clsx('display:flex', { 'hover:opacity:80%': hasHover })}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['display:flex', 'hover:opacity:80%']));
});

test('extracts classes from nested clsx arguments', () => {
	const source = `<div class={clsx('base', active && 'active', ['nested', condition && 'cond'])}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['base', 'active', 'nested', 'cond']));
});

// Test template literals

test('extracts classes from template literal', () => {
	const source = `<div class={\`foo bar\`}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar']));
});

test('extracts static parts from template literal with expressions', () => {
	const source = `<div class={\`base \${active ? 'active' : 'inactive'} end\`}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['base', 'active', 'inactive', 'end']));
});

// Test mixed expressions

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
	expect(result.classes).toContain('base');
	expect(result.classes).toContain('active');
	expect(result.classes).toContain('disabled');
	expect(result.classes).toContain('nested');
});

// Test variable tracking

test('extracts classes from variables with class-like names', () => {
	const source = `
<script>
	const buttonClasses = 'btn primary';
</script>
<div class={buttonClasses}></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('btn');
	expect(result.classes).toContain('primary');
});

test('extracts classes from variables ending in Classes', () => {
	const source = `
<script>
	const cardClasses = 'display:flex gap:var(--space_md)';
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('display:flex');
	expect(result.classes).toContain('gap:var(--space_md)');
});

// Test TypeScript extraction

test('extracts classes from TypeScript file', () => {
	const source = `
const buttonClasses = 'btn primary hover:opacity:80%';
export const cardClass = 'card';
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes).toContain('btn');
	expect(result.classes).toContain('primary');
	expect(result.classes).toContain('hover:opacity:80%');
	expect(result.classes).toContain('card');
});

test('extracts classes from clsx in TypeScript', () => {
	const source = `
const classes = clsx('base', active && 'active', { 'display:flex': true });
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes).toContain('base');
	expect(result.classes).toContain('active');
	expect(result.classes).toContain('display:flex');
});

test('extracts classes from object with class property', () => {
	const source = `
const props = { class: 'foo bar' };
const config = { className: 'baz' };
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes).toContain('foo');
	expect(result.classes).toContain('bar');
	expect(result.classes).toContain('baz');
});

// Test unified extraction function

test('extract_css_classes auto-detects Svelte files', () => {
	const source = `<div class="foo bar"></div>`;
	const result = extract_css_classes(source, 'test.svelte');
	expect(result).toEqual(new Set(['foo', 'bar']));
});

test('extract_css_classes auto-detects TypeScript files', () => {
	const source = `const buttonClasses = 'btn primary';`;
	const result = extract_css_classes(source, 'test.ts');
	expect(result).toContain('btn');
	expect(result).toContain('primary');
});

// Test component attributes

test('extracts classes from Component class prop', () => {
	const source = `<Button class="custom-button hover:scale:1.05"></Button>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['custom-button', 'hover:scale:1.05']));
});

test('extracts classes from Component with complex class prop', () => {
	const source = `<Card class={clsx('card', selected && 'border:2px~solid~blue')}></Card>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('card');
	expect(result.classes).toContain('border:2px~solid~blue');
});

// Test edge cases

test('handles empty class attribute', () => {
	const source = `<div class=""></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes.size).toBe(0);
});

test('handles class attribute with only whitespace', () => {
	const source = `<div class="   "></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes.size).toBe(0);
});

test('handles malformed Svelte gracefully', () => {
	const source = `<div class="foo" <broken>`;
	const result = extract_from_svelte(source);
	// Should not throw, may return partial results
	expect(result.classes).toBeDefined();
});

test('handles malformed TypeScript gracefully', () => {
	const source = `const x = { broken`;
	const result = extract_from_ts(source, 'test.ts');
	// Should not throw, returns empty result
	expect(result.classes.size).toBe(0);
});

// Test real-world patterns from Svelte 5.16+ docs

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
	expect(result.classes).toContain('cool-button');
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
	expect(result.classes).toContain('bg-blue-700');
	expect(result.classes).toContain('sm:w-1/2');
});

// Test no false positives

test('does not extract from non-class attributes', () => {
	const source = `
<a href="mailto:someone@fuz.dev">Email</a>
<div data-value="foo:bar"></div>
<img src="http://fuz.dev/image.png" alt="test">
`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('mailto:someone@fuz.dev')).toBe(false);
	expect(result.classes.has('foo:bar')).toBe(false);
	expect(result.classes.has('http://fuz.dev/image.png')).toBe(false);
});

test('does not extract from string variables without class-like names', () => {
	const source = `
<script>
	const url = 'http://fuz.dev';
	const styles = 'display:flex';
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('http://fuz.dev')).toBe(false);
	// 'styles' doesn't match CLASS_NAME_PATTERN, so not extracted
	expect(result.classes.has('display:flex')).toBe(false);
});

// Test combination of multiple elements

test('extracts classes from multiple elements', () => {
	const source = `
<div class="container">
	<header class={{ 'header': true, 'sticky': isSticky }}></header>
	<main class={['main', theme && 'themed']}></main>
	<footer class:active={isActive}></footer>
</div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('container');
	expect(result.classes).toContain('header');
	expect(result.classes).toContain('sticky');
	expect(result.classes).toContain('main');
	expect(result.classes).toContain('themed');
	expect(result.classes).toContain('active');
});

// Test spaces in multi-value CSS-literal

test('extracts CSS-literal with tilde space encoding', () => {
	const source = `<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('margin:0~auto');
	expect(result.classes).toContain('padding:var(--space_sm)~var(--space_lg)');
});

// Test complex modifiers

test('extracts classes with complex modifier combinations', () => {
	const source = `<div class="md:dark:hover:before:opacity:80%"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('md:dark:hover:before:opacity:80%');
});

test('extracts nth-child modifier classes', () => {
	const source = `<div class="nth-child(2n+1):background:var(--bg_2)"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('nth-child(2n+1):background:var(--bg_2)');
});

// Test @fuz-classes comment extraction

test('extracts classes from single-line @fuz-classes comment', () => {
	const source = `
<script>
	// @fuz-classes outline_width_focus outline_width_active
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('outline_width_focus');
	expect(result.classes).toContain('outline_width_active');
});

test('extracts classes from multi-line @fuz-classes comment', () => {
	const source = `
<script>
	/* @fuz-classes dynamic_class_1 dynamic_class_2 */
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('dynamic_class_1');
	expect(result.classes).toContain('dynamic_class_2');
});

test('extracts classes from multiple @fuz-classes comments', () => {
	const source = `
<script>
	// @fuz-classes class_a class_b
	// @fuz-classes class_c class_d
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('class_a');
	expect(result.classes).toContain('class_b');
	expect(result.classes).toContain('class_c');
	expect(result.classes).toContain('class_d');
});

test('extracts @fuz-classes from TypeScript files', () => {
	const source = `
// @fuz-classes ts_class_1 ts_class_2
const foo = 'bar';
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes).toContain('ts_class_1');
	expect(result.classes).toContain('ts_class_2');
});

test('combines @fuz-classes with regular class extraction', () => {
	const source = `
<script>
	// @fuz-classes dynamic_class
	const buttonClasses = 'static_class';
</script>
<div class="attribute_class"></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('dynamic_class');
	expect(result.classes).toContain('static_class');
	expect(result.classes).toContain('attribute_class');
});

// Test other class utility functions

test('extracts classes from cx() call', () => {
	const source = `<div class={cx('foo', 'bar')}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['foo', 'bar']));
});

test('extracts classes from classNames() call', () => {
	const source = `<div class={classNames('base', { active: isActive })}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['base', 'active']));
});

test('extracts classes from classnames() call (lowercase)', () => {
	const source = `<div class={classnames('one', 'two')}></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['one', 'two']));
});

// Test edge cases

test('handles empty class attribute gracefully', () => {
	const source = `<div class=""></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes.size).toBe(0);
});

test('handles parse errors gracefully, returns @fuz-classes only', () => {
	const source = `
// @fuz-classes fallback_class
<div class="this is { invalid svelte syntax
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toContain('fallback_class');
});

test('extracts from multiple @fuz-classes comments', () => {
	const source = `
<script>
	// @fuz-classes class_a class_b
	// @fuz-classes class_c
</script>
`;
	const result = extract_from_svelte(source);
	expect(result.classes).toEqual(new Set(['class_a', 'class_b', 'class_c']));
});
