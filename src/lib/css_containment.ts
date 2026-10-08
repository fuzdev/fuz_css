/**
 * Containment checks for text rendered verbatim into a stylesheet.
 *
 * A theme is plain data, and a theme restored from storage or handed across
 * a boundary is untrusted data. Its values land in CSS as written, so each
 * one has to stay inside the declaration it was rendered into - and inside
 * the `<style>` element when the CSS is injected as HTML. The `Theme` schema
 * reports a failing value as an error, and `render_theme_style` drops it.
 *
 * These are not CSS validators: a contained value can still be meaningless
 * CSS, which the browser discards on its own.
 *
 * Each check takes `unknown` and fails anything that isn't a string, so
 * unvalidated data can be handed over as it is: a non-string would otherwise
 * be coerced on its way into the stylesheet, past the check that read it.
 *
 * @module
 */

// the end tag that closes a `<style>` element from inside its text content
const STYLE_CLOSER_MATCHER = /<\/style/iu;

// a whole string - a newline ends a string early, so one is only a string
// without them - or an unquoted `url(` token, whose contents CSS reads raw: a
// quote there is no string, and a malformed one swallows up to the first `)`.
// A `url(` after a name character, `#`, or `@` ends a longer name (`#url`,
// `@url`) and opens a plain bracket, which the bracket balance reads. Matched
// in one pass so the scan reads left to right like the tokenizer
const INERT_MATCHER =
	/"(?:[^"\\\n\r\f]|\\[^])*"|'(?:[^'\\\n\r\f]|\\[^])*'|(?<![-\w#@\u{80}-\u{10FFFF}])url\((?![ \t\n\r\f]*["'])[ \t\n\r\f]*([^)]*)(\)?)/giu;

// what a well-formed unquoted url holds past its leading whitespace: printable
// characters other than a quote, bracket, or escape - so no inner whitespace
// or control character - with only trailing whitespace before the `)`
const URL_CONTENTS_MATCHER = /^[!#-&*-[\]-~\u{80}-\u{10FFFF}]*[ \t\n\r\f]*$/u;

// outside strings: a block, `!important`, a comment, a stray quote or escape
const ESCAPING_MATCHER = /[{}!"'\\]|\/\*/u;

const INNERMOST_BRACKETS_MATCHER = /\([^()[\]]*\)|\[[^()[\]]*\]/gu;

/**
 * Checks that a declaration value can't end its own declaration or rule:
 * quotes and brackets balance, and nothing outside a string closes the
 * declaration (a top-level `;`), opens or closes a block, sets `!important`,
 * opens a comment, or escapes a character. Stricter than the grammar where
 * that keeps the rule simple - braces, comments, and escapes outside strings
 * are rejected outright, as is an unquoted `url(` whose contents a quoted one
 * would hold, so quote a URL that needs them.
 *
 * @param value - the declaration value, e.g. a style variable's slot
 */
export const css_value_is_contained = (value: unknown): boolean => {
	if (typeof value !== 'string' || STYLE_CLOSER_MATCHER.test(value)) return false;
	// strings and well-formed url tokens are inert, so drop them before reading
	// the structure; what survives of either - an unclosed quote - fails next
	let malformed_url = false;
	let rest = value.replace(INERT_MATCHER, (_match, url_contents?: string, url_close?: string) => {
		if (url_contents !== undefined && (!url_close || !URL_CONTENTS_MATCHER.test(url_contents))) {
			malformed_url = true;
		}
		return '';
	});
	if (malformed_url || ESCAPING_MATCHER.test(rest)) return false;
	// collapse balanced brackets from the innermost out, their semicolons with
	// them - inside brackets a semicolon belongs to the block, e.g. a data URL
	let collapsed = rest;
	do {
		rest = collapsed;
		collapsed = rest.replace(INNERMOST_BRACKETS_MATCHER, '');
	} while (collapsed !== rest);
	// what's left is top-level: an unbalanced bracket or a semicolon escapes
	return !/[()[\];]/u.test(rest);
};

/**
 * Checks that text can sit inside a CSS comment without closing it.
 *
 * @param text - the comment body, e.g. a style variable's summary
 */
export const css_comment_is_contained = (text: unknown): boolean =>
	typeof text === 'string' && !text.includes('*/') && !STYLE_CLOSER_MATCHER.test(text);

/**
 * Checks that a custom property name is a plain identifier, so it can't
 * smuggle a value or a second declaration in with it.
 *
 * @param name - the name without its `--` prefix
 */
export const css_custom_property_name_is_contained = (name: unknown): boolean =>
	typeof name === 'string' && /^[\w-]+$/u.test(name);

/**
 * Serializes a string as a CSS identifier, so any string can name an element
 * id in a selector (`'#' + escape_css_identifier(id)` matches the element
 * whose `id` attribute is that string). Follows the CSSOM identifier
 * serialization, except that ASCII punctuation is escaped by code point
 * (`\3c `) rather than with a bare backslash, since `\</style` still closes a
 * `<style>` element - the output can't end its rule or its element.
 *
 * @param value - the raw identifier text
 * @returns the identifier, safe to follow `#` or `.` in a selector
 */
export const escape_css_identifier = (value: string): string => {
	let out = '';
	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i);
		const char = value[i]!;
		const leading_digit =
			code >= 0x30 && code <= 0x39 && (i === 0 || (i === 1 && value[0] === '-'));
		if (code === 0) {
			out += '\\fffd ';
		} else if (leading_digit) {
			out += `\\${code.toString(16)} `;
		} else if (i === 0 && char === '-' && value.length === 1) {
			out += '\\-';
		} else if (code >= 0x80 || /[\w-]/u.test(char)) {
			out += char;
		} else {
			out += `\\${code.toString(16)} `;
		}
	}
	return out;
};
