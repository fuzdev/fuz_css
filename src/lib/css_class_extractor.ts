/**
 * AST-based CSS class extraction for Svelte and TypeScript files.
 *
 * Replaces regex-based extraction with proper parsing to handle:
 * - `class="display:flex"` - string attributes
 * - `class={{ active, disabled: !enabled }}` - object attributes (Svelte 5.16+)
 * - `class={[cond && 'box', 'display:flex']}` - array attributes (Svelte 5.16+)
 * - `class:active={cond}` - class directives
 * - `clsx('foo', { bar: true })` - class utility function calls
 * - Variables with class-related names
 * - `// @fuz-classes class1 class2` - comment hints for dynamic classes
 *
 * @module
 */

import {parse as parse_svelte, type AST} from 'svelte/compiler';
import {walk, type Visitors} from 'zimmerframe';
import {Parser, type Node} from 'acorn';
import {tsPlugin} from '@sveltejs/acorn-typescript';

// Known class utility function names
const CLASS_UTILITY_FUNCTIONS = new Set([
	'clsx', // clsx package
	'cn', // common alias (shadcn/ui convention)
	'classNames', // classnames package
	'classnames', // lowercase variant
	'cx', // emotion and other libs
]);

// Pattern for variables with class-related names
const CLASS_NAME_PATTERN = /(class|classes|classname|classnames)$/i;

/**
 * Pattern to match @fuz-classes comments.
 * Supports both single-line and multi-line comment syntax:
 * - `// @fuz-classes class1 class2`
 * - Block comments: @fuz-classes class1 class2
 */
const FUZ_CLASSES_COMMENT_PATTERN = /(?:\/\/|\/\*)\s*@fuz-classes\s+([^*\n]+?)(?:\*\/|\n|$)/g;

/**
 * Extracts class names from @fuz-classes comments in source code.
 * This provides a way to hint dynamic class names that can't be statically extracted.
 *
 * @example
 * // @fuz-classes outline_width_focus outline_width_active
 * // @fuz-classes dynamic_class_1 dynamic_class_2
 */
const extract_from_fuz_comments = (source: string): Set<string> => {
	const classes: Set<string> = new Set();
	let match;

	while ((match = FUZ_CLASSES_COMMENT_PATTERN.exec(source)) !== null) {
		const class_list = match[1]!.trim();
		for (const cls of class_list.split(/\s+/).filter(Boolean)) {
			classes.add(cls);
		}
	}

	return classes;
};

/**
 * Extraction result with classes and tracked variables.
 */
export interface ExtractionResult {
	/** All extracted class names */
	classes: Set<string>;
	/** Variables that were used in class contexts (for diagnostics) */
	tracked_vars: Set<string>;
}

/**
 * State maintained during AST walking.
 */
interface WalkState {
	/** Collected class names */
	classes: Set<string>;
	/** Variables used in class contexts */
	tracked_vars: Set<string>;
	/** Variables with class-like names, mapped to their initializers */
	class_name_vars: Map<string, unknown>;
	/** Whether we're in a class context (for tracking variable usage) */
	in_class_context: boolean;
}

/**
 * Extracts CSS classes from a Svelte file using AST parsing.
 *
 * @param source - The Svelte file source code
 * @returns Extraction result with classes and tracked variables
 */
export const extract_from_svelte = (source: string): ExtractionResult => {
	const classes: Set<string> = new Set();
	const tracked_vars: Set<string> = new Set();
	const class_name_vars: Map<string, unknown> = new Map();

	// Extract from @fuz-classes comments first (works even if parsing fails)
	for (const cls of extract_from_fuz_comments(source)) {
		classes.add(cls);
	}

	let ast: AST.Root;
	try {
		ast = parse_svelte(source, {modern: true});
	} catch {
		// If parsing fails, return what we got from comments
		return {classes, tracked_vars};
	}

	const state: WalkState = {
		classes,
		tracked_vars,
		class_name_vars,
		in_class_context: false,
	};

	// Walk the template AST
	walk_template(ast.fragment, state);

	// Walk the script AST (module and instance)
	if (ast.instance) {
		walk_script(ast.instance.content, state);
	}
	if (ast.module) {
		walk_script(ast.module.content, state);
	}

	// Second pass: extract from tracked variables that weren't already processed
	if (tracked_vars.size > 0 && (ast.instance || ast.module)) {
		extract_from_tracked_vars(ast, state);
	}

	return {classes, tracked_vars};
};

/**
 * Extracts CSS classes from a TypeScript/JavaScript file using AST parsing.
 *
 * @param source - The TS/JS file source code
 * @param filename - The filename (for determining parser options)
 * @returns Extraction result with classes and tracked variables
 */
export const extract_from_ts = (source: string, _filename?: string): ExtractionResult => {
	const classes: Set<string> = new Set();
	const tracked_vars: Set<string> = new Set();
	const class_name_vars: Map<string, unknown> = new Map();

	// Extract from @fuz-classes comments first (works even if parsing fails)
	for (const cls of extract_from_fuz_comments(source)) {
		classes.add(cls);
	}

	let ast: Node;
	try {
		// Use acorn with TypeScript plugin for both TS and JS
		// The plugin handles both gracefully
		const parser = Parser.extend(tsPlugin());
		ast = parser.parse(source, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
		});
	} catch {
		// If parsing fails, return what we got from comments
		return {classes, tracked_vars};
	}

	const state: WalkState = {
		classes,
		tracked_vars,
		class_name_vars,
		in_class_context: false,
	};

	walk_script(ast, state);

	return {classes, tracked_vars};
};

/**
 * Unified extraction function that auto-detects file type.
 *
 * @param source - The file source code
 * @param filename - The filename (for determining file type)
 * @returns Extraction result with classes
 */
export const extract_css_classes = (source: string, filename?: string): Set<string> => {
	const ext = filename ? filename.slice(filename.lastIndexOf('.')) : '';

	if (ext === '.svelte') {
		return extract_from_svelte(source).classes;
	} else if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
		return extract_from_ts(source, filename).classes;
	}

	// Default to Svelte-style extraction (handles both)
	const svelte_result = extract_from_svelte(source);
	if (svelte_result.classes.size > 0) {
		return svelte_result.classes;
	}
	return extract_from_ts(source, filename).classes;
};

// Template AST walking

/**
 * Walks the Svelte template AST to extract class names.
 */
const walk_template = (fragment: AST.Fragment, state: WalkState): void => {
	const visitors: Visitors<AST.SvelteNode, WalkState> = {
		// Handle regular elements and components
		RegularElement(node, {state, next}) {
			process_element_attributes(node.attributes, state);
			next();
		},
		SvelteElement(node, {state, next}) {
			process_element_attributes(node.attributes, state);
			next();
		},
		SvelteComponent(node, {state, next}) {
			process_element_attributes(node.attributes, state);
			next();
		},
		Component(node, {state, next}) {
			process_element_attributes(node.attributes, state);
			next();
		},
		SvelteFragment(node, {state, next}) {
			process_element_attributes(node.attributes, state);
			next();
		},
	};

	walk(fragment as AST.SvelteNode, state, visitors);
};

/**
 * Processes attributes on an element to extract class names.
 */
const process_element_attributes = (
	attributes: Array<AST.Attribute | AST.SpreadAttribute | AST.Directive | AST.AttachTag>,
	state: WalkState,
): void => {
	for (const attr of attributes) {
		// Handle class attribute
		if (attr.type === 'Attribute' && attr.name === 'class') {
			extract_from_attribute_value(attr.value, state);
		}

		// Handle class: directive
		if (attr.type === 'ClassDirective') {
			state.classes.add(attr.name);
		}
	}
};

/**
 * Extracts classes from an attribute value.
 * Handles string literals, expressions, objects, and arrays.
 */
const extract_from_attribute_value = (value: AST.Attribute['value'], state: WalkState): void => {
	if (value === true) {
		// Boolean attribute, no classes
		return;
	}

	// Handle array of Text and ExpressionTag (e.g., class="foo {expr} bar")
	if (Array.isArray(value)) {
		for (const part of value) {
			if (part.type === 'Text') {
				// Static text: split on whitespace
				for (const cls of part.data.split(/\s+/).filter(Boolean)) {
					state.classes.add(cls);
				}
			} else {
				// ExpressionTag: extract from the expression
				state.in_class_context = true;
				extract_from_expression(part.expression, state);
				state.in_class_context = false;
			}
		}
		return;
	}

	// Handle single ExpressionTag (e.g., class={expression})
	// At this point, value is an ExpressionTag
	state.in_class_context = true;
	extract_from_expression(value.expression, state);
	state.in_class_context = false;
};

/**
 * Extracts classes from a JavaScript expression.
 * Handles strings, arrays, objects, conditionals, and function calls.
 */
const extract_from_expression = (expr: AST.SvelteNode, state: WalkState): void => {
	switch (expr.type) {
		case 'Literal': {
			// String literal
			const node = expr as unknown as {value: unknown};
			if (typeof node.value === 'string') {
				for (const cls of node.value.split(/\s+/).filter(Boolean)) {
					state.classes.add(cls);
				}
			}
			break;
		}

		case 'TemplateLiteral': {
			// Template literal - extract static parts
			const node = expr as unknown as {
				quasis: Array<{value: {raw: string}}>;
				expressions: Array<unknown>;
			};
			for (const quasi of node.quasis) {
				if (quasi.value.raw) {
					for (const cls of quasi.value.raw.split(/\s+/).filter(Boolean)) {
						state.classes.add(cls);
					}
				}
			}
			// Also extract from expressions
			for (const subexpr of node.expressions) {
				extract_from_expression(subexpr as AST.SvelteNode, state);
			}
			break;
		}

		case 'ArrayExpression': {
			// Array: extract from each element
			const node = expr as unknown as {elements: Array<unknown>};
			for (const element of node.elements) {
				if (element) {
					extract_from_expression(element as AST.SvelteNode, state);
				}
			}
			break;
		}

		case 'ObjectExpression': {
			// Object: extract keys (values are conditions)
			const node = expr as unknown as {
				properties: Array<{type: string; key: unknown; computed: boolean}>;
			};
			for (const prop of node.properties) {
				if (prop.type === 'Property' && !prop.computed) {
					// Non-computed key - extract the key as a class name
					const key = prop.key as {type: string; name?: string; value?: string};
					if (key.type === 'Identifier') {
						state.classes.add(key.name!);
					} else if (key.type === 'Literal' && typeof key.value === 'string') {
						// Handle string keys like { 'display:flex': condition }
						for (const cls of key.value.split(/\s+/).filter(Boolean)) {
							state.classes.add(cls);
						}
					}
				}
			}
			break;
		}

		case 'ConditionalExpression': {
			// Ternary: extract from both branches
			const node = expr as unknown as {consequent: unknown; alternate: unknown};
			extract_from_expression(node.consequent as AST.SvelteNode, state);
			extract_from_expression(node.alternate as AST.SvelteNode, state);
			break;
		}

		case 'LogicalExpression': {
			// && or ||: extract from both sides
			const node = expr as unknown as {left: unknown; right: unknown};
			extract_from_expression(node.left as AST.SvelteNode, state);
			extract_from_expression(node.right as AST.SvelteNode, state);
			break;
		}

		case 'CallExpression': {
			// Function call: check if it's a class utility function
			const node = expr as unknown as {
				callee: {type: string; name?: string};
				arguments: Array<unknown>;
			};
			if (node.callee.type === 'Identifier' && CLASS_UTILITY_FUNCTIONS.has(node.callee.name!)) {
				// It's clsx/cn/etc - extract from arguments
				for (const arg of node.arguments) {
					extract_from_expression(arg as AST.SvelteNode, state);
				}
			}
			break;
		}

		case 'Identifier': {
			// Variable reference: track it for later extraction
			const node = expr as unknown as {name: string};
			if (state.in_class_context) {
				state.tracked_vars.add(node.name);
			}
			break;
		}

		case 'MemberExpression': {
			// Member access like obj.prop - we can't statically extract
			// but track the root identifier
			break;
		}

		default:
			// Other expression types we don't handle
			break;
	}
};

// Script AST walking

/**
 * Walks a JavaScript/TypeScript AST to extract class names.
 */
const walk_script = (ast: unknown, state: WalkState): void => {
	const visitors: Visitors<Node, WalkState> = {
		// Variable declarations
		VariableDeclarator(node, {state, next}) {
			const declarator = node as unknown as {id: {type: string; name: string}; init: unknown};
			if (declarator.id.type === 'Identifier') {
				const name = declarator.id.name;
				// Check if variable name matches class pattern
				if (CLASS_NAME_PATTERN.test(name)) {
					state.class_name_vars.set(name, declarator.init);
					if (declarator.init) {
						extract_from_expression(declarator.init as AST.SvelteNode, state);
					}
				}
				// Also check if this variable was tracked from usage
				if (state.tracked_vars.has(name) && declarator.init) {
					extract_from_expression(declarator.init as AST.SvelteNode, state);
				}
			}
			next();
		},

		// Call expressions (for clsx/cn calls outside of class attributes)
		CallExpression(node, {state, next}) {
			const call = node as unknown as {
				callee: {type: string; name?: string};
				arguments: Array<unknown>;
			};
			if (call.callee.type === 'Identifier' && CLASS_UTILITY_FUNCTIONS.has(call.callee.name!)) {
				for (const arg of call.arguments) {
					extract_from_expression(arg as AST.SvelteNode, state);
				}
			}
			next();
		},

		// Object properties with class-related keys
		Property(node, {state, next}) {
			const prop = node as unknown as {
				key: {type: string; name?: string; value?: string};
				value: unknown;
				computed: boolean;
			};
			if (!prop.computed && prop.key.type === 'Identifier') {
				const key_name = prop.key.name!;
				if (key_name === 'class' || key_name === 'className' || CLASS_NAME_PATTERN.test(key_name)) {
					extract_from_expression(prop.value as AST.SvelteNode, state);
				}
			}
			next();
		},
	};

	walk(ast as Node, state, visitors);
};

/**
 * Second pass to extract from tracked variables.
 */
const extract_from_tracked_vars = (ast: AST.Root, state: WalkState): void => {
	const scripts = [ast.instance?.content, ast.module?.content].filter(Boolean);

	for (const script of scripts) {
		const find_visitors: Visitors<Node, WalkState> = {
			VariableDeclarator(node, {state}) {
				const declarator = node as unknown as {id: {type: string; name: string}; init: unknown};
				if (
					declarator.id.type === 'Identifier' &&
					state.tracked_vars.has(declarator.id.name) &&
					!state.class_name_vars.has(declarator.id.name) &&
					declarator.init
				) {
					extract_from_expression(declarator.init as AST.SvelteNode, state);
				}
			},
		};

		walk(script as unknown as Node, state, find_visitors);
	}
};
