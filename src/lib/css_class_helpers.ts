import type {Logger} from '@fuzdev/fuz_util/log.js';

import {extract_css_classes} from './css_class_extractor.js';

/**
 * Escapes special characters in a CSS class name for use in a selector.
 * CSS selectors require escaping of characters like `:`, `%`, `(`, `)`, etc.
 *
 * @example
 * escape_css_selector('display:flex') // 'display\\:flex'
 * escape_css_selector('opacity:80%') // 'opacity\\:80\\%'
 * escape_css_selector('nth-child(2n)') // 'nth-child\\(2n\\)'
 */
export const escape_css_selector = (name: string): string => {
	return name.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
};

export interface CollectCssClassesOptions {
	/**
	 * File path used to determine extraction method (Svelte vs TS).
	 */
	filename?: string;
}

/**
 * Returns a Set of CSS classes from a string of HTML/Svelte/JS/TS content.
 * Uses AST parsing for accurate extraction of:
 * - `class="..."` string attributes
 * - `class={{...}}` object attributes (Svelte 5.16+)
 * - `class={[...]}` array attributes (Svelte 5.16+)
 * - `class:name` directives
 * - `clsx()`, `cn()`, `classNames()` calls
 * - Variables with class-like names
 */
export const collect_css_classes = (
	contents: string,
	options: CollectCssClassesOptions = {},
): Set<string> => {
	return extract_css_classes(contents, options.filename);
};

export class CssClasses {
	include_classes: Set<string> | null;

	#all: Set<string> = new Set();

	#by_id: Map<string, Set<string>> = new Map();

	#dirty = true;

	constructor(include_classes: Set<string> | null = null) {
		this.include_classes = include_classes;
	}

	add(id: string, classes: Set<string>): void {
		this.#dirty = true;
		this.#by_id.set(id, classes);
	}

	delete(id: string): void {
		this.#dirty = true;
		this.#by_id.delete(id);
	}

	get(): Set<string> {
		if (this.#dirty) {
			this.#dirty = false;
			this.#recalculate();
		}
		return this.#all;
	}

	#recalculate(): void {
		this.#all.clear();
		if (this.include_classes) {
			for (const c of this.include_classes) {
				this.#all.add(c);
			}
		}
		for (const classes of this.#by_id.values()) {
			for (const c of classes) {
				this.#all.add(c);
			}
		}
	}
}

export type CssClassDeclaration =
	| CssClassDeclarationItem
	| CssClassDeclarationGroup
	| CssClassDeclarationInterpreter;

export interface CssClassDeclarationBase {
	comment?: string;
}

export interface CssClassDeclarationItem extends CssClassDeclarationBase {
	declaration: string;
}
export interface CssClassDeclarationGroup extends CssClassDeclarationBase {
	ruleset: string;
}
/**
 * Diagnostic from CSS class interpretation.
 */
export interface CssClassDiagnostic {
	level: 'error' | 'warning';
	message: string;
	class_name: string;
	suggestion?: string;
}

export interface CssClassDeclarationInterpreter extends CssClassDeclarationBase {
	pattern: RegExp;
	interpret: (
		matched: RegExpMatchArray,
		log?: Logger,
		diagnostics?: Array<CssClassDiagnostic>,
	) => string | null;
}

/**
 * Result from CSS class generation.
 */
export interface GenerateClassesCssResult {
	css: string;
	diagnostics: Array<CssClassDiagnostic>;
}

export const generate_classes_css = (
	classes: Iterable<string>,
	classes_by_name: Record<string, CssClassDeclaration | undefined>,
	interpreters: Array<CssClassDeclarationInterpreter>,
	log?: Logger,
): GenerateClassesCssResult => {
	const diagnostics: Array<CssClassDiagnostic> = [];
	// TODO when the API is redesigned this kind of thing should be cached
	// Create a map that has the index of each class name as the key
	const indexes: Map<string, number> = new Map();
	const keys = Object.keys(classes_by_name);
	for (let i = 0; i < keys.length; i++) {
		indexes.set(keys[i]!, i);
	}

	// If any classes are unknown, just put them at the end
	const sorted_classes = (Array.isArray(classes) ? classes : Array.from(classes)).sort((a, b) => {
		const index_a = indexes.get(a) ?? Number.MAX_VALUE;
		const index_b = indexes.get(b) ?? Number.MAX_VALUE;
		if (index_a !== index_b) return index_a - index_b;
		return a.localeCompare(b); // alphabetic tiebreaker for stable sort
	});

	let css = '';
	for (const c of sorted_classes) {
		let v = classes_by_name[c];

		// If not found statically, try interpreters
		if (!v) {
			for (const interpreter of interpreters) {
				const matched = c.match(interpreter.pattern);
				if (matched) {
					const result = interpreter.interpret(matched, log, diagnostics);
					if (result) {
						// Check if the result is a full ruleset (contains braces)
						// or just a declaration
						if (result.includes('{')) {
							// Full ruleset - use as-is
							v = {ruleset: result, comment: interpreter.comment};
						} else {
							// Simple declaration
							v = {declaration: result, comment: interpreter.comment};
						}
						break;
					}
				}
			}
		}

		if (!v) {
			// diagnostic
			// if (!/^[a-z_0-9]+$/.test(c)) {
			// 	console.error('invalid class detected, fix the regexps', c);
			// }
			continue;
		}

		const {comment} = v;

		if (comment) {
			css += comment.includes('\n') ? `/*\n${comment}\n*/\n` : `/** ${comment} */\n`;
		}

		if ('declaration' in v) {
			css += `.${escape_css_selector(c)} { ${v.declaration} }\n`;
		} else if ('ruleset' in v) {
			css += v.ruleset + '\n';
		}
		// Note: Interpreted types are converted to declaration above, so no else clause needed
	}

	return {css, diagnostics};
};
