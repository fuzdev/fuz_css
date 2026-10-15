/**
 * The build-mode placeholder that `vite_plugin_fuz_css` emits for
 * `virtual:fuz.css`, and the splice that replaces it with the generated CSS.
 *
 * Normally the placeholder never reaches the output: once every module is
 * transformed, the build restates the virtual module's text with the
 * generated CSS through Vite's CSS pipeline (`vite_plugin_fuz_css_build.ts`).
 * The splice is the fallback for when that restatement can't run, writing
 * the CSS into the bundled stylesheet at the placeholder's position.
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
 * Matches the placeholder declaration - index and extent locate the marker
 * within its rule.
 */
const FUZ_CSS_PLACEHOLDER_DECL_RE = /--fuz-css-placeholder\s*:\s*([\w-]+)\s*;?/;

/** Matches anything that isn't ignorable filler between declarations. */
const NON_FILLER_RE = /[^\s;]/;

/**
 * Matches what the structural search reads past: an escaped character (a
 * quote in an escaped selector like `.content-\[\"hi\"\]` opens no string), a
 * comment, a string, or an unquoted `url()`, any of which can hold a brace, a
 * semicolon, or a `/*`.
 */
const INERT_RE =
	/\\[^]|\/\*[^]*?(?:\*\/|$)|"(?:[^"\\\n]|\\[^])*"|'(?:[^'\\\n]|\\[^])*'|(?<![-\w#@\u{80}-\u{10FFFF}])url\([^)"']*\)/gu;

/**
 * Replaces the first placeholder in a bundled stylesheet with the generated
 * CSS, at the offset the marker occupies.
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
 * Comments, strings, and unquoted `url()`s are read past, since one can hold
 * any of those - an unminified build or a preserved `/*! *\/` comment leaves
 * them in, and a `content` string or a URL can hold a `/*` of its own.
 *
 * @param source - the bundled stylesheet holding the marker
 * @param generated_css - the CSS to write at the marker's position
 * @returns `source` with the generated CSS spliced in and the marker stripped,
 * or `null` if no marker sits inside a well-formed rule
 */
export const splice_css_at_placeholder = (source: string, generated_css: string): string | null => {
	// the structure is searched in a copy with comments, strings, and url
	// tokens blanked to spaces, so offsets match `source`, which the slices
	// below read from
	const scan = source.replace(INERT_RE, (inert) => ' '.repeat(inert.length));
	const decl = FUZ_CSS_PLACEHOLDER_DECL_RE.exec(scan);
	if (!decl) return null;
	const decl_end = decl.index + decl[0].length;

	const open_brace = scan.lastIndexOf('{', decl.index);
	const close_brace = scan.indexOf('}', decl_end);
	if (open_brace === -1 || close_brace === -1) return null;
	const preceding_end =
		Math.max(
			scan.lastIndexOf('}', open_brace),
			scan.lastIndexOf(';', open_brace),
			open_brace > 0 ? scan.lastIndexOf('{', open_brace - 1) : -1
		) + 1; // 0 when the marker's rule is first
	// whitespace and comments ahead of the selector stay where they are
	const block_start = preceding_end + /^\s*/.exec(scan.slice(preceding_end, open_brace))![0].length;
	const selector = source.slice(block_start, open_brace);
	const decls_before = source.slice(open_brace + 1, decl.index);
	const decls_after = source.slice(decl_end, close_brace);

	let result = source.slice(0, block_start);
	if (NON_FILLER_RE.test(decls_before)) result += `${selector}{${decls_before}}`;
	result += generated_css + '\n';
	if (NON_FILLER_RE.test(decls_after)) result += `${selector}{${decls_after}}`;
	return result + source.slice(close_brace + 1);
};

/**
 * Finishes one bundled stylesheet: writes the generated CSS at its first
 * placeholder and strips any others. Two entries' CSS merged into one asset,
 * or a pipeline that copied the placeholder rule, leave more than one; the
 * generated CSS belongs at the first.
 *
 * @param source - the bundled stylesheet
 * @param generated_css - the CSS to write at the first placeholder
 * @returns the finished stylesheet, or `null` when it holds no placeholder
 */
export const splice_css_into_asset = (source: string, generated_css: string): string | null => {
	let spliced = splice_css_at_placeholder(source, generated_css);
	if (spliced === null) return null;
	let stripped: string | null;
	while ((stripped = splice_css_at_placeholder(spliced, '')) !== null) spliced = stripped;
	return spliced;
};
