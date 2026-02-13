# Refactor: Extraction pipeline API improvements

## Context

The extraction pipeline passes 6 data fields (classes, explicit_classes, diagnostics, elements, explicit_elements, explicit_variables) through 3 layers as positional parameters. `save_cached_extraction` has 9 positional params, `CssClasses.add()` has 7. Three identical `parse_fuz_*_comment` functions exist. `GenerationDiagnostic.class_name` holds element/variable names too. All breaking changes are acceptable in this PR.

## Step 1: Define `ExtractionData` type

**File**: `src/lib/css_class_extractor.ts`

Extract the 6 cacheable fields from `ExtractionResult` into a base interface. `tracked_vars` stays only on `ExtractionResult` (internal to AST walking).

```ts
export interface ExtractionData {
	classes: Map<string, Array<SourceLocation>> | null;
	explicit_classes: Set<string> | null;
	diagnostics: Array<ExtractionDiagnostic> | null;
	elements: Set<string> | null;
	explicit_elements: Set<string> | null;
	explicit_variables: Set<string> | null;
}

export interface ExtractionResult extends ExtractionData {
	tracked_vars: Set<string> | null;
}
```

Also update `FileExtraction` in `src/lib/gen_fuz_css.ts`:

```ts
interface FileExtraction extends ExtractionData {
	id: string;
	cache_path: string | null;
	content_hash: string;
}
```

Purely additive — no callers break.

## Step 2: Deduplicate `parse_fuz_*_comment` functions

**File**: `src/lib/css_class_extractor.ts` (lines 320-406)

Three identical functions differ only in tag name and message text. Replace with factory:

```ts
const create_fuz_comment_parser = (
	tag: string,
): ((
	content: string,
	location: SourceLocation,
	diagnostics: Array<ExtractionDiagnostic>,
) => Array<string> | null) => {
	const pattern = new RegExp(`^\\s*@fuz-${tag}(:?)\\s+(.+?)\\s*$`);
	return (content, location, diagnostics) => {
		const match = pattern.exec(content);
		if (!match) return null;
		if (match[1] === ':') {
			diagnostics.push({
				phase: 'extraction',
				level: 'warning',
				message: `@fuz-${tag}: colon is unnecessary`,
				suggestion: `Use @fuz-${tag} without the colon`,
				location,
			});
		}
		return match[2]!.split(/\s+/).filter(Boolean);
	};
};

const parse_fuz_classes_comment = create_fuz_comment_parser('classes');
const parse_fuz_elements_comment = create_fuz_comment_parser('elements');
const parse_fuz_variables_comment = create_fuz_comment_parser('variables');
```

`process_fuz_comment` unchanged. Internal only — no API changes. Existing tests pass.

## Step 3: `from_cached_extraction` returns `ExtractionData`

**File**: `src/lib/css_cache.ts`

Replace inline return type with `ExtractionData`. Import from `css_class_extractor.ts`. Body unchanged.

```ts
export const from_cached_extraction = (cached: CachedExtraction): ExtractionData => ({...});
```

Low risk — same fields, just a named type.

## Step 4: `save_cached_extraction` takes `ExtractionData`

**File**: `src/lib/css_cache.ts`

Change from 9 positional params to 4:

```ts
export const save_cached_extraction = async (
	ops: CacheOperations,
	cache_path: string,
	content_hash: string,
	data: ExtractionData,
): Promise<void> => {
	const classes_array = data.classes && data.classes.size > 0 ? Array.from(data.classes.entries()) : null;
	// ... same conversion logic, reading from data.*
};
```

**Callers to update:**
- `src/lib/gen_fuz_css.ts` (~line 380) — `FileExtraction extends ExtractionData`, so pass it directly: `save_cached_extraction(ops, cache_path, content_hash, extraction)`
- `src/lib/vite_plugin_fuz_css.ts` (~line 611) — pass `result` (ExtractionResult extends ExtractionData)
- `src/test/css_cache.test.ts` — update `save_and_load` helper to pass data object, update ~3 direct call sites from 9 positional nulls to `{classes: null, explicit_classes: null, ...}` or a helper

## Step 5: `CssClasses.add()` takes `Partial<ExtractionData>`

**File**: `src/lib/css_classes.ts`

```ts
add(id: string, data: Partial<ExtractionData>): void {
	this.#dirty = true;
	if (data.classes) { this.#by_id.set(id, data.classes); }
	else { this.#by_id.delete(id); }
	// ... same for other fields
}
```

`Partial` lets tests pass just `{classes: map}` without null padding. `undefined` and `null` are both falsy, so existing truthiness checks work.

**Callers to update:**
- `src/lib/gen_fuz_css.ts` (~line 346) — pass extraction object directly
- `src/lib/vite_plugin_fuz_css.ts` (2 sites) — pass `from_cached_extraction(cached)` or `result` directly
- `src/test/css_classes.test.ts` — ~25 call sites. Patterns:
  - `add('f', map)` → `add('f', {classes: map})`
  - `add('f', map, explicit)` → `add('f', {classes: map, explicit_classes: explicit})`
  - `add('f', map, null, null, null, null, vars)` → `add('f', {classes: map, explicit_variables: vars})`

## Step 6: Rename `class_name` → `identifier` in diagnostics

**Files** (interface field rename + all property access/creation sites):

### `src/lib/diagnostics.ts`
- `GenerationDiagnostic.class_name` → `identifier` (+ update JSDoc comment)
- `InterpreterDiagnostic.class_name` → `identifier`
- `create_generation_diagnostic`: `class_name: diagnostic.class_name` → `identifier: diagnostic.identifier`
- `format_diagnostic`: `d.class_name` → `d.identifier`

### `src/lib/css_bundled_resolution.ts`
- 5 sites creating `GenerationDiagnostic` with `class_name:` → `identifier:`

### `src/lib/css_class_generation.ts`
- `diag.class_name` reads (~line 231-232) → `diag.identifier`
- Diagnostic creation sites with `class_name:` → `identifier:`

### `src/lib/css_class_interpreters.ts`
- Lines 125, 132: `class_name` → `identifier` (property key only, the `class_name` local variable stays)

### `src/lib/css_class_resolution.ts`
- ~10 sites creating `InterpreterDiagnostic` with `class_name:` → `identifier:`
- Note: `original_class_name` and `class_name` as function params/locals are NOT renamed

### `src/lib/css_literal.ts`
- `ParsedCssLiteral.class_name` — **NOT renamed** (this is the CSS class name, semantically correct)
- Lines 707, 730: `class_name: context_class_name` → `identifier: context_class_name` (InterpreterDiagnostic creation)
- All function params named `class_name` — **NOT renamed** (they hold CSS class names)

### `src/lib/vite_plugin_fuz_css.ts`
- Lines 330, 343: `d.class_name` → `d.identifier`

### Tests
- `css_class_resolution.test.ts`: ~5 sites `.class_name` → `.identifier`
- `modified_class_interpreter.test.ts`: ~3 sites `d.class_name` → `d.identifier`
- `explicit_classes.test.ts`: ~1 site `.class_name` → `.identifier`
- `diagnostics.test.ts`: ~11 sites `.class_name` → `.identifier`

### NOT renamed (different semantics — these hold actual CSS class names):
- `ParsedCssLiteral.class_name` in css_literal.ts
- Function params (`class_name`, `escaped_class_name`, `original_class_name`, `context_class_name`, `base_class_name`)
- `state.class_name_vars` in css_class_extractor.ts
- Anything in css_ruleset_parser.ts

TypeScript will enforce correctness after renaming the two interface fields.

## Verification

After each step, run `gro typecheck` for fast iteration. After all steps:

```bash
SKIP_EXAMPLE_TESTS=1 gro check
```

No cache version bump needed — `CachedExtraction` format is unchanged.

## Continuation prompt

> Implement the refactoring plan in TODO_REFACTOR.md on the `refactor` branch in fuz_css. 6 steps:
>
> 1. Define `ExtractionData` interface (ExtractionResult minus tracked_vars), make ExtractionResult extend it, update FileExtraction in gen_fuz_css.ts
> 2. Deduplicate 3 identical `parse_fuz_*_comment` functions into a `create_fuz_comment_parser` factory
> 3. `from_cached_extraction` return type → `ExtractionData`
> 4. `save_cached_extraction` takes `(ops, cache_path, content_hash, data: ExtractionData)` instead of 9 positional params
> 5. `CssClasses.add()` takes `(id, data: Partial<ExtractionData>)` instead of 7 positional params
> 6. Rename `GenerationDiagnostic.class_name` and `InterpreterDiagnostic.class_name` → `identifier` (NOT renaming `ParsedCssLiteral.class_name` or local variables — those hold actual CSS class names)
>
> Pure refactor, no behavioral changes. Run `gro typecheck` between steps, verify with `SKIP_EXAMPLE_TESTS=1 gro check` at the end.
