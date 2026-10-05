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
 * @module
 */

// the end tag that closes a `<style>` element from inside its text content
const STYLE_CLOSER_MATCHER = /<\/style/iu;

// an escape (which takes the next character with it), or a whole string - a
// newline ends a string early, so one is only a string without them
const ESCAPE_OR_STRING_MATCHER = /\\[^]|"(?:[^"\\\n\r\f]|\\[^])*"|'(?:[^'\\\n\r\f]|\\[^])*'/gu;

// outside strings: a block, `!important`, a comment, a stray quote or escape
const ESCAPING_MATCHER = /[{}!"'\\]|\/\*/u;

const INNERMOST_BRACKETS_MATCHER = /\([^()[\]]*\)|\[[^()[\]]*\]/gu;

/**
 * Checks that a declaration value can't end its own declaration or rule:
 * quotes and brackets balance, and nothing outside a string closes the
 * declaration (a top-level `;`), opens or closes a block, sets `!important`,
 * or opens a comment. Stricter than the grammar where that keeps the rule
 * simple - braces and comments are rejected outright, so quote a URL that
 * needs them.
 *
 * @param value - the declaration value, e.g. a style variable's slot
 */
export const css_value_is_contained = (value: string): boolean => {
	if (STYLE_CLOSER_MATCHER.test(value)) return false;
	// escapes and strings are inert, so drop them before reading the structure;
	// what survives of either - a trailing escape, an unclosed quote - fails next
	let rest = value.replace(ESCAPE_OR_STRING_MATCHER, '');
	if (ESCAPING_MATCHER.test(rest)) return false;
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
export const css_comment_is_contained = (text: string): boolean =>
	!text.includes('*/') && !STYLE_CLOSER_MATCHER.test(text);

/**
 * Checks that a custom property name is a plain identifier, so it can't
 * smuggle a value or a second declaration in with it.
 *
 * @param name - the name without its `--` prefix
 */
export const css_custom_property_name_is_contained = (name: string): boolean =>
	/^[\w-]+$/u.test(name);
