/**
 * Example CSS class exports demonstrating node_modules extraction.
 *
 * This module exists to verify that the Vite plugin extracts classes from
 * dependencies in node_modules. The exports test specific extraction patterns
 * that require being in a separate module.
 *
 * **Important:** Variable names must match `CLASS_NAME_PATTERN` in css_class_extractor.ts.
 * Supported suffixes: `class`, `classes`, `className`, `classNames`, `classList`, `classLists`
 * (also snake_case variants like `class_name`, `class_names`, `class_list`, `class_lists`).
 *
 * **Patterns demonstrated:**
 * - Naming patterns: All CLASS_NAME_PATTERN suffix variants
 * - Expression patterns: Ternary, logical AND, arrays
 * - Comment hints: `@fuz-classes` directive
 *
 * Token, composite, and literal classes are demonstrated inline in the examples
 * since they don't require special extraction testing.
 *
 * @module
 */

/* eslint-disable no-constant-condition, @typescript-eslint/no-unnecessary-condition, no-constant-binary-expression */

//
// Naming patterns - all CLASS_NAME_PATTERN suffix variants (mb_* + ml_* for plurals)
//

/** `*Class` suffix (camelCase) */
export const demoClass = 'mb_xs5';

/** `*_class` suffix (snake_case) */
export const demo_class = 'mb_xs4';

/** `SCREAMING_SNAKE_CASE` naming */
export const DEMO_CLASS = 'mb_xs3';

/** `*Classes` suffix (camelCase) - plural, multiple classes */
export const demoClasses = 'mb_xs2 ml_xs';

/** `*_classes` suffix (snake_case) - plural, multiple classes */
export const demo_classes = 'mb_xs ml_sm';

/** `*ClassName` suffix (camelCase) */
export const demoClassName = 'mb_sm';

/** `*class_name` suffix (snake_case) */
export const demo_class_name = 'mb_md';

/** `*ClassNames` suffix (camelCase) - plural, multiple classes */
export const demoClassNames = 'mb_lg ml_md';

/** `*class_names` suffix (snake_case) - plural, multiple classes */
export const demo_class_names = 'mb_xl ml_lg';

/** `*ClassList` suffix (camelCase) */
export const demoClassList = 'mb_xl2';

/** `*class_list` suffix (snake_case) */
export const demo_class_list = 'mb_xl3';

/** `*ClassLists` suffix (camelCase) - plural, multiple classes */
export const demoClassLists = 'mb_xl4 ml_xl';

/** `*class_lists` suffix (snake_case) - plural, multiple classes */
export const demo_class_lists = 'mb_xl5 ml_xl2';

//
// Expression patterns - ternary, logical AND, array (mt_* incrementing)
//

/** Ternary expression - both branches extracted */
export const ternaryClass = true ? 'mt_xs' : 'mt_sm';

/** Logical AND - truthy value extracted */
export const logicalClass = true && 'mt_md';

/** Array - all elements extracted */
export const arrayClasses = ['mt_lg', 'mt_xl'];

/** Object - keys extracted as class names */
export const objectClasses = {mt_xl2: 'mt_xl2', mt_xl3: 'mt_xl3'};

//
// Comment hint examples - @fuz-classes directive
//

// @fuz-classes shadow_lg
/**
 * Comment hint - extracted via @fuz-classes, NOT via variable name pattern.
 * Variable name `fromComment` doesn't end in class/classes/className.
 */
export const fromComment = 'shadow_lg';
