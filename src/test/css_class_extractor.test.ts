import {test, expect, describe} from 'vitest';

import {
	extract_from_svelte,
	extract_from_ts,
	extract_css_classes,
} from '$lib/css_class_extractor.js';

import {
	class_names_equal,
	class_set_equal,
	assert_no_classes,
} from './css_class_extractor_test_helpers.js';

describe('basic string class attributes', () => {
	test('extracts classes from class="string" attribute', () => {
		const source = `<div class="foo bar baz"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar', 'baz']);
	});

	test('extracts CSS-literal classes from class attribute', () => {
		const source = `<div class="display:flex hover:opacity:80%"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['display:flex', 'hover:opacity:80%']);
	});

	test('extracts classes with responsive modifiers', () => {
		const source = `<div class="md:display:flex lg:flex-direction:row"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['md:display:flex', 'lg:flex-direction:row']);
	});
});

describe('array-style class attributes (Svelte 5.16+)', () => {
	test('extracts classes from class={[...]} array syntax', () => {
		const source = `<div class={['foo', 'bar']}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar']);
	});

	test('extracts classes from conditional array syntax', () => {
		const source = `<div class={[cond && 'active', 'base']}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['active', 'base']);
	});

	test('extracts classes from complex array with CSS-literal syntax', () => {
		const source = `<div class={[faded && 'saturate-0 opacity-50', large && 'scale-200']}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['saturate-0', 'opacity-50', 'scale-200']);
	});

	test('extracts CSS-literal classes from array syntax', () => {
		const source = `<div class={[cond && 'box', 'display:flex']}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['box', 'display:flex']);
	});
});

describe('object-style class attributes (Svelte 5.16+)', () => {
	test('extracts classes from class={{...}} object syntax', () => {
		const source = `<div class={{ cool, lame: !cool }}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['cool', 'lame']);
	});

	test('extracts CSS-literal classes from object keys', () => {
		const source = `<div class={{ 'display:flex': isActive, 'hover:opacity:80%': hasHover }}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['display:flex', 'hover:opacity:80%']);
	});

	test('extracts classes from mixed object with identifiers and strings', () => {
		const source = `<div class={{ active, 'hover:color:red': true }}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['active', 'hover:color:red']);
	});
});

describe('class: directive', () => {
	test('extracts class from class:name directive', () => {
		const source = `<div class:active={isActive}></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['active']);
	});

	test('extracts class from shorthand class:name directive', () => {
		const source = `<div class:cool></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['cool']);
	});

	test('extracts multiple class directives', () => {
		const source = `<div class:foo class:bar={cond} class:baz></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['foo', 'bar', 'baz']);
	});
});

describe('TypeScript extraction', () => {
	test('extracts classes from TypeScript file', () => {
		const source = `
const buttonClasses = 'btn primary hover:opacity:80%';
export const cardClass = 'card';
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['btn', 'primary', 'hover:opacity:80%', 'card']);
	});

	test('extracts classes from clsx in TypeScript', () => {
		const source = `
const classes = clsx('base', active && 'active', { 'display:flex': true });
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['base', 'active', 'display:flex']);
	});

	test('extracts classes from object with class property', () => {
		const source = `
const props = { class: 'foo bar' };
const config = { className: 'baz' };
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['foo', 'bar', 'baz']);
	});

	test('extracts classes from object with double-quoted string literal keys', () => {
		const source = `
const config = {
	"class": "dq-class",
	"className": "dq-classname",
	"buttonClasses": "dq-btn primary",
	"foo-classes": "dq-foo"
};
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['dq-class', 'dq-classname', 'dq-btn', 'primary', 'dq-foo']);
	});

	test('extracts classes from object with single-quoted string literal keys', () => {
		const source = `
const config = {
	'class': 'sq-class',
	'className': 'sq-classname',
	'buttonClasses': 'sq-btn secondary',
	'bar-classes': 'sq-bar'
};
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['sq-class', 'sq-classname', 'sq-btn', 'secondary', 'sq-bar']);
	});

	test('extracts classes from mixed identifier and string literal keys', () => {
		const source = `
const config = {
	class: "id-class",
	"className": "str-classname",
	containerClasses: "id-container",
	"wrapper-classes": "str-wrapper"
};
`;
		const result = extract_from_ts(source, 'test.ts');
		class_names_equal(result, ['id-class', 'str-classname', 'id-container', 'str-wrapper']);
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

describe('component attributes', () => {
	test('extracts classes from Component class prop', () => {
		const source = `<Button class="custom-button hover:scale:1.05"></Button>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['custom-button', 'hover:scale:1.05']);
	});

	test('extracts classes from Component with complex class prop', () => {
		const source = `<Card class={clsx('card', selected && 'border:2px~solid~blue')}></Card>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['card', 'border:2px~solid~blue']);
	});
});

describe('edge cases', () => {
	test('handles empty class attribute', () => {
		const source = `<div class=""></div>`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});

	test('handles class attribute with only whitespace', () => {
		const source = `<div class="   "></div>`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});

	test('handles empty class array', () => {
		const source = `<div class={[]}></div>`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
	});

	test('handles empty class object', () => {
		const source = `<div class={{}}></div>`;
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
		// Spread elements can't be statically analyzed, but static strings can
		class_names_equal(result, ['static-class']);
	});

	test('handles spread in objects (extracts static keys only)', () => {
		const source = `<div class={{...baseClasses, 'static-key': true}}></div>`;
		const result = extract_from_svelte(source);
		// Spread elements can't be statically analyzed, but static keys can
		class_names_equal(result, ['static-key']);
	});

	test('handles malformed Svelte gracefully with diagnostic', () => {
		const source = `<div class="foo" <broken>`;
		const result = extract_from_svelte(source, 'test.svelte');
		assert_no_classes(result);
		expect(result.diagnostics).not.toBeNull();
		expect(result.diagnostics!.length).toBeGreaterThan(0);
		expect(result.diagnostics![0]!.level).toBe('warning');
		expect(result.diagnostics![0]!.message).toContain('parse');
		expect(result.diagnostics![0]!.location.file).toBe('test.svelte');
	});

	test('handles malformed TypeScript gracefully with diagnostic', () => {
		const source = `const x = { broken`;
		const result = extract_from_ts(source, 'test.ts');
		expect(result.diagnostics).not.toBeNull();
		expect(result.diagnostics!.length).toBeGreaterThan(0);
		expect(result.diagnostics![0]!.level).toBe('warning');
		expect(result.diagnostics![0]!.message).toContain('parse');
		expect(result.diagnostics![0]!.location.file).toBe('test.ts');
	});
});

describe('no false positives', () => {
	test('does not extract from non-class attributes', () => {
		const source = `
<a href="mailto:someone@fuz.dev">Email</a>
<div data-value="foo:bar"></div>
<img src="http://fuz.dev/image.png" alt="test">
`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
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

	test('does not extract from script string literals without class context', () => {
		const source = `
<script>
	const message = 'hello world';
	const config = { type: 'primary', size: 'large' };
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		assert_no_classes(result);
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
	test('extracts classes inside {#each} blocks', () => {
		const source = `
{#each items as item}
	<div class="list-item">{item.name}</div>
{/each}
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['list-item']);
	});

	test('extracts classes inside {#if} blocks', () => {
		const source = `
{#if condition}
	<div class="shown"></div>
{:else}
	<div class="hidden"></div>
{/if}
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['shown', 'hidden']);
	});

	test('extracts classes inside {#snippet} blocks', () => {
		const source = `
{#snippet row(item)}
	<tr class="table-row">
		<td class="table-cell">{item.name}</td>
	</tr>
{/snippet}
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['table-row', 'table-cell']);
	});

	test('extracts classes from {#await} blocks', () => {
		const source = `
{#await promise}
	<div class="loading"></div>
{:then value}
	<div class="success"></div>
{:catch error}
	<div class="error"></div>
{/await}
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['loading', 'success', 'error']);
	});

	test('extracts classes from nested control flow', () => {
		const source = `
{#each items as item}
	{#if item.visible}
		<div class="nested-visible"></div>
	{/if}
{/each}
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['nested-visible']);
	});
});

describe('module scripts', () => {
	test('extracts classes from script context="module" (Svelte 4 syntax)', () => {
		const source = `
<script context="module">
	export const sharedClasses = 'module-class shared';
</script>
<script>
	const localClasses = 'local-class';
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['local-class', 'module-class', 'shared']);
	});

	test('extracts classes from script module (Svelte 5 syntax)', () => {
		const source = `
<script module>
	export const exportedClasses = 'exported-one exported-two';
</script>
<script>
	const instanceClasses = 'instance-class';
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['instance-class', 'exported-one', 'exported-two']);
	});
});

describe('@fuz-classes comment extraction', () => {
	test('extracts classes from single-line @fuz-classes comment', () => {
		const source = `
<script>
	// @fuz-classes outline_width_focus outline_width_active
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['outline_width_focus', 'outline_width_active']);
	});

	test('extracts classes from multi-line @fuz-classes comment', () => {
		const source = `
<script>
	/* @fuz-classes dynamic_class_1 dynamic_class_2 */
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['dynamic_class_1', 'dynamic_class_2']);
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
		class_names_equal(result, ['class_a', 'class_b', 'class_c', 'class_d']);
	});

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

	test('combines @fuz-classes with regular class extraction', () => {
		const source = `
<script>
	// @fuz-classes dynamic_class
	const buttonClasses = 'static_class';
</script>
<div class="attribute_class"></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['attribute_class', 'dynamic_class', 'static_class']);
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
		expect(result.diagnostics?.length).toBe(1);
		expect(result.diagnostics?.[0]!.level).toBe('warning');
		expect(result.diagnostics?.[0]!.message).toContain('unnecessary');
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

	test('extracts classes from HTML comment @fuz-classes', () => {
		const source = `
<!-- @fuz-classes html-comment-class another-class -->
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['html-comment-class', 'another-class']);
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
