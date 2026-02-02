/**
 * Tests for @fuz-elements comment extraction.
 *
 * Tests the extraction of explicit elements from comments,
 * similar to how @fuz-classes works for dynamic class names.
 */

import {test, describe, beforeAll, expect} from 'vitest';

import {extract_from_svelte, extract_from_ts} from '$lib/css_class_extractor.js';
import {
	assert_elements,
	assert_explicit_elements,
	assert_no_explicit_elements,
	assert_diagnostic,
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
// Combined @fuz-* comments
//

describe('combined @fuz-* comments', () => {
	test('extracts classes and elements from separate comments', () => {
		const result = extract_from_svelte(`
<!-- @fuz-classes box row -->
<!-- @fuz-elements dialog -->
<div class="foo"></div>
`);
		expect(result.explicit_classes).toEqual(new Set(['box', 'row']));
		assert_explicit_elements(result, ['dialog']);
	});

	test('handles both in script comments', () => {
		const result = extract_from_svelte(
			svelte_script(`
// @fuz-classes dynamic_class
// @fuz-elements dialog
const x = 1;
`),
		);
		expect(result.explicit_classes).toEqual(new Set(['dynamic_class']));
		assert_explicit_elements(result, ['dialog']);
	});
});
