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
	type ParsedCssLiteral,
} from '$lib/css_literal.js';
import {escape_css_selector, type CssClassDiagnostic} from '$lib/css_class_generation.js';
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
): {parsed: ParsedCssLiteral; diagnostics: Array<CssClassDiagnostic>} => {
	assert.isTrue(result.ok, 'Expected parse result to be ok');
	return result as {ok: true; parsed: ParsedCssLiteral; diagnostics: Array<CssClassDiagnostic>};
};

// Helper to assert result is error
const assert_error = (
	result: ReturnType<typeof parse_css_literal>,
): {error: CssClassDiagnostic} => {
	assert.isFalse(result.ok, 'Expected parse result to be error');
	return result as {ok: false; error: CssClassDiagnostic};
};

describe('is_possible_css_literal', () => {
	const positive_cases = [
		'display:flex',
		'opacity:80%',
		'hover:opacity:80%',
		'md:display:flex',
		'md:dark:hover:opacity:80%',
		'margin:0~auto',
		'width:calc(100%-20px)',
		'--custom-prop:value',
		'nth-child(2n):color:red',
		'min-width(800px):display:flex',
	];

	for (const input of positive_cases) {
		test(`should recognize "${input}" as possible CSS-literal`, () => {
			assert.isTrue(is_possible_css_literal(input));
		});
	}

	const negative_cases = [
		'opacity_50', // underscore pattern
		'color_a_5', // underscore pattern
		'box', // no colon
		'p_md', // underscore pattern
		'', // empty
		':', // just colon
		'display:', // empty value
		':flex', // empty property
	];

	for (const input of negative_cases) {
		test(`should reject "${input}" as not CSS-literal`, () => {
			assert.isFalse(is_possible_css_literal(input));
		});
	}
});

describe('extract_segments', () => {
	const cases: Array<[string, Array<string>]> = [
		['display:flex', ['display', 'flex']],
		['hover:opacity:80%', ['hover', 'opacity', '80%']],
		['md:dark:hover:opacity:80%', ['md', 'dark', 'hover', 'opacity', '80%']],
		['nth-child(2n+1):color:red', ['nth-child(2n+1)', 'color', 'red']],
		['width:calc(100%-20px)', ['width', 'calc(100%-20px)']],
		['min-width(800px):display:flex', ['min-width(800px)', 'display', 'flex']],
		['before:content:""', ['before', 'content', '""']],
		// Nested parentheses
		['width:calc(min(100%,500px))', ['width', 'calc(min(100%,500px))']],
	];

	for (const [input, expected] of cases) {
		test(`extract_segments("${input}") → ${JSON.stringify(expected)}`, () => {
			assert.deepEqual(extract_segments(input), expected);
		});
	}
});

describe('format_css_value', () => {
	const cases: Array<[string, string]> = [
		['flex', 'flex'],
		['80%', '80%'],
		['0~auto', '0 auto'],
		['1px~solid~red', '1px solid red'],
		['flex!important', 'flex !important'],
		['0~auto!important', '0 auto !important'],
		['calc(100%~-~20px)', 'calc(100% - 20px)'],
	];

	for (const [input, expected] of cases) {
		test(`format_css_value("${input}") → "${expected}"`, () => {
			assert.equal(format_css_value(input), expected);
		});
	}
});

describe('check_calc_expression', () => {
	const warning_cases = ['calc(100%-20px)', 'calc(50%+10px)', 'calc(100vh-4rem)'];

	for (const input of warning_cases) {
		test(`should warn about "${input}"`, () => {
			assert.isNotNull(check_calc_expression(input));
		});
	}

	const ok_cases = [
		'calc(100% - 20px)', // proper spaces
		'calc(100%*2)', // multiplication doesn't need spaces
		'calc(100%/2)', // division doesn't need spaces
		'100%', // not calc
		'flex', // not calc
	];

	for (const input of ok_cases) {
		test(`should not warn about "${input}"`, () => {
			assert.isNull(check_calc_expression(input));
		});
	}
});

describe('get_modifier', () => {
	const cases: Array<[string, string | null]> = [
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
		// Unknown
		['unknown', null],
		['notamodifier', null],
	];

	for (const [name, expected_type] of cases) {
		test(`get_modifier("${name}") → type: ${expected_type}`, () => {
			const modifier = get_modifier(name);
			if (expected_type === null) {
				assert.isNull(modifier);
			} else {
				if (!modifier) throw new Error('Expected modifier');
				assert.equal(modifier.type, expected_type);
			}
		});
	}
});

describe('parse_arbitrary_breakpoint', () => {
	const cases: Array<[string, string | null]> = [
		['min-width(800px)', '@media (width >= 800px)'],
		['max-width(600px)', '@media (width < 600px)'],
		['min-width(50rem)', '@media (width >= 50rem)'],
		['max-width(100vw)', '@media (width < 100vw)'],
		['sm', null],
		['md', null],
		['hover', null],
	];

	for (const [input, expected] of cases) {
		test(`parse_arbitrary_breakpoint("${input}") → ${expected}`, () => {
			assert.equal(parse_arbitrary_breakpoint(input), expected);
		});
	}
});

describe('parse_parameterized_state', () => {
	const cases: Array<[string, {css: string} | null]> = [
		['nth-child(2n)', {css: ':nth-child(2n)'}],
		['nth-child(2n+1)', {css: ':nth-child(2n+1)'}],
		['nth-child(odd)', {css: ':nth-child(odd)'}],
		['nth-of-type(3)', {css: ':nth-of-type(3)'}],
		['nth-of-type(2n)', {css: ':nth-of-type(2n)'}],
		['hover', null],
		['first', null],
	];

	for (const [input, expected] of cases) {
		test(`parse_parameterized_state("${input}")`, () => {
			const result = parse_parameterized_state(input);
			if (expected === null) {
				assert.isNull(result);
			} else {
				if (!result) throw new Error('Expected result');
				assert.equal(result.css, expected.css);
			}
		});
	}
});

describe('parse_css_literal - valid cases', () => {
	const cases: Array<[string, {property: string; value: string}]> = [
		['display:flex', {property: 'display', value: 'flex'}],
		['opacity:80%', {property: 'opacity', value: '80%'}],
		['margin:0~auto', {property: 'margin', value: '0 auto'}],
		['color:red', {property: 'color', value: 'red'}],
		['font-size:16px', {property: 'font-size', value: '16px'}],
		['z-index:100', {property: 'z-index', value: '100'}],
		['--custom-prop:value', {property: '--custom-prop', value: 'value'}],
	];

	for (const [input, expected] of cases) {
		test(`parse_css_literal("${input}") → property: ${expected.property}, value: ${expected.value}`, () => {
			const {parsed} = assert_ok(parse_css_literal(input, css_properties));
			assert.equal(parsed.property, expected.property);
			assert.equal(parsed.value, expected.value);
		});
	}
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
	test('hover:focus:color:red (wrong order - should be focus:hover)', () => {
		const {error} = assert_error(parse_css_literal('hover:focus:color:red', css_properties));
		assert.include(error.message, 'alphabetical order');
	});

	test('dark:md:display:none (ancestor before media)', () => {
		const {error} = assert_error(parse_css_literal('dark:md:display:none', css_properties));
		assert.include(error.message, 'Media modifier must come before');
	});

	test('hover:dark:display:none (state before ancestor)', () => {
		const {error} = assert_error(parse_css_literal('hover:dark:display:none', css_properties));
		assert.include(error.message, 'Ancestor modifier must come before');
	});

	test('before:hover:opacity:100% (pseudo-element before state)', () => {
		const {error} = assert_error(parse_css_literal('before:hover:opacity:100%', css_properties));
		assert.include(error.message, 'State modifiers must come before');
	});

	test('dark:light:color:red (mutually exclusive)', () => {
		const {error} = assert_error(parse_css_literal('dark:light:color:red', css_properties));
		assert.include(error.message, 'mutually exclusive');
	});

	test('sm:md:display:flex (multiple media modifiers)', () => {
		const {error} = assert_error(parse_css_literal('sm:md:display:flex', css_properties));
		assert.include(error.message, 'Multiple media modifiers');
	});

	test('before:after:content:"" (multiple pseudo-elements)', () => {
		const {error} = assert_error(parse_css_literal('before:after:content:""', css_properties));
		assert.include(error.message, 'Multiple pseudo-element');
	});

	test('unknown:color:red (unknown modifier)', () => {
		const {error} = assert_error(parse_css_literal('unknown:color:red', css_properties));
		assert.include(error.message, 'Unknown modifier');
	});

	test('hoverr:color:red (typo with suggestion)', () => {
		const {error} = assert_error(parse_css_literal('hoverr:color:red', css_properties));
		assert.include(error.message, 'Unknown modifier');
		// Should suggest 'hover'
		assert.isDefined(error.suggestion);
	});

	test('dipslay:flex (typo in property)', () => {
		const {error} = assert_error(parse_css_literal('dipslay:flex', css_properties));
		assert.include(error.message, 'Unknown CSS property');
		// Should suggest 'display'
		assert.isDefined(error.suggestion);
		assert.include(error.suggestion ?? '', 'display');
	});

	test('nth-child(2n):hover:color:red (wrong state order with parameterized)', () => {
		const {error} = assert_error(
			parse_css_literal('nth-child(2n):hover:color:red', css_properties),
		);
		assert.include(error.message, 'alphabetical order');
	});
});

describe('parse_css_literal - warnings', () => {
	test('width:calc(100%-20px) generates warning', () => {
		const {diagnostics} = assert_ok(parse_css_literal('width:calc(100%-20px)', css_properties));
		assert.isTrue(diagnostics.length > 0);
		assert.equal(diagnostics[0]?.level, 'warning');
	});
});

describe('interpret_css_literal', () => {
	test('display:flex generates correct output', () => {
		const output = interpret_css_literal('display:flex', 'display\\:flex', css_properties);
		if (!output) throw new Error('Expected output');
		assert.equal(output.declaration, 'display: flex;');
		assert.equal(output.selector, '.display\\:flex');
		assert.isNull(output.media_wrapper);
		assert.isNull(output.ancestor_wrapper);
	});

	test('hover:opacity:80% includes pseudo-class in selector', () => {
		const class_name = 'hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		assert.equal(output.declaration, 'opacity: 80%;');
		assert.include(output.selector, ':hover');
	});

	test('md:display:flex has media wrapper', () => {
		const class_name = 'md:display:flex';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		if (!output.media_wrapper) throw new Error('Expected media_wrapper');
		assert.include(output.media_wrapper, '@media');
		assert.include(output.media_wrapper, '48rem');
	});

	test('dark:opacity:60% has ancestor wrapper', () => {
		const class_name = 'dark:opacity:60%';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		assert.equal(output.ancestor_wrapper, ':root.dark');
	});

	test('before:content:"" includes pseudo-element in selector', () => {
		const class_name = 'before:content:""';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		assert.include(output.selector, '::before');
	});

	test('md:dark:hover:before:opacity:80% has all components', () => {
		const class_name = 'md:dark:hover:before:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		if (!output.media_wrapper) throw new Error('Expected media_wrapper');
		if (!output.ancestor_wrapper) throw new Error('Expected ancestor_wrapper');
		assert.include(output.selector, ':hover');
		assert.include(output.selector, '::before');
	});
});

describe('generate_css_literal_simple', () => {
	test('simple property:value', () => {
		const output = interpret_css_literal('display:flex', 'display\\:flex', css_properties);
		if (!output) throw new Error('Expected output');
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
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, ':hover');
		assert.include(css, 'opacity: 80%;');
	});

	test('md:display:flex has media wrapper', () => {
		const class_name = 'md:display:flex';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, '@media (width >= 48rem)');
		assert.include(css, 'display: flex;');
	});

	test('dark:opacity:60% has ancestor wrapper', () => {
		const class_name = 'dark:opacity:60%';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, ':root.dark');
		assert.include(css, 'opacity: 60%;');
	});

	test('md:dark:hover:opacity:80% has nested structure', () => {
		const class_name = 'md:dark:hover:opacity:80%';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, '@media (width >= 48rem)');
		assert.include(css, ':root.dark');
		assert.include(css, ':hover');
		assert.include(css, 'opacity: 80%;');
	});
});

describe('suggest_css_property', () => {
	test('suggests display for dipslay', () => {
		const suggestion = suggest_css_property('dipslay', css_properties);
		assert.equal(suggestion, 'display');
	});

	test('suggests opacity for opacty', () => {
		const suggestion = suggest_css_property('opacty', css_properties);
		assert.equal(suggestion, 'opacity');
	});

	test('suggests color for colr', () => {
		const suggestion = suggest_css_property('colr', css_properties);
		assert.equal(suggestion, 'color');
	});

	test('returns null for very different strings', () => {
		const suggestion = suggest_css_property('xyz123', css_properties);
		assert.isNull(suggestion);
	});
});

describe('parse_css_literal - max breakpoints', () => {
	test('max-sm:display:none', () => {
		const {parsed} = assert_ok(parse_css_literal('max-sm:display:none', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'max-sm');
		assert.include(parsed.media.css, 'width <');
		assert.equal(parsed.property, 'display');
		assert.equal(parsed.value, 'none');
	});

	test('max-md:flex-direction:column', () => {
		const {parsed} = assert_ok(parse_css_literal('max-md:flex-direction:column', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'max-md');
		assert.include(parsed.media.css, '48rem');
	});

	test('max-lg:padding:1rem', () => {
		const {parsed} = assert_ok(parse_css_literal('max-lg:padding:1rem', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'max-lg');
	});

	test('max-xl:gap:0', () => {
		const {parsed} = assert_ok(parse_css_literal('max-xl:gap:0', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'max-xl');
	});

	test('max-2xl:margin:auto', () => {
		const {parsed} = assert_ok(parse_css_literal('max-2xl:margin:auto', css_properties));
		if (!parsed.media) throw new Error('Expected media');
		assert.equal(parsed.media.name, 'max-2xl');
	});
});

describe('generate_css_literal_simple - max breakpoints', () => {
	test('max-sm generates correct media query', () => {
		const class_name = 'max-sm:display:none';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, '@media (width < 40rem)');
		assert.include(css, 'display: none;');
	});

	test('max-lg generates correct media query', () => {
		const class_name = 'max-lg:opacity:50%';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, '@media (width < 64rem)');
	});
});

describe('parse_css_literal - !important with modifiers', () => {
	test('display:flex!important', () => {
		const {parsed} = assert_ok(parse_css_literal('display:flex!important', css_properties));
		assert.equal(parsed.property, 'display');
		assert.equal(parsed.value, 'flex !important');
	});

	test('hover:opacity:100%!important', () => {
		const {parsed} = assert_ok(parse_css_literal('hover:opacity:100%!important', css_properties));
		assert.lengthOf(parsed.states, 1);
		assert.equal(parsed.states[0]!.name, 'hover');
		assert.equal(parsed.property, 'opacity');
		assert.equal(parsed.value, '100% !important');
	});

	test('md:dark:display:block!important', () => {
		const {parsed} = assert_ok(
			parse_css_literal('md:dark:display:block!important', css_properties),
		);
		if (!parsed.media) throw new Error('Expected media');
		if (!parsed.ancestor) throw new Error('Expected ancestor');
		assert.equal(parsed.value, 'block !important');
	});

	test('margin:0~auto!important', () => {
		const {parsed} = assert_ok(parse_css_literal('margin:0~auto!important', css_properties));
		assert.equal(parsed.value, '0 auto !important');
	});
});

describe('generate_css_literal_simple - !important', () => {
	test('renders !important correctly', () => {
		const class_name = 'display:flex!important';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, 'display: flex !important;');
	});

	test('hover:color:red!important renders correctly', () => {
		const class_name = 'hover:color:red!important';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, ':hover');
		assert.include(css, 'color: red !important;');
	});
});

describe('parse_css_literal - Unicode values', () => {
	test('content with Unicode arrow', () => {
		const {parsed} = assert_ok(parse_css_literal('content:"→"', css_properties));
		assert.equal(parsed.property, 'content');
		assert.equal(parsed.value, '"→"');
	});

	test('content with emoji', () => {
		const {parsed} = assert_ok(parse_css_literal('content:"✓"', css_properties));
		assert.equal(parsed.property, 'content');
		assert.equal(parsed.value, '"✓"');
	});

	test('before:content with Unicode', () => {
		const {parsed} = assert_ok(parse_css_literal('before:content:"«"', css_properties));
		if (!parsed.pseudo_element) throw new Error('Expected pseudo_element');
		assert.equal(parsed.pseudo_element.name, 'before');
		assert.equal(parsed.value, '"«"');
	});

	test('list-style-type with Unicode', () => {
		const {parsed} = assert_ok(parse_css_literal('list-style-type:"•"', css_properties));
		assert.equal(parsed.property, 'list-style-type');
		assert.equal(parsed.value, '"•"');
	});
});

describe('generate_css_literal_simple - Unicode', () => {
	test('renders Unicode content correctly', () => {
		const class_name = 'content:"→"';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, 'content: "→";');
	});

	test('before:content:"✓" renders correctly', () => {
		const class_name = 'before:content:"✓"';
		const escaped = escape_css_selector(class_name);
		const output = interpret_css_literal(class_name, escaped, css_properties);
		if (!output) throw new Error('Expected output');
		const css = generate_css_literal_simple(output);
		assert.include(css, '::before');
		assert.include(css, 'content: "✓";');
	});
});
