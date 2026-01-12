/**
 * CSS class resolution utilities for composing class definitions.
 *
 * Provides the `resolve_classes` helper to recursively resolve class names
 * to their combined CSS declarations.
 *
 * @module
 */

import type {InterpreterDiagnostic} from './diagnostics.js';
import type {CssClassDefinition, CssClassDefinitionStatic} from './css_class_generation.js';

/**
 * Result from resolving a `classes` array to combined declarations.
 */
export type ResolveClassesResult =
	| {ok: true; declaration: string; warnings: Array<InterpreterDiagnostic> | null}
	| {ok: false; error: InterpreterDiagnostic};

/**
 * Resolves a class definition's declaration, handling `classes` composition.
 *
 * If the definition has a `classes` property, resolves those classes recursively
 * and combines with any explicit `declaration`. If no `classes`, returns the
 * explicit `declaration` directly.
 *
 * @param def - The class definition to resolve
 * @param class_name - The name of the class being resolved (for error messages)
 * @param definitions - Record of all known class definitions
 * @returns Combined declaration or an error
 */
export const resolve_class_definition = (
	def: CssClassDefinitionStatic,
	class_name: string,
	definitions: Record<string, CssClassDefinition | undefined>,
): ResolveClassesResult => {
	let warnings: Array<InterpreterDiagnostic> | null = null;

	// Handle classes-based definitions
	if ('classes' in def && def.classes) {
		const result = resolve_classes(
			def.classes,
			definitions,
			new Set([class_name]),
			new Set(),
			class_name,
		);
		if (!result.ok) return result;

		// Combine resolved declarations with explicit declaration (if present)
		let combined = result.declaration;
		if ('declaration' in def) {
			const trimmed = def.declaration?.trim();
			if (trimmed) {
				combined = combined ? `${combined} ${trimmed}` : trimmed;
			} else if (def.declaration !== undefined) {
				// Warn about empty declaration
				warnings = result.warnings ? [...result.warnings] : [];
				warnings.push({
					level: 'warning',
					class_name,
					message: `Class "${class_name}" has an empty declaration`,
					suggestion: 'Remove the empty declaration property or add CSS',
				});
			}
		}
		if (!warnings && result.warnings) {
			warnings = result.warnings;
		}
		return {ok: true, declaration: combined, warnings};
	}

	// Handle declaration-only definitions
	if ('declaration' in def) {
		const trimmed = def.declaration?.trim();
		if (!trimmed && def.declaration !== undefined) {
			warnings = [
				{
					level: 'warning',
					class_name,
					message: `Class "${class_name}" has an empty declaration`,
					suggestion: 'Remove the empty declaration property or add CSS',
				},
			];
		}
		return {ok: true, declaration: trimmed ?? '', warnings};
	}

	// Ruleset definitions don't have a single declaration
	return {ok: true, declaration: '', warnings: null};
};

/**
 * Resolves an array of class names to their combined CSS declarations.
 *
 * Recursively resolves nested `classes` arrays and combines all declarations.
 * Validates that referenced classes exist and are resolvable (not rulesets or interpreters).
 *
 * Deduplication behavior:
 * - Diamond dependencies (class reached via different composition branches) are silently skipped
 * - Redundant listings (class already included by an earlier sibling in this array) emit a warning
 *
 * @param class_names - Array of class names to resolve
 * @param definitions - Record of all known class definitions
 * @param resolution_stack - Set of class names currently being resolved (for cycle detection)
 * @param visited - Set of all class names already resolved (for deduplication)
 * @param original_class_name - The class name being defined (for error messages)
 * @returns Combined declarations or an error
 */
export const resolve_classes = (
	class_names: Array<string>,
	definitions: Record<string, CssClassDefinition | undefined>,
	resolution_stack: Set<string>,
	visited: Set<string>,
	original_class_name: string,
): ResolveClassesResult => {
	const declarations: Array<string> = [];
	let warnings: Array<InterpreterDiagnostic> | null = null;

	// Snapshot of visited at start - classes added during this array's processing are redundant
	const visited_at_start: ReadonlySet<string> = new Set(visited);

	for (const name of class_names) {
		// Cycle detection (current path)
		if (resolution_stack.has(name)) {
			const cycle_path = [...resolution_stack, name].join(' → ');
			return {
				ok: false,
				error: {
					level: 'error',
					class_name: original_class_name,
					message: `Circular reference detected: ${cycle_path}`,
					suggestion: null,
				},
			};
		}

		// Deduplication - skip if already resolved
		if (visited.has(name)) {
			// Warn if redundant (added during this array's processing), not diamond (was already there)
			if (!visited_at_start.has(name)) {
				warnings ??= [];
				warnings.push({
					level: 'warning',
					class_name: original_class_name,
					message: `Class "${name}" is redundant`,
					suggestion: 'Already included by another class in this definition',
				});
			}
			continue;
		}

		const def = definitions[name];
		if (!def) {
			return {
				ok: false,
				error: {
					level: 'error',
					class_name: original_class_name,
					message: `Unknown class "${name}" in classes array`,
					suggestion: `Check that "${name}" is defined in class_definitions`,
				},
			};
		}

		// Only static definitions allowed (not interpreters)
		if ('pattern' in def) {
			return {
				ok: false,
				error: {
					level: 'error',
					class_name: original_class_name,
					message: `Cannot reference interpreter pattern "${name}" in classes array`,
					suggestion: 'Only static class definitions can be referenced',
				},
			};
		}

		// Ruleset not allowed in classes
		if ('ruleset' in def && def.ruleset) {
			return {
				ok: false,
				error: {
					level: 'error',
					class_name: original_class_name,
					message: `Cannot reference ruleset class "${name}" in classes array`,
					suggestion: 'Ruleset classes have multiple selectors and cannot be inlined',
				},
			};
		}

		// Mark as visited before processing (for deduplication)
		visited.add(name);

		// Recursive resolution for nested classes
		if ('classes' in def && def.classes) {
			resolution_stack.add(name);
			const nested = resolve_classes(
				def.classes,
				definitions,
				resolution_stack,
				visited,
				original_class_name,
			);
			resolution_stack.delete(name);
			if (!nested.ok) return nested; // Propagate error
			if (nested.declaration) {
				declarations.push(nested.declaration);
			}
			if (nested.warnings) {
				warnings ??= [];
				warnings.push(...nested.warnings);
			}
		}

		// Add the declaration if present (trimmed)
		if ('declaration' in def) {
			const trimmed = def.declaration?.trim();
			if (trimmed) {
				declarations.push(trimmed);
			} else if (def.declaration !== undefined) {
				// Warn about empty declaration
				warnings ??= [];
				warnings.push({
					level: 'warning',
					class_name: name,
					message: `Class "${name}" has an empty declaration`,
					suggestion: 'Remove the empty declaration property or add CSS',
				});
			}
		}
	}

	return {ok: true, declaration: declarations.join(' '), warnings};
};
