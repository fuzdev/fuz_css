/**
 * Tests for @fuz-elements and @fuz-variables comment extraction.
 *
 * Tests the extraction of explicit elements and variables from comments,
 * similar to how @fuz-classes works for dynamic class names.
 */

import {test, describe, beforeAll, expect} from 'vitest';

import {extract_from_svelte, extract_from_ts} from '$lib/css_class_extractor.js';
import {
	assert_elements,
	assert_explicit_elements,
	assert_no_explicit_elements,
	assert_css_variables,
	assert_explicit_variables,
	assert_no_explicit_variables,
	assert_diagnostic,
	assert_diagnostic_count,
	svelte_script,
	create_jsx_extractor,
} from './css_class_extractor_test_helpers.js';

//
// @fuz-elements extraction
//

describe('@fuz-elements comment extraction', () => {
	test('extracts elements from HTML comment', () => {
		const result = extract_from_svelte(`
<!-- @fuz-elements dialog details summary -->
<div>content</div>
`);
		assert_explicit_elements(result, ['dialog', 'details', 'summary']);
		// Elements should also be in the main elements set
		assert_elements(result, ['dialog', 'details', 'summary', 'div']);
	});

	test('extracts elements from script comment', () => {
		const result = extract_from_svelte(
			svelte_script(`
// @fuz-elements dialog article
const el = document.createElement('dialog');
`),
		);
		assert_explicit_elements(result, ['dialog', 'article']);
	});

	test('extracts elements from multi-line script comment', () => {
		const result = extract_from_svelte(
			svelte_script(`
/* @fuz-elements nav header footer */
const x = 1;
`),
		);
		assert_explicit_elements(result, ['nav', 'header', 'footer']);
	});

	test('combines @fuz-elements with regular element extraction', () => {
		const result = extract_from_svelte(`
<!-- @fuz-elements dialog -->
<button>Click</button>
<span>Text</span>
`);
		assert_explicit_elements(result, ['dialog']);
		assert_elements(result, ['dialog', 'button', 'span']);
	});

	test('handles multiple @fuz-elements comments', () => {
		const result = extract_from_svelte(`
<!-- @fuz-elements dialog -->
<!-- @fuz-elements details summary -->
<div></div>
`);
		assert_explicit_elements(result, ['dialog', 'details', 'summary']);
	});

	test('emits warning for colon variant', () => {
		const result = extract_from_svelte(`
<!-- @fuz-elements: dialog -->
<div></div>
`);
		assert_explicit_elements(result, ['dialog']);
		assert_diagnostic(result, 'warning', 'colon is unnecessary');
	});

	test('no explicit elements when none declared', () => {
		const result = extract_from_svelte(`<div></div>`);
		assert_no_explicit_elements(result);
	});
});

describe('@fuz-elements in TypeScript', () => {
	test('extracts elements from TS file', () => {
		const result = extract_from_ts(
			`
// @fuz-elements dialog details
const el = document.createElement('dialog');
`,
			'test.ts',
		);
		assert_explicit_elements(result, ['dialog', 'details']);
	});

	test('extracts elements from block comment', () => {
		const result = extract_from_ts(
			`
/* @fuz-elements nav footer */
export const x = 1;
`,
			'test.ts',
		);
		assert_explicit_elements(result, ['nav', 'footer']);
	});
});

describe('@fuz-elements in JSX', () => {
	let extract_jsx: Awaited<ReturnType<typeof create_jsx_extractor>>;

	beforeAll(async () => {
		extract_jsx = await create_jsx_extractor();
	});

	test('extracts elements from JSX file', () => {
		const result = extract_jsx(`
// @fuz-elements dialog details
const App = () => <div>Hello</div>;
`);
		assert_explicit_elements(result, ['dialog', 'details']);
		assert_elements(result, ['dialog', 'details', 'div']);
	});
});

//
// @fuz-variables extraction
//

describe('@fuz-variables comment extraction', () => {
	test('extracts variables from HTML comment', () => {
		const result = extract_from_svelte(`
<!-- @fuz-variables color_a_5 space_lg font_lg -->
<div>content</div>
`);
		assert_explicit_variables(result, ['color_a_5', 'space_lg', 'font_lg']);
		// Variables should also be in the main css_variables set
		assert_css_variables(result, ['color_a_5', 'space_lg', 'font_lg']);
	});

	test('extracts variables from script comment', () => {
		const result = extract_from_svelte(
			svelte_script(`
// @fuz-variables hue_a hue_b
const x = 1;
`),
		);
		assert_explicit_variables(result, ['hue_a', 'hue_b']);
	});

	test('extracts variables from multi-line script comment', () => {
		const result = extract_from_svelte(
			svelte_script(`
/* @fuz-variables radius_sm shadow_lg */
const x = 1;
`),
		);
		assert_explicit_variables(result, ['radius_sm', 'shadow_lg']);
	});

	test('strips -- prefix and warns', () => {
		const result = extract_from_svelte(`
<!-- @fuz-variables --color_a_5 --space_lg -->
<div></div>
`);
		assert_explicit_variables(result, ['color_a_5', 'space_lg']);
		assert_diagnostic(result, 'warning', 'without the -- prefix');
	});

	test('handles mixed prefixed and non-prefixed', () => {
		const result = extract_from_svelte(`
<!-- @fuz-variables color_a_5 --space_lg font_lg -->
<div></div>
`);
		assert_explicit_variables(result, ['color_a_5', 'space_lg', 'font_lg']);
		// Only one warning for --space_lg
		assert_diagnostic_count(result, 1);
	});

	test('combines @fuz-variables with style attribute extraction', () => {
		const result = extract_from_svelte(`
<!-- @fuz-variables custom_var -->
<div style="color: var(--text_color)"></div>
`);
		assert_explicit_variables(result, ['custom_var']);
		assert_css_variables(result, ['custom_var', 'text_color']);
	});

	test('handles multiple @fuz-variables comments', () => {
		const result = extract_from_svelte(`
<!-- @fuz-variables color_a_5 -->
<!-- @fuz-variables space_lg space_xl -->
<div></div>
`);
		assert_explicit_variables(result, ['color_a_5', 'space_lg', 'space_xl']);
	});

	test('emits warning for colon variant', () => {
		const result = extract_from_svelte(`
<!-- @fuz-variables: color_a_5 -->
<div></div>
`);
		assert_explicit_variables(result, ['color_a_5']);
		assert_diagnostic(result, 'warning', 'colon is unnecessary');
	});

	test('no explicit variables when none declared', () => {
		const result = extract_from_svelte(`<div></div>`);
		assert_no_explicit_variables(result);
	});
});

describe('@fuz-variables in TypeScript', () => {
	test('extracts variables from TS file', () => {
		const result = extract_from_ts(
			`
// @fuz-variables color_a_5 hue_b
const x = 1;
`,
			'test.ts',
		);
		assert_explicit_variables(result, ['color_a_5', 'hue_b']);
	});

	test('strips -- prefix and warns in TS', () => {
		const result = extract_from_ts(
			`
// @fuz-variables --custom_var color_a_5
const x = 1;
`,
			'test.ts',
		);
		assert_explicit_variables(result, ['custom_var', 'color_a_5']);
		assert_diagnostic(result, 'warning', 'without the -- prefix');
	});
});

describe('@fuz-variables in JSX', () => {
	let extract_jsx: Awaited<ReturnType<typeof create_jsx_extractor>>;

	beforeAll(async () => {
		extract_jsx = await create_jsx_extractor();
	});

	test('extracts variables from JSX file', () => {
		const result = extract_jsx(`
// @fuz-variables color_a_5 hue_b
const App = () => <div>Hello</div>;
`);
		assert_explicit_variables(result, ['color_a_5', 'hue_b']);
	});
});

//
// Combined @fuz-* comments
//

describe('combined @fuz-* comments', () => {
	test('extracts classes, elements, and variables from separate comments', () => {
		const result = extract_from_svelte(`
<!-- @fuz-classes box row -->
<!-- @fuz-elements dialog -->
<!-- @fuz-variables color_a_5 -->
<div class="foo"></div>
`);
		expect(result.explicit_classes).toEqual(new Set(['box', 'row']));
		assert_explicit_elements(result, ['dialog']);
		assert_explicit_variables(result, ['color_a_5']);
	});

	test('handles all three in script comments', () => {
		const result = extract_from_svelte(
			svelte_script(`
// @fuz-classes dynamic_class
// @fuz-elements dialog
// @fuz-variables custom_var
const x = 1;
`),
		);
		expect(result.explicit_classes).toEqual(new Set(['dynamic_class']));
		assert_explicit_elements(result, ['dialog']);
		assert_explicit_variables(result, ['custom_var']);
	});
});
