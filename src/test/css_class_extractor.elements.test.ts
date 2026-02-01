import {test, expect, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {assert_elements} from './css_class_extractor_test_helpers.js';

const element_cases = [
	{
		name: 'detects common HTML elements',
		source: `
<div class="container">
	<button>Click</button>
	<input type="text" />
	<a href="#">Link</a>
</div>
`,
		present: ['div', 'button', 'input', 'a'],
		absent: [],
	},
	{
		name: 'svelte:element dynamic tag is not added to elements',
		source: `
<script>
	let tag = 'button';
</script>
<svelte:element this={tag} class="dynamic">Content</svelte:element>
<div class="static">Static content</div>
`,
		present: ['div'],
		absent: ['svelte:element', 'button'],
	},
	{
		name: 'svelte:body and svelte:window are not added to elements',
		source: `
<svelte:body on:click={handleClick} />
<svelte:window on:resize={handleResize} />
<main>Content</main>
`,
		present: ['main'],
		absent: ['svelte:body', 'svelte:window'],
	},
	{
		name: 'svelte:head is not added but child elements are',
		source: `
<svelte:head>
	<title>Page Title</title>
	<meta name="description" content="..." />
	<link rel="stylesheet" href="style.css" />
</svelte:head>
<main>Content</main>
`,
		present: ['main', 'title', 'meta', 'link'],
		absent: ['svelte:head'],
	},
	{
		name: 'slot element and fallback content elements are detected',
		source: `
<slot name="header">
	<header class="default-header">
		<h1>Default Title</h1>
	</header>
</slot>
<slot>
	<p>Default paragraph</p>
</slot>
`,
		present: ['slot', 'header', 'h1', 'p'],
		absent: [],
	},
	{
		name: 'detects SVG elements',
		source: `
<svg viewBox="0 0 100 100" class="icon">
	<circle cx="50" cy="50" r="40" class="circle" />
	<path d="M10 10" class="path" />
	<g class="group">
		<rect x="0" y="0" width="10" height="10" />
	</g>
</svg>
`,
		present: ['svg', 'circle', 'path', 'g', 'rect'],
		absent: [],
	},
	{
		name: 'detects MathML elements',
		source: `
<math class="equation">
	<mrow class="row">
		<mi>x</mi>
		<mo>=</mo>
		<mfrac>
			<mrow><mo>-</mo><mi>b</mi></mrow>
			<mrow><mn>2</mn><mi>a</mi></mrow>
		</mfrac>
	</mrow>
</math>
`,
		present: ['math', 'mrow', 'mi', 'mo', 'mfrac', 'mn'],
		absent: [],
	},
	{
		name: 'detects custom elements with dashes',
		source: `
<my-button class="btn">Click</my-button>
<custom-card class="card">
	<card-header>Title</card-header>
	<card-body>Content</card-body>
</custom-card>
`,
		present: ['my-button', 'custom-card', 'card-header', 'card-body'],
		absent: [],
	},
	{
		name: 'does not detect Svelte components as elements',
		source: `
<script>
	import Button from './Button.svelte';
	import Card from './Card.svelte';
</script>
<Button class="btn">Click</Button>
<Card>Content</Card>
<div>Regular element</div>
`,
		present: ['div'],
		absent: ['Button', 'Card'],
	},
	{
		name: 'detects elements in nested control flow',
		source: `
{#if condition}
	<article class="post">
		{#each items as item}
			<section class="item">
				<header>Title</header>
			</section>
		{/each}
	</article>
{/if}
`,
		present: ['article', 'section', 'header'],
		absent: [],
	},
];

describe('element detection', () => {
	test.each(element_cases)('$name', ({source, present, absent}) => {
		const result = extract_from_svelte(source);
		assert_elements(result, present, absent);
	});

	test('returns null elements for file with no elements', () => {
		const source = `
<script>
	const x = 1;
</script>
`;
		const result = extract_from_svelte(source);
		expect(result.elements).toBeNull();
	});

	test('classes from svelte:element are still extracted', () => {
		const source = `
<script>
	let tag = 'button';
</script>
<svelte:element this={tag} class="dynamic">Content</svelte:element>
`;
		const result = extract_from_svelte(source);
		expect(result.classes?.has('dynamic')).toBe(true);
	});

	test('classes from slot fallback content are extracted', () => {
		const source = `
<slot name="header">
	<header class="default-header">
		<h1>Default Title</h1>
	</header>
</slot>
`;
		const result = extract_from_svelte(source);
		expect(result.classes?.has('default-header')).toBe(true);
	});
});
