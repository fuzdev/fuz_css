import {test, expect, describe, beforeAll} from 'vitest';

import {
	parse_css_literal,
	is_possible_css_literal,
	extract_segments,
	format_css_value,
	check_calc_expression,
	suggest_css_property,
	load_css_properties,
	interpret_css_literal,
	generate_css_literal_simple,
	has_modifiers,
	has_extracted_modifiers,
	try_resolve_literal,
	extract_and_validate_modifiers,
	type ParsedCssLiteral,
	type InterpretCssLiteralResult,
	type CssLiteralOutput,
	type LiteralResolutionResult,
	type ExtractedModifiers,
	type ModifierExtractionResult,
} from '$lib/css_literal.js';
import {escape_css_selector} from '$lib/css_class_generation.js';
import {type InterpreterDiagnostic} from '$lib/diagnostics.js';
import {
	get_modifier,
	parse_arbitrary_breakpoint,
	parse_parameterized_state,
	extract_balanced_parens,
} from '$lib/modifiers.js';
import {assert_result_ok, assert_result_error} from './test_helpers.js';

// CSS properties loaded before tests run
let css_properties: Set<string>;

beforeAll(async () => {
	css_properties = await load_css_properties();
});

// Type aliases for result types - makes helpers more readable
interface ParseOkResult {
	parsed: ParsedCssLiteral;
	diagnostics: Array<InterpreterDiagnostic> | null;
}
interface ParseErrorResult {
	error: InterpreterDiagnostic;
}
interface InterpretOkResult {
	output: CssLiteralOutput;
}

// Specialized helpers using generic assert_result_ok/assert_result_error
const assert_parse_ok = (result: ReturnType<typeof parse_css_literal>): ParseOkResult =>
	assert_result_ok<ParseOkResult, ParseErrorResult>(result, 'Expected parse result to be ok');

const assert_parse_error = (result: ReturnType<typeof parse_css_literal>): ParseErrorResult =>
	assert_result_error<ParseOkResult, ParseErrorResult>(result, 'Expected parse result to be error');

const assert_interpret_ok = (result: InterpretCssLiteralResult): CssLiteralOutput =>
	assert_result_ok<InterpretOkResult, {error: InterpreterDiagnostic}>(
		result,
		'Expected interpret result to be ok',
	).output;

describe('is_possible_css_literal', () => {
	test.each([
		['display:flex'],
		['opacity:80%'],
		['hover:opacity:80%'],
		['md:display:flex'],
		['md:dark:hover:opacity:80%'],
		['margin:0~auto'],
		['width:calc(100%-20px)'],
		['--custom-prop:value'],
		['nth-child(2n):color:red'],
		['min-width(800px):display:flex'],
	])('recognizes "%s" as possible CSS-literal', (input) => {
		expect(is_possible_css_literal(input)).toBe(true);
	});

	test.each([
		['opacity_50', 'underscore pattern'],
		['color_a_50', 'underscore pattern'],
		['box', 'no colon'],
		['p_md', 'underscore pattern'],
		['', 'empty'],
		[':', 'just colon'],
		['display:', 'empty value'],
		[':flex', 'empty property'],
	])('rejects "%s" as not CSS-literal (%s)', (input) => {
		expect(is_possible_css_literal(input)).toBe(false);
	});
});

describe('extract_segments', () => {
	test.each<[string, Array<string>]>([
		['display:flex', ['display', 'flex']],
		['hover:opacity:80%', ['hover', 'opacity', '80%']],
		['md:dark:hover:opacity:80%', ['md', 'dark', 'hover', 'opacity', '80%']],
		['nth-child(2n+1):color:red', ['nth-child(2n+1)', 'color', 'red']],
		['width:calc(100%-20px)', ['width', 'calc(100%-20px)']],
		['min-width(800px):display:flex', ['min-width(800px)', 'display', 'flex']],
		['before:content:""', ['before', 'content', '""']],
		['width:calc(min(100%,500px))', ['width', 'calc(min(100%,500px))']],
	])('extract_segments("%s") → %j', (input, expected) => {
		expect(extract_segments(input)).toEqual(expected);
	});

	// Mismatched parentheses - documents graceful degradation behavior
	test.each<[string, Array<string>]>([
		['width:calc((100%', ['width', 'calc((100%']], // unclosed - keeps as-is
		['width:calc(100%))', ['width', 'calc(100%))']], // extra close - keeps as-is
		['fn((a:b))', ['fn((a:b))']], // colon inside nested parens stays inside
	])('extract_segments("%s") handles mismatched parens → %j', (input, expected) => {
		expect(extract_segments(input)).toEqual(expected);
	});
});

describe('format_css_value', () => {
	test.each([
		['flex', 'flex'],
		['80%', '80%'],
		['0~auto', '0 auto'],
		['1px~solid~red', '1px solid red'],
		['flex!important', 'flex !important'],
		['0~auto!important', '0 auto !important'],
		['calc(100%~-~20px)', 'calc(100% - 20px)'],
	] as const)('format_css_value("%s") → "%s"', (input, expected) => {
		expect(format_css_value(input)).toBe(expected);
	});

	// Edge cases for tilde handling
	test.each([
		['~~~', '   '], // only tildes → only spaces
		['0~', '0 '], // trailing tilde → trailing space
		['~0', ' 0'], // leading tilde → leading space
		['~~', '  '], // consecutive tildes → consecutive spaces
	] as const)('format_css_value("%s") → "%s" (edge cases)', (input, expected) => {
		expect(format_css_value(input)).toBe(expected);
	});
});

describe('check_calc_expression', () => {
	test.each([['calc(100%-20px)'], ['calc(50%+10px)'], ['calc(100vh-4rem)']])(
		'warns about "%s"',
		(input) => {
			expect(check_calc_expression(input)).not.toBeNull();
		},
	);

	test.each([
		['calc(100% - 20px)', 'proper spaces'],
		['calc(100%*2)', 'multiplication needs no spaces'],
		['calc(100%/2)', 'division needs no spaces'],
		['100%', 'not calc'],
		['flex', 'not calc'],
	])('does not warn about "%s" (%s)', (input) => {
		expect(check_calc_expression(input)).toBeNull();
	});
});

describe('get_modifier', () => {
	test.each([
		// Media modifiers
		['sm', 'media'],
		['md', 'media'],
		['lg', 'media'],
		['xl', 'media'],
		['2xl', 'media'],
		['max-sm', 'media'],
		['max-md', 'media'],
		['print', 'media'],
		['motion-safe', 'media'],
		['motion-reduce', 'media'],
		['contrast-more', 'media'],
		['portrait', 'media'],
		['landscape', 'media'],
		// Ancestor modifiers
		['dark', 'ancestor'],
		['light', 'ancestor'],
		// State modifiers
		['hover', 'state'],
		['focus', 'state'],
		['focus-visible', 'state'],
		['active', 'state'],
		['disabled', 'state'],
		['checked', 'state'],
		['first', 'state'],
		['last', 'state'],
		['odd', 'state'],
		['even', 'state'],
		// Pseudo-element modifiers
		['before', 'pseudo-element'],
		['after', 'pseudo-element'],
		['placeholder', 'pseudo-element'],
		['selection', 'pseudo-element'],
	] as const)('get_modifier("%s") → type: %s', (name, expected_type) => {
		const modifier = get_modifier(name);
		if (!modifier) throw new Error(`Expected modifier for "${name}"`);
		expect(modifier.type).toBe(expected_type);
	});

	test.each([['unknown'], ['notamodifier']])('get_modifier("%s") → null', (name) => {
		expect(get_modifier(name)).toBeNull();
	});
});

describe('parse_arbitrary_breakpoint', () => {
	test.each([
		['min-width(800px)', '@media (width >= 800px)'],
		['max-width(600px)', '@media (width < 600px)'],
		['min-width(50rem)', '@media (width >= 50rem)'],
		['max-width(100vw)', '@media (width < 100vw)'],
	] as const)('parse_arbitrary_breakpoint("%s") → %s', (input, expected) => {
		expect(parse_arbitrary_breakpoint(input)).toBe(expected);
	});

	test.each([['sm'], ['md'], ['hover']])('parse_arbitrary_breakpoint("%s") → null', (input) => {
		expect(parse_arbitrary_breakpoint(input)).toBeNull();
	});
});

describe('parse_parameterized_state', () => {
	test.each([
		['nth-child(2n)', ':nth-child(2n)'],
		['nth-child(2n+1)', ':nth-child(2n+1)'],
		['nth-child(odd)', ':nth-child(odd)'],
		['nth-of-type(3)', ':nth-of-type(3)'],
		['nth-of-type(2n)', ':nth-of-type(2n)'],
	] as const)('parse_parameterized_state("%s") → css: %s', (input, expected_css) => {
		const result = parse_parameterized_state(input);
		if (!result) throw new Error(`Expected result for "${input}"`);
		expect(result.css).toBe(expected_css);
	});

	test.each([['hover'], ['first']])('parse_parameterized_state("%s") → null', (input) => {
		expect(parse_parameterized_state(input)).toBeNull();
	});
});

describe('parse_css_literal - valid cases', () => {
	test.each([
		['display:flex', 'display', 'flex'],
		['opacity:80%', 'opacity', '80%'],
		['margin:0~auto', 'margin', '0 auto'],
		['color:red', 'color', 'red'],
		['font-size:16px', 'font-size', '16px'],
		['z-index:100', 'z-index', '100'],
		['--custom-prop:value', '--custom-prop', 'value'],
	] as const)('parse_css_literal("%s") → property: %s, value: %s', (input, property, value) => {
		const {parsed} = assert_parse_ok(parse_css_literal(input, css_properties));
		expect(parsed.property).toBe(property);
		expect(parsed.value).toBe(value);
	});
});

describe('parse_css_literal - with modifiers', () => {
	test('hover:opacity:80%', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('hover:opacity:80%', css_properties));
		expect(parsed.media).toBeNull();
		expect(parsed.ancestor).toBeNull();
		expect(parsed.states).toHaveLength(1);
		expect(parsed.states[0]!.name).toBe('hover');
		expect(parsed.pseudo_element).toBeNull();
		expect(parsed.property).toBe('opacity');
		expect(parsed.value).toBe('80%');
	});

	test('md:display:flex', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('md:display:flex', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		expect(parsed.media.name).toBe('md');
		expect(parsed.ancestor).toBeNull();
		expect(parsed.states).toHaveLength(0);
		expect(parsed.property).toBe('display');
	});

	test('dark:opacity:60%', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('dark:opacity:60%', css_properties));
		expect(parsed.media).toBeNull();
		if (!parsed.ancestor) throw new Error('Expected ancestor');
		expect(parsed.ancestor.name).toBe('dark');
		expect(parsed.property).toBe('opacity');
	});

	test('before:content:""', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('before:content:""', css_properties));
		if (!parsed.pseudo_element) throw new Error('Expected pseudo_element');
		expect(parsed.pseudo_element.name).toBe('before');
		expect(parsed.property).toBe('content');
	});

	test('md:dark:hover:before:opacity:80%', () => {
		const {parsed} = assert_parse_ok(
			parse_css_literal('md:dark:hover:before:opacity:80%', css_properties),
		);
		if (!parsed.media) throw new Error('Expected media');
		expect(parsed.media.name).toBe('md');
		if (!parsed.ancestor) throw new Error('Expected ancestor');
		expect(parsed.ancestor.name).toBe('dark');
		expect(parsed.states).toHaveLength(1);
		expect(parsed.states[0]!.name).toBe('hover');
		if (!parsed.pseudo_element) throw new Error('Expected pseudo_element');
		expect(parsed.pseudo_element.name).toBe('before');
		expect(parsed.property).toBe('opacity');
		expect(parsed.value).toBe('80%');
	});

	test('focus:hover:color:red (alphabetical states)', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('focus:hover:color:red', css_properties));
		expect(parsed.states).toHaveLength(2);
		expect(parsed.states[0]!.name).toBe('focus');
		expect(parsed.states[1]!.name).toBe('hover');
	});

	test('active:focus:hover:opacity:80% (multiple states alphabetical)', () => {
		const {parsed} = assert_parse_ok(
			parse_css_literal('active:focus:hover:opacity:80%', css_properties),
		);
		expect(parsed.states).toHaveLength(3);
		expect(parsed.states[0]!.name).toBe('active');
		expect(parsed.states[1]!.name).toBe('focus');
		expect(parsed.states[2]!.name).toBe('hover');
	});

	test('min-width(800px):display:flex (arbitrary breakpoint)', () => {
		const {parsed} = assert_parse_ok(
			parse_css_literal('min-width(800px):display:flex', css_properties),
		);
		if (!parsed.media) throw new Error('Expected media');
		expect(parsed.media.css).toBe('@media (width >= 800px)');
	});

	test('nth-child(2n+1):color:red (parameterized state)', () => {
		const {parsed} = assert_parse_ok(
			parse_css_literal('nth-child(2n+1):color:red', css_properties),
		);
		expect(parsed.states).toHaveLength(1);
		expect(parsed.states[0]!.css).toBe(':nth-child(2n+1)');
	});

	test('hover:nth-child(2n):color:red (alphabetical with parameterized)', () => {
		const {parsed} = assert_parse_ok(
			parse_css_literal('hover:nth-child(2n):color:red', css_properties),
		);
		expect(parsed.states).toHaveLength(2);
		// 'hover' < 'nth-child(2n)' alphabetically
		expect(parsed.states[0]!.name).toBe('hover');
		expect(parsed.states[1]!.name).toBe('nth-child(2n)');
	});
});

describe('parse_css_literal - error cases', () => {
	describe('modifier ordering errors', () => {
		test.each<[string, string]>([
			['hover:focus:color:red', 'alphabetical order'],
			['dark:md:display:none', 'Media modifier must come before'],
			['hover:dark:display:none', 'Ancestor modifier must come before'],
			['before:hover:opacity:100%', 'State modifiers must come before'],
			['nth-child(2n):hover:color:red', 'alphabetical order'],
		])('%s → error containing "%s"', (input, expected_message) => {
			const {error} = assert_parse_error(parse_css_literal(input, css_properties));
			expect(error.message).toContain(expected_message);
		});
	});

	describe('conflicting modifiers', () => {
		test.each<[string, string]>([
			['dark:light:color:red', 'mutually exclusive'],
			['sm:md:display:flex', 'Multiple media modifiers'],
			['before:after:content:""', 'Multiple pseudo-element'],
		])('%s → error containing "%s"', (input, expected_message) => {
			const {error} = assert_parse_error(parse_css_literal(input, css_properties));
			expect(error.message).toContain(expected_message);
		});
	});

	test('unknown:color:red (unknown modifier)', () => {
		const {error} = assert_parse_error(parse_css_literal('unknown:color:red', css_properties));
		expect(error.message).toContain('Unknown modifier');
	});

	test('hoverr:color:red (typo with suggestion)', () => {
		const {error} = assert_parse_error(parse_css_literal('hoverr:color:red', css_properties));
		expect(error.message).toContain('Unknown modifier');
		expect(error.suggestion).toBeDefined();
	});

	test('dipslay:flex (typo in property with suggestion)', () => {
		const {error} = assert_parse_error(parse_css_literal('dipslay:flex', css_properties));
		expect(error.message).toContain('Unknown CSS property');
		expect(error.suggestion).toBeDefined();
		expect(error.suggestion ?? '').toContain('display');
	});
});

describe('parse_css_literal - warnings', () => {
	test('width:calc(100%-20px) generates warning', () => {
		const {diagnostics} = assert_parse_ok(
			parse_css_literal('width:calc(100%-20px)', css_properties),
		);
		expect(diagnostics).toBeTruthy();
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics![0]?.level).toBe('warning');
	});
});

describe('interpret_css_literal', () => {
	test('display:flex generates correct output', () => {
		const result = interpret_css_literal('display:flex', 'display\\:flex', css_properties);
		const output = assert_interpret_ok(result);
		expect(output.declaration).toBe('display: flex;');
		expect(output.selector).toBe('.display\\:flex');
		expect(output.media_wrapper).toBeNull();
		expect(output.ancestor_wrapper).toBeNull();
	});

	test('hover:opacity:80% includes pseudo-class in selector', () => {
		const class_name = 'hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		expect(output.declaration).toBe('opacity: 80%;');
		expect(output.selector).toContain(':hover');
	});

	test('md:display:flex has media wrapper', () => {
		const class_name = 'md:display:flex';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		if (!output.media_wrapper) throw new Error('Expected media_wrapper');
		expect(output.media_wrapper).toContain('@media');
		expect(output.media_wrapper).toContain('48rem');
	});

	test('dark:opacity:60% has ancestor wrapper', () => {
		const class_name = 'dark:opacity:60%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		expect(output.ancestor_wrapper).toBe(':root.dark');
	});

	test('before:content:"" includes pseudo-element in selector', () => {
		const class_name = 'before:content:""';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		expect(output.selector).toContain('::before');
	});

	test('md:dark:hover:before:opacity:80% has all components', () => {
		const class_name = 'md:dark:hover:before:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		if (!output.media_wrapper) throw new Error('Expected media_wrapper');
		if (!output.ancestor_wrapper) throw new Error('Expected ancestor_wrapper');
		expect(output.selector).toContain(':hover');
		expect(output.selector).toContain('::before');
	});
});

describe('generate_css_literal_simple', () => {
	test('simple property:value', () => {
		const result = interpret_css_literal('display:flex', 'display\\:flex', css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain('.display\\:flex');
		expect(css).toContain('display: flex;');
		// Should not have wrappers
		expect(css).not.toContain('@media');
		expect(css).not.toContain(':root');
	});

	test('hover:opacity:80%', () => {
		const class_name = 'hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain(':hover');
		expect(css).toContain('opacity: 80%;');
	});

	test('md:display:flex has media wrapper', () => {
		const class_name = 'md:display:flex';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain('@media (width >= 48rem)');
		expect(css).toContain('display: flex;');
	});

	test('dark:opacity:60% has ancestor wrapper', () => {
		const class_name = 'dark:opacity:60%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain(':root.dark');
		expect(css).toContain('opacity: 60%;');
	});

	test('md:dark:hover:opacity:80% has nested structure', () => {
		const class_name = 'md:dark:hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain('@media (width >= 48rem)');
		expect(css).toContain(':root.dark');
		expect(css).toContain(':hover');
		expect(css).toContain('opacity: 80%;');
	});
});

describe('suggest_css_property', () => {
	test.each([
		['dipslay', 'display'],
		['opacty', 'opacity'],
		['colr', 'color'],
	] as const)('suggests %s for %s', (typo, expected) => {
		expect(suggest_css_property(typo, css_properties)).toBe(expected);
	});

	test('returns null for very different strings', () => {
		expect(suggest_css_property('xyz123', css_properties)).toBeNull();
	});
});

describe('parse_css_literal - max breakpoints', () => {
	test.each([
		['max-sm:display:none', 'max-sm', 'display', 'none'],
		['max-md:flex-direction:column', 'max-md', 'flex-direction', 'column'],
		['max-lg:padding:1rem', 'max-lg', 'padding', '1rem'],
		['max-xl:gap:0', 'max-xl', 'gap', '0'],
		['max-2xl:margin:auto', 'max-2xl', 'margin', 'auto'],
	] as const)('%s parses correctly', (input, media_name, property, value) => {
		const {parsed} = assert_parse_ok(parse_css_literal(input, css_properties));
		if (!parsed.media) throw new Error('Expected media');
		expect(parsed.media.name).toBe(media_name);
		expect(parsed.media.css).toContain('width <');
		expect(parsed.property).toBe(property);
		expect(parsed.value).toBe(value);
	});
});

describe('generate_css_literal_simple - max breakpoints', () => {
	test.each([
		['max-sm:display:none', '@media (width < 40rem)', 'display: none;'],
		['max-lg:opacity:50%', '@media (width < 64rem)', 'opacity: 50%;'],
	] as const)('%s generates correct media query', (class_name, expected_media, expected_decl) => {
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain(expected_media);
		expect(css).toContain(expected_decl);
	});
});

describe('parse_css_literal - !important with modifiers', () => {
	test.each([
		['display:flex!important', 'display', 'flex !important'],
		['hover:opacity:100%!important', 'opacity', '100% !important'],
		['md:dark:display:block!important', 'display', 'block !important'],
		['margin:0~auto!important', 'margin', '0 auto !important'],
	] as const)('%s → property: %s, value: %s', (input, property, value) => {
		const {parsed} = assert_parse_ok(parse_css_literal(input, css_properties));
		expect(parsed.property).toBe(property);
		expect(parsed.value).toBe(value);
	});
});

describe('generate_css_literal_simple - !important', () => {
	test.each([
		['display:flex!important', 'display: flex !important;', null],
		['hover:color:red!important', 'color: red !important;', ':hover'],
	] as const)('%s renders correctly', (class_name, expected_decl, expected_selector) => {
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain(expected_decl);
		if (expected_selector) expect(css).toContain(expected_selector);
	});
});

describe('parse_css_literal - Unicode values', () => {
	test.each([
		['content:"→"', 'content', '"→"'],
		['content:"✓"', 'content', '"✓"'],
		['before:content:"«"', 'content', '"«"'],
		['list-style-type:"•"', 'list-style-type', '"•"'],
	] as const)('%s → property: %s, value: %s', (input, property, value) => {
		const {parsed} = assert_parse_ok(parse_css_literal(input, css_properties));
		expect(parsed.property).toBe(property);
		expect(parsed.value).toBe(value);
	});
});

describe('generate_css_literal_simple - Unicode', () => {
	test.each([
		['content:"→"', 'content: "→";', null],
		['before:content:"✓"', 'content: "✓";', '::before'],
	] as const)('%s renders correctly', (class_name, expected_decl, expected_selector) => {
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		expect(css).toContain(expected_decl);
		if (expected_selector) expect(css).toContain(expected_selector);
	});
});

//
// Composition Support Tests
//

// Type aliases for modifier/literal result types
interface ModOkResult {
	modifiers: ExtractedModifiers;
	remaining: Array<string>;
}
interface ModErrorResult {
	error: InterpreterDiagnostic;
}
interface LiteralOkResult {
	declaration: string;
	warnings: Array<InterpreterDiagnostic> | null;
}
interface LiteralErrorResult {
	error: InterpreterDiagnostic | null;
}

// Helper to assert modifier extraction result is ok
const assert_mod_ok = (result: ModifierExtractionResult): ModOkResult =>
	assert_result_ok<ModOkResult, ModErrorResult>(result, 'Expected modifier extraction to be ok');

// Helper to assert literal resolution result is ok
const assert_literal_ok = (result: LiteralResolutionResult): LiteralOkResult =>
	assert_result_ok<LiteralOkResult, LiteralErrorResult>(
		result,
		'Expected literal resolution to be ok',
	);

// Helper to assert literal resolution result is not a literal (error with null)
const assert_literal_not_literal = (result: LiteralResolutionResult): void => {
	const err = assert_result_error<LiteralOkResult, LiteralErrorResult>(
		result,
		'Expected literal resolution to fail',
	);
	expect(err.error).toBeNull();
};

// Helper to assert literal resolution result is error with non-null error
const assert_literal_has_error = (result: LiteralResolutionResult): InterpreterDiagnostic => {
	const err = assert_result_error<LiteralOkResult, LiteralErrorResult>(
		result,
		'Expected literal resolution to fail',
	);
	expect(err.error).not.toBeNull();
	return err.error!;
};

describe('has_modifiers', () => {
	test('returns false for unmodified literal', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('display:flex', null));
		expect(has_modifiers(parsed)).toBe(false);
	});

	test('returns true for media modifier', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('md:display:flex', null));
		expect(has_modifiers(parsed)).toBe(true);
	});

	test('returns true for state modifier', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('hover:opacity:80%', null));
		expect(has_modifiers(parsed)).toBe(true);
	});

	test('returns true for ancestor modifier', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('dark:color:white', null));
		expect(has_modifiers(parsed)).toBe(true);
	});

	test('returns true for pseudo-element modifier', () => {
		const {parsed} = assert_parse_ok(parse_css_literal('before:content:""', null));
		expect(has_modifiers(parsed)).toBe(true);
	});
});

describe('has_extracted_modifiers', () => {
	test('returns false for empty modifiers', () => {
		const segments = extract_segments('box');
		const {modifiers} = assert_mod_ok(extract_and_validate_modifiers(segments, 'box'));
		expect(has_extracted_modifiers(modifiers)).toBe(false);
	});

	test('returns true for media modifier', () => {
		const segments = extract_segments('md:box');
		const {modifiers} = assert_mod_ok(extract_and_validate_modifiers(segments, 'md:box'));
		expect(has_extracted_modifiers(modifiers)).toBe(true);
	});

	test('returns true for multiple state modifiers', () => {
		const segments = extract_segments('focus:hover:box');
		const {modifiers} = assert_mod_ok(extract_and_validate_modifiers(segments, 'focus:hover:box'));
		expect(has_extracted_modifiers(modifiers)).toBe(true);
		expect(modifiers.states).toHaveLength(2);
	});
});

describe('try_resolve_literal', () => {
	test('resolves unmodified literal', () => {
		const {declaration} = assert_literal_ok(
			try_resolve_literal('text-align:center', css_properties, 'test'),
		);
		expect(declaration).toBe('text-align: center;');
	});

	test('resolves literal with ~ space encoding', () => {
		const {declaration} = assert_literal_ok(
			try_resolve_literal('margin:0~auto', css_properties, 'test'),
		);
		expect(declaration).toBe('margin: 0 auto;');
	});

	test('resolves custom property', () => {
		const {declaration} = assert_literal_ok(
			try_resolve_literal('--my-color:blue', css_properties, 'test'),
		);
		expect(declaration).toBe('--my-color: blue;');
	});

	test('returns null error for non-literal class names', () => {
		assert_literal_not_literal(try_resolve_literal('p_lg', css_properties, 'test'));
	});

	test('returns error for modified literal', () => {
		const error = assert_literal_has_error(
			try_resolve_literal('hover:opacity:80%', css_properties, 'test'),
		);
		expect(error.message).toContain('cannot be used in composes array');
	});

	test('returns error for invalid property with suggestion', () => {
		const error = assert_literal_has_error(
			try_resolve_literal('disply:flex', css_properties, 'test'),
		);
		expect(error.message).toContain('Unknown CSS property');
		expect(error.suggestion).not.toBeNull();
		expect(error.suggestion).toContain('display');
	});

	test('modifier:token pattern returns property error (detection in resolve_composes)', () => {
		// hover:shadow_lg parses as property:value, fails property validation
		// The "modified class" detection happens earlier in resolve_composes
		const error = assert_literal_has_error(
			try_resolve_literal('hover:shadow_lg', css_properties, 'card'),
		);
		expect(error.message).toContain('Unknown CSS property');
	});

	test('returns null error for token class without colon', () => {
		assert_literal_not_literal(try_resolve_literal('box', css_properties, 'test'));
	});
});

describe('extract_balanced_parens', () => {
	// Valid extractions
	test.each([
		['min-width(800px)', 'min-width', '800px', 'simple value'],
		['min-width(50rem)', 'min-width', '50rem', 'rem units'],
		['max-width(100%)', 'max-width', '100%', 'percentage'],
		['min-width(calc(100vw - 200px))', 'min-width', 'calc(100vw - 200px)', 'calc with subtraction'],
		['min-width(calc(50% + 20px))', 'min-width', 'calc(50% + 20px)', 'calc with addition'],
		[
			'min-width(clamp(300px, 50%, 800px))',
			'min-width',
			'clamp(300px, 50%, 800px)',
			'clamp function',
		],
		['min-width(min(100vw, 1200px))', 'min-width', 'min(100vw, 1200px)', 'min function'],
		['min-width(max(300px, 20%))', 'min-width', 'max(300px, 20%)', 'max function'],
		[
			'min-width(calc(min(100vw, 1200px) - 2rem))',
			'min-width',
			'calc(min(100vw, 1200px) - 2rem)',
			'nested functions',
		],
		['foo(bar(baz(qux)))', 'foo', 'bar(baz(qux))', 'deeply nested'],
	] as const)('%s with prefix "%s" → "%s" (%s)', (input, prefix, expected, _desc) => {
		expect(extract_balanced_parens(input, prefix)).toBe(expected);
	});

	// Invalid/null cases
	test.each([
		['min-width(800px', 'min-width', 'unclosed paren'],
		['min-width800px)', 'min-width', 'missing opening paren'],
		['max-width(800px)', 'min-width', 'wrong prefix'],
		['min-width(calc(100vw)', 'min-width', 'unbalanced nested'],
		['min-width()', 'min-width', 'empty parens'],
		['min-width(800px)trailing', 'min-width', 'trailing characters'],
		['min-width(a)(b)', 'min-width', 'multiple paren groups'],
		['', 'min-width', 'empty string'],
		['min-width', 'min-width', 'no parens at all'],
	] as const)('%s with prefix "%s" → null (%s)', (input, prefix, _desc) => {
		expect(extract_balanced_parens(input, prefix)).toBeNull();
	});
});

describe('parse_arbitrary_breakpoint - edge cases', () => {
	// Cases that return null (not recognized as arbitrary breakpoint)
	test.each([
		['min-width()', 'empty value'],
		['min-width(px)', 'no leading digit'],
		['min-width(rem)', 'unit without number'],
		['min-width(.5rem)', 'decimal without leading zero'],
		['min-width(-100px)', 'negative value'],
		['min-width(800px', 'unclosed paren'],
		['min-width)', 'missing opening paren'],
		['min-width())', 'extra closing paren'],
		['minwidth(800px)', 'missing hyphen'],
		['min-Width(800px)', 'wrong case'],
		['max-width(vh)', 'max-width without number'],
		['min-width(calc(100vw)', 'unbalanced calc'],
		['min-width(800px)extra', 'trailing characters'],
		['min-width(var(--breakpoint))', 'var() not supported in media queries'],
	] as const)('%s returns null for %s', (input, _desc) => {
		expect(parse_arbitrary_breakpoint(input)).toBeNull();
	});

	// Valid simple cases - value must start with a digit
	test.each([
		['min-width(0)', '@media (width >= 0)', 'zero value'],
		['min-width(100%)', '@media (width >= 100%)', 'percentage'],
		['min-width(800px)', '@media (width >= 800px)', 'pixels'],
		['min-width(50rem)', '@media (width >= 50rem)', 'rem units'],
		['min-width(100vw)', '@media (width >= 100vw)', 'viewport units'],
		['min-width(50cqw)', '@media (width >= 50cqw)', 'container query units'],
		['max-width(50em)', '@media (width < 50em)', 'max-width em units'],
		['max-width(600px)', '@media (width < 600px)', 'max-width pixels'],
	] as const)('%s → %s (%s)', (input, expected, _desc) => {
		expect(parse_arbitrary_breakpoint(input)).toBe(expected);
	});

	// Nested parentheses - calc, clamp, min, max, env
	test.each([
		[
			'min-width(calc(100vw - 200px))',
			'@media (width >= calc(100vw - 200px))',
			'calc with subtraction',
		],
		['min-width(calc(50% + 2rem))', '@media (width >= calc(50% + 2rem))', 'calc with addition'],
		[
			'min-width(clamp(300px, 50vw, 800px))',
			'@media (width >= clamp(300px, 50vw, 800px))',
			'clamp function',
		],
		['min-width(min(100vw, 1200px))', '@media (width >= min(100vw, 1200px))', 'min function'],
		['min-width(max(300px, 20vw))', '@media (width >= max(300px, 20vw))', 'max function'],
		['max-width(calc(100% - 4rem))', '@media (width < calc(100% - 4rem))', 'max-width with calc'],
		[
			'min-width(calc(min(100vw, 1200px) - 2rem))',
			'@media (width >= calc(min(100vw, 1200px) - 2rem))',
			'nested functions',
		],
		[
			'min-width(env(safe-area-inset-left))',
			'@media (width >= env(safe-area-inset-left))',
			'env function',
		],
	] as const)('%s → %s (%s)', (input, expected, _desc) => {
		expect(parse_arbitrary_breakpoint(input)).toBe(expected);
	});
});

describe('parse_parameterized_state - edge cases', () => {
	test.each([
		['nth-child(-n+3)', ':nth-child(-n+3)', 'negative n formula'],
		['nth-child(n)', ':nth-child(n)', 'just n'],
		['nth-last-child(2n)', ':nth-last-child(2n)', 'nth-last-child'],
		['nth-of-type(even)', ':nth-of-type(even)', 'even keyword'],
		['nth-of-type(odd)', ':nth-of-type(odd)', 'odd keyword'],
		['nth-last-of-type(3n+1)', ':nth-last-of-type(3n+1)', 'nth-last-of-type with formula'],
		['nth-child(3n-1)', ':nth-child(3n-1)', 'negative offset'],
		['nth-child(5)', ':nth-child(5)', 'simple number'],
	] as const)('%s → css: %s (%s)', (input, expected_css, _desc) => {
		const result = parse_parameterized_state(input);
		expect(result).not.toBeNull();
		expect(result!.css).toBe(expected_css);
		expect(result!.type).toBe('state');
	});

	test.each([
		['nth-child()', 'empty formula'],
		['nth-child', 'missing parens'],
		['child(2n)', 'missing nth- prefix'],
		['nth(2n)', 'incomplete pattern'],
	] as const)('%s returns null for %s', (input, _desc) => {
		expect(parse_parameterized_state(input)).toBeNull();
	});
});

describe('edge cases and error paths', () => {
	describe('duplicate modifiers', () => {
		test('duplicate responsive modifier returns error', () => {
			// Parser validates and rejects duplicate media modifiers
			const result = parse_css_literal('md:md:opacity:50%', css_properties);
			expect(result.ok).toBe(false);
		});

		test('duplicate state modifier is allowed', () => {
			// hover:hover may look redundant but actually parses fine
			const result = parse_css_literal('hover:hover:opacity:50%', css_properties);
			expect(result.ok).toBe(true);
		});

		test('duplicate color-scheme modifier returns error', () => {
			// Parser validates and rejects duplicate ancestor modifiers
			const result = parse_css_literal('dark:dark:opacity:50%', css_properties);
			expect(result.ok).toBe(false);
		});
	});

	describe('conflicting modifiers', () => {
		test('dark and light together returns error', () => {
			// Parser validates conflicting color-scheme modifiers
			const result = parse_css_literal('dark:light:opacity:50%', css_properties);
			expect(result.ok).toBe(false);
		});
	});

	describe('property edge cases', () => {
		test('property with leading hyphen parses as CSS custom property', () => {
			// CSS custom properties (--name) are valid properties
			const result = parse_css_literal('--custom:value', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.property).toBe('--custom');
				expect(result.parsed.value).toBe('value');
			}
		});

		test('property with numbers', () => {
			const result = parse_css_literal('z-index:100', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.property).toBe('z-index');
				expect(result.parsed.value).toBe('100');
			}
		});
	});

	describe('value edge cases', () => {
		test('value with multiple tildes converts to spaces', () => {
			const result = parse_css_literal('margin:0~auto~0~auto', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('0 auto 0 auto');
			}
		});

		test('value with trailing tilde converts to trailing space', () => {
			const result = parse_css_literal('margin:0~', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('0 ');
			}
		});

		test('value with leading tilde converts to leading space', () => {
			const result = parse_css_literal('margin:~0', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe(' 0');
			}
		});
	});

	describe('empty and minimal inputs', () => {
		test('single character property', () => {
			const result = parse_css_literal('x:1', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.property).toBe('x');
			}
		});

		test('single character value', () => {
			const result = parse_css_literal('opacity:0', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('0');
			}
		});
	});

	describe('special CSS values', () => {
		test('inherit keyword', () => {
			const result = parse_css_literal('color:inherit', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('inherit');
			}
		});

		test('initial keyword', () => {
			const result = parse_css_literal('display:initial', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('initial');
			}
		});

		test('unset keyword', () => {
			const result = parse_css_literal('margin:unset', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('unset');
			}
		});

		test('revert keyword', () => {
			const result = parse_css_literal('all:revert', css_properties);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.parsed.value).toBe('revert');
			}
		});
	});
});
