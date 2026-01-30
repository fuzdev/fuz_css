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
	/** Source locations where this class was used, or null if from additional_classes */
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
export interface InterpreterDiagnostic {
	level: 'error' | 'warning';
	message: string;
	class_name: string;
	suggestion: string | null;
}

//
// Diagnostic Utilities
//

/**
 * Converts a InterpreterDiagnostic to a GenerationDiagnostic with locations.
 *
 * @param diagnostic - Interpreter diagnostic to convert
 * @param locations - Source locations where the class was used
 */
export const create_generation_diagnostic = (
	diagnostic: InterpreterDiagnostic,
	locations: Array<SourceLocation> | null,
): GenerationDiagnostic => ({
	phase: 'generation',
	level: diagnostic.level,
	message: diagnostic.message,
	class_name: diagnostic.class_name,
	suggestion: diagnostic.suggestion ?? null,
	locations,
});

/**
 * Formats a diagnostic for display.
 */
export const format_diagnostic = (d: Diagnostic): string => {
	const suggestion = d.suggestion ? ` (${d.suggestion})` : '';
	if (d.phase === 'extraction') {
		return `  - ${d.location.file}:${d.location.line}:${d.location.column}: ${d.message}${suggestion}`;
	}
	const loc = d.locations?.[0];
	const location_str = loc ? `${loc.file}:${loc.line}:${loc.column}: ` : '';
	return `  - ${location_str}${d.class_name}: ${d.message}${suggestion}`;
};

/**
 * Error thrown when CSS generation encounters errors or warnings
 * (depending on `on_error` and `on_warning` settings).
 * Contains the full diagnostics array for programmatic access.
 */
export class CssGenerationError extends Error {
	diagnostics: Array<Diagnostic>;

	constructor(diagnostics: Array<Diagnostic>) {
		const errors = diagnostics.filter((d) => d.level === 'error');
		const warnings = diagnostics.filter((d) => d.level === 'warning');

		const parts: Array<string> = [];
		if (errors.length > 0) {
			parts.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
		}
		if (warnings.length > 0) {
			parts.push(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
		}

		const summary = parts.length > 0 ? parts.join(' and ') : '0 issues';
		const formatted = diagnostics.map(format_diagnostic).join('\n');
		const message = `CSS generation failed with ${summary}:\n${formatted}`;

		super(message);
		this.name = 'CssGenerationError';
		this.diagnostics = diagnostics;
	}
}
