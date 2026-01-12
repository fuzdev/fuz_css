import {test, expect, describe} from 'vitest';

import {
	extract_from_svelte,
	extract_from_ts,
	extract_css_classes,
} from '$lib/css_class_extractor.js';

import {class_names_equal, class_set_equal} from './css_class_extractor_test_helpers.js';

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

describe('variable tracking', () => {
	test('extracts classes from variables with class-like names', () => {
		const source = `
<script>
	const buttonClasses = 'btn primary';
</script>
<div class={buttonClasses}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['btn', 'primary']);
	});

	test('extracts classes from variables ending in Classes', () => {
		const source = `
<script>
	const cardClasses = 'display:flex gap:var(--space_md)';
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['display:flex', 'gap:var(--space_md)']);
	});

	test('extracts classes from variables ending in className or classNames', () => {
		const source = `
<script>
	const buttonClassName = 'btn-camel';
	const cardClassNames = 'card-x card-y';
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['btn-camel', 'card-x', 'card-y']);
	});

	test('extracts classes from variables ending in class_name or class_names', () => {
		const source = `
<script>
	const button_class_name = 'btn-snake';
	const card_class_names = 'card-a card-b';
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['btn-snake', 'card-a', 'card-b']);
	});

	test('extracts classes from $derived rune', () => {
		const source = `
<script>
	let active = $state(false);
	const buttonClasses = $derived(active ? 'btn-active' : 'btn-inactive');
</script>
<div class={buttonClasses}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['btn-active', 'btn-inactive']);
	});

	test('extracts classes from $derived.by rune with block body', () => {
		const source = `
<script>
	const itemClasses = $derived.by(() => {
		return selected ? 'item-selected' : 'item-normal';
	});
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['item-selected', 'item-normal']);
	});

	test('extracts classes from $derived.by rune with expression body', () => {
		const source = `
<script>
	const toggleClasses = $derived.by(() => active ? 'on' : 'off');
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['on', 'off']);
	});

	test('extracts from arbitrarily-named variable used in class context', () => {
		const source = `
<script>
	const styles = 'tracked-class another';
</script>
<div class={styles}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['tracked-class', 'another']);
	});

	test('extracts from variable with non-class name used in class array', () => {
		const source = `
<script>
	const base = 'base-style';
	const extra = 'extra-style';
</script>
<div class={[base, extra, 'literal']}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['literal', 'base-style', 'extra-style']);
	});

	test('extracts from variable used in clsx call within class attribute', () => {
		const source = `
<script>
	const variant = 'primary';
</script>
<div class={clsx('btn', variant)}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['btn', 'primary']);
	});

	test('extracts from variable used in ternary class expression', () => {
		const source = `
<script>
	const onStyle = 'state-on';
	const offStyle = 'state-off';
</script>
<div class={active ? onStyle : offStyle}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['state-on', 'state-off']);
	});

	test('extracts from variable used in logical AND class expression', () => {
		const source = `
<script>
	const conditional = 'shown-when-true';
</script>
<div class={isVisible && conditional}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['shown-when-true']);
	});

	test('extracts from variable used multiple times in different class contexts', () => {
		const source = `
<script>
	const shared = 'shared-style';
</script>
<div class={shared}></div>
<span class={[shared, 'other']}></span>
<p class={clsx(shared, 'more')}></p>
`;
		const result = extract_from_svelte(source);
		// shared-style appears once (deduped), plus the literals
		class_names_equal(result, ['other', 'more', 'shared-style']);
	});

	test('extracts from variable with array value used in class context', () => {
		const source = `
<script>
	const items = ['item-a', 'item-b'];
</script>
<div class={items}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['item-a', 'item-b']);
	});

	test('extracts from variable with ternary value used in class context', () => {
		const source = `
<script>
	const dynamic = condition ? 'when-true' : 'when-false';
</script>
<div class={dynamic}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['when-true', 'when-false']);
	});

	test('does not extract from variable not used in class context', () => {
		const source = `
<script>
	const notUsed = 'should-not-extract';
	const alsoNotUsed = 'also-ignored';
</script>
<div data-value={notUsed}></div>
`;
		const result = extract_from_svelte(source);
		expect(result.classes).toBeNull();
	});

	test('extracts only from variables actually used in class contexts', () => {
		const source = `
<script>
	const styles = 'extracted';
	const other = 'not-extracted';
</script>
<div class={styles} data-other={other}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['extracted']);
	});

	test('extracts from variable passed to component class prop', () => {
		const source = `
<script>
	const componentStyle = 'component-class';
</script>
<Button class={componentStyle}></Button>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['component-class']);
	});

	test('extracts from variable in nested clsx array within class attribute', () => {
		const source = `
<script>
	const nested = 'deep-class';
</script>
<div class={clsx(['outer', nested])}></div>
`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['outer', 'deep-class']);
	});

	test('does not track variables in standalone clsx calls outside class attributes', () => {
		const source = `
<script>
	const variant = 'primary';
	const result = clsx('btn', variant);
</script>
<div></div>
`;
		const result = extract_from_svelte(source);
		// Only 'btn' is extracted (literal in clsx), not 'primary' (variant not tracked)
		class_names_equal(result, ['btn']);
	});

	test('does not support transitive variable tracking', () => {
		const source = `
<script>
	const original = 'original-class';
	const alias = original;
</script>
<div class={alias}></div>
`;
		const result = extract_from_svelte(source);
		// 'alias' is tracked, but its value is another identifier, not a string literal
		// Transitive tracking is not supported, so no classes are extracted
		expect(result.classes).toBeNull();
		expect(result.tracked_vars?.has('alias')).toBe(true);
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
		expect(result.classes).toBeNull();
	});

	test('handles class attribute with only whitespace', () => {
		const source = `<div class="   "></div>`;
		const result = extract_from_svelte(source);
		expect(result.classes).toBeNull();
	});

	test('handles empty class array', () => {
		const source = `<div class={[]}></div>`;
		const result = extract_from_svelte(source);
		expect(result.classes).toBeNull();
	});

	test('handles empty class object', () => {
		const source = `<div class={{}}></div>`;
		const result = extract_from_svelte(source);
		expect(result.classes).toBeNull();
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
		expect(result.classes).toBeNull();
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

describe('no false positives', () => {
	test('does not extract from non-class attributes', () => {
		const source = `
<a href="mailto:someone@fuz.dev">Email</a>
<div data-value="foo:bar"></div>
<img src="http://fuz.dev/image.png" alt="test">
`;
		const result = extract_from_svelte(source);
		expect(result.classes).toBeNull();
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
		expect(result.classes).toBeNull();
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
		expect(result.classes).toBeNull();
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
		const source = `<div class="nth-child(2n+1):background:var(--bg_2)"></div>`;
		const result = extract_from_svelte(source);
		class_names_equal(result, ['nth-child(2n+1):background:var(--bg_2)']);
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
		expect(result.diagnostics?.[0]!.message).toContain('deprecated');
	});

	test('handles @fuz-classes with only whitespace after it', () => {
		const source = `
<script>
	// @fuz-classes
	const foo = 'bar';
</script>
`;
		const result = extract_from_svelte(source);
		expect(result.classes).toBeNull();
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
		expect(result.classes).toBeNull();
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

describe('source location tracking', () => {
	test('tracks source locations for classes', () => {
		const source = `<div class="foo bar"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		expect(result.classes?.get('foo')).toBeDefined();
		expect(result.classes?.get('foo')![0]!.file).toBe('test.svelte');
		expect(result.classes?.get('foo')![0]!.line).toBe(1);
	});

	test('tracks source locations for multi-line class attributes', () => {
		const source = `<div>
	<span class="line2-class"></span>
	<p class="line3-class"></p>
</div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		expect(result.classes?.get('line2-class')![0]!.line).toBe(2);
		expect(result.classes?.get('line3-class')![0]!.line).toBe(3);
	});

	test('accumulates locations for duplicate class names', () => {
		const source = `
<div class="shared"></div>
<span class="shared"></span>
<p class="shared"></p>
`;
		const result = extract_from_svelte(source, 'test.svelte');
		const locations = result.classes?.get('shared');
		expect(locations).toBeDefined();
		expect(locations!.length).toBe(3);
		expect(locations![0]!.line).toBe(2);
		expect(locations![1]!.line).toBe(3);
		expect(locations![2]!.line).toBe(4);
	});

	test('tracks column positions', () => {
		const source = `<div class="col-test"></div>`;
		const result = extract_from_svelte(source, 'test.svelte');
		const location = result.classes?.get('col-test')?.[0];
		expect(location).toBeDefined();
		expect(location!.line).toBe(1);
		// Column should be somewhere after the opening tag
		expect(location!.column).toBeGreaterThan(0);
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


