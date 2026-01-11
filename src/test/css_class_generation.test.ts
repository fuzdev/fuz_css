import {test, assert, expect} from 'vitest';

import {
	SourceIndex,
	type ExtractionDiagnostic,
	type SourceLocation,
} from '$lib/css_class_extractor.js';
import {
	escape_css_selector,
	generate_classes_css,
	CssClasses,
	type CssClassDefinitionInterpreter,
} from '$lib/css_class_generation.js';
import {modified_class_interpreter} from '$lib/css_class_interpreters.js';
import {token_classes} from '$lib/css_classes.js';
import {css_class_composites} from '$lib/css_class_composites.js';

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
	const class_names = ['display:flex', 'opacity:80%'];
	const class_definitions: Record<string, {declaration: string}> = {
		'display:flex': {declaration: 'display: flex;'},
		'opacity:80%': {declaration: 'opacity: 80%;'},
	};

	const result = generate_classes_css({
		class_names,
		class_definitions,
		interpreters: [],
		css_properties: null,
	});

	assert.include(result.css, '.display\\:flex { display: flex; }');
	assert.include(result.css, '.opacity\\:80\\% { opacity: 80%; }');
	// Should NOT contain unescaped versions
	assert.notInclude(result.css, '.display:flex {');
	assert.notInclude(result.css, '.opacity:80% {');
});

test('generate_classes_css escapes complex CSS-literal class names', () => {
	const class_names = ['hover:opacity:80%', 'nth-child(2n):color:red'];
	const class_definitions: Record<string, {declaration: string}> = {
		'hover:opacity:80%': {declaration: 'opacity: 80%;'},
		'nth-child(2n):color:red': {declaration: 'color: red;'},
	};

	const result = generate_classes_css({
		class_names,
		class_definitions,
		interpreters: [],
		css_properties: null,
	});

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
	const classes: Map<string, Array<SourceLocation>> = new Map([
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
	const interpreter: CssClassDefinitionInterpreter = {
		pattern: /^test-(\w+)$/,
		interpret: (matched) => `test-prop: ${matched[1]};`,
	};

	const result = generate_classes_css({
		class_names: ['test-value'],
		class_definitions: {},
		interpreters: [interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.test-value');
	expect(result.css).toContain('test-prop: value;');
});

test('generate_classes_css interpreter can return full ruleset', () => {
	const interpreter: CssClassDefinitionInterpreter = {
		pattern: /^media-(\w+)$/,
		interpret: (matched) =>
			`@media (min-width: 800px) { .media-${matched[1]} { display: ${matched[1]}; } }`,
	};

	const result = generate_classes_css({
		class_names: ['media-flex'],
		class_definitions: {},
		interpreters: [interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('@media (min-width: 800px)');
	expect(result.css).toContain('display: flex;');
});

test('generate_classes_css collects interpreter diagnostics', () => {
	const interpreter: CssClassDefinitionInterpreter = {
		pattern: /^warn-(.+)$/,
		interpret: (matched, ctx) => {
			ctx.diagnostics.push({
				level: 'warning',
				message: 'test warning',
				class_name: matched[0],
				suggestion: null,
			});
			return `color: ${matched[1]};`;
		},
	};

	const result = generate_classes_css({
		class_names: ['warn-red'],
		class_definitions: {},
		interpreters: [interpreter],
		css_properties: null,
	});

	expect(result.diagnostics).toHaveLength(1);
	expect(result.diagnostics[0]!.message).toBe('test warning');
	expect(result.diagnostics[0]!.phase).toBe('generation');
});

// generate_classes_css comment rendering

test('generate_classes_css renders single-line comment', () => {
	const class_definitions = {
		'test-class': {declaration: 'color: red;', comment: 'Single line comment'},
	};

	const result = generate_classes_css({
		class_names: ['test-class'],
		class_definitions,
		interpreters: [],
		css_properties: null,
	});

	expect(result.css).toContain('/* Single line comment */');
});

test('generate_classes_css renders multi-line comment as block', () => {
	const class_definitions = {
		'test-class': {declaration: 'color: red;', comment: 'Line 1\nLine 2'},
	};

	const result = generate_classes_css({
		class_names: ['test-class'],
		class_definitions,
		interpreters: [],
		css_properties: null,
	});

	expect(result.css).toContain('/*\nLine 1\nLine 2\n*/');
});

// generate_classes_css sorting

test('generate_classes_css maintains definition order for known classes', () => {
	const class_definitions = {
		aaa: {declaration: 'a: a;'},
		zzz: {declaration: 'z: z;'},
		mmm: {declaration: 'm: m;'},
	};

	// Request in different order than defined
	const result = generate_classes_css({
		class_names: ['mmm', 'aaa', 'zzz'],
		class_definitions,
		interpreters: [],
		css_properties: null,
	});

	// Should be in definition order (aaa, zzz, mmm)
	const aaa_idx = result.css.indexOf('.aaa');
	const zzz_idx = result.css.indexOf('.zzz');
	const mmm_idx = result.css.indexOf('.mmm');

	expect(aaa_idx).toBeLessThan(zzz_idx);
	expect(zzz_idx).toBeLessThan(mmm_idx);
});

test('generate_classes_css sorts unknown classes alphabetically at end', () => {
	const class_definitions = {
		known: {declaration: 'k: k;'},
	};

	const result = generate_classes_css({
		class_names: ['unknown-b', 'known', 'unknown-a'],
		class_definitions,
		interpreters: [],
		css_properties: null,
	});

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
	const interpreter: CssClassDefinitionInterpreter = {
		pattern: /^int-(\w+)$/,
		interpret: (matched) => `prop: ${matched[1]};`,
	};

	const result = generate_classes_css({
		class_names: ['int-ccc', 'int-aaa', 'int-bbb'],
		class_definitions: {},
		interpreters: [interpreter],
		css_properties: null,
	});

	const aaa_idx = result.css.indexOf('.int-aaa');
	const bbb_idx = result.css.indexOf('.int-bbb');
	const ccc_idx = result.css.indexOf('.int-ccc');

	expect(aaa_idx).toBeLessThan(bbb_idx);
	expect(bbb_idx).toBeLessThan(ccc_idx);
});

// modified_class_interpreter tests

test('modified_class_interpreter generates CSS for hover:box', () => {
	const result = generate_classes_css({
		class_names: ['hover:box'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.hover\\:box:hover');
	expect(result.css).toContain('display: flex');
	expect(result.css).toContain('flex-direction: column');
});

test('modified_class_interpreter generates CSS for md:box with media query', () => {
	const result = generate_classes_css({
		class_names: ['md:box'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('@media (width >= 48rem)');
	expect(result.css).toContain('.md\\:box');
	expect(result.css).toContain('display: flex');
});

test('modified_class_interpreter generates CSS for dark:panel with ancestor wrapper', () => {
	const result = generate_classes_css({
		class_names: ['dark:panel'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain(':root.dark');
	expect(result.css).toContain('.dark\\:panel');
	expect(result.css).toContain('border-radius');
});

test('modified_class_interpreter handles multiple modifiers md:dark:hover:box', () => {
	const result = generate_classes_css({
		class_names: ['md:dark:hover:box'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('@media (width >= 48rem)');
	expect(result.css).toContain(':root.dark');
	expect(result.css).toContain('.md\\:dark\\:hover\\:box:hover');
});

test('modified_class_interpreter handles token class with modifiers hover:p_md', () => {
	const result = generate_classes_css({
		class_names: ['hover:p_md'],
		class_definitions: token_classes,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.hover\\:p_md:hover');
	expect(result.css).toContain('padding');
});

test('modified_class_interpreter returns null for unknown base class', () => {
	const result = generate_classes_css({
		class_names: ['hover:unknown_class'],
		class_definitions: {},
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Should produce no output for unknown class
	expect(result.css).not.toContain('hover:unknown_class');
});

test('modified_class_interpreter returns null for class without modifiers', () => {
	// 'box' without modifiers should not be handled by modified_class_interpreter
	// (it should be handled as a regular known class)
	const result = generate_classes_css({
		class_names: ['box'],
		class_definitions: {},
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// No output from interpreter (box has no modifiers)
	expect(result.css).not.toContain('.box');
});

test('modified_class_interpreter handles before pseudo-element', () => {
	const result = generate_classes_css({
		class_names: ['before:box'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.before\\:box::before');
	expect(result.css).toContain('display: flex');
});

test('modified_class_interpreter handles combined state and pseudo-element', () => {
	const result = generate_classes_css({
		class_names: ['hover:before:ellipsis'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.hover\\:before\\:ellipsis:hover::before');
});

test('modified_class_interpreter prioritizes known classes over css-literal', () => {
	// 'hover:row' should be interpreted as modifier + known class
	// not as css-literal property:value
	const result = generate_classes_css({
		class_names: ['hover:row'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.hover\\:row:hover');
	expect(result.css).toContain('display: flex');
	expect(result.css).toContain('flex-direction: row');
});

// Phase 2: Ruleset modifier support tests

test('modified_class_interpreter handles ruleset class with hover: selectable', () => {
	const result = generate_classes_css({
		class_names: ['hover:selectable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Should contain modified selectors with :hover appended
	expect(result.css).toContain('.hover\\:selectable:hover');
	// Rules that already have :hover are skipped (no :hover:hover)
	expect(result.css).not.toContain(':hover:hover');
	expect(result.css).toContain('cursor: pointer');
});

test('modified_class_interpreter handles ruleset class with media: md:selectable', () => {
	const result = generate_classes_css({
		class_names: ['md:selectable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('@media (width >= 48rem)');
	expect(result.css).toContain('.md\\:selectable');
	expect(result.css).toContain('.md\\:selectable:hover');
	expect(result.css).toContain('.md\\:selectable.selected');
});

test('modified_class_interpreter handles ruleset with descendant selectors: hover:menu_item', () => {
	const result = generate_classes_css({
		class_names: ['hover:menu_item'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// State should be applied to the first compound block
	expect(result.css).toContain('.hover\\:menu_item:hover');
	expect(result.css).toContain('.hover\\:menu_item:hover .content');
	expect(result.css).toContain('.hover\\:menu_item:hover .icon');
	expect(result.css).toContain('.hover\\:menu_item:hover .title');
});

test('modified_class_interpreter handles ruleset with pseudo-element: hover:chevron', () => {
	const result = generate_classes_css({
		class_names: ['hover:chevron'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.hover\\:chevron:hover');
	// State should come BEFORE existing pseudo-element
	expect(result.css).toContain('.hover\\:chevron:hover::before');
});

test('modified_class_interpreter handles ruleset with element.class: hover:chip', () => {
	const result = generate_classes_css({
		class_names: ['hover:chip'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('.hover\\:chip:hover');
	expect(result.css).toContain('a.hover\\:chip:hover');
	expect(result.css).toContain('font-weight: 500');
	expect(result.css).toContain('font-weight: 600');
});

test('modified_class_interpreter handles md:dark:hover:selectable', () => {
	const result = generate_classes_css({
		class_names: ['md:dark:hover:selectable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('@media (width >= 48rem)');
	expect(result.css).toContain(':root.dark');
	expect(result.css).toContain('.md\\:dark\\:hover\\:selectable:hover');
});

test('modified_class_interpreter handles plain ruleset with :not()', () => {
	const result = generate_classes_css({
		class_names: ['focus:plain'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Should add :focus after the :not(:hover) pseudo-class
	expect(result.css).toContain('.focus\\:plain:not(:hover):focus');
	expect(result.css).toContain('.focus\\:plain:hover:focus');
	expect(result.css).toContain('.focus\\:plain:active:focus');
});

test('modified_class_interpreter handles clickable ruleset', () => {
	const result = generate_classes_css({
		class_names: ['md:clickable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	expect(result.css).toContain('@media (width >= 48rem)');
	expect(result.css).toContain('.md\\:clickable');
	expect(result.css).toContain('.md\\:clickable:focus');
	expect(result.css).toContain('.md\\:clickable:hover');
	expect(result.css).toContain('.md\\:clickable:active');
});

test('modified_class_interpreter includes pseudo-element rules without extra modifier: before:chevron', () => {
	const result = generate_classes_css({
		class_names: ['before:chevron'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// .chevron rule gets ::before added
	expect(result.css).toContain('.before\\:chevron::before');
	expect(result.css).toContain('position: relative');
	// .chevron::before rule is included (class renamed, no extra ::before)
	expect(result.css).toContain('border-left-color');
	// Should NOT have invalid ::before::before
	expect(result.css).not.toContain('::before::before');
});

test('modified_class_interpreter applies pseudo-element to simple ruleset: before:chip', () => {
	const result = generate_classes_css({
		class_names: ['before:chip'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Both rules get ::before added (neither has existing pseudo-element)
	expect(result.css).toContain('.before\\:chip::before');
	expect(result.css).toContain('a.before\\:chip::before');
	expect(result.css).toContain('font-weight: 500');
	expect(result.css).toContain('font-weight: 600');
});

// State conflict skipping tests

test('hover:selectable skips .selectable:hover rule but keeps others', () => {
	const result = generate_classes_css({
		class_names: ['hover:selectable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Base .selectable rule gets :hover added
	expect(result.css).toContain('.hover\\:selectable:hover');
	expect(result.css).toContain('cursor: pointer');

	// .selectable.selected rule gets :hover added (different - has .selected class not :hover state)
	expect(result.css).toContain('.hover\\:selectable.selected:hover');

	// No :hover:hover anywhere (rules with :hover are skipped)
	expect(result.css).not.toContain(':hover:hover');
});

test('hover:selectable keeps .selectable:active rule (different state)', () => {
	const result = generate_classes_css({
		class_names: ['hover:selectable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// .selectable:active rule gets :hover added → :active:hover
	expect(result.css).toContain(':active:hover');
});

test('focus:clickable skips .clickable:focus rule', () => {
	const result = generate_classes_css({
		class_names: ['focus:clickable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Base .clickable rule gets :focus added
	expect(result.css).toContain('.focus\\:clickable:focus');

	// No :focus:focus anywhere
	expect(result.css).not.toContain(':focus:focus');

	// Other state rules get :focus added
	expect(result.css).toContain(':hover:focus');
	expect(result.css).toContain(':active:focus');
});

test('active:clickable skips .clickable:active rule', () => {
	const result = generate_classes_css({
		class_names: ['active:clickable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// No :active:active anywhere
	expect(result.css).not.toContain(':active:active');

	// Other state rules get :active added
	expect(result.css).toContain(':hover:active');
	expect(result.css).toContain(':focus:active');
});

test('hover:plain includes all rules, skipping redundant :hover additions', () => {
	const result = generate_classes_css({
		class_names: ['hover:plain'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Rules are included with class renamed, but :hover not added where it already exists
	expect(result.css).toContain('.hover\\:plain');
	// :not(:hover) rule is included (class renamed, no extra :hover added)
	expect(result.css).toContain('.hover\\:plain:not(:hover)');
	// .plain:hover, .plain:active selector list is included (class renamed)
	// Note: Since the selector string contains :hover, the whole rule has :hover skipped
	// (selector lists are treated as a unit for conflict detection)
	expect(result.css).toContain('.hover\\:plain:hover');
	expect(result.css).toContain('.hover\\:plain:active');
	// No :hover:hover anywhere
	expect(result.css).not.toContain(':hover:hover');

	// Should have warnings for skipped modifier additions
	expect(result.diagnostics.length).toBeGreaterThan(0);
	const warnings = result.diagnostics.filter((d) => d.class_name === 'hover:plain');
	expect(warnings.length).toBeGreaterThan(0);
});

// Skip warning tests

test('before:chevron emits warning for skipped pseudo-element rule', () => {
	const result = generate_classes_css({
		class_names: ['before:chevron'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Should have a warning about the skipped ::before rule
	expect(result.diagnostics.length).toBeGreaterThan(0);
	const warning = result.diagnostics.find(
		(d) => d.class_name === 'before:chevron' && d.message.includes('pseudo-element'),
	);
	expect(warning).toBeDefined();
	expect(warning!.level).toBe('warning');
	expect(warning!.message).toContain('.chevron::before');
	expect(warning!.message).toContain('::before');
});

test('hover:selectable emits warnings for skipped :hover rules', () => {
	const result = generate_classes_css({
		class_names: ['hover:selectable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	// Should have warnings about skipped :hover rules
	const hover_warnings = result.diagnostics.filter(
		(d) => d.class_name === 'hover:selectable' && d.message.includes(':hover'),
	);
	expect(hover_warnings.length).toBeGreaterThan(0);

	// All should be warnings about redundant state
	for (const warning of hover_warnings) {
		expect(warning.level).toBe('warning');
		expect(warning.message).toContain('redundancy');
	}
});

test('focus:clickable emits warning for skipped :focus rule', () => {
	const result = generate_classes_css({
		class_names: ['focus:clickable'],
		class_definitions: css_class_composites,
		interpreters: [modified_class_interpreter],
		css_properties: null,
	});

	const focus_warning = result.diagnostics.find(
		(d) => d.class_name === 'focus:clickable' && d.message.includes(':focus'),
	);
	expect(focus_warning).toBeDefined();
	expect(focus_warning!.message).toContain('.clickable:focus');
	expect(focus_warning!.message).toContain('redundancy');
});
