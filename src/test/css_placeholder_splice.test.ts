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
	parse_css_placeholder_hash,
	splice_css_at_placeholder,
	to_hashed_css_placeholder
} from '$lib/css_placeholder_splice.ts';

/** The marker rule the build-mode virtual module emits. */
const MARKER = ':root{--fuz-css-placeholder:1}';

/** Stands in for a hash of the generated CSS - digit-first after the prefix, the awkward case. */
const HASH = '9e5a0123456789ab';

/** The marker rule restated with the generated CSS's hash. */
const HASHED_MARKER = `:root{${FUZ_CSS_PLACEHOLDER}:h${HASH}}`;

/** Stands in for the generated theme + classes. */
const GENERATED = ':root{--font_family_serif: Georgia, serif}';

/** Stands in for an app stylesheet imported after `virtual:fuz.css`. */
const APP = ":root{--font_family_serif: 'DM Serif Display', Georgia, serif}";

/** Both placeholder forms, as the bare declaration and the rule it loads as. */
const PLACEHOLDER_FORMS = [
	{ form: 'unhashed', decl: `${FUZ_CSS_PLACEHOLDER}:1`, marker: MARKER },
	{ form: 'hashed', decl: `${FUZ_CSS_PLACEHOLDER}:h${HASH}`, marker: HASHED_MARKER }
];

describe.each(PLACEHOLDER_FORMS)('splice_css_at_placeholder, $form', ({ decl, marker }) => {
	/** Asserts nothing of the placeholder is left - property, hash, or empty rule. */
	const assert_no_marker = (spliced: string): void => {
		assert.notInclude(spliced, FUZ_CSS_PLACEHOLDER);
		assert.notInclude(spliced, HASH);
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

	test('repeated splicing strips every marker, whichever form each takes', () => {
		// the loop `generateBundle` runs: place the CSS at the first marker,
		// then strip the rest with empty CSS until none is left
		let spliced = splice_css_at_placeholder(
			HASHED_MARKER + APP + MARKER + HASHED_MARKER,
			GENERATED
		);
		assert.isNotNull(spliced);
		let stripped = splice_css_at_placeholder(spliced, '');
		while (stripped !== null) {
			spliced = stripped;
			stripped = splice_css_at_placeholder(spliced, '');
		}
		assert.notInclude(spliced, FUZ_CSS_PLACEHOLDER);
		assert.strictEqual(spliced.split(GENERATED).length - 1, 1, 'the generated CSS is placed once');
		assert.include(spliced, APP);
	});
});

describe('to_hashed_css_placeholder', () => {
	test('restates the placeholder rule as one declaration carrying the hash', () => {
		assert.strictEqual(to_hashed_css_placeholder(FUZ_CSS_PLACEHOLDER_RULE, HASH), HASHED_MARKER);
		assert.strictEqual(to_hashed_css_placeholder(MARKER, HASH), HASHED_MARKER);
	});

	test('differs by hash and from the unhashed rule', () => {
		assert.notStrictEqual(HASHED_MARKER, FUZ_CSS_PLACEHOLDER_RULE);
		assert.notStrictEqual(HASHED_MARKER, to_hashed_css_placeholder(MARKER, '0000000000000000'));
	});

	test('changes only the value, keeping what surrounds the placeholder', () => {
		// what a CSS pipeline can leave: a wrapper, its own formatting, neighbors
		const processed = `@layer app {\n  :root {\n    --a: 1;\n    ${FUZ_CSS_PLACEHOLDER}: 1;\n  }\n}\n`;
		const hashed = to_hashed_css_placeholder(processed, HASH);
		assert.isNotNull(hashed);
		assert.strictEqual(hashed, processed.replace(': 1;\n  }', `: h${HASH};\n  }`));
		assert.strictEqual(parse_css_placeholder_hash(hashed), HASH);
	});

	test('hashes every copy of the placeholder', () => {
		const hashed = to_hashed_css_placeholder(MARKER + APP + MARKER, HASH);
		assert.strictEqual(hashed, HASHED_MARKER + APP + HASHED_MARKER);
	});

	test('replaces a hash the placeholder already carries', () => {
		assert.strictEqual(
			to_hashed_css_placeholder(HASHED_MARKER, '0000000000000000'),
			`:root{${FUZ_CSS_PLACEHOLDER}:h0000000000000000}`
		);
	});

	test('returns null when there is no placeholder', () => {
		assert.isNull(to_hashed_css_placeholder(APP, HASH));
		assert.isNull(to_hashed_css_placeholder('', HASH));
	});

	test('splicing the hashed text gives the bytes splicing the unhashed text does', () => {
		const processed = `@layer app{${MARKER}${APP}}`;
		const hashed = to_hashed_css_placeholder(processed, HASH);
		assert.isNotNull(hashed);
		assert.strictEqual(
			splice_css_at_placeholder(hashed, GENERATED),
			splice_css_at_placeholder(processed, GENERATED)
		);
	});
});

describe('parse_css_placeholder_hash', () => {
	test('reads the hash back out of a bundled stylesheet', () => {
		assert.strictEqual(parse_css_placeholder_hash(APP + HASHED_MARKER + APP), HASH);
	});

	test('reads through unminified spacing', () => {
		const unminified = `:root {\n\t${FUZ_CSS_PLACEHOLDER}: h${HASH};\n}\n`;
		assert.strictEqual(parse_css_placeholder_hash(unminified), HASH);
	});

	test('reads a hash merged into a neighboring rule', () => {
		const merged = `:root{--a: 1;${FUZ_CSS_PLACEHOLDER}:h${HASH};--b: 2}`;
		assert.strictEqual(parse_css_placeholder_hash(merged), HASH);
	});

	test('returns null for the unhashed placeholder', () => {
		assert.isNull(parse_css_placeholder_hash(MARKER + APP));
	});

	test('returns null when there is no placeholder', () => {
		assert.isNull(parse_css_placeholder_hash(APP));
	});
});
