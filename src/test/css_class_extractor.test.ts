import {test, expect} from 'vitest';

import {
	extract_from_svelte,
	extract_from_ts,
	extract_css_classes,
} from '$lib/css_class_extractor.js';

/**
 * Helper to get class names from extraction result.
 */
const class_names = (result: {classes: Map<string, unknown>}): Set<string> =>
	new Set(result.classes.keys());

// Test basic string class attributes

test('extracts classes from class="string" attribute', () => {
	const source = `<div class="foo bar baz"></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar', 'baz']));
});

test('extracts CSS-literal classes from class attribute', () => {
	const source = `<div class="display:flex hover:opacity:80%"></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['display:flex', 'hover:opacity:80%']));
});

test('extracts classes with responsive modifiers', () => {
	const source = `<div class="md:display:flex lg:flex-direction:row"></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['md:display:flex', 'lg:flex-direction:row']));
});

// Test array-style class attributes (Svelte 5.16+)

test('extracts classes from class={[...]} array syntax', () => {
	const source = `<div class={['foo', 'bar']}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar']));
});

test('extracts classes from conditional array syntax', () => {
	const source = `<div class={[cond && 'active', 'base']}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['active', 'base']));
});

test('extracts classes from complex array with CSS-literal syntax', () => {
	const source = `<div class={[faded && 'saturate-0 opacity-50', large && 'scale-200']}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['saturate-0', 'opacity-50', 'scale-200']));
});

test('extracts CSS-literal classes from array syntax', () => {
	const source = `<div class={[cond && 'box', 'display:flex']}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['box', 'display:flex']));
});

// Test object-style class attributes (Svelte 5.16+)

test('extracts classes from class={{...}} object syntax', () => {
	const source = `<div class={{ cool, lame: !cool }}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['cool', 'lame']));
});

test('extracts CSS-literal classes from object keys', () => {
	const source = `<div class={{ 'display:flex': isActive, 'hover:opacity:80%': hasHover }}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['display:flex', 'hover:opacity:80%']));
});

test('extracts classes from mixed object with identifiers and strings', () => {
	const source = `<div class={{ active, 'hover:color:red': true }}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['active', 'hover:color:red']));
});

// Test class: directive

test('extracts class from class:name directive', () => {
	const source = `<div class:active={isActive}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['active']));
});

test('extracts class from shorthand class:name directive', () => {
	const source = `<div class:cool></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['cool']));
});

test('extracts multiple class directives', () => {
	const source = `<div class:foo class:bar={cond} class:baz></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar', 'baz']));
});

// Test ternary expressions

test('extracts both branches of ternary in class attribute', () => {
	const source = `<div class={large ? 'large' : 'small'}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['large', 'small']));
});

test('extracts CSS-literal classes from ternary', () => {
	const source = `<div class={expanded ? 'max-height:500px' : 'max-height:0'}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['max-height:500px', 'max-height:0']));
});

// Test clsx/cn function calls

test('extracts classes from clsx() call', () => {
	const source = `<div class={clsx('foo', 'bar')}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar']));
});

test('extracts classes from cn() call', () => {
	const source = `<div class={cn('base', active && 'active')}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['base', 'active']));
});

test('extracts classes from clsx() with object syntax', () => {
	const source = `<div class={clsx({ foo: true, bar: false })}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar']));
});

test('extracts CSS-literal classes from clsx() call', () => {
	const source = `<div class={clsx('display:flex', { 'hover:opacity:80%': hasHover })}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['display:flex', 'hover:opacity:80%']));
});

test('extracts classes from nested clsx arguments', () => {
	const source = `<div class={clsx('base', active && 'active', ['nested', condition && 'cond'])}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['base', 'active', 'nested', 'cond']));
});

// Test template literals

test('extracts classes from template literal', () => {
	const source = `<div class={\`foo bar\`}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar']));
});

test('extracts static parts from template literal with expressions', () => {
	const source = `<div class={\`base \${active ? 'active' : 'inactive'} end\`}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['base', 'active', 'inactive', 'end']));
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
	expect(result.classes.has('base')).toBe(true);
	expect(result.classes.has('active')).toBe(true);
	expect(result.classes.has('disabled')).toBe(true);
	expect(result.classes.has('nested')).toBe(true);
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
	expect(result.classes.has('btn')).toBe(true);
	expect(result.classes.has('primary')).toBe(true);
});

test('extracts classes from variables ending in Classes', () => {
	const source = `
<script>
	const cardClasses = 'display:flex gap:var(--space_md)';
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('display:flex')).toBe(true);
	expect(result.classes.has('gap:var(--space_md)')).toBe(true);
});

// Test TypeScript extraction

test('extracts classes from TypeScript file', () => {
	const source = `
const buttonClasses = 'btn primary hover:opacity:80%';
export const cardClass = 'card';
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes.has('btn')).toBe(true);
	expect(result.classes.has('primary')).toBe(true);
	expect(result.classes.has('hover:opacity:80%')).toBe(true);
	expect(result.classes.has('card')).toBe(true);
});

test('extracts classes from clsx in TypeScript', () => {
	const source = `
const classes = clsx('base', active && 'active', { 'display:flex': true });
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes.has('base')).toBe(true);
	expect(result.classes.has('active')).toBe(true);
	expect(result.classes.has('display:flex')).toBe(true);
});

test('extracts classes from object with class property', () => {
	const source = `
const props = { class: 'foo bar' };
const config = { className: 'baz' };
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes.has('foo')).toBe(true);
	expect(result.classes.has('bar')).toBe(true);
	expect(result.classes.has('baz')).toBe(true);
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
	expect(result.has('btn')).toBe(true);
	expect(result.has('primary')).toBe(true);
});

// Test component attributes

test('extracts classes from Component class prop', () => {
	const source = `<Button class="custom-button hover:scale:1.05"></Button>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['custom-button', 'hover:scale:1.05']));
});

test('extracts classes from Component with complex class prop', () => {
	const source = `<Card class={clsx('card', selected && 'border:2px~solid~blue')}></Card>`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('card')).toBe(true);
	expect(result.classes.has('border:2px~solid~blue')).toBe(true);
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
	expect(result.classes.has('cool-button')).toBe(true);
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
	expect(result.classes.has('bg-blue-700')).toBe(true);
	expect(result.classes.has('sm:w-1/2')).toBe(true);
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
	expect(result.classes.has('container')).toBe(true);
	expect(result.classes.has('header')).toBe(true);
	expect(result.classes.has('sticky')).toBe(true);
	expect(result.classes.has('main')).toBe(true);
	expect(result.classes.has('themed')).toBe(true);
	expect(result.classes.has('active')).toBe(true);
});

// Test spaces in multi-value CSS-literal

test('extracts CSS-literal with tilde space encoding', () => {
	const source = `<div class="margin:0~auto padding:var(--space_sm)~var(--space_lg)"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('margin:0~auto')).toBe(true);
	expect(result.classes.has('padding:var(--space_sm)~var(--space_lg)')).toBe(true);
});

// Test complex modifiers

test('extracts classes with complex modifier combinations', () => {
	const source = `<div class="md:dark:hover:before:opacity:80%"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('md:dark:hover:before:opacity:80%')).toBe(true);
});

test('extracts nth-child modifier classes', () => {
	const source = `<div class="nth-child(2n+1):background:var(--bg_2)"></div>`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('nth-child(2n+1):background:var(--bg_2)')).toBe(true);
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
	expect(result.classes.has('outline_width_focus')).toBe(true);
	expect(result.classes.has('outline_width_active')).toBe(true);
});

test('extracts classes from multi-line @fuz-classes comment', () => {
	const source = `
<script>
	/* @fuz-classes dynamic_class_1 dynamic_class_2 */
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('dynamic_class_1')).toBe(true);
	expect(result.classes.has('dynamic_class_2')).toBe(true);
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
	expect(result.classes.has('class_a')).toBe(true);
	expect(result.classes.has('class_b')).toBe(true);
	expect(result.classes.has('class_c')).toBe(true);
	expect(result.classes.has('class_d')).toBe(true);
});

test('extracts @fuz-classes from TypeScript files', () => {
	const source = `
// @fuz-classes ts_class_1 ts_class_2
const foo = 'bar';
`;
	const result = extract_from_ts(source, 'test.ts');
	expect(result.classes.has('ts_class_1')).toBe(true);
	expect(result.classes.has('ts_class_2')).toBe(true);
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
	expect(result.classes.has('dynamic_class')).toBe(true);
	expect(result.classes.has('static_class')).toBe(true);
	expect(result.classes.has('attribute_class')).toBe(true);
});

// Test other class utility functions

test('extracts classes from cx() call', () => {
	const source = `<div class={cx('foo', 'bar')}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['foo', 'bar']));
});

test('extracts classes from classNames() call', () => {
	const source = `<div class={classNames('base', { active: isActive })}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['base', 'active']));
});

test('extracts classes from classnames() call (lowercase)', () => {
	const source = `<div class={classnames('one', 'two')}></div>`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['one', 'two']));
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
	// Parse fails, but @fuz-classes is no longer extracted via regex before parsing
	// So the result is empty now
	expect(result.classes.size).toBe(0);
});

test('extracts from multiple @fuz-classes comments', () => {
	const source = `
<script>
	// @fuz-classes class_a class_b
	// @fuz-classes class_c
</script>
`;
	const result = extract_from_svelte(source);
	expect(class_names(result)).toEqual(new Set(['class_a', 'class_b', 'class_c']));
});

// Test @fuz-classes: colon variant warning

test('extracts @fuz-classes with colon variant and emits warning', () => {
	const source = `
<script>
	// @fuz-classes: colon_class_1 colon_class_2
</script>
<div></div>
`;
	const result = extract_from_svelte(source);
	expect(result.classes.has('colon_class_1')).toBe(true);
	expect(result.classes.has('colon_class_2')).toBe(true);
	expect(result.diagnostics.length).toBe(1);
	expect(result.diagnostics[0]!.level).toBe('warning');
	expect(result.diagnostics[0]!.message).toContain('deprecated');
});

// Test source location tracking

test('tracks source locations for classes', () => {
	const source = `<div class="foo bar"></div>`;
	const result = extract_from_svelte(source, 'test.svelte');
	expect(result.classes.get('foo')).toBeDefined();
	expect(result.classes.get('foo')![0]!.file).toBe('test.svelte');
	expect(result.classes.get('foo')![0]!.line).toBe(1);
});
