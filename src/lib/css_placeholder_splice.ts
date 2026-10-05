/**
 * The build-mode placeholder that `vite_plugin_fuz_css` emits for
 * `virtual:fuz.css`, and the splice that replaces it with the generated CSS
 * in `generateBundle`.
 *
 * The placeholder is one declaration whose value says what it stands in for:
 * `1` while the generated CSS isn't known yet (`FUZ_CSS_PLACEHOLDER_RULE`),
 * or a hash of the generated CSS once it is (`to_hashed_css_placeholder`).
 * The hashed form is what makes the bundler's content hash for the
 * stylesheet cover CSS that's only written into it afterwards. Both forms
 * are a single declaration, so the splice that strips one strips the other -
 * there is no second declaration a minifier could reorder, merge away from
 * the first, or leave behind.
 *
 * @module
 */

/**
 * Marker custom property emitted by the build-mode virtual module. Unlike a CSS
 * comment (stripped by minification) this survives into the output, so
 * `generateBundle` can locate both the asset where Vite placed the virtual
 * module's CSS - the importer's globally-loaded stylesheet, not an arbitrary
 * code-split chunk - and the offset within it that import order put it at.
 */
export const FUZ_CSS_PLACEHOLDER = '--fuz-css-placeholder';

/**
 * The rule the build-mode virtual module loads as, before the generated CSS
 * is known.
 */
export const FUZ_CSS_PLACEHOLDER_RULE = `:root{${FUZ_CSS_PLACEHOLDER}:1}`;

/**
 * Prefix of a hashed placeholder's value, making it an identifier whatever
 * the hash starts with - a bare hex run can lex as a number (`1e5`).
 */
const FUZ_CSS_PLACEHOLDER_HASH_PREFIX = 'h';

/**
 * Matches the placeholder declaration in either form - index and extent
 * locate the marker within its rule, and the capture is its value.
 */
const FUZ_CSS_PLACEHOLDER_DECL_RE = /--fuz-css-placeholder\s*:\s*([\w-]+)\s*;?/;

/** Matches anything that isn't ignorable filler between declarations. */
const NON_FILLER_RE = /[^\s;]/;

/** Matches every placeholder declaration, capturing what precedes its value. */
const FUZ_CSS_PLACEHOLDER_VALUE_RE = /(--fuz-css-placeholder\s*:\s*)[\w-]+/g;

/**
 * Restates every placeholder in a stylesheet with a hash of the generated
 * CSS as its value, leaving the rest of the text as it is.
 *
 * The bundler names a stylesheet from its content before the generated CSS is
 * spliced in. Carrying the hash in the placeholder makes that content - and so
 * the filename - change exactly when the generated CSS does.
 *
 * Only the value changes, so whatever a CSS pipeline did around the
 * placeholder stays: a wrapper it was moved into (`@layer`, `@media`), its
 * formatting, a copy of it. Each copy gets the same hash.
 *
 * @param source - CSS holding the placeholder, in either form
 * @param content_hash - hash of the generated CSS, as word characters (hex, base64url)
 * @returns `source` with each placeholder carrying `content_hash`, or `null`
 * when it holds no placeholder
 */
export const to_hashed_css_placeholder = (source: string, content_hash: string): string | null => {
	let found = false;
	const hashed = source.replace(FUZ_CSS_PLACEHOLDER_VALUE_RE, (_match, before: string) => {
		found = true;
		return before + FUZ_CSS_PLACEHOLDER_HASH_PREFIX + content_hash;
	});
	return found ? hashed : null;
};

/**
 * Parses the hash the first placeholder in a stylesheet carries.
 *
 * @param source - the stylesheet holding the marker
 * @returns the hash given to `to_hashed_css_placeholder`, or `null` when the
 * stylesheet has no placeholder or its placeholder is unhashed
 */
export const parse_css_placeholder_hash = (source: string): string | null => {
	const value = FUZ_CSS_PLACEHOLDER_DECL_RE.exec(source)?.[1];
	if (value === undefined || !value.startsWith(FUZ_CSS_PLACEHOLDER_HASH_PREFIX)) return null;
	return value.slice(FUZ_CSS_PLACEHOLDER_HASH_PREFIX.length);
};

/**
 * Replaces the first placeholder in a bundled stylesheet with the generated
 * CSS, at the offset the marker occupies. Either form of the placeholder -
 * unhashed or hashed - is located and stripped the same way.
 *
 * Position is the point: the marker sits where Vite placed `virtual:fuz.css`
 * in the importer's stylesheet, so writing the generated CSS there reproduces
 * the import order the source asked for. Appending to the end of the asset
 * instead would silently move fuz_css's `:root` after every stylesheet bundled
 * alongside it, so an app's own equal-specificity token override would win in
 * dev (where the virtual module is served in place) and lose in the production
 * bundle.
 *
 * Usually the marker is its own rule, but a minifier that merges adjacent
 * rules with identical selectors (lightningcss is one; esbuild, Vite's
 * default, isn't) folds neighboring `:root` declarations into the marker's
 * block - from either or both sides. Declaration order preserves the merged
 * rules' order, so splitting the block at the marker keeps the cascade exact:
 * declarations before it came from stylesheets bundled before
 * `virtual:fuz.css` and stay before the generated CSS, declarations after it
 * stay after. The solo-rule case is the same split with both sides empty.
 *
 * The marker's rule starts after whatever ends the preceding construct: a
 * rule's `}`, a statement at-rule's `;` (`@charset`, `@import`, which a
 * bundler hoists ahead of the first rule), or an enclosing block's `{`.
 *
 * @param source - the bundled stylesheet holding the marker
 * @param generated_css - the CSS to write at the marker's position
 * @returns `source` with the generated CSS spliced in and the marker stripped,
 * or `null` if no marker sits inside a well-formed rule
 */
export const splice_css_at_placeholder = (source: string, generated_css: string): string | null => {
	const decl = FUZ_CSS_PLACEHOLDER_DECL_RE.exec(source);
	if (!decl) return null;
	const decl_end = decl.index + decl[0].length;

	const open_brace = source.lastIndexOf('{', decl.index);
	const close_brace = source.indexOf('}', decl_end);
	if (open_brace === -1 || close_brace === -1) return null;
	const block_start =
		Math.max(
			source.lastIndexOf('}', open_brace),
			source.lastIndexOf(';', open_brace),
			open_brace > 0 ? source.lastIndexOf('{', open_brace - 1) : -1
		) + 1; // 0 when the marker's rule is first
	const selector = source.slice(block_start, open_brace);
	const decls_before = source.slice(open_brace + 1, decl.index);
	const decls_after = source.slice(decl_end, close_brace);

	let result = source.slice(0, block_start);
	if (NON_FILLER_RE.test(decls_before)) result += `${selector}{${decls_before}}`;
	result += generated_css + '\n';
	if (NON_FILLER_RE.test(decls_after)) result += `${selector}{${decls_after}}`;
	return result + source.slice(close_brace + 1);
};
