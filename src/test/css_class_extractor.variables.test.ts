import {test, expect, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {
	class_names_equal,
	svelte_script,
	assert_no_classes,
} from './css_class_extractor_test_helpers.js';

describe('variable tracking', () => {
	describe('naming convention extraction', () => {
		const naming_convention_cases = [
			{
				suffix: 'Classes',
				script: "const buttonClasses = 'btn primary';",
				expected: ['btn', 'primary'],
			},
			{
				suffix: 'ClassNames (with extra)',
				script: "const buttonClassName = 'btn-camel';\nconst cardClassNames = 'card-x card-y';",
				expected: ['btn-camel', 'card-x', 'card-y'],
			},
			{
				suffix: 'class_name/class_names',
				script: "const button_class_name = 'btn-snake';\nconst card_class_names = 'card-a card-b';",
				expected: ['btn-snake', 'card-a', 'card-b'],
			},
			{
				suffix: 'classList/class_list',
				script:
					"const buttonClassList = 'btn-list';\nconst card_class_list = 'card-list-a card-list-b';",
				expected: ['btn-list', 'card-list-a', 'card-list-b'],
			},
			{
				suffix: 'classLists/class_lists',
				script:
					"const buttonClassLists = ['btn-lists-a', 'btn-lists-b'];\nconst card_class_lists = 'card-lists';",
				expected: ['btn-lists-a', 'btn-lists-b', 'card-lists'],
			},
		];

		test.each(naming_convention_cases)(
			'extracts from variable ending in $suffix',
			({script, expected}) => {
				const result = extract_from_svelte(svelte_script(script));
				class_names_equal(result, expected);
			},
		);

		test('extracts CSS-literal classes from Classes variable', () => {
			const source = svelte_script("const cardClasses = 'display:flex gap:var(--space_md)';");
			const result = extract_from_svelte(source);
			class_names_equal(result, ['display:flex', 'gap:var(--space_md)']);
		});
	});

	describe('Svelte runes', () => {
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
	});

	describe('class context tracking', () => {
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
	});

	describe('non-extraction cases', () => {
		test('does not extract from variable not used in class context', () => {
			const source = `
<script>
	const notUsed = 'should-not-extract';
	const alsoNotUsed = 'also-ignored';
</script>
<div data-value={notUsed}></div>
`;
			const result = extract_from_svelte(source);
			assert_no_classes(result);
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
			assert_no_classes(result);
			expect(result.tracked_vars?.has('alias')).toBe(true);
		});
	});
});
