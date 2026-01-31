import {test, describe} from 'vitest';

import {extract_from_svelte} from '$lib/css_class_extractor.js';

import {
	class_names_equal,
	svelte_script,
	assert_no_classes,
	assert_tracked_var,
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
			const result = extract_from_svelte(
				svelte_script("const cardClasses = 'display:flex gap:var(--space_md)';"),
			);
			class_names_equal(result, ['display:flex', 'gap:var(--space_md)']);
		});
	});

	describe('Svelte runes', () => {
		const rune_cases = [
			{
				name: 'extracts classes from $derived rune',
				source: svelte_script(
					"let active = $state(false);\nconst buttonClasses = $derived(active ? 'btn-active' : 'btn-inactive');",
					'<div class={buttonClasses}></div>',
				),
				expected: ['btn-active', 'btn-inactive'],
			},
			{
				name: 'extracts classes from $derived.by rune with block body',
				source: svelte_script(
					"const itemClasses = $derived.by(() => {\n\treturn selected ? 'item-selected' : 'item-normal';\n});",
				),
				expected: ['item-selected', 'item-normal'],
			},
			{
				name: 'extracts classes from $derived.by rune with expression body',
				source: svelte_script("const toggleClasses = $derived.by(() => active ? 'on' : 'off');"),
				expected: ['on', 'off'],
			},
		];

		test.each(rune_cases)('$name', ({source, expected}) => {
			const result = extract_from_svelte(source);
			class_names_equal(result, expected);
		});
	});

	describe('class context tracking', () => {
		const context_tracking_cases = [
			{
				name: 'extracts from arbitrarily-named variable used in class context',
				source: svelte_script(
					"const styles = 'tracked-class another';",
					'<div class={styles}></div>',
				),
				expected: ['tracked-class', 'another'],
			},
			{
				name: 'extracts from variable with non-class name used in class array',
				source: svelte_script(
					"const base = 'base-style';\nconst extra = 'extra-style';",
					"<div class={[base, extra, 'literal']}></div>",
				),
				expected: ['literal', 'base-style', 'extra-style'],
			},
			{
				name: 'extracts from variable used in clsx call within class attribute',
				source: svelte_script(
					"const variant = 'primary';",
					"<div class={clsx('btn', variant)}></div>",
				),
				expected: ['btn', 'primary'],
			},
			{
				name: 'extracts from variable used in ternary class expression',
				source: svelte_script(
					"const onStyle = 'state-on';\nconst offStyle = 'state-off';",
					'<div class={active ? onStyle : offStyle}></div>',
				),
				expected: ['state-on', 'state-off'],
			},
			{
				name: 'extracts from variable used in logical AND class expression',
				source: svelte_script(
					"const conditional = 'shown-when-true';",
					'<div class={isVisible && conditional}></div>',
				),
				expected: ['shown-when-true'],
			},
			{
				name: 'extracts from variable with array value used in class context',
				source: svelte_script("const items = ['item-a', 'item-b'];", '<div class={items}></div>'),
				expected: ['item-a', 'item-b'],
			},
			{
				name: 'extracts from variable with ternary value used in class context',
				source: svelte_script(
					"const dynamic = condition ? 'when-true' : 'when-false';",
					'<div class={dynamic}></div>',
				),
				expected: ['when-true', 'when-false'],
			},
			{
				name: 'extracts from variable passed to component class prop',
				source: svelte_script(
					"const componentStyle = 'component-class';",
					'<Button class={componentStyle}></Button>',
				),
				expected: ['component-class'],
			},
			{
				name: 'extracts from variable in nested clsx array within class attribute',
				source: svelte_script(
					"const nested = 'deep-class';",
					"<div class={clsx(['outer', nested])}></div>",
				),
				expected: ['outer', 'deep-class'],
			},
		];

		test.each(context_tracking_cases)('$name', ({source, expected}) => {
			const result = extract_from_svelte(source);
			class_names_equal(result, expected);
		});

		test('extracts from variable used multiple times in different class contexts', () => {
			const source = svelte_script(
				"const shared = 'shared-style';",
				`<div class={shared}></div>
<span class={[shared, 'other']}></span>
<p class={clsx(shared, 'more')}></p>`,
			);
			const result = extract_from_svelte(source);
			// shared-style appears once (deduped), plus the literals
			class_names_equal(result, ['other', 'more', 'shared-style']);
		});
	});

	describe('non-extraction cases', () => {
		test('does not extract from variable not used in class context', () => {
			const source = svelte_script(
				"const notUsed = 'should-not-extract';\nconst alsoNotUsed = 'also-ignored';",
				'<div data-value={notUsed}></div>',
			);
			const result = extract_from_svelte(source);
			assert_no_classes(result);
		});

		test('extracts only from variables actually used in class contexts', () => {
			const source = svelte_script(
				"const styles = 'extracted';\nconst other = 'not-extracted';",
				'<div class={styles} data-other={other}></div>',
			);
			const result = extract_from_svelte(source);
			class_names_equal(result, ['extracted']);
		});

		test('does not track variables in standalone clsx calls outside class attributes', () => {
			const source = svelte_script(
				"const variant = 'primary';\nconst result = clsx('btn', variant);",
			);
			const result = extract_from_svelte(source);
			// Only 'btn' is extracted (literal in clsx), not 'primary' (variant not tracked)
			class_names_equal(result, ['btn']);
		});

		test('does not support transitive variable tracking', () => {
			const source = svelte_script(
				"const original = 'original-class';\nconst alias = original;",
				'<div class={alias}></div>',
			);
			const result = extract_from_svelte(source);
			// 'alias' is tracked, but its value is another identifier, not a string literal
			// Transitive tracking is not supported, so no classes are extracted
			assert_no_classes(result);
			assert_tracked_var(result, 'alias');
		});
	});
});
