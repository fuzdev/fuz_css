/**
 * Diagnostic types for CSS class extraction and generation.
 *
 * Provides a unified diagnostic system across all phases:
 * - Extraction: Parsing source files to find class names
 * - Generation: Producing CSS output from class definitions
 *
 * @module
 */

//
// Source Location
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

//
// Diagnostic Types
//

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
 * Diagnostic from the generation phase.
 */
export interface GenerationDiagnostic {
	phase: 'generation';
	level: 'error' | 'warning';
	message: string;
	suggestion: string | null;
	class_name: string;
	/** Source locations where this class was used, or null if from include_classes */
	locations: Array<SourceLocation> | null;
}

/**
 * Union of all diagnostic types.
 */
export type Diagnostic = ExtractionDiagnostic | GenerationDiagnostic;

/**
 * Diagnostic from CSS class interpretation.
 * Used internally by interpreters; converted to GenerationDiagnostic with locations.
 */
export interface CssClassDiagnostic {
	level: 'error' | 'warning';
	message: string;
	class_name: string;
	suggestion: string | null;
}

//
// Diagnostic Utilities
//

/**
 * Converts a CssClassDiagnostic to a GenerationDiagnostic with locations.
 *
 * @param diagnostic - Interpreter diagnostic to convert
 * @param locations - Source locations where the class was used
 */
export const create_generation_diagnostic = (
	diagnostic: CssClassDiagnostic,
	locations: Array<SourceLocation> | null,
): GenerationDiagnostic => ({
	phase: 'generation',
	level: diagnostic.level,
	message: diagnostic.message,
	class_name: diagnostic.class_name,
	suggestion: diagnostic.suggestion ?? null,
	locations,
});
