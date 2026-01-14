/**
 * Example CSS class exports demonstrating node_modules extraction.
 *
 * This module exists to verify that the Vite plugin extracts classes from
 * dependencies in node_modules. Each export uses a unique class value
 * to verify extraction is working correctly.
 *
 * **Important:** Variable names must end with `class`, `classes`, or `className`
 * for the extractor to detect them (see `CLASS_NAME_PATTERN` in css_class_extractor.ts).
 *
 * **Class types demonstrated:**
 * - Token classes: Map to style variables (`p_lg`, `shadow_sm`)
 * - Composite classes: Multi-property shortcuts (`box`, `row`)
 * - Literal classes: CSS property:value syntax (`display:flex`)
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

/** Padding token - large spacing (snake_case) */
export const demo_padding_class = 'p_lg';

/** Shadow token - small elevation (camelCase) */
export const demoShadowClass = 'shadow_sm';

/** Color token - primary hue intensity 5 (snake_case) */
export const demo_color_class = 'color_a_5';

//
// Composite classes - multi-property shortcuts
//

/** Layout composite - centered flex container (camelCase) */
export const demoBoxClass = 'box';

/** Layout composite - horizontal flex row (snake_case) */
export const demo_row_class = 'row';

/** Text composite - truncate with ellipsis (camelCase) */
export const demoEllipsisClass = 'ellipsis';

//
// Literal classes - CSS property:value syntax
//

/** Display literal - flex layout (snake_case) */
export const demo_display_class = 'display:flex';

/** Alignment literal - center items (camelCase) */
export const demoAlignClass = 'align-items:center';

/** Spacing literal - gap between children (snake_case) */
export const demo_gap_class = 'gap:1rem';

//
// Variable patterns and naming conventions
//

/** camelCase naming - triggers naming-based extraction */
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
export const demoArrayClasses = ['m_xs', 'shadow_xs'];

//
// Comment hint examples - @fuz-classes directive
//

// @fuz-classes shadow_lg
/**
 * Comment hint - extracted via @fuz-classes, NOT via variable name pattern.
 * Variable name `from_comment` doesn't end in class/classes/className.
 */
export const from_comment = 'shadow_lg';

// @fuz-classes unknown_not_included
/**
 * Unknown class - extracted via @fuz-classes but has no CSS definition.
 * This class will be extracted but NOT included in output (no matching token/composite/literal).
 */
export const unknown_extracted = 'unknown_not_included';

// @fuz-classes not-real:extracted-but-excluded
/**
 * Invalid literal - extracted via @fuz-classes but excluded from CSS output.
 * Properties are validated against `@webref/css` data, so `not-real` fails validation.
 * This demonstrates that extraction and generation are separate steps.
 */
export const arbitrary_literal = 'not-real:extracted-but-excluded';
