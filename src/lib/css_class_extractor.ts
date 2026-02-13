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
 * - `// @fuz-elements element1 element2` - comment hints for dynamic elements
 * - `// @fuz-variables var1 var2` - comment hints for dynamic CSS variables
 *
 * @module
 */

import {parse as parse_svelte, type AST} from 'svelte/compiler';
import {walk, type Visitors} from 'zimmerframe';
import {Parser, type Node} from 'acorn';
import {tsPlugin} from '@sveltejs/acorn-typescript';

import {type SourceLocation, type ExtractionDiagnostic} from './diagnostics.js';

//
// Types
//

/**
 * Extraction result with classes mapped to their source locations.
 * Uses `null` instead of empty collections to avoid allocation overhead.
 *
 * Uses embedded diagnostics (rather than a Result type) because file extraction
 * can partially succeed: some classes may be extracted while others produce errors.
 * This differs from `CssLiteralParseResult` which uses a discriminated union
 * because single-class parsing is binary success/failure.
 */
export interface ExtractionResult {
	/**
	 * Map from class name to locations where it was used, or null if none.
	 * Keys = unique classes, values = locations for diagnostics/IDE integration.
	 */
	classes: Map<string, Array<SourceLocation>> | null;
	/**
	 * Classes explicitly annotated via `@fuz-classes` comments, or null if none.
	 * These produce errors if they can't be resolved during generation.
	 */
	explicit_classes: Set<string> | null;
	/** Variables that were used in class contexts, or null if none */
	tracked_vars: Set<string> | null;
	/** Diagnostics from the extraction phase, or null if none */
	diagnostics: Array<ExtractionDiagnostic> | null;
	/**
	 * HTML elements found in the file, or null if none.
	 * Used for including only the style.css rules needed.
	 */
	elements: Set<string> | null;
	/**
	 * Elements explicitly annotated via `@fuz-elements` comments, or null if none.
	 * These should produce errors if they have no matching style rules.
	 */
	explicit_elements: Set<string> | null;
	/**
	 * Variables explicitly annotated via `@fuz-variables` comments, or null if none.
	 * These produce errors if they can't be resolved to theme variables.
	 */
	explicit_variables: Set<string> | null;
}

/**
 * Acorn plugin type - a function that extends the Parser class.
 */
export type AcornPlugin = (BaseParser: typeof Parser) => typeof Parser;

/**
 * Options for CSS class extraction.
 */
export interface ExtractCssClassesOptions {
	/**
	 * File path used to determine extraction method (Svelte vs TS)
	 * and for location tracking in diagnostics.
	 */
	filename?: string;
	/**
	 * Additional acorn plugins to use when parsing TS/JS files.
	 * Useful for adding JSX support via `acorn-jsx` for React projects.
	 *
	 * @example
	 * ```ts
	 * import jsx from 'acorn-jsx';
	 * extract_css_classes(source, { acorn_plugins: [jsx()] });
	 * ```
	 */
	acorn_plugins?: Array<AcornPlugin>;
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
 * @mutates classes - Adds or appends to the map entry
 */
const add_class_with_location = (
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

// Svelte 5 runes that wrap expressions we should extract from
const SVELTE_RUNES = new Set(['$derived', '$state']);

// Pattern for variables with class-related names
const CLASS_NAME_PATTERN = /(class|classes|class_?names?|class_?lists?)$/i;

/**
 * State maintained during AST walking.
 */
interface WalkState {
	/** Map from class name to locations */
	classes: Map<string, Array<SourceLocation>>;
	/** Classes explicitly annotated via @fuz-classes comments */
	explicit_classes: Set<string>;
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
	/** HTML elements found in the file */
	elements: Set<string>;
	/** Elements explicitly annotated via @fuz-elements comments */
	explicit_elements: Set<string>;
	/** Variables explicitly annotated via @fuz-variables comments */
	explicit_variables: Set<string>;
}

/**
 * Creates a fresh WalkState for extraction.
 */
const create_walk_state = (file: string, source_index: SourceIndex | null): WalkState => ({
	classes: new Map(),
	explicit_classes: new Set(),
	tracked_vars: new Set(),
	class_name_vars: new Map(),
	in_class_context: false,
	file,
	source_index,
	diagnostics: [],
	elements: new Set(),
	explicit_elements: new Set(),
	explicit_variables: new Set(),
});

/**
 * Converts WalkState to ExtractionResult, converting empty collections to null.
 */
const finalize_extraction_result = (state: WalkState): ExtractionResult => ({
	classes: state.classes.size > 0 ? state.classes : null,
	explicit_classes: state.explicit_classes.size > 0 ? state.explicit_classes : null,
	tracked_vars: state.tracked_vars.size > 0 ? state.tracked_vars : null,
	diagnostics: state.diagnostics.length > 0 ? state.diagnostics : null,
	elements: state.elements.size > 0 ? state.elements : null,
	explicit_elements: state.explicit_elements.size > 0 ? state.explicit_elements : null,
	explicit_variables: state.explicit_variables.size > 0 ? state.explicit_variables : null,
});

/**
 * Creates an empty ExtractionResult with only diagnostics.
 * Used when parsing fails early.
 */
const empty_extraction_result = (diagnostics: Array<ExtractionDiagnostic>): ExtractionResult => ({
	classes: null,
	explicit_classes: null,
	tracked_vars: null,
	diagnostics: diagnostics.length > 0 ? diagnostics : null,
	elements: null,
	explicit_elements: null,
	explicit_variables: null,
});

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
 * @returns Extraction result with classes, tracked variables, elements, and diagnostics
 */
export const extract_from_svelte = (source: string, file = '<unknown>'): ExtractionResult => {
	const source_index = new SourceIndex(source);

	let ast: AST.Root;
	try {
		ast = parse_svelte(source, {modern: true});
	} catch (err) {
		return empty_extraction_result([
			{
				phase: 'extraction',
				level: 'warning',
				message: `Failed to parse Svelte file: ${err instanceof Error ? err.message : 'unknown error'}`,
				suggestion: 'Check for syntax errors in the file',
				location: {file, line: 1, column: 1},
			},
		]);
	}

	const state = create_walk_state(file, source_index);

	// Extract from @fuz-* comments via AST (Svelte Comment nodes)
	extract_fuz_comments_from_svelte(ast, state);

	// Walk the template AST
	walk_template(ast.fragment, state);

	// Walk the script AST (module and instance) including @fuz-classes comments
	if (ast.instance) {
		extract_fuz_comments_from_script(ast.instance, source, state);
		walk_script(ast.instance.content, state);
	}
	if (ast.module) {
		extract_fuz_comments_from_script(ast.module, source, state);
		walk_script(ast.module.content, state);
	}

	// Second pass: extract from tracked variables that weren't already processed
	if (state.tracked_vars.size > 0 && (ast.instance || ast.module)) {
		extract_from_tracked_vars(ast, state);
	}

	return finalize_extraction_result(state);
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

	// Emit warning if colon was used (unnecessary but supported)
	if (has_colon) {
		diagnostics.push({
			phase: 'extraction',
			level: 'warning',
			message: '@fuz-classes: colon is unnecessary',
			suggestion: 'Use @fuz-classes without the colon',
			location,
		});
	}

	return class_list.split(/\s+/).filter(Boolean);
};

/**
 * Parses @fuz-elements content from a comment, handling the colon variant.
 * Returns the list of element names or null if not a @fuz-elements comment.
 */
const FUZ_ELEMENTS_PATTERN = /^\s*@fuz-elements(:?)\s+(.+?)\s*$/;

const parse_fuz_elements_comment = (
	content: string,
	location: SourceLocation,
	diagnostics: Array<ExtractionDiagnostic>,
): Array<string> | null => {
	const match = FUZ_ELEMENTS_PATTERN.exec(content);
	if (!match) return null;

	const has_colon = match[1] === ':';
	const element_list = match[2]!;

	if (has_colon) {
		diagnostics.push({
			phase: 'extraction',
			level: 'warning',
			message: '@fuz-elements: colon is unnecessary',
			suggestion: 'Use @fuz-elements without the colon',
			location,
		});
	}

	return element_list.split(/\s+/).filter(Boolean);
};

/**
 * Parses @fuz-variables content from a comment, handling the colon variant.
 * Returns the list of variable names or null if not a @fuz-variables comment.
 */
const FUZ_VARIABLES_PATTERN = /^\s*@fuz-variables(:?)\s+(.+?)\s*$/;

const parse_fuz_variables_comment = (
	content: string,
	location: SourceLocation,
	diagnostics: Array<ExtractionDiagnostic>,
): Array<string> | null => {
	const match = FUZ_VARIABLES_PATTERN.exec(content);
	if (!match) return null;

	const has_colon = match[1] === ':';
	const variable_list = match[2]!;

	if (has_colon) {
		diagnostics.push({
			phase: 'extraction',
			level: 'warning',
			message: '@fuz-variables: colon is unnecessary',
			suggestion: 'Use @fuz-variables without the colon',
			location,
		});
	}

	return variable_list.split(/\s+/).filter(Boolean);
};

/**
 * Processes a comment for @fuz-classes, @fuz-elements, and @fuz-variables annotations.
 * Adds found items to the appropriate state collections.
 */
const process_fuz_comment = (content: string, location: SourceLocation, state: WalkState): void => {
	// @fuz-classes
	const class_list = parse_fuz_classes_comment(content, location, state.diagnostics);
	if (class_list) {
		for (const cls of class_list) {
			add_class(state, cls, location);
			state.explicit_classes.add(cls);
		}
	}

	// @fuz-elements
	const element_list = parse_fuz_elements_comment(content, location, state.diagnostics);
	if (element_list) {
		for (const el of element_list) {
			state.elements.add(el);
			state.explicit_elements.add(el);
		}
	}

	// @fuz-variables
	const variable_list = parse_fuz_variables_comment(content, location, state.diagnostics);
	if (variable_list) {
		for (const v of variable_list) {
			state.explicit_variables.add(v);
		}
	}
};

/**
 * Extracts @fuz-classes and @fuz-elements from Svelte HTML Comment nodes.
 */
const extract_fuz_comments_from_svelte = (ast: AST.Root, state: WalkState): void => {
	const visitors: Visitors<AST.SvelteNode, WalkState> = {
		Comment(node, {state}) {
			process_fuz_comment(node.data, location_from_offset(state, node.start), state);
		},
	};
	walk(ast.fragment as AST.SvelteNode, state, visitors);
};

/**
 * Extracts @fuz-* comments from script blocks by re-parsing with acorn.
 * Svelte's parser doesn't expose JS comments, so we parse the
 * script source separately to get comments via acorn's onComment callback.
 */
const extract_fuz_comments_from_script = (
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

	// Process @fuz-* comments
	for (const comment of comments) {
		const location: SourceLocation = {
			file: state.file,
			line: comment.loc.start.line + line_offset,
			column: comment.loc.start.column + 1,
		};
		process_fuz_comment(comment.value, location, state);
	}
};

/**
 * Extracts CSS classes from a TypeScript/JS file using AST parsing.
 *
 * @param source - The TS/JS file source code
 * @param file - File path for location tracking
 * @param acorn_plugins - Additional acorn plugins (e.g., acorn-jsx for React)
 * @returns Extraction result with classes, tracked variables, elements, and diagnostics
 */
export const extract_from_ts = (
	source: string,
	file = '<unknown>',
	acorn_plugins?: Array<AcornPlugin>,
): ExtractionResult => {
	// Collect comments via acorn's onComment callback
	const comments: Array<{value: string; loc: {start: {line: number; column: number}}}> = [];

	let ast: Node;
	try {
		// Use acorn with TypeScript plugin, plus any additional plugins (e.g., jsx)
		const plugins: Array<AcornPlugin> = [tsPlugin(), ...(acorn_plugins ?? [])];
		const parser = plugins.reduce((p, plugin) => plugin(p), Parser);
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
		return empty_extraction_result([
			{
				phase: 'extraction',
				level: 'warning',
				message: `Failed to parse TypeScript/JS file: ${err instanceof Error ? err.message : 'unknown error'}`,
				suggestion: 'Check for syntax errors in the file',
				location: {file, line: 1, column: 1},
			},
		]);
	}

	const state = create_walk_state(file, null); // null source_index - acorn provides locations

	// Process @fuz-* comments
	for (const comment of comments) {
		const location: SourceLocation = {
			file,
			line: comment.loc.start.line,
			column: comment.loc.start.column + 1,
		};
		process_fuz_comment(comment.value, location, state);
	}

	walk_script(ast, state);

	// Second pass: extract from tracked variables that weren't already processed
	// This handles JSX patterns where className={foo} is encountered after const foo = '...'
	if (state.tracked_vars.size > 0) {
		extract_from_tracked_vars_in_script(ast, state);
	}

	return finalize_extraction_result(state);
};

/**
 * Unified extraction function that auto-detects file type.
 * Returns just the class names as a Set.
 *
 * @param source - The file source code
 * @param options - Extraction options
 * @returns Set of class names, or null if none found
 */
export const extract_css_classes = (
	source: string,
	options: ExtractCssClassesOptions = {},
): Set<string> | null => {
	const result = extract_css_classes_with_locations(source, options);
	return result.classes ? new Set(result.classes.keys()) : null;
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
	const {filename, acorn_plugins} = options;
	const ext = filename ? filename.slice(filename.lastIndexOf('.')) : '';
	const file = filename ?? '<unknown>';

	if (ext === '.svelte' || ext === '.html') {
		return extract_from_svelte(source, file);
	} else if (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx') {
		return extract_from_ts(source, file, acorn_plugins);
	}

	// Default to Svelte-style extraction (handles both)
	const svelte_result = extract_from_svelte(source, file);
	if (svelte_result.classes) {
		return svelte_result;
	}
	return extract_from_ts(source, file, acorn_plugins);
};

// Template AST walking

/**
 * Walks the Svelte template AST to extract class names and element names.
 */
const walk_template = (fragment: AST.Fragment, state: WalkState): void => {
	const visitors: Visitors<AST.SvelteNode, WalkState> = {
		// Handle regular elements - capture element name
		RegularElement(node, {state, next}) {
			// Track HTML element names (not components, not svelte:* elements)
			state.elements.add(node.name);
			process_element_attributes(node.attributes, state);
			next();
		},
		// SvelteElement has dynamic tag, can't statically determine element
		SvelteElement(node, {state, next}) {
			process_element_attributes(node.attributes, state);
			next();
		},
		// Components are PascalCase - don't add to elements
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
		// SvelteHead injects children into document <head> - walk its fragment
		SvelteHead(_node, {next}) {
			next();
		},
		// TitleElement is a special element type for <title> inside svelte:head
		TitleElement(node, {state, next}) {
			state.elements.add(node.name);
			process_element_attributes(node.attributes, state);
			next();
		},
		// SlotElement is <slot> - can have fallback content with elements
		SlotElement(node, {state, next}) {
			state.elements.add(node.name);
			process_element_attributes(node.attributes, state);
			next();
		},
		// SvelteBody, SvelteWindow, SvelteDocument don't have element children
		SvelteBody(_node, {next}) {
			next();
		},
		SvelteWindow(_node, {next}) {
			next();
		},
		SvelteDocument(_node, {next}) {
			next();
		},
	};

	walk(fragment as AST.SvelteNode, state, visitors);
};

/**
 * Processes attributes on an element to extract class names and CSS variables.
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
 * Extracts classes from a TS expression.
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
			// Template literal - extract static parts that are complete tokens
			// Only extract tokens that are whitespace-bounded (not fragments like `icon-` from `icon-${size}`)
			const node = expr as unknown as {
				quasis: Array<{
					value: {raw: string};
					start?: number;
					loc?: {start: {line: number; column: number}};
				}>;
				expressions: Array<unknown>;
			};

			const has_expressions = node.expressions.length > 0;

			for (let i = 0; i < node.quasis.length; i++) {
				const quasi = node.quasis[i]!;
				if (!quasi.value.raw) continue;

				const location = quasi.loc
					? {file: state.file, line: quasi.loc.start.line, column: quasi.loc.start.column + 1}
					: quasi.start !== undefined
						? location_from_offset(state, quasi.start)
						: get_location();

				const raw = quasi.value.raw;

				if (!has_expressions) {
					// No expressions - extract all tokens (pure static template literal)
					for (const cls of raw.split(/\s+/).filter(Boolean)) {
						add_class(state, cls, location);
					}
				} else {
					// Has expressions - only extract complete tokens
					// A token is complete if bounded by whitespace/string-boundary on both sides
					const is_first = i === 0;
					const is_last = i === node.quasis.length - 1;
					const has_expr_before = !is_first;
					const has_expr_after = !is_last;

					// Split preserving info about boundaries
					const tokens = raw.split(/\s+/);
					const starts_with_ws = /^\s/.test(raw);
					const ends_with_ws = /\s$/.test(raw);

					for (let j = 0; j < tokens.length; j++) {
						const token = tokens[j];
						if (!token) continue;

						const is_first_token = j === 0;
						const is_last_token = j === tokens.length - 1;

						// Token is bounded on the left if:
						// - It's the first token AND (is_first quasi OR starts_with_ws)
						// - OR it's not the first token (preceded by whitespace from split)
						const bounded_left = !is_first_token || is_first || (has_expr_before && starts_with_ws);

						// Token is bounded on the right if:
						// - It's the last token AND (is_last quasi OR ends_with_ws)
						// - OR it's not the last token (followed by whitespace from split)
						const bounded_right = !is_last_token || is_last || (has_expr_after && ends_with_ws);

						if (bounded_left && bounded_right) {
							add_class(state, token, location);
						}
					}
				}
			}

			// Also extract from expressions (e.g., ternaries inside the template)
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
			// Function call: check if it's a class utility function or Svelte rune
			const node = expr as unknown as {
				callee: {type: string; name?: string; object?: {name?: string}; property?: {name?: string}};
				arguments: Array<unknown>;
			};

			let should_extract = false;

			if (node.callee.type === 'Identifier') {
				// Direct call: clsx(), cn(), $derived(), etc.
				should_extract =
					CLASS_UTILITY_FUNCTIONS.has(node.callee.name!) || SVELTE_RUNES.has(node.callee.name!);
			} else if (node.callee.type === 'MemberExpression') {
				// Member call: $derived.by(), etc.
				const obj = node.callee.object;
				if (obj?.name && SVELTE_RUNES.has(obj.name)) {
					should_extract = true;
				}
			}

			if (should_extract) {
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

		case 'TaggedTemplateExpression': {
			// Tagged template literal like css`class-name` - extract from the template
			const node = expr as unknown as {quasi: unknown};
			if (node.quasi) {
				extract_from_expression(node.quasi as AST.SvelteNode, state);
			}
			break;
		}

		case 'ArrowFunctionExpression':
		case 'FunctionExpression': {
			// Function expression: extract from the body
			// Handles $derived.by(() => cond ? 'a' : 'b')
			const node = expr as unknown as {body: unknown};
			if (node.body) {
				extract_from_expression(node.body as AST.SvelteNode, state);
			}
			break;
		}

		case 'BlockStatement': {
			// Block statement: walk all statements looking for return statements
			const node = expr as unknown as {body: Array<unknown>};
			for (const stmt of node.body) {
				extract_from_expression(stmt as AST.SvelteNode, state);
			}
			break;
		}

		case 'ReturnStatement': {
			// Return statement: extract from the argument
			const node = expr as unknown as {argument: unknown};
			if (node.argument) {
				extract_from_expression(node.argument as AST.SvelteNode, state);
			}
			break;
		}

		default:
			// Other expression types we don't handle
			break;
	}
};

// Script AST walking

/**
 * Extracts classes from a JSX attribute value (React className, Preact/Solid class, Solid classList).
 * Handles string literals and expression containers.
 * Sets in_class_context to enable variable tracking.
 */
const extract_from_jsx_attribute_value = (value: unknown, state: WalkState): void => {
	const node = value as {
		type: string;
		value?: string;
		expression?: unknown;
		loc?: {start: {line: number; column: number}};
	};

	if (node.type === 'Literal' && typeof node.value === 'string') {
		// Static className="foo bar"
		const location: SourceLocation = node.loc
			? {file: state.file, line: node.loc.start.line, column: node.loc.start.column + 1}
			: {file: state.file, line: 1, column: 1};
		for (const cls of node.value.split(/\s+/).filter(Boolean)) {
			add_class(state, cls, location);
		}
	} else if (node.type === 'JSXExpressionContainer' && node.expression) {
		// Dynamic className={expr} - enable variable tracking
		const prev_context = state.in_class_context;
		state.in_class_context = true;
		extract_from_expression(node.expression as AST.SvelteNode, state);
		state.in_class_context = prev_context;
	}
};

/**
 * Walks a TypeScript/JS AST to extract class names.
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
			if (!prop.computed) {
				// Extract key name from identifier or string literal
				let key_name: string | undefined;
				if (prop.key.type === 'Identifier') {
					key_name = prop.key.name;
				} else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
					key_name = prop.key.value;
				}
				if (
					key_name &&
					(key_name === 'class' || key_name === 'className' || CLASS_NAME_PATTERN.test(key_name))
				) {
					extract_from_expression(prop.value as AST.SvelteNode, state);
				}
			}
			next();
		},

		// JSX elements (React/Preact/Solid) - extract class-related attributes and element names
		// These are only present when acorn-jsx plugin is used
		JSXElement(node, {state, next}) {
			const element = node as unknown as {
				openingElement: {
					name?: {type: string; name?: string};
					attributes: Array<{
						type: string;
						name?: {type: string; name?: string};
						value?: unknown;
					}>;
				};
			};

			// Track element names (lowercase = HTML element, PascalCase = component)
			const tag_name = element.openingElement.name?.name;
			if (tag_name && /^[a-z]/.test(tag_name)) {
				state.elements.add(tag_name);
			}

			for (const attr of element.openingElement.attributes) {
				if (attr.type === 'JSXAttribute' && attr.value) {
					const attr_name = attr.name?.name;
					// className (React), class (Preact/Solid)
					if (attr_name === 'className' || attr_name === 'class') {
						extract_from_jsx_attribute_value(attr.value, state);
					}
					// classList (Solid) - object syntax like classList={{ active: isActive }}
					else if (attr_name === 'classList') {
						extract_from_jsx_attribute_value(attr.value, state);
					}
				}
			}
			next();
		},
	};

	walk(ast as Node, state, visitors);
};

/**
 * Second pass to extract from tracked variables in Svelte scripts.
 */
const extract_from_tracked_vars = (ast: AST.Root, state: WalkState): void => {
	const scripts = [ast.instance?.content, ast.module?.content].filter(Boolean);

	for (const script of scripts) {
		extract_from_tracked_vars_in_script(script as unknown as Node, state);
	}
};

/**
 * Second pass to extract from tracked variables in a standalone script AST.
 * Used for both Svelte scripts and standalone TS/JS files (including JSX).
 */
const extract_from_tracked_vars_in_script = (ast: Node, state: WalkState): void => {
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

	walk(ast, state, find_visitors);
};
