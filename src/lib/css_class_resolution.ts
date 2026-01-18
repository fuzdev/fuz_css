/**
 * CSS class resolution utilities for composing class definitions.
 *
 * Provides the `resolve_composes` helper to recursively resolve class names
 * to their combined CSS declarations.
 *
 * @module
 */

import type {InterpreterDiagnostic} from './diagnostics.js';
import type {CssClassDefinition, CssClassDefinitionStatic} from './css_class_generation.js';
import {
	try_resolve_literal,
	extract_segments,
	extract_and_validate_modifiers,
	has_extracted_modifiers,
} from './css_literal.js';

/**
 * Result from resolving a `composes` array to combined declarations.
 */
export type ResolveComposesResult =
	| {ok: true; declaration: string; warnings: Array<InterpreterDiagnostic> | null}
	| {ok: false; error: InterpreterDiagnostic};

/**
 * Resolves a class definition's declaration, handling `composes` composition.
 *
 * If the definition has a `composes` property, resolves those classes recursively
 * and combines with any explicit `declaration`. If no `composes`, returns the
 * explicit `declaration` directly.
 *
 * @param def - The class definition to resolve
 * @param class_name - The name of the class being resolved (for error messages)
 * @param definitions - Record of all known class definitions
 * @param css_properties - Set of valid CSS properties for literal validation, or null to skip
 * @returns Combined declaration or an error
 */
export const resolve_class_definition = (
	def: CssClassDefinitionStatic,
	class_name: string,
	definitions: Record<string, CssClassDefinition | undefined>,
	css_properties: Set<string> | null = null,
): ResolveComposesResult => {
	let warnings: Array<InterpreterDiagnostic> | null = null;

	// Handle composes-based definitions
	if ('composes' in def && def.composes) {
		const result = resolve_composes(
			def.composes,
			definitions,
			new Set([class_name]),
			new Set(),
			class_name,
			css_properties,
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
 * Recursively resolves nested `composes` arrays and combines all declarations.
 * Validates that referenced classes exist and are resolvable (not rulesets or interpreters).
 * Supports unmodified CSS literals (e.g., `text-align:center`) in the composes array.
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
 * @param css_properties - Set of valid CSS properties for literal validation, or null to skip
 * @returns Combined declarations or an error
 * @mutates resolution_stack - Temporarily adds/removes names during recursion
 * @mutates visited - Adds resolved class names for deduplication
 */
export const resolve_composes = (
	class_names: Array<string>,
	definitions: Record<string, CssClassDefinition | undefined>,
	resolution_stack: Set<string>,
	visited: Set<string>,
	original_class_name: string,
	css_properties: Set<string> | null = null,
): ResolveComposesResult => {
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
					suggestion: 'Remove the circular dependency from composes arrays',
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
			// Check if this looks like a modified class (hover:box, md:p_lg)
			const segments = extract_segments(name);
			if (segments.length >= 2) {
				const mod_result = extract_and_validate_modifiers(segments, name);
				if (
					mod_result.ok &&
					mod_result.remaining.length === 1 &&
					has_extracted_modifiers(mod_result.modifiers)
				) {
					const base_name = mod_result.remaining[0]!;
					const base_def = definitions[base_name];
					if (base_def) {
						// Modified existing class - can't compose
						return {
							ok: false,
							error: {
								level: 'error',
								class_name: original_class_name,
								message: `Modified class "${name}" cannot be used in composes array`,
								suggestion: 'Apply modified classes directly in markup, not in composes arrays',
							},
						};
					} else {
						// Looks like modifier:unknown - report the unknown base
						return {
							ok: false,
							error: {
								level: 'error',
								class_name: original_class_name,
								message: `Unknown class "${base_name}" in composes array`,
								suggestion: `Check that "${base_name}" is defined in class_definitions`,
							},
						};
					}
				}
			}

			// Try parsing as CSS literal
			const literal_result = try_resolve_literal(name, css_properties, original_class_name);
			if (literal_result.ok) {
				visited.add(name);
				declarations.push(literal_result.declaration);
				if (literal_result.warnings) {
					warnings ??= [];
					warnings.push(...literal_result.warnings);
				}
				continue;
			}
			// If literal parsing returned an error, use it
			if (literal_result.error) {
				return {ok: false, error: literal_result.error};
			}
			// Not a literal - fall through to original "unknown class" error
			return {
				ok: false,
				error: {
					level: 'error',
					class_name: original_class_name,
					message: `Unknown class "${name}" in composes array`,
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
					message: `Cannot reference interpreter pattern "${name}" in composes array`,
					suggestion: 'Only static class definitions can be referenced',
				},
			};
		}

		// Ruleset not allowed in composes
		if ('ruleset' in def && def.ruleset) {
			return {
				ok: false,
				error: {
					level: 'error',
					class_name: original_class_name,
					message: `Cannot reference ruleset class "${name}" in composes array`,
					suggestion: 'Ruleset classes have multiple selectors and cannot be inlined',
				},
			};
		}

		// Mark as visited before processing (for deduplication)
		visited.add(name);

		// Recursive resolution for nested composes
		if ('composes' in def && def.composes) {
			resolution_stack.add(name);
			const nested = resolve_composes(
				def.composes,
				definitions,
				resolution_stack,
				visited,
				original_class_name,
				css_properties,
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
