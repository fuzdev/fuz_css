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
	/** The class name, element name, or variable name this diagnostic refers to */
	identifier: string;
	/** Source locations where this class was used, or null if from `additional_classes` */
	locations: Array<SourceLocation> | null;
}

/**
 * Union of all diagnostic types.
 */
export type Diagnostic = ExtractionDiagnostic | GenerationDiagnostic;

/**
 * Diagnostic from CSS class interpretation.
 * Used internally by interpreters; converted to `GenerationDiagnostic` with locations.
 */
export interface InterpreterDiagnostic {
	level: 'error' | 'warning';
	message: string;
	/** The class name, element name, or variable name this diagnostic refers to */
	identifier: string;
	suggestion: string | null;
}

//
// Diagnostic Utilities
//

/**
 * Converts an `InterpreterDiagnostic` to a `GenerationDiagnostic` with locations.
 *
 * @param diagnostic - interpreter diagnostic to convert
 * @param locations - source locations where the class was used
 */
export const create_generation_diagnostic = (
	diagnostic: InterpreterDiagnostic,
	locations: Array<SourceLocation> | null
): GenerationDiagnostic => ({
	phase: 'generation',
	level: diagnostic.level,
	message: diagnostic.message,
	identifier: diagnostic.identifier,
	suggestion: diagnostic.suggestion ?? null,
	locations
});

/**
 * Formats a diagnostic for display.
 */
export const format_diagnostic = (d: Diagnostic): string => {
	const suggestion = d.suggestion ? ` (${d.suggestion})` : '';
	if (d.phase === 'extraction') {
		return `  - ${d.location.file}:${d.location.line}:${d.location.column}: ${d.message}${
			suggestion
		}`;
	}
	const loc = d.locations?.[0];
	const location_str = loc ? `${loc.file}:${loc.line}:${loc.column}: ` : '';
	return `  - ${location_str}${d.identifier}: ${d.message}${suggestion}`;
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

/**
 * Where a dispatcher writes the diagnostics it logs.
 *
 * @internal The dispatch the generators share - not stable API.
 */
export interface DiagnosticSink {
	warn: (message: string) => void;
	error: (message: string) => void;
}

/**
 * How generation diagnostics are handled - see `CssDiagnosticsOptions`.
 *
 * @internal The dispatch the generators share - not stable API.
 */
export interface DiagnosticDispatchOptions {
	on_error: 'log' | 'throw';
	on_warning: 'log' | 'throw' | 'ignore';
}

/**
 * Creates the diagnostic dispatch a generator runs after each render: a
 * diagnostic level set to `'throw'` fails the render with a
 * `CssGenerationError`, and the rest are logged to `sink` - except that a
 * message the previous dispatch already logged isn't logged again.
 *
 * A render reports every file's diagnostics, so a dev server or watch mode
 * re-rendering on each edit would otherwise repeat every warning in the
 * project on every change. A diagnostic that goes away and comes back is
 * logged again.
 *
 * @param options - the `on_error`/`on_warning` settings
 * @param sink - where logged diagnostics go
 * @returns the dispatch, to call with each render's diagnostics
 * @throws CssGenerationError - from the returned dispatch, for a level set to `'throw'`
 *
 * @internal The dispatch the generators share - not stable API.
 */
export const create_diagnostic_dispatcher = (
	options: DiagnosticDispatchOptions,
	sink: DiagnosticSink
): ((diagnostics: Array<Diagnostic>) => void) => {
	const { on_error, on_warning } = options;
	let logged: Set<string> = new Set();
	return (diagnostics) => {
		const errors = diagnostics.filter((d) => d.level === 'error');
		const warnings = diagnostics.filter((d) => d.level === 'warning');
		if (warnings.length > 0 && on_warning === 'throw') throw new CssGenerationError(warnings);
		const next_logged: Set<string> = new Set();
		const log = (d: Diagnostic, write: (message: string) => void): void => {
			const message = format_diagnostic(d);
			next_logged.add(message);
			if (!logged.has(message)) write(message);
		};
		// warnings are logged before errors throw, so a failing render still shows them
		if (on_warning === 'log') for (const w of warnings) log(w, sink.warn);
		if (errors.length > 0 && on_error === 'throw') {
			logged = next_logged;
			throw new CssGenerationError(errors);
		}
		for (const e of errors) log(e, sink.error);
		logged = next_logged;
	};
};
