/**
 * Tests for splicing the build-mode placeholder in `vite_plugin_fuz_css`.
 *
 * The generated CSS has to land at the marker's own position rather than at the
 * end of the asset, so that a stylesheet imported after `virtual:fuz.css` still
 * cascades over fuz_css's theme in the production bundle the way it does in dev.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import { splice_css_at_placeholder } from '$lib/vite_plugin_fuz_css.ts';

/** The marker rule the build-mode virtual module emits. */
const MARKER = ':root{--fuz-css-placeholder:1}';

/** Stands in for the generated theme + classes. */
const GENERATED = ':root{--font_family_serif: Georgia, serif}';

/** Stands in for an app stylesheet imported after `virtual:fuz.css`. */
const APP = ":root{--font_family_serif: 'DM Serif Display', Georgia, serif}";

describe('splice_css_at_placeholder', () => {
	test('writes the generated CSS at the marker, not at the end', () => {
		const spliced = splice_css_at_placeholder(MARKER + APP, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(
			spliced.indexOf(GENERATED) < spliced.indexOf(APP),
			'generated CSS must precede a stylesheet bundled after it'
		);
	});

	test('leaves no trace of the marker', () => {
		const spliced = splice_css_at_placeholder(MARKER + APP, GENERATED);
		assert.isNotNull(spliced);
		assert.notInclude(spliced, '--fuz-css-placeholder');
		assert.notInclude(spliced, ':root{}');
	});

	test('preserves CSS bundled before the marker', () => {
		const before = ':root{--a: 1}';
		const spliced = splice_css_at_placeholder(before + MARKER + APP, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(spliced.startsWith(before), 'CSS imported before fuz_css stays first');
		assert.ok(spliced.indexOf(before) < spliced.indexOf(GENERATED));
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf(APP));
	});

	test('honors a marker placed after the app CSS', () => {
		const spliced = splice_css_at_placeholder(APP + MARKER, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(
			spliced.indexOf(APP) < spliced.indexOf(GENERATED),
			'importing `virtual:fuz.css` last must put the generated CSS last'
		);
	});

	test('tolerates the unminified marker rule', () => {
		const spliced = splice_css_at_placeholder(
			':root {\n\t--fuz-css-placeholder: 1;\n}\n' + APP,
			GENERATED
		);
		assert.isNotNull(spliced);
		assert.notInclude(spliced, '--fuz-css-placeholder');
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf(APP));
	});

	test('splits a merged rule: decls after the marker stay after the generated CSS', () => {
		// A rule-merging minifier (e.g. lightningcss) folds the adjacent `:root`
		// rules into one, so there is no standalone marker rule left to swap out.
		const merged = ":root{--fuz-css-placeholder:1;--font_family_serif: 'DM Serif Display'}";
		const spliced = splice_css_at_placeholder(':root{--a: 1}' + merged, GENERATED);
		assert.isNotNull(spliced);
		assert.notInclude(spliced, '--fuz-css-placeholder');
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf("'DM Serif Display'"));
		assert.include(spliced, '--a: 1');
	});

	test('splits a merged rule: decls before the marker stay before the generated CSS', () => {
		// The app stylesheet was bundled before `virtual:fuz.css`, so the merge
		// put its decls before the marker - fuz_css must still cascade over them.
		const merged = ":root{--font_family_serif: 'DM Serif Display';--fuz-css-placeholder:1}";
		const spliced = splice_css_at_placeholder(merged, GENERATED);
		assert.isNotNull(spliced);
		assert.notInclude(spliced, '--fuz-css-placeholder');
		assert.ok(
			spliced.indexOf("'DM Serif Display'") < spliced.indexOf(GENERATED),
			'generated CSS must stay after a stylesheet bundled before it'
		);
	});

	test('splits a merged rule with decls on both sides of the marker', () => {
		const merged = ":root{--a: 1;--fuz-css-placeholder:1;--font_family_serif: 'DM Serif Display'}";
		const spliced = splice_css_at_placeholder(merged, GENERATED);
		assert.isNotNull(spliced);
		assert.notInclude(spliced, '--fuz-css-placeholder');
		assert.notInclude(spliced, ':root{}');
		assert.ok(spliced.indexOf('--a: 1') < spliced.indexOf(GENERATED));
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf("'DM Serif Display'"));
	});

	test('returns null when the marker is absent', () => {
		assert.isNull(splice_css_at_placeholder(APP, GENERATED));
	});
});
