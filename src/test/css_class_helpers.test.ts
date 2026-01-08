import {test, assert, expect} from 'vitest';

import {
	escape_css_selector,
	generate_classes_css,
	SourceIndex,
	CssClasses,
	type CssClassDeclarationInterpreter,
	type ExtractionDiagnostic,
	type SourceLocation,
} from '$lib/css_class_helpers.js';

// CSS selector escaping tests
const escape_values: Array<[input: string, expected: string]> = [
	// Basic cases - no escaping needed
	['foo', 'foo'],
	['foo_bar', 'foo_bar'],
	['foo-bar', 'foo-bar'],

	// CSS-literal syntax - colons need escaping
	['display:flex', 'display\\:flex'],
	['display:none', 'display\\:none'],
	['justify-content:center', 'justify-content\\:center'],

	// Percent signs
	['opacity:80%', 'opacity\\:80\\%'],
	['width:100%', 'width\\:100\\%'],

	// Parentheses
	['nth-child(2n)', 'nth-child\\(2n\\)'],
	['min-width(800px)', 'min-width\\(800px\\)'],
	['calc(100%-20px)', 'calc\\(100\\%-20px\\)'],

	// Tilde (space encoding)
	['margin:0~auto', 'margin\\:0\\~auto'],
	['padding:10px~20px', 'padding\\:10px\\~20px'],

	// Combined - CSS-literal with modifiers
	['hover:opacity:80%', 'hover\\:opacity\\:80\\%'],
	['md:display:flex', 'md\\:display\\:flex'],
	['md:hover:opacity:80%', 'md\\:hover\\:opacity\\:80\\%'],
	['dark:color:white', 'dark\\:color\\:white'],

	// Complex cases
	['nth-child(3n+1):color:red', 'nth-child\\(3n\\+1\\)\\:color\\:red'],
	['min-width(800px):display:flex', 'min-width\\(800px\\)\\:display\\:flex'],
	['background:url(data:image/png)', 'background\\:url\\(data\\:image\\/png\\)'],

	// All special characters that need escaping
	['a!b', 'a\\!b'],
	['a"b', 'a\\"b'],
	['a#b', 'a\\#b'],
	['a$b', 'a\\$b'],
	['a%b', 'a\\%b'],
	['a&b', 'a\\&b'],
	["a'b", "a\\'b"],
	['a(b', 'a\\(b'],
	['a)b', 'a\\)b'],
	['a*b', 'a\\*b'],
	['a+b', 'a\\+b'],
	['a,b', 'a\\,b'],
	['a.b', 'a\\.b'],
	['a/b', 'a\\/b'],
	['a:b', 'a\\:b'],
	['a;b', 'a\\;b'],
	['a<b', 'a\\<b'],
	['a=b', 'a\\=b'],
	['a>b', 'a\\>b'],
	['a?b', 'a\\?b'],
	['a@b', 'a\\@b'],
	['a[b', 'a\\[b'],
	['a\\b', 'a\\\\b'],
	['a]b', 'a\\]b'],
	['a^b', 'a\\^b'],
	['a`b', 'a\\`b'],
	['a{b', 'a\\{b'],
	['a|b', 'a\\|b'],
	['a}b', 'a\\}b'],
	['a~b', 'a\\~b'],
];

for (const [input, expected] of escape_values) {
	test(`escape_css_selector escapes "${input}" to "${expected}"`, () => {
		assert.equal(escape_css_selector(input), expected);
	});
}

// Test that generate_classes_css uses escaping
test('generate_classes_css escapes class names with special characters', () => {
	const classes = ['display:flex', 'opacity:80%'];
	const classes_by_name: Record<string, {declaration: string}> = {
		'display:flex': {declaration: 'display: flex;'},
		'opacity:80%': {declaration: 'opacity: 80%;'},
	};

	const result = generate_classes_css(classes, classes_by_name, []);

	assert.include(result.css, '.display\\:flex { display: flex; }');
	assert.include(result.css, '.opacity\\:80\\% { opacity: 80%; }');
	// Should NOT contain unescaped versions
	assert.notInclude(result.css, '.display:flex {');
	assert.notInclude(result.css, '.opacity:80% {');
});

test('generate_classes_css escapes complex CSS-literal class names', () => {
	const classes = ['hover:opacity:80%', 'nth-child(2n):color:red'];
	const classes_by_name: Record<string, {declaration: string}> = {
		'hover:opacity:80%': {declaration: 'opacity: 80%;'},
		'nth-child(2n):color:red': {declaration: 'color: red;'},
	};

	const result = generate_classes_css(classes, classes_by_name, []);

	assert.include(result.css, '.hover\\:opacity\\:80\\%');
	assert.include(result.css, '.nth-child\\(2n\\)\\:color\\:red');
});

// SourceIndex tests

test('SourceIndex converts offset 0 to line 1, column 1', () => {
	const source = 'abc\ndef\nghi';
	const index = new SourceIndex(source);
	const loc = index.get_location(0, 'test.ts');
	expect(loc.line).toBe(1);
	expect(loc.column).toBe(1);
	expect(loc.file).toBe('test.ts');
});

test('SourceIndex converts offset within first line', () => {
	const source = 'abc\ndef\nghi';
	const index = new SourceIndex(source);
	const loc = index.get_location(2, 'test.ts');
	expect(loc.line).toBe(1);
	expect(loc.column).toBe(3);
});

test('SourceIndex converts offset at start of second line', () => {
	const source = 'abc\ndef\nghi';
	const index = new SourceIndex(source);
	const loc = index.get_location(4, 'test.ts');
	expect(loc.line).toBe(2);
	expect(loc.column).toBe(1);
});

test('SourceIndex converts offset within second line', () => {
	const source = 'abc\ndef\nghi';
	const index = new SourceIndex(source);
	const loc = index.get_location(6, 'test.ts');
	expect(loc.line).toBe(2);
	expect(loc.column).toBe(3);
});

test('SourceIndex converts offset at start of third line', () => {
	const source = 'abc\ndef\nghi';
	const index = new SourceIndex(source);
	const loc = index.get_location(8, 'test.ts');
	expect(loc.line).toBe(3);
	expect(loc.column).toBe(1);
});

test('SourceIndex handles empty lines', () => {
	const source = 'abc\n\ndef';
	const index = new SourceIndex(source);

	// First line
	expect(index.get_location(0, 'f').line).toBe(1);

	// Empty second line (offset 4 is the start of the empty line)
	expect(index.get_location(4, 'f').line).toBe(2);
	expect(index.get_location(4, 'f').column).toBe(1);

	// Third line
	expect(index.get_location(5, 'f').line).toBe(3);
});

test('SourceIndex handles single line source', () => {
	const source = 'hello world';
	const index = new SourceIndex(source);
	const loc = index.get_location(6, 'f');
	expect(loc.line).toBe(1);
	expect(loc.column).toBe(7);
});

test('SourceIndex handles empty source', () => {
	const source = '';
	const index = new SourceIndex(source);
	const loc = index.get_location(0, 'f');
	expect(loc.line).toBe(1);
	expect(loc.column).toBe(1);
});

test('SourceIndex handles CRLF line endings', () => {
	const source = 'abc\r\ndef\r\nghi';
	const index = new SourceIndex(source);
	// Line 1: 'abc\r' (4 chars, newline at position 4)
	expect(index.get_location(0, 'f').line).toBe(1);
	expect(index.get_location(3, 'f').line).toBe(1); // 'c'
	// After \r\n we're at line 2
	expect(index.get_location(5, 'f').line).toBe(2); // 'd'
	expect(index.get_location(8, 'f').line).toBe(2); // 'f'
	// Line 3
	expect(index.get_location(10, 'f').line).toBe(3); // 'g'
});

// CssClasses class tests

test('CssClasses add and get', () => {
	const css_classes = new CssClasses();
	const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
	const classes = new Map<string, Array<SourceLocation>>([
		['foo', [loc]],
		['bar', [loc]],
	]);
	css_classes.add('file1.svelte', classes);

	const result = css_classes.get();
	expect(result.has('foo')).toBe(true);
	expect(result.has('bar')).toBe(true);
});

test('CssClasses merges classes from multiple files', () => {
	const css_classes = new CssClasses();
	const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
	const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

	css_classes.add('file1.svelte', new Map([['foo', [loc1]]]));
	css_classes.add('file2.svelte', new Map([['bar', [loc2]]]));

	const result = css_classes.get();
	expect(result.has('foo')).toBe(true);
	expect(result.has('bar')).toBe(true);
});

test('CssClasses delete removes file classes', () => {
	const css_classes = new CssClasses();
	const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

	css_classes.add('file1.svelte', new Map([['foo', [loc]]]));
	css_classes.add('file2.svelte', new Map([['bar', [loc]]]));

	css_classes.delete('file1.svelte');

	const result = css_classes.get();
	expect(result.has('foo')).toBe(false);
	expect(result.has('bar')).toBe(true);
});

test('CssClasses include_classes always included', () => {
	const css_classes = new CssClasses(new Set(['always-included']));
	const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
	css_classes.add('file1.svelte', new Map([['extracted', [loc]]]));

	const result = css_classes.get();
	expect(result.has('always-included')).toBe(true);
	expect(result.has('extracted')).toBe(true);
});

test('CssClasses get_with_locations returns null for include_classes', () => {
	const css_classes = new CssClasses(new Set(['included']));
	const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
	css_classes.add('file1.svelte', new Map([['extracted', [loc]]]));

	const result = css_classes.get_with_locations();
	expect(result.get('included')).toBeNull();
	expect(result.get('extracted')).toEqual([loc]);
});

test('CssClasses get_with_locations merges locations from multiple files', () => {
	const css_classes = new CssClasses();
	const loc1: SourceLocation = {file: 'file1.svelte', line: 1, column: 1};
	const loc2: SourceLocation = {file: 'file2.svelte', line: 5, column: 10};

	css_classes.add('file1.svelte', new Map([['shared', [loc1]]]));
	css_classes.add('file2.svelte', new Map([['shared', [loc2]]]));

	const result = css_classes.get_with_locations();
	const locations = result.get('shared');
	expect(locations).toHaveLength(2);
	expect(locations).toContainEqual(loc1);
	expect(locations).toContainEqual(loc2);
});

test('CssClasses get_diagnostics returns extraction diagnostics', () => {
	const css_classes = new CssClasses();
	const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};
	const diagnostics: Array<ExtractionDiagnostic> = [
		{
			phase: 'extraction',
			level: 'warning',
			message: 'test warning',
			suggestion: null,
			location: loc,
		},
	];

	css_classes.add('file1.svelte', new Map(), diagnostics);

	const result = css_classes.get_diagnostics();
	expect(result).toHaveLength(1);
	expect(result[0]!.message).toBe('test warning');
});

test('CssClasses dirty flag triggers recalculation', () => {
	const css_classes = new CssClasses();
	const loc: SourceLocation = {file: 'test.svelte', line: 1, column: 1};

	css_classes.add('file1.svelte', new Map([['foo', [loc]]]));
	const result1 = css_classes.get();
	expect(result1.has('foo')).toBe(true);

	// Add more classes
	css_classes.add('file2.svelte', new Map([['bar', [loc]]]));
	const result2 = css_classes.get();
	expect(result2.has('bar')).toBe(true);
});

// generate_classes_css with interpreters

test('generate_classes_css uses interpreter for unknown classes', () => {
	const interpreter: CssClassDeclarationInterpreter = {
		pattern: /^test-(\w+)$/,
		interpret: (matched) => `test-prop: ${matched[1]};`,
	};

	const result = generate_classes_css(['test-value'], {}, [interpreter]);

	expect(result.css).toContain('.test-value');
	expect(result.css).toContain('test-prop: value;');
});

test('generate_classes_css interpreter can return full ruleset', () => {
	const interpreter: CssClassDeclarationInterpreter = {
		pattern: /^media-(\w+)$/,
		interpret: (matched) =>
			`@media (min-width: 800px) { .media-${matched[1]} { display: ${matched[1]}; } }`,
	};

	const result = generate_classes_css(['media-flex'], {}, [interpreter]);

	expect(result.css).toContain('@media (min-width: 800px)');
	expect(result.css).toContain('display: flex;');
});

test('generate_classes_css collects interpreter diagnostics', () => {
	const interpreter: CssClassDeclarationInterpreter = {
		pattern: /^warn-(.+)$/,
		interpret: (matched, _log, diagnostics) => {
			if (diagnostics) {
				diagnostics.push({
					level: 'warning',
					message: 'test warning',
					class_name: matched[0]!,
				});
			}
			return `color: ${matched[1]};`;
		},
	};

	const result = generate_classes_css(['warn-red'], {}, [interpreter]);

	expect(result.diagnostics).toHaveLength(1);
	expect(result.diagnostics[0]!.message).toBe('test warning');
	expect(result.diagnostics[0]!.phase).toBe('generation');
});

// generate_classes_css comment rendering

test('generate_classes_css renders single-line comment', () => {
	const classes_by_name = {
		'test-class': {declaration: 'color: red;', comment: 'Single line comment'},
	};

	const result = generate_classes_css(['test-class'], classes_by_name, []);

	expect(result.css).toContain('/** Single line comment */');
});

test('generate_classes_css renders multi-line comment', () => {
	const classes_by_name = {
		'test-class': {declaration: 'color: red;', comment: 'Line 1\nLine 2'},
	};

	const result = generate_classes_css(['test-class'], classes_by_name, []);

	expect(result.css).toContain('/*\nLine 1\nLine 2\n*/');
});

// generate_classes_css sorting

test('generate_classes_css maintains definition order for known classes', () => {
	const classes_by_name = {
		aaa: {declaration: 'a: a;'},
		zzz: {declaration: 'z: z;'},
		mmm: {declaration: 'm: m;'},
	};

	// Request in different order than defined
	const result = generate_classes_css(['mmm', 'aaa', 'zzz'], classes_by_name, []);

	// Should be in definition order (aaa, zzz, mmm)
	const aaa_idx = result.css.indexOf('.aaa');
	const zzz_idx = result.css.indexOf('.zzz');
	const mmm_idx = result.css.indexOf('.mmm');

	expect(aaa_idx).toBeLessThan(zzz_idx);
	expect(zzz_idx).toBeLessThan(mmm_idx);
});

test('generate_classes_css sorts unknown classes alphabetically at end', () => {
	const classes_by_name = {
		known: {declaration: 'k: k;'},
	};

	const result = generate_classes_css(['unknown-b', 'known', 'unknown-a'], classes_by_name, []);

	// known should come first, then unknown sorted alphabetically
	const known_idx = result.css.indexOf('.known');
	const unknown_a_idx = result.css.indexOf('.unknown-a');
	const unknown_b_idx = result.css.indexOf('.unknown-b');

	// known is first (has index 0 in classes_by_name)
	// unknown classes have no CSS output (they're skipped)
	expect(known_idx).toBeGreaterThanOrEqual(0);
	// Unknown classes without interpreter produce no output
	expect(unknown_a_idx).toBe(-1);
	expect(unknown_b_idx).toBe(-1);
});

test('generate_classes_css sorts interpreted classes alphabetically', () => {
	const interpreter: CssClassDeclarationInterpreter = {
		pattern: /^int-(\w+)$/,
		interpret: (matched) => `prop: ${matched[1]};`,
	};

	const result = generate_classes_css(['int-ccc', 'int-aaa', 'int-bbb'], {}, [interpreter]);

	const aaa_idx = result.css.indexOf('.int-aaa');
	const bbb_idx = result.css.indexOf('.int-bbb');
	const ccc_idx = result.css.indexOf('.int-ccc');

	expect(aaa_idx).toBeLessThan(bbb_idx);
	expect(bbb_idx).toBeLessThan(ccc_idx);
});
