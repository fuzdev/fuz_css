/**
 * Keyword classes: a CSS value keyword as a bare class name, setting the one
 * property it belongs to (`.flex` is `display: flex`, `.sticky` is
 * `position: sticky`). The CSS spec is the namespace - a keyword earns a class
 * when no other mainstream property shares it, so it identifies its property
 * alone (`flex`, `sticky`, `uppercase`), while a shared keyword (`center`,
 * `nowrap`, `none`) stays a `property:value` literal. Hyphenated names are
 * the spec's own words (`inline-flex`, `line-through`), never concatenations.
 *
 * Each is a single-purpose declaration ordered by its property's rank like a
 * token class, so `md:flex` and `hover:underline` work as any class does.
 * `hidden` is the one name the spec doesn't supply: it mirrors the HTML
 * attribute (`display: none`) and orders late within its bucket, after the
 * literals it ties with.
 *
 * @module
 */

import type { CssClassDefinitionDeclaration } from './css_class_generation.ts';

// a keyword class setting `property` to the class's own name
const to_keyword_classes = (
	property: string,
	keywords: ReadonlyArray<string>
): Record<string, CssClassDefinitionDeclaration> => {
	const classes: Record<string, CssClassDefinitionDeclaration> = {};
	for (const keyword of keywords) classes[keyword] = { declaration: `${property}: ${keyword};` };
	return classes;
};

/**
 * The display keywords with a class: the inside formatting contexts and the
 * legacy inline forms, plus `block`.
 */
export const display_keywords = [
	'flex',
	'inline-flex',
	'grid',
	'inline-grid',
	'inline-block',
	'block',
	'flow-root'
] as const;

/** The position keywords with a class, all but the initial `static`. */
export const position_keywords = ['relative', 'absolute', 'fixed', 'sticky'] as const;

/** The text-transform keywords with a class. */
export const text_transform_keywords = ['uppercase', 'lowercase', 'capitalize'] as const;

/** The font-style keywords with a class. */
export const font_style_keywords = ['italic', 'oblique'] as const;

/** The font-weight keywords with a class. */
export const font_weight_keywords = ['bold', 'bolder', 'lighter'] as const;

/**
 * The text-decoration-line keywords with a class. They set the longhand, so
 * an element's decoration color, style, and thickness carry through.
 */
export const text_decoration_line_keywords = ['underline', 'overline', 'line-through'] as const;

/**
 * The keyword classes, plus `hidden`. Spread into `css_class_definitions`.
 */
export const css_class_keywords: Record<string, CssClassDefinitionDeclaration> = {
	...to_keyword_classes('display', display_keywords),
	...to_keyword_classes('position', position_keywords),
	...to_keyword_classes('text-transform', text_transform_keywords),
	...to_keyword_classes('font-style', font_style_keywords),
	...to_keyword_classes('font-weight', font_weight_keywords),
	...to_keyword_classes('text-decoration-line', text_decoration_line_keywords),
	// mirrors the HTML attribute, for the modifiers the attribute can't take
	// (`max-md:hidden`, `print:hidden`); late, so it beats a `display:*`
	// literal it ties with while a media query still outranks it
	hidden: { declaration: 'display: none;', late: true }
};
