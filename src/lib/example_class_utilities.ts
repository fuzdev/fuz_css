/**
 * Example CSS class exports demonstrating node_modules extraction.
 *
 * This module exists to verify that the Vite plugin extracts classes from
 * dependencies in node_modules. Each export uses a unique class value
 * to verify extraction is working correctly.
 *
 * **Important:** Variable names must match `CLASS_NAME_PATTERN` in css_class_extractor.ts.
 * Supported suffixes: `class`, `classes`, `className`, `classNames`, `classList`, `classLists`
 * (also snake_case variants like `class_name`, `class_names`, `class_list`, `class_lists`).
 *
 * **Class types demonstrated:**
 * - Token classes: Map to style variables (`p_lg`, `shadow_sm`)
 * - Composite classes: Multi-property shortcuts (`box`, `row`)
 * - Literal classes: CSS property:value syntax (`justify-content:space-between`)
 *
 * **Variable patterns demonstrated:**
 * - Simple assignment, ternary expressions, logical AND, arrays
 * - Various naming conventions (camelCase, snake_case, SCREAMING_SNAKE)
 * - Comment hints via `@fuz-classes`
 *
 * @module
 */

/* eslint-disable no-constant-condition, @typescript-eslint/no-unnecessary-condition, no-constant-binary-expression */

//
// Token classes - map to style variables
//

/** Padding token - large spacing */
export const demoPaddingClass = 'p_lg';

/** Shadow token - small elevation */
export const demoShadowClass = 'shadow_sm';

/** Color token - primary hue intensity 5 */
export const demoColorClass = 'color_a_5';

//
// Composite classes - multi-property shortcuts
//

/** Layout composite - centered flex container */
export const demoBoxClass = 'box';

/** Layout composite - horizontal flex row */
export const demoRowClass = 'row';

/** Text composite - truncate with ellipsis */
export const demoEllipsisClass = 'ellipsis';

//
// Literal classes - CSS property:value syntax
//

/** Justify literal - space-between distribution */
export const demoJustifyClass = 'justify-content:space-between';

/** Text literal - uppercase transform */
export const demoTextTransformClass = 'text-transform:uppercase';

/** Spacing literal - gap between children */
export const demoGapClass = 'gap:1rem';

//
// Naming patterns - all CLASS_NAME_PATTERN suffix variants (mb_* incrementing)
//

/** `*Class` suffix (camelCase) */
export const demoClass = 'mb_xs5';

/** `*_class` suffix (snake_case) */
export const demo_class = 'mb_xs4';

/** `*Classes` suffix (camelCase) */
export const demoClasses = 'mb_xs3';

/** `*_classes` suffix (snake_case) */
export const demo_classes = 'mb_xs2';

/** `*ClassName` suffix (camelCase) */
export const demoClassName = 'mb_xs';

/** `*class_name` suffix (snake_case) */
export const demo_class_name = 'mb_sm';

/** `*ClassNames` suffix (camelCase) */
export const demoClassNames = 'mb_md';

/** `*class_names` suffix (snake_case) */
export const demo_class_names = 'mb_lg';

/** `*ClassList` suffix (camelCase) */
export const demoClassList = 'mb_xl';

/** `*class_list` suffix (snake_case) */
export const demo_class_list = 'mb_xl2';

/** `*ClassLists` suffix (camelCase) */
export const demoClassLists = 'mb_xl3';

/** `*class_lists` suffix (snake_case) */
export const demo_class_lists = 'mb_xl4';

/** `SCREAMING_SNAKE_CASE` naming */
export const DEMO_CLASS = 'mb_xl5';

//
// Expression patterns - ternary, logical AND, array (mt_* incrementing)
//

/** Ternary expression - both branches extracted */
export const ternaryClass = true ? 'mt_xs' : 'mt_sm';

/** Logical AND - truthy value extracted */
export const logicalClass = true && 'mt_md';

/** Array - all elements extracted */
export const arrayClasses = ['mt_lg', 'mt_xl'];

//
// Comment hint examples - @fuz-classes directive
//

// @fuz-classes shadow_lg
/**
 * Comment hint - extracted via @fuz-classes, NOT via variable name pattern.
 * Variable name `fromComment` doesn't end in class/classes/className.
 */
export const fromComment = 'shadow_lg';

// @fuz-classes unknown_not_included
/**
 * Unknown class - extracted via @fuz-classes but has no CSS definition.
 * This class will be extracted but NOT included in output (no matching token/composite/literal).
 */
export const unknownExtracted = 'unknown_not_included';

// @fuz-classes not-real:extracted-but-excluded
/**
 * Invalid literal - extracted via @fuz-classes but excluded from CSS output.
 * Properties are validated against `@webref/css` data, so `not-real` fails validation.
 * This demonstrates that extraction and generation are separate steps.
 */
export const arbitraryLiteral = 'not-real:extracted-but-excluded';
