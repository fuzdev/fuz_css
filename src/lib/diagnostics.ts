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
 * What went wrong, one code per kind of diagnostic - the stable key to match
 * on, where the message is prose that may change. Codes are snake_case and
 * lead with the family of their subject (`file_`, `hint_`, `class_`,
 * `element_`, `variable_`, `base_css_`, `theme_`).
 *
 * Extraction:
 * - `file_parse_failed` - a source file failed to parse, so nothing was extracted from it
 * - `hint_colon` - an `@fuz-*:` comment hint carries an unnecessary colon
 *
 * Classes:
 * - `class_unresolved` - a hinted or listed class that nothing defines, interprets, or (when base styles are bundled) targets
 * - `class_literal_syntax` - a CSS literal without its `property:value` form
 * - `class_property_unknown` - a CSS literal naming a property that doesn't exist
 * - `class_value_uncontained` - a CSS literal value that could end its declaration or rule
 * - `class_calc_spacing` - a `calc()` in a literal value missing the spaces around `+` or `-`
 * - `class_modifier_unknown` - a segment in modifier position that names no modifier
 * - `class_modifier_order` - modifiers out of their required order
 * - `class_modifier_conflict` - two modifiers that can't combine, like two media modifiers
 * - `class_modifier_skipped` - a modifier left off a ruleset rule that already carries it or a pseudo-element
 * - `class_declaration_empty` - a class definition with an empty `declaration`
 * - `class_ruleset_empty` - a class definition with an empty `ruleset`
 * - `class_ruleset_invalid` - a `ruleset` that fails to parse
 * - `class_ruleset_unselected` - a `ruleset` with no selector naming its own class
 * - `class_ruleset_single` - a single-selector `ruleset` that could be a `declaration`
 * - `class_composes_unknown` - a `composes` entry naming no class
 * - `class_composes_cycle` - `composes` entries that reach back to the class being resolved
 * - `class_composes_redundant` - a `composes` entry another entry already includes
 * - `class_composes_modified` - a modified class in `composes`
 * - `class_composes_interpreter` - a `composes` entry naming an interpreter
 * - `class_composes_ruleset` - a `composes` entry naming a ruleset class
 * - `class_interpreter` - reported by a custom interpreter, for what the other codes don't cover
 *
 * Elements:
 * - `element_unstyled` - an included element no base style rule targets
 * - `element_unknown` - a hinted element (`@fuz-elements`) no base style rule targets
 *
 * Variables:
 * - `variable_unknown` - a hinted variable (`@fuz-variables`) that names no theme variable
 * - `variable_misspelled` - a `var()` reference to an undefined name close to a theme variable's
 * - `variable_excluded_referenced` - an excluded variable that shipped styles or variables still reference
 * - `variable_cycle` - a cycle among theme variables' references to each other
 * - `variable_value_uncontained` - a theme or configured variable left out because its value or name could escape its declaration
 *
 * Base styles:
 * - `base_css_variables_undefined` - shipped base styles reference default variables nothing defines
 * - `base_css_layer` - an `@layer` rule of the consumer's own in `base_css`
 * - `base_css_unsupported_at_rule` - an `@import` or `@namespace` in `base_css`
 *
 * Themes:
 * - `theme_discarded` - a configured `theme` with theme output disabled
 * - `theme_lint` - a `validate_theme` issue in the baked theme, at the issue's level
 * - `theme_gate_failed` - the baked theme fails accessibility gates
 * - `theme_gate_unchecked` - the baked theme has gate inputs the checker can't evaluate
 */
export type DiagnosticCode =
	| 'file_parse_failed'
	| 'hint_colon'
	| 'class_unresolved'
	| 'class_literal_syntax'
	| 'class_property_unknown'
	| 'class_value_uncontained'
	| 'class_calc_spacing'
	| 'class_modifier_unknown'
	| 'class_modifier_order'
	| 'class_modifier_conflict'
	| 'class_modifier_skipped'
	| 'class_declaration_empty'
	| 'class_ruleset_empty'
	| 'class_ruleset_invalid'
	| 'class_ruleset_unselected'
	| 'class_ruleset_single'
	| 'class_composes_unknown'
	| 'class_composes_cycle'
	| 'class_composes_redundant'
	| 'class_composes_modified'
	| 'class_composes_interpreter'
	| 'class_composes_ruleset'
	| 'class_interpreter'
	| 'element_unstyled'
	| 'element_unknown'
	| 'variable_unknown'
	| 'variable_misspelled'
	| 'variable_excluded_referenced'
	| 'variable_cycle'
	| 'variable_value_uncontained'
	| 'base_css_variables_undefined'
	| 'base_css_layer'
	| 'base_css_unsupported_at_rule'
	| 'theme_discarded'
	| 'theme_lint'
	| 'theme_gate_failed'
	| 'theme_gate_unchecked';

/**
 * Base diagnostic with common fields.
 */
export interface BaseDiagnostic {
	code: DiagnosticCode;
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
export interface GenerationDiagnostic extends BaseDiagnostic {
	phase: 'generation';
	/**
	 * The subject - a class, element, variable, or theme name. A variable is
	 * named bare, without `--` (as `exclude_variables` takes it), and a
	 * diagnostic about the base stylesheet names its construct (`@layer foo`)
	 * or `base_css`.
	 */
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
export interface InterpreterDiagnostic extends BaseDiagnostic {
	/** The subject - the class name this diagnostic refers to. */
	identifier: string;
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
	code: diagnostic.code,
	level: diagnostic.level,
	message: diagnostic.message,
	identifier: diagnostic.identifier,
	suggestion: diagnostic.suggestion ?? null,
	locations
});

/**
 * Formats a diagnostic for display, as `[code] subject: message (suggestion)`
 * after its first location - an extraction diagnostic has no subject.
 */
export const format_diagnostic = (d: Diagnostic): string => {
	const suggestion = d.suggestion ? ` (${d.suggestion})` : '';
	if (d.phase === 'extraction') {
		return `  - ${d.location.file}:${d.location.line}:${d.location.column}: [${d.code}] ${d.message}${
			suggestion
		}`;
	}
	const loc = d.locations?.[0];
	const location_str = loc ? `${loc.file}:${loc.line}:${loc.column}: ` : '';
	return `  - ${location_str}[${d.code}] ${d.identifier}: ${d.message}${suggestion}`;
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
 * @internal The dispatch the generator core runs - not stable API.
 */
export interface DiagnosticSink {
	warn: (message: string) => void;
	error: (message: string) => void;
}

/**
 * How generation diagnostics are handled - see `CssDiagnosticsOptions`.
 *
 * @internal The dispatch the generator core runs - not stable API.
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
 * @internal The dispatch the generator core runs - not stable API.
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
