import {test, assert, describe, beforeAll} from 'vitest';

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
} from '$lib/modifiers.js';

// CSS properties loaded before tests run
let css_properties: Set<string>;

beforeAll(async () => {
	css_properties = await load_css_properties();
});

// Helper to assert result is ok and return parsed value
const assert_ok = (
	result: ReturnType<typeof parse_css_literal>,
): {parsed: ParsedCssLiteral; diagnostics: Array<InterpreterDiagnostic> | null} => {
	assert.isTrue(result.ok, 'Expected parse result to be ok');
	return result as {
		ok: true;
		parsed: ParsedCssLiteral;
		diagnostics: Array<InterpreterDiagnostic> | null;
	};
};

// Helper to assert result is error
const assert_error = (
	result: ReturnType<typeof parse_css_literal>,
): {error: InterpreterDiagnostic} => {
	assert.isFalse(result.ok, 'Expected parse result to be error');
	return result as {ok: false; error: InterpreterDiagnostic};
};

// Helper to assert interpret result is ok and return output
const assert_interpret_ok = (result: InterpretCssLiteralResult): CssLiteralOutput => {
	assert.isTrue(result.ok, 'Expected interpret result to be ok');
	return (result as {ok: true; output: CssLiteralOutput}).output;
};

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
		assert.isTrue(is_possible_css_literal(input));
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
		assert.isFalse(is_possible_css_literal(input));
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
		assert.deepEqual(extract_segments(input), expected);
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
		assert.equal(format_css_value(input), expected);
	});
});

describe('check_calc_expression', () => {
	test.each([['calc(100%-20px)'], ['calc(50%+10px)'], ['calc(100vh-4rem)']])(
		'warns about "%s"',
		(input) => {
			assert.isNotNull(check_calc_expression(input));
		},
	);

	test.each([
		['calc(100% - 20px)', 'proper spaces'],
		['calc(100%*2)', 'multiplication needs no spaces'],
		['calc(100%/2)', 'division needs no spaces'],
		['100%', 'not calc'],
		['flex', 'not calc'],
	])('does not warn about "%s" (%s)', (input) => {
		assert.isNull(check_calc_expression(input));
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
		assert.equal(modifier.type, expected_type);
	});

	test.each([['unknown'], ['notamodifier']])('get_modifier("%s") → null', (name) => {
		assert.isNull(get_modifier(name));
	});
});

describe('parse_arbitrary_breakpoint', () => {
	test.each([
		['min-width(800px)', '@media (width >= 800px)'],
		['max-width(600px)', '@media (width < 600px)'],
		['min-width(50rem)', '@media (width >= 50rem)'],
		['max-width(100vw)', '@media (width < 100vw)'],
	] as const)('parse_arbitrary_breakpoint("%s") → %s', (input, expected) => {
		assert.equal(parse_arbitrary_breakpoint(input), expected);
	});

	test.each([['sm'], ['md'], ['hover']])('parse_arbitrary_breakpoint("%s") → null', (input) => {
		assert.isNull(parse_arbitrary_breakpoint(input));
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
		assert.equal(result.css, expected_css);
	});

	test.each([['hover'], ['first']])('parse_parameterized_state("%s") → null', (input) => {
		assert.isNull(parse_parameterized_state(input));
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
		const {parsed} = assert_ok(parse_css_literal(input, css_properties));
		assert.equal(parsed.property, property);
		assert.equal(parsed.value, value);
	});
});

describe('parse_css_literal - with modifiers', () => {
	test('hover:opacity:80%', () => {
		const {parsed} = assert_ok(parse_css_literal('hover:opacity:80%', css_properties));
		assert.isNull(parsed.media);
		assert.isNull(parsed.ancestor);
		assert.lengthOf(parsed.states, 1);
		assert.equal(parsed.states[0]!.name, 'hover');
		assert.isNull(parsed.pseudo_element);
		assert.equal(parsed.property, 'opacity');
		assert.equal(parsed.value, '80%');
	});

	test('md:display:flex', () => {
		const {parsed} = assert_ok(parse_css_literal('md:display:flex', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'md');
		assert.isNull(parsed.ancestor);
		assert.lengthOf(parsed.states, 0);
		assert.equal(parsed.property, 'display');
	});

	test('dark:opacity:60%', () => {
		const {parsed} = assert_ok(parse_css_literal('dark:opacity:60%', css_properties));
		assert.isNull(parsed.media);
		if (!parsed.ancestor) throw new Error('Expected ancestor');
		assert.equal(parsed.ancestor.name, 'dark');
		assert.equal(parsed.property, 'opacity');
	});

	test('before:content:""', () => {
		const {parsed} = assert_ok(parse_css_literal('before:content:""', css_properties));
		if (!parsed.pseudo_element) throw new Error('Expected pseudo_element');
		assert.equal(parsed.pseudo_element.name, 'before');
		assert.equal(parsed.property, 'content');
	});

	test('md:dark:hover:before:opacity:80%', () => {
		const {parsed} = assert_ok(
			parse_css_literal('md:dark:hover:before:opacity:80%', css_properties),
		);
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'md');
		if (!parsed.ancestor) throw new Error('Expected ancestor');
		assert.equal(parsed.ancestor.name, 'dark');
		assert.lengthOf(parsed.states, 1);
		assert.equal(parsed.states[0]!.name, 'hover');
		if (!parsed.pseudo_element) throw new Error('Expected pseudo_element');
		assert.equal(parsed.pseudo_element.name, 'before');
		assert.equal(parsed.property, 'opacity');
		assert.equal(parsed.value, '80%');
	});

	test('focus:hover:color:red (alphabetical states)', () => {
		const {parsed} = assert_ok(parse_css_literal('focus:hover:color:red', css_properties));
		assert.lengthOf(parsed.states, 2);
		assert.equal(parsed.states[0]!.name, 'focus');
		assert.equal(parsed.states[1]!.name, 'hover');
	});

	test('active:focus:hover:opacity:80% (multiple states alphabetical)', () => {
		const {parsed} = assert_ok(parse_css_literal('active:focus:hover:opacity:80%', css_properties));
		assert.lengthOf(parsed.states, 3);
		assert.equal(parsed.states[0]!.name, 'active');
		assert.equal(parsed.states[1]!.name, 'focus');
		assert.equal(parsed.states[2]!.name, 'hover');
	});

	test('min-width(800px):display:flex (arbitrary breakpoint)', () => {
		const {parsed} = assert_ok(parse_css_literal('min-width(800px):display:flex', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.css, '@media (width >= 800px)');
	});

	test('nth-child(2n+1):color:red (parameterized state)', () => {
		const {parsed} = assert_ok(parse_css_literal('nth-child(2n+1):color:red', css_properties));
		assert.lengthOf(parsed.states, 1);
		assert.equal(parsed.states[0]!.css, ':nth-child(2n+1)');
	});

	test('hover:nth-child(2n):color:red (alphabetical with parameterized)', () => {
		const {parsed} = assert_ok(parse_css_literal('hover:nth-child(2n):color:red', css_properties));
		assert.lengthOf(parsed.states, 2);
		// 'hover' < 'nth-child(2n)' alphabetically
		assert.equal(parsed.states[0]!.name, 'hover');
		assert.equal(parsed.states[1]!.name, 'nth-child(2n)');
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
			const {error} = assert_error(parse_css_literal(input, css_properties));
			assert.include(error.message, expected_message);
		});
	});

	describe('conflicting modifiers', () => {
		test.each<[string, string]>([
			['dark:light:color:red', 'mutually exclusive'],
			['sm:md:display:flex', 'Multiple media modifiers'],
			['before:after:content:""', 'Multiple pseudo-element'],
		])('%s → error containing "%s"', (input, expected_message) => {
			const {error} = assert_error(parse_css_literal(input, css_properties));
			assert.include(error.message, expected_message);
		});
	});

	test('unknown:color:red (unknown modifier)', () => {
		const {error} = assert_error(parse_css_literal('unknown:color:red', css_properties));
		assert.include(error.message, 'Unknown modifier');
	});

	test('hoverr:color:red (typo with suggestion)', () => {
		const {error} = assert_error(parse_css_literal('hoverr:color:red', css_properties));
		assert.include(error.message, 'Unknown modifier');
		assert.isDefined(error.suggestion);
	});

	test('dipslay:flex (typo in property with suggestion)', () => {
		const {error} = assert_error(parse_css_literal('dipslay:flex', css_properties));
		assert.include(error.message, 'Unknown CSS property');
		assert.isDefined(error.suggestion);
		assert.include(error.suggestion ?? '', 'display');
	});
});

describe('parse_css_literal - warnings', () => {
	test('width:calc(100%-20px) generates warning', () => {
		const {diagnostics} = assert_ok(parse_css_literal('width:calc(100%-20px)', css_properties));
		assert.ok(diagnostics);
		assert.lengthOf(diagnostics, 1);
		assert.equal(diagnostics[0]?.level, 'warning');
	});
});

describe('interpret_css_literal', () => {
	test('display:flex generates correct output', () => {
		const result = interpret_css_literal('display:flex', 'display\\:flex', css_properties);
		const output = assert_interpret_ok(result);
		assert.equal(output.declaration, 'display: flex;');
		assert.equal(output.selector, '.display\\:flex');
		assert.isNull(output.media_wrapper);
		assert.isNull(output.ancestor_wrapper);
	});

	test('hover:opacity:80% includes pseudo-class in selector', () => {
		const class_name = 'hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		assert.equal(output.declaration, 'opacity: 80%;');
		assert.include(output.selector, ':hover');
	});

	test('md:display:flex has media wrapper', () => {
		const class_name = 'md:display:flex';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		if (!output.media_wrapper) throw new Error('Expected media_wrapper');
		assert.include(output.media_wrapper, '@media');
		assert.include(output.media_wrapper, '48rem');
	});

	test('dark:opacity:60% has ancestor wrapper', () => {
		const class_name = 'dark:opacity:60%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		assert.equal(output.ancestor_wrapper, ':root.dark');
	});

	test('before:content:"" includes pseudo-element in selector', () => {
		const class_name = 'before:content:""';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		assert.include(output.selector, '::before');
	});

	test('md:dark:hover:before:opacity:80% has all components', () => {
		const class_name = 'md:dark:hover:before:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		if (!output.media_wrapper) throw new Error('Expected media_wrapper');
		if (!output.ancestor_wrapper) throw new Error('Expected ancestor_wrapper');
		assert.include(output.selector, ':hover');
		assert.include(output.selector, '::before');
	});
});

describe('generate_css_literal_simple', () => {
	test('simple property:value', () => {
		const result = interpret_css_literal('display:flex', 'display\\:flex', css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		assert.include(css, '.display\\:flex');
		assert.include(css, 'display: flex;');
		// Should not have wrappers
		assert.notInclude(css, '@media');
		assert.notInclude(css, ':root');
	});

	test('hover:opacity:80%', () => {
		const class_name = 'hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		assert.include(css, ':hover');
		assert.include(css, 'opacity: 80%;');
	});

	test('md:display:flex has media wrapper', () => {
		const class_name = 'md:display:flex';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		assert.include(css, '@media (width >= 48rem)');
		assert.include(css, 'display: flex;');
	});

	test('dark:opacity:60% has ancestor wrapper', () => {
		const class_name = 'dark:opacity:60%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		assert.include(css, ':root.dark');
		assert.include(css, 'opacity: 60%;');
	});

	test('md:dark:hover:opacity:80% has nested structure', () => {
		const class_name = 'md:dark:hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const result = interpret_css_literal(class_name, escaped, css_properties);
		const output = assert_interpret_ok(result);
		const css = generate_css_literal_simple(output);
		assert.include(css, '@media (width >= 48rem)');
		assert.include(css, ':root.dark');
		assert.include(css, ':hover');
		assert.include(css, 'opacity: 80%;');
	});
});

describe('suggest_css_property', () => {
	test.each([
		['dipslay', 'display'],
		['opacty', 'opacity'],
		['colr', 'color'],
	] as const)('suggests %s for %s', (typo, expected) => {
		assert.equal(suggest_css_property(typo, css_properties), expected);
	});

	test('returns null for very different strings', () => {
		assert.isNull(suggest_css_property('xyz123', css_properties));
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
		const {parsed} = assert_ok(parse_css_literal(input, css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, media_name);
		assert.include(parsed.media.css, 'width <');
		assert.equal(parsed.property, property);
		assert.equal(parsed.value, value);
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
		assert.include(css, expected_media);
		assert.include(css, expected_decl);
	});
});

describe('parse_css_literal - !important with modifiers', () => {
	test.each([
		['display:flex!important', 'display', 'flex !important'],
		['hover:opacity:100%!important', 'opacity', '100% !important'],
		['md:dark:display:block!important', 'display', 'block !important'],
		['margin:0~auto!important', 'margin', '0 auto !important'],
	] as const)('%s → property: %s, value: %s', (input, property, value) => {
		const {parsed} = assert_ok(parse_css_literal(input, css_properties));
		assert.equal(parsed.property, property);
		assert.equal(parsed.value, value);
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
		assert.include(css, expected_decl);
		if (expected_selector) assert.include(css, expected_selector);
	});
});

describe('parse_css_literal - Unicode values', () => {
	test.each([
		['content:"→"', 'content', '"→"'],
		['content:"✓"', 'content', '"✓"'],
		['before:content:"«"', 'content', '"«"'],
		['list-style-type:"•"', 'list-style-type', '"•"'],
	] as const)('%s → property: %s, value: %s', (input, property, value) => {
		const {parsed} = assert_ok(parse_css_literal(input, css_properties));
		assert.equal(parsed.property, property);
		assert.equal(parsed.value, value);
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
		assert.include(css, expected_decl);
		if (expected_selector) assert.include(css, expected_selector);
	});
});

//
// Composition Support Tests
//

// Helper to assert modifier extraction result is ok
const assert_mod_ok = (
	result: ModifierExtractionResult,
): {modifiers: ExtractedModifiers; remaining: Array<string>} => {
	assert.isTrue(result.ok, 'Expected modifier extraction to be ok');
	return result as {ok: true; modifiers: ExtractedModifiers; remaining: Array<string>};
};

// Helper to assert literal resolution result is ok
const assert_literal_ok = (
	result: LiteralResolutionResult,
): {declaration: string; warnings: Array<InterpreterDiagnostic> | null} => {
	assert.isTrue(result.ok, 'Expected literal resolution to be ok');
	return result as {ok: true; declaration: string; warnings: Array<InterpreterDiagnostic> | null};
};

// Helper to assert literal resolution result is not a literal (error with null)
const assert_literal_not_literal = (result: LiteralResolutionResult): void => {
	assert.isFalse(result.ok, 'Expected literal resolution to fail');
	// After assert.isFalse, TypeScript narrows result.ok to false
	assert.isNull(
		(result as {ok: false; error: InterpreterDiagnostic | null}).error,
		'Expected error to be null (not a literal)',
	);
};

// Helper to assert literal resolution result is error with non-null error
const assert_literal_has_error = (result: LiteralResolutionResult): InterpreterDiagnostic => {
	assert.isFalse(result.ok, 'Expected literal resolution to fail');
	// After assert.isFalse, TypeScript narrows result.ok to false
	const error_result = result as {ok: false; error: InterpreterDiagnostic | null};
	assert.isNotNull(error_result.error, 'Expected non-null error');
	return error_result.error;
};

describe('has_modifiers', () => {
	test('returns false for unmodified literal', () => {
		const {parsed} = assert_ok(parse_css_literal('display:flex', null));
		assert.isFalse(has_modifiers(parsed));
	});

	test('returns true for media modifier', () => {
		const {parsed} = assert_ok(parse_css_literal('md:display:flex', null));
		assert.isTrue(has_modifiers(parsed));
	});

	test('returns true for state modifier', () => {
		const {parsed} = assert_ok(parse_css_literal('hover:opacity:80%', null));
		assert.isTrue(has_modifiers(parsed));
	});

	test('returns true for ancestor modifier', () => {
		const {parsed} = assert_ok(parse_css_literal('dark:color:white', null));
		assert.isTrue(has_modifiers(parsed));
	});

	test('returns true for pseudo-element modifier', () => {
		const {parsed} = assert_ok(parse_css_literal('before:content:""', null));
		assert.isTrue(has_modifiers(parsed));
	});
});

describe('has_extracted_modifiers', () => {
	test('returns false for empty modifiers', () => {
		const segments = extract_segments('box');
		const {modifiers} = assert_mod_ok(extract_and_validate_modifiers(segments, 'box'));
		assert.isFalse(has_extracted_modifiers(modifiers));
	});

	test('returns true for media modifier', () => {
		const segments = extract_segments('md:box');
		const {modifiers} = assert_mod_ok(extract_and_validate_modifiers(segments, 'md:box'));
		assert.isTrue(has_extracted_modifiers(modifiers));
	});

	test('returns true for multiple state modifiers', () => {
		const segments = extract_segments('focus:hover:box');
		const {modifiers} = assert_mod_ok(extract_and_validate_modifiers(segments, 'focus:hover:box'));
		assert.isTrue(has_extracted_modifiers(modifiers));
		assert.lengthOf(modifiers.states, 2);
	});
});

describe('try_resolve_literal', () => {
	test('resolves unmodified literal', () => {
		const {declaration} = assert_literal_ok(
			try_resolve_literal('text-align:center', css_properties, 'test'),
		);
		assert.equal(declaration, 'text-align: center;');
	});

	test('resolves literal with ~ space encoding', () => {
		const {declaration} = assert_literal_ok(
			try_resolve_literal('margin:0~auto', css_properties, 'test'),
		);
		assert.equal(declaration, 'margin: 0 auto;');
	});

	test('resolves custom property', () => {
		const {declaration} = assert_literal_ok(
			try_resolve_literal('--my-color:blue', css_properties, 'test'),
		);
		assert.equal(declaration, '--my-color: blue;');
	});

	test('returns null error for non-literal class names', () => {
		assert_literal_not_literal(try_resolve_literal('p_lg', css_properties, 'test'));
	});

	test('returns error for modified literal', () => {
		const error = assert_literal_has_error(
			try_resolve_literal('hover:opacity:80%', css_properties, 'test'),
		);
		assert.include(error.message, 'cannot be used in composes array');
	});

	test('returns error for invalid property with suggestion', () => {
		const error = assert_literal_has_error(
			try_resolve_literal('disply:flex', css_properties, 'test'),
		);
		assert.include(error.message, 'Unknown CSS property');
		assert.isNotNull(error.suggestion);
		assert.include(error.suggestion, 'display');
	});

	test('modifier:token pattern returns property error (detection in resolve_composes)', () => {
		// hover:shadow_lg parses as property:value, fails property validation
		// The "modified class" detection happens earlier in resolve_composes
		const error = assert_literal_has_error(
			try_resolve_literal('hover:shadow_lg', css_properties, 'card'),
		);
		assert.include(error.message, 'Unknown CSS property');
	});

	test('returns null error for token class without colon', () => {
		assert_literal_not_literal(try_resolve_literal('box', css_properties, 'test'));
	});
});
