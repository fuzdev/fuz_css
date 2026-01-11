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

//
// Types
//

/**
 * Source location for IDE/LSP integration.
 */
export interface SourceLocation {
	file: string;
	/** 1-based line number */
	line: number;
	/** 1-based column number */
	column: number;
}

/**
 * Base diagnostic with common fields.
 */
export interface BaseDiagnostic {
	level: 'error' | 'warning';
	message: string;
	suggestion: string | null;
}

/**
 * Diagnostic from the extraction phase.
 */
export interface ExtractionDiagnostic extends BaseDiagnostic {
	phase: 'extraction';
	location: SourceLocation;
}

/**
 * Extraction result with classes mapped to their source locations.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 */
export interface ExtractionResult {
	/**
	 * Map from class name to locations where it was used, or null if none.
	 * Keys = unique classes, values = locations for diagnostics/IDE integration.
	 */
	classes: Map<string, Array<SourceLocation>> | null;
	/** Variables that were used in class contexts, or null if none */
	tracked_vars: Set<string> | null;
	/** Diagnostics from the extraction phase, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
}

/**
 * Options for CSS class extraction.
 */
export interface ExtractCssClassesOptions {
	/**
	 * File path used to determine extraction method (Svelte vs TS)
	 * and for location tracking in diagnostics.
	 */
	filename?: string;
}

//
// Utilities
//

/**
 * Helper class for converting character offsets to line/column positions.
 * Svelte template nodes (Comment, Text, ExpressionTag) only have char offsets,
 * so this class enables efficient conversion.
 *
 * Build: O(n) where n = source length
 * Lookup: O(log m) where m = number of lines (binary search)
 */
export class SourceIndex {
	private line_starts: Array<number>;

	constructor(source: string) {
		this.line_starts = [0];
		for (let i = 0; i < source.length; i++) {
			if (source[i] === '\n') this.line_starts.push(i + 1);
		}
	}

	/**
	 * Converts a character offset to a source location.
	 *
	 * @param offset - 0-based character offset in the source
	 * @param file - File path for the location
	 * @returns SourceLocation with 1-based line and column
	 */
	get_location(offset: number, file: string): SourceLocation {
		// Binary search for line
		let low = 0;
		let high = this.line_starts.length - 1;
		while (low < high) {
			const mid = Math.ceil((low + high) / 2);
			if (this.line_starts[mid]! <= offset) low = mid;
			else high = mid - 1;
		}
		return {file, line: low + 1, column: offset - this.line_starts[low]! + 1};
	}
}

/**
 * Adds a class with its location to the extraction result.
 *
 * @param classes - Map of classes to locations
 * @param class_name - Class name to add
 * @param location - Source location where the class was found
 */
export const add_class_with_location = (
	classes: Map<string, Array<SourceLocation>>,
	class_name: string,
	location: SourceLocation,
): void => {
	const existing = classes.get(class_name);
	if (existing) {
		existing.push(location);
	} else {
		classes.set(class_name, [location]);
	}
};

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
 * State maintained during AST walking.
 */
interface WalkState {
	/** Map from class name to locations */
	classes: Map<string, Array<SourceLocation>>;
	/** Variables used in class contexts */
	tracked_vars: Set<string>;
	/** Variables with class-like names, mapped to their initializers */
	class_name_vars: Map<string, unknown>;
	/** Whether we're in a class context (for tracking variable usage) */
	in_class_context: boolean;
	/** File path for creating locations */
	file: string;
	/** Source index for char offset → line/column conversion (template only) */
	source_index: SourceIndex | null;
	/** Diagnostics collected during extraction */
	diagnostics: Array<ExtractionDiagnostic>;
}

/**
 * Adds a class to the state with a location.
 */
const add_class = (state: WalkState, class_name: string, location: SourceLocation): void => {
	add_class_with_location(state.classes, class_name, location);
};

/**
 * Creates a location from a character offset using the source index.
 */
const location_from_offset = (state: WalkState, offset: number): SourceLocation => {
	if (state.source_index) {
		return state.source_index.get_location(offset, state.file);
	}
	// Fallback for script context (should have line/column from AST)
	return {file: state.file, line: 1, column: 1};
};

/**
 * Extracts CSS classes from a Svelte file using AST parsing.
 *
 * @param source - The Svelte file source code
 * @param file - File path for location tracking
 * @returns Extraction result with classes, tracked variables, and diagnostics
 */
export const extract_from_svelte = (source: string, file = '<unknown>'): ExtractionResult => {
	const classes: Map<string, Array<SourceLocation>> = new Map();
	const tracked_vars: Set<string> = new Set();
	const class_name_vars: Map<string, unknown> = new Map();
	const diagnostics: Array<ExtractionDiagnostic> = [];
	const source_index = new SourceIndex(source);

	let ast: AST.Root;
	try {
		ast = parse_svelte(source, {modern: true});
	} catch (err) {
		// Emit diagnostic about parse failure
		diagnostics.push({
			phase: 'extraction',
			level: 'warning',
			message: `Failed to parse Svelte file: ${err instanceof Error ? err.message : 'unknown error'}`,
			suggestion: 'Check for syntax errors in the file',
			location: {file, line: 1, column: 1},
		});
		// Return with diagnostics (classes/tracked_vars empty, so null)
		return {classes: null, tracked_vars: null, diagnostics};
	}

	const state: WalkState = {
		classes,
		tracked_vars,
		class_name_vars,
		in_class_context: false,
		file,
		source_index,
		diagnostics,
	};

	// Extract from @fuz-classes comments via AST (Svelte Comment nodes)
	extract_fuz_classes_from_svelte_comments(ast, state);

	// Walk the template AST
	walk_template(ast.fragment, state);

	// Walk the script AST (module and instance) including @fuz-classes comments
	if (ast.instance) {
		extract_fuz_classes_from_script(ast.instance, source, state);
		walk_script(ast.instance.content, state);
	}
	if (ast.module) {
		extract_fuz_classes_from_script(ast.module, source, state);
		walk_script(ast.module.content, state);
	}

	// Second pass: extract from tracked variables that weren't already processed
	if (tracked_vars.size > 0 && (ast.instance || ast.module)) {
		extract_from_tracked_vars(ast, state);
	}

	// Convert empty to null
	return {
		classes: classes.size > 0 ? classes : null,
		tracked_vars: tracked_vars.size > 0 ? tracked_vars : null,
		diagnostics: diagnostics.length > 0 ? diagnostics : null,
	};
};

/**
 * Parses @fuz-classes content from a comment, handling the colon variant.
 * Returns the list of class names or null if not a @fuz-classes comment.
 */
const FUZ_CLASSES_PATTERN = /^\s*@fuz-classes(:?)\s+(.+?)\s*$/;

const parse_fuz_classes_comment = (
	content: string,
	location: SourceLocation,
	diagnostics: Array<ExtractionDiagnostic>,
): Array<string> | null => {
	// Match @fuz-classes with optional colon
	const match = FUZ_CLASSES_PATTERN.exec(content);
	if (!match) return null;

	const has_colon = match[1] === ':';
	const class_list = match[2]!;

	// Emit warning if colon was used
	if (has_colon) {
		diagnostics.push({
			phase: 'extraction',
			level: 'warning',
			message: '@fuz-classes: (with colon) is deprecated, use @fuz-classes (without colon)',
			suggestion: 'Remove the colon after @fuz-classes',
			location,
		});
	}

	return class_list.split(/\s+/).filter(Boolean);
};

/**
 * Extracts @fuz-classes from Svelte HTML Comment nodes.
 */
const extract_fuz_classes_from_svelte_comments = (ast: AST.Root, state: WalkState): void => {
	// Walk the fragment looking for Comment nodes
	const visitors: Visitors<AST.SvelteNode, WalkState> = {
		Comment(node, {state}) {
			const location = location_from_offset(state, node.start);
			const classes = parse_fuz_classes_comment(node.data, location, state.diagnostics);
			if (classes) {
				for (const cls of classes) {
					add_class(state, cls, location);
				}
			}
		},
	};

	walk(ast.fragment as AST.SvelteNode, state, visitors);
};

/**
 * Extracts @fuz-classes from script blocks by re-parsing with acorn.
 * Svelte's parser doesn't expose JavaScript comments, so we parse the
 * script source separately to get comments via acorn's onComment callback.
 */
const extract_fuz_classes_from_script = (
	script: AST.Script,
	source: string,
	state: WalkState,
): void => {
	// Extract the script source using start/end positions
	// Svelte AST nodes have start/end but the TypeScript types don't include them
	const content = script.content as unknown as {start: number; end: number};
	const script_source = source.slice(content.start, content.end);

	// Calculate the line offset for proper location reporting
	// Count newlines before the script content starts
	let line_offset = 0;
	for (let i = 0; i < content.start; i++) {
		if (source[i] === '\n') line_offset++;
	}

	// Collect comments via acorn's onComment callback
	const comments: Array<{value: string; loc: {start: {line: number; column: number}}}> = [];

	try {
		const parser = Parser.extend(tsPlugin());
		parser.parse(script_source, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
			onComment: (
				_block: boolean,
				text: string,
				_start: number,
				_end: number,
				startLoc?: {line: number; column: number},
			) => {
				if (startLoc) {
					comments.push({value: text, loc: {start: startLoc}});
				}
			},
		});
	} catch {
		// If parsing fails, we can't extract comments
		return;
	}

	// Process @fuz-classes comments
	for (const comment of comments) {
		const location: SourceLocation = {
			file: state.file,
			line: comment.loc.start.line + line_offset,
			column: comment.loc.start.column + 1,
		};
		const class_list = parse_fuz_classes_comment(comment.value, location, state.diagnostics);
		if (class_list) {
			for (const cls of class_list) {
				add_class(state, cls, location);
			}
		}
	}
};

/**
 * Extracts CSS classes from a TypeScript/JavaScript file using AST parsing.
 *
 * @param source - The TS/JS file source code
 * @param file - File path for location tracking
 * @returns Extraction result with classes, tracked variables, and diagnostics
 */
export const extract_from_ts = (source: string, file = '<unknown>'): ExtractionResult => {
	const classes: Map<string, Array<SourceLocation>> = new Map();
	const tracked_vars: Set<string> = new Set();
	const class_name_vars: Map<string, unknown> = new Map();
	const diagnostics: Array<ExtractionDiagnostic> = [];

	// Collect comments via acorn's onComment callback
	const comments: Array<{value: string; loc: {start: {line: number; column: number}}}> = [];

	let ast: Node;
	try {
		// Use acorn with TypeScript plugin for both TS and JS
		// The plugin handles both gracefully
		const parser = Parser.extend(tsPlugin());
		ast = parser.parse(source, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			locations: true,
			onComment: (
				_block: boolean,
				text: string,
				_start: number,
				_end: number,
				startLoc?: {line: number; column: number},
			) => {
				if (startLoc) {
					comments.push({value: text, loc: {start: startLoc}});
				}
			},
		});
	} catch (err) {
		// Emit diagnostic about parse failure
		diagnostics.push({
			phase: 'extraction',
			level: 'warning',
			message: `Failed to parse TypeScript/JavaScript file: ${err instanceof Error ? err.message : 'unknown error'}`,
			suggestion: 'Check for syntax errors in the file',
			location: {file, line: 1, column: 1},
		});
		// Return with diagnostics (classes/tracked_vars empty, so null)
		return {classes: null, tracked_vars: null, diagnostics};
	}

	// Process @fuz-classes comments
	for (const comment of comments) {
		const location: SourceLocation = {
			file,
			line: comment.loc.start.line,
			column: comment.loc.start.column + 1,
		};
		const class_list = parse_fuz_classes_comment(comment.value, location, diagnostics);
		if (class_list) {
			for (const cls of class_list) {
				add_class_with_location(classes, cls, location);
			}
		}
	}

	const state: WalkState = {
		classes,
		tracked_vars,
		class_name_vars,
		in_class_context: false,
		file,
		source_index: null, // Not needed for TS files - acorn provides locations
		diagnostics,
	};

	walk_script(ast, state);

	// Convert empty to null
	return {
		classes: classes.size > 0 ? classes : null,
		tracked_vars: tracked_vars.size > 0 ? tracked_vars : null,
		diagnostics: diagnostics.length > 0 ? diagnostics : null,
	};
};

/**
 * Unified extraction function that auto-detects file type.
 * Returns just the class names as a Set.
 *
 * @param source - The file source code
 * @param options - Extraction options
 * @returns Set of class names
 */
export const extract_css_classes = (
	source: string,
	options: ExtractCssClassesOptions = {},
): Set<string> => {
	const result = extract_css_classes_with_locations(source, options);
	return result.classes ? new Set(result.classes.keys()) : new Set();
};

/**
 * Unified extraction function that auto-detects file type.
 * Returns full extraction result with locations and diagnostics.
 *
 * @param source - The file source code
 * @param options - Extraction options
 * @returns Full extraction result with classes, tracked variables, and diagnostics
 */
export const extract_css_classes_with_locations = (
	source: string,
	options: ExtractCssClassesOptions = {},
): ExtractionResult => {
	const {filename} = options;
	const ext = filename ? filename.slice(filename.lastIndexOf('.')) : '';
	const file = filename ?? '<unknown>';

	if (ext === '.svelte') {
		return extract_from_svelte(source, file);
	} else if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
		return extract_from_ts(source, file);
	}

	// Default to Svelte-style extraction (handles both)
	const svelte_result = extract_from_svelte(source, file);
	if (svelte_result.classes) {
		return svelte_result;
	}
	return extract_from_ts(source, file);
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
			add_class(state, attr.name, location_from_offset(state, attr.start));
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
				const location = location_from_offset(state, part.start);
				for (const cls of part.data.split(/\s+/).filter(Boolean)) {
					add_class(state, cls, location);
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
	// Get location from the expression's start offset
	const get_location = (): SourceLocation => {
		const node = expr as unknown as {start?: number; loc?: {start: {line: number; column: number}}};
		if (node.loc) {
			return {file: state.file, line: node.loc.start.line, column: node.loc.start.column + 1};
		}
		if (node.start !== undefined) {
			return location_from_offset(state, node.start);
		}
		return {file: state.file, line: 1, column: 1};
	};

	switch (expr.type) {
		case 'Literal': {
			// String literal
			const node = expr as unknown as {value: unknown};
			if (typeof node.value === 'string') {
				const location = get_location();
				for (const cls of node.value.split(/\s+/).filter(Boolean)) {
					add_class(state, cls, location);
				}
			}
			break;
		}

		case 'TemplateLiteral': {
			// Template literal - extract static parts
			const node = expr as unknown as {
				quasis: Array<{
					value: {raw: string};
					start?: number;
					loc?: {start: {line: number; column: number}};
				}>;
				expressions: Array<unknown>;
			};
			for (const quasi of node.quasis) {
				if (quasi.value.raw) {
					const location = quasi.loc
						? {file: state.file, line: quasi.loc.start.line, column: quasi.loc.start.column + 1}
						: quasi.start !== undefined
							? location_from_offset(state, quasi.start)
							: get_location();
					for (const cls of quasi.value.raw.split(/\s+/).filter(Boolean)) {
						add_class(state, cls, location);
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
				properties: Array<{
					type: string;
					key: unknown;
					computed: boolean;
					start?: number;
					loc?: {start: {line: number; column: number}};
				}>;
			};
			for (const prop of node.properties) {
				if (prop.type === 'Property' && !prop.computed) {
					// Non-computed key - extract the key as a class name
					const key = prop.key as {type: string; name?: string; value?: string};
					const location = prop.loc
						? {file: state.file, line: prop.loc.start.line, column: prop.loc.start.column + 1}
						: prop.start !== undefined
							? location_from_offset(state, prop.start)
							: get_location();
					if (key.type === 'Identifier') {
						add_class(state, key.name!, location);
					} else if (key.type === 'Literal' && typeof key.value === 'string') {
						// Handle string keys like { 'display:flex': condition }
						for (const cls of key.value.split(/\s+/).filter(Boolean)) {
							add_class(state, cls, location);
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
