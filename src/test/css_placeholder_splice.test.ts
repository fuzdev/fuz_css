/**
 * Tests for splicing the build-mode placeholder into a bundled stylesheet.
 *
 * The generated CSS has to land at the marker's own position rather than at the
 * end of the asset, so that a stylesheet imported after `virtual:fuz.css` still
 * cascades over fuz_css's theme in the production bundle the way it does in dev.
 *
 * @module
 */

import { test, assert, describe } from 'vitest';

import {
	FUZ_CSS_PLACEHOLDER,
	FUZ_CSS_PLACEHOLDER_RULE,
	splice_css_at_placeholder,
	splice_css_into_asset
} from '#lib/css_placeholder_splice.ts';

/** The marker rule the build-mode virtual module emits. */
const MARKER = ':root{--fuz-css-placeholder:1}';

/** Stands in for the generated theme + classes. */
const GENERATED = ':root{--font_family_serif: Georgia, serif}';

/** Stands in for an app stylesheet imported after `virtual:fuz.css`. */
const APP = ":root{--font_family_serif: 'DM Serif Display', Georgia, serif}";

/** The placeholder's bare declaration. */
const decl = `${FUZ_CSS_PLACEHOLDER}:1`;
const marker = MARKER;

test('the marker is the rule the virtual module loads as', () => {
	assert.strictEqual(MARKER, FUZ_CSS_PLACEHOLDER_RULE);
});

describe('splice_css_at_placeholder', () => {
	/** Asserts nothing of the placeholder is left - property or empty rule. */
	const assert_no_marker = (spliced: string): void => {
		assert.notInclude(spliced, FUZ_CSS_PLACEHOLDER);
		assert.notInclude(spliced, ':root{}');
	};

	test('writes the generated CSS at the marker, not at the end', () => {
		const spliced = splice_css_at_placeholder(marker + APP, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.strictEqual(spliced, GENERATED + '\n' + APP);
	});

	test('preserves CSS bundled before the marker', () => {
		const before = ':root{--a: 1}';
		const spliced = splice_css_at_placeholder(before + marker + APP, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(spliced.startsWith(before), 'CSS imported before fuz_css stays first');
		assert.ok(spliced.indexOf(before) < spliced.indexOf(GENERATED));
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf(APP));
	});

	test('honors a marker placed after the app CSS', () => {
		const spliced = splice_css_at_placeholder(APP + marker, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(
			spliced.indexOf(APP) < spliced.indexOf(GENERATED),
			'importing `virtual:fuz.css` last must put the generated CSS last'
		);
	});

	test('tolerates the unminified marker rule', () => {
		const spliced = splice_css_at_placeholder(`:root {\n\t${decl};\n}\n` + APP, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf(APP));
	});

	test('tolerates a minified marker with a trailing semicolon', () => {
		const spliced = splice_css_at_placeholder(`:root{${decl};}` + APP, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
	});

	test('reads past a comment holding structural characters before the marker', () => {
		// an unminified build keeps comments, and a `;`, `}`, or `{` in one must
		// not be taken for the end of the preceding construct
		const before = ':root{--a: 1}\n/* app styles; see {notes} */\n';
		const spliced = splice_css_at_placeholder(before + marker + '\n' + APP, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.strictEqual(spliced, before + GENERATED + '\n\n' + APP);
	});

	test('reads past a string or url holding a comment opener before the marker', () => {
		// a `/*` inside a string or an unquoted url opens no comment, so it must
		// not blank the marker that follows it
		for (const before of [
			'.code::before{content:"/*"}',
			".code::before{content:'}/*'}",
			'.a{background:url(/img/*.png)}'
		]) {
			const spliced = splice_css_at_placeholder(before + marker + APP + '/* note */', GENERATED);
			assert.isNotNull(spliced, before);
			assert.strictEqual(spliced, before + GENERATED + '\n' + APP + '/* note */');
		}
	});

	test('reads past an escaped quote, which opens no string', () => {
		// a minified escaped selector ahead of the marker, and a string after it
		// that a quote taken for an opener would pair with
		const before = '.content-\\[\\"hi\\"\\]::after{content:"hi"}';
		const after = '.x::after{content:"x"}';
		const spliced = splice_css_at_placeholder(before + marker + after, GENERATED);
		assert.strictEqual(spliced, before + GENERATED + '\n' + after);
	});

	test('splits a merged rule: decls after the marker stay after the generated CSS', () => {
		// A rule-merging minifier (e.g. lightningcss) folds the adjacent `:root`
		// rules into one, so there is no standalone marker rule left to swap out.
		const merged = `:root{${decl};--font_family_serif: 'DM Serif Display'}`;
		const spliced = splice_css_at_placeholder(':root{--a: 1}' + merged, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.ok(spliced.indexOf('--a: 1') < spliced.indexOf(GENERATED));
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf("'DM Serif Display'"));
	});

	test('splits a merged rule: decls before the marker stay before the generated CSS', () => {
		// The app stylesheet was bundled before `virtual:fuz.css`, so the merge
		// put its decls before the marker - fuz_css must still cascade over them.
		const merged = `:root{--font_family_serif: 'DM Serif Display';${decl}}`;
		const spliced = splice_css_at_placeholder(merged, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.ok(
			spliced.indexOf("'DM Serif Display'") < spliced.indexOf(GENERATED),
			'generated CSS must stay after a stylesheet bundled before it'
		);
	});

	test('splits a merged rule with decls on both sides of the marker', () => {
		const merged = `:root{--a: 1;${decl};--b: 2}`;
		const spliced = splice_css_at_placeholder(merged, GENERATED);
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.strictEqual(spliced, `:root{--a: 1;}${GENERATED}\n:root{--b: 2}`);
	});

	test('keeps a hoisted @charset ahead of a leading marker', () => {
		const charset = '@charset "UTF-8";';
		const spliced = splice_css_at_placeholder(charset + marker + APP, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(spliced.startsWith(charset), 'the statement at-rule must survive the splice');
		assert_no_marker(spliced);
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf(APP));
	});

	test('keeps a hoisted @import ahead of a leading marker', () => {
		const font_import = '@import url(https://fonts.example/css);';
		const spliced = splice_css_at_placeholder(font_import + marker + APP, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(spliced.startsWith(font_import));
		assert_no_marker(spliced);
	});

	test('splices inside an enclosing block without swallowing its prelude', () => {
		const spliced = splice_css_at_placeholder(`@layer app{${marker}${APP}}`, GENERATED);
		assert.isNotNull(spliced);
		assert.ok(spliced.startsWith('@layer app{'));
		assert_no_marker(spliced);
		assert.ok(spliced.indexOf(GENERATED) < spliced.indexOf(APP));
		assert.ok(spliced.endsWith('}'));
	});

	test('strips a marker when given empty CSS', () => {
		const spliced = splice_css_at_placeholder(marker + APP, '');
		assert.isNotNull(spliced);
		assert_no_marker(spliced);
		assert.include(spliced, APP);
	});

	test('returns null when the marker has no enclosing rule', () => {
		assert.isNull(splice_css_at_placeholder(decl, GENERATED));
	});
});

describe('splice_css_at_placeholder', () => {
	test('returns null when the marker is absent', () => {
		assert.isNull(splice_css_at_placeholder(APP, GENERATED));
	});
});

describe('splice_css_into_asset', () => {
	test('returns null when the marker is absent', () => {
		assert.isNull(splice_css_into_asset(APP, GENERATED));
	});

	test('places the CSS at the first marker and strips every other', () => {
		const spliced = splice_css_into_asset(MARKER + APP + MARKER + MARKER, GENERATED);
		assert.isNotNull(spliced);
		assert.notInclude(spliced, FUZ_CSS_PLACEHOLDER);
		assert.strictEqual(spliced.split(GENERATED).length - 1, 1, 'the generated CSS is placed once');
		assert.include(spliced, APP);
	});
});
