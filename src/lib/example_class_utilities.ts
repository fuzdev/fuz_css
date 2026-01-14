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
// Variable patterns and naming conventions
//

/** className suffix pattern - triggers naming-based extraction */
export const demoClassName = 'column';

/** SCREAMING_SNAKE_CASE naming */
export const DEMO_CONSTANT_CLASS = 'p_md';

/** Suffix convention (_class) - triggers naming-based extraction */
export const card_class = 'pane';

/** Ternary expression - both branches should be extracted */
export const demo_ternary_class = true ? 'bg_d_3' : 'bg_3';

/** Logical AND - truthy value should be extracted */
export const demo_logical_class = true && 'opacity:60%';

/** Array - all elements should be extracted */
export const demoArrayClasses = ['m_xl5', 'shadow_xs'];

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
