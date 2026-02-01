import {test, expect, describe, beforeAll} from 'vitest';

import type {ExtractionResult} from '$lib/css_class_extractor.js';

import {
	class_names_equal,
	create_jsx_extractor,
	assert_css_variables,
	assert_no_css_variables,
} from './css_class_extractor_test_helpers.js';

/**
 * JSX extractor with acorn-jsx plugin pre-configured.
 * Initialized once before all tests via beforeAll().
 */
let extract_jsx: (source: string, file?: string) => ExtractionResult;

beforeAll(async () => {
	extract_jsx = await create_jsx_extractor();
});

describe('JSX className attribute (React)', () => {
	test('extracts from static className', () => {
		const source = `
const Button = () => <button className="btn primary hover:opacity:80%">Click</button>;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['btn', 'primary', 'hover:opacity:80%']);
	});

	test('extracts from className with clsx', () => {
		const source = `
const Card = ({ active }) => (
	<div className={clsx("card", active && "active", "p_md")}>Content</div>
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['card', 'active', 'p_md']);
	});

	test('extracts from className with ternary', () => {
		const source = `
const Box = ({ big }) => <div className={big ? "large" : "small"} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['large', 'small']);
	});

	test('extracts from className with cn() utility', () => {
		const source = `
const Card = () => <div className={cn("card", "shadow_lg")} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['card', 'shadow_lg']);
	});

	test('extracts from className with logical AND', () => {
		const source = `
const Button = ({ disabled }) => (
	<button className={disabled && "opacity:50%"} />
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['opacity:50%']);
	});

	test('extracts from className with template literal', () => {
		const source = `
const Box = () => <div className={\`box \${variant}\`} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['box']);
	});

	test('extracts from multiple nested elements', () => {
		const source = `
const Layout = () => (
	<div className="container">
		<header className="header p_lg">
			<nav className="nav">Links</nav>
		</header>
		<main className="main">Content</main>
		<footer className="footer">Footer</footer>
	</div>
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['container', 'header', 'p_lg', 'nav', 'main', 'footer']);
	});

	test('extracts with TypeScript types', () => {
		const source = `
interface Props {
	variant: 'primary' | 'secondary';
}

const Button: React.FC<Props> = ({ variant }) => (
	<button className={cn("btn", variant === 'primary' && "btn-primary")}>
		Click
	</button>
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['btn', 'btn-primary']);
	});

	test('does not extract template literal fragments', () => {
		const source = `
const Icon = ({ size, color }) => (
	<svg className={clsx("icon", size && \`icon-\${size}\`, color && \`color_\${color}_5\`)} />
);
`;
		const result = extract_jsx(source);
		// Fragments like 'icon-', 'color_', '_5' are NOT extracted (incomplete tokens)
		class_names_equal(result, ['icon']);
	});
});

describe('JSX class attribute (Preact/Solid/Vue)', () => {
	test('extracts from static class attribute', () => {
		const source = `
const Button = () => <button class="btn primary">Click</button>;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['btn', 'primary']);
	});

	test('extracts from class with clsx expression', () => {
		const source = `
const Card = ({ active }) => (
	<div class={clsx("card", active && "active")}>Content</div>
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['card', 'active']);
	});

	test('extracts from class with ternary', () => {
		const source = `
const Box = ({ big }) => <div class={big ? "large" : "small"} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['large', 'small']);
	});

	test('extracts from class with template literal', () => {
		const source = `
const Box = () => <div class={\`box \${variant}\`} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['box']);
	});

	test('extracts from class with array syntax', () => {
		const source = `
const Box = ({ active }) => (
	<div class={['box', active && 'active', 'p_md']} />
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['box', 'active', 'p_md']);
	});

	test('extracts from class with object syntax', () => {
		const source = `
const Box = ({ active, disabled }) => (
	<div class={{ box: true, active, disabled, 'text-muted': disabled }} />
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['box', 'active', 'disabled', 'text-muted']);
	});
});

describe('JSX framework-specific constructs', () => {
	test('Solid: extracts from classList object syntax', () => {
		const source = `
const Toggle = ({ isOn, hasError }) => (
	<button classList={{ active: isOn, 'text-red': hasError, disabled: false }}>
		Toggle
	</button>
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['active', 'text-red', 'disabled']);
	});

	test('Solid: extracts from mixed class and classList', () => {
		const source = `
const Item = ({ selected }) => (
	<div class="item p_md" classList={{ selected, 'shade_20': selected }}>
		Item
	</div>
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['item', 'p_md', 'selected', 'shade_20']);
	});

	test('Solid: extracts from classList with string literal keys', () => {
		const source = `
const Alert = ({ type }) => (
	<div classList={{
		'alert': true,
		'alert-success': type === 'success',
		'alert-error': type === 'error',
		'p_md': true
	}} />
);
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['alert', 'alert-success', 'alert-error', 'p_md']);
	});

	test('Solid: extracts static keys from classList with spread', () => {
		const source = `
const Button = ({ variant }) => (
	<button classList={{ ...baseStyles, active: isActive, 'btn-primary': true }} />
);
`;
		const result = extract_jsx(source);
		// Spread can't be statically analyzed, but static keys are extracted
		class_names_equal(result, ['active', 'btn-primary']);
	});

	test('Solid: does not extract computed keys from classList (parameter)', () => {
		const source = `
const Dynamic = ({ className }) => (
	<div classList={{ [className]: true, 'static-class': true }} />
);
`;
		const result = extract_jsx(source);
		// Function parameters can't be statically analyzed
		class_names_equal(result, ['static-class']);
	});

	test('Solid: extracts from variable in computed key via naming convention', () => {
		const source = `
const dynamicClass = 'extracted-via-naming';
const Component = () => <div classList={{ [dynamicClass]: true, static: true }} />;
`;
		const result = extract_jsx(source);
		// dynamicClass matches *Class naming convention, so it's extracted
		// Note: computed keys don't trigger usage tracking, only naming convention works here
		class_names_equal(result, ['extracted-via-naming', 'static']);
	});

	test('extracts from variables ending in classList or class_list', () => {
		const source = `
const buttonClassList = 'btn-list';
const card_class_list = 'card-list-a card-list-b';
const Component = () => <div className="static" />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['btn-list', 'card-list-a', 'card-list-b', 'static']);
	});

	test('extracts from variables ending in classLists or class_lists', () => {
		const source = `
const buttonClassLists = ['btn-lists-a', 'btn-lists-b'];
const card_class_lists = 'card-lists';
const Component = () => <div className="static" />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['btn-lists-a', 'btn-lists-b', 'card-lists', 'static']);
	});
});

describe('JSX general', () => {
	test('extracts @fuz-classes comments in JSX files', () => {
		const source = `
// @fuz-classes dynamic-opacity opacity:50%
const Component = ({ opacity }) => (
	<div className={\`opacity:\${opacity}%\`} />
);
`;
		const result = extract_jsx(source);
		// Template literal fragments like 'opacity:' and '%' are NOT extracted
		class_names_equal(result, ['dynamic-opacity', 'opacity:50%']);
	});

	test('fails gracefully without jsx plugin on TSX files', async () => {
		// This test still needs direct import to test the no-plugin case
		const {extract_from_ts} = await import('$lib/css_class_extractor.js');
		const source = `const Button = () => <button className="btn">Click</button>;`;
		const result = extract_from_ts(source, 'component.tsx');
		expect(result.classes).toBeNull();
		expect(result.diagnostics).not.toBeNull();
		expect(result.diagnostics?.[0]?.level).toBe('warning');
	});
});

describe('JSX variable tracking', () => {
	test('tracks variable in className={foo}', () => {
		const source = `
const foo = 'my-class';
const Component = () => <div className={foo} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['my-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
	});

	test('tracks variable in class={foo} (Preact style)', () => {
		const source = `
const foo = 'my-class';
const Component = () => <div class={foo} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['my-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
	});

	test('tracks multiple variables in className={clsx(foo, bar)}', () => {
		const source = `
const foo = 'foo-class';
const bar = 'bar-class';
const Component = () => <div className={clsx(foo, bar)} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['foo-class', 'bar-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
		expect(result.tracked_vars?.has('bar')).toBe(true);
	});

	test('tracks variables in ternary className={cond ? foo : bar}', () => {
		const source = `
const foo = 'foo-class';
const bar = 'bar-class';
const Component = () => <div className={cond ? foo : bar} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['foo-class', 'bar-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
		expect(result.tracked_vars?.has('bar')).toBe(true);
	});

	test('tracks variable in logical AND className={cond && foo}', () => {
		const source = `
const foo = 'conditional-class';
const Component = () => <div className={isActive && foo} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['conditional-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
	});

	test('tracks variable with array value in className', () => {
		const source = `
const classes = ['class-a', 'class-b'];
const Component = () => <div className={clsx(classes)} />;
`;
		const result = extract_jsx(source);
		class_names_equal(result, ['class-a', 'class-b']);
	});

	test('extracts from variable in classList computed key via naming convention (Solid)', () => {
		const source = `
const activeClass = 'is-active';
const Component = () => <div classList={{ [activeClass]: isActive, base: true }} />;
`;
		const result = extract_jsx(source);
		// activeClass is extracted via naming convention (*Class pattern), not usage tracking
		// 'base' is extracted as a static key
		class_names_equal(result, ['is-active', 'base']);
	});
});

describe('JSX element detection', () => {
	test('detects lowercase HTML elements', () => {
		const source = `
const Layout = () => (
	<div className="container">
		<header>Header</header>
		<main>Content</main>
		<footer>Footer</footer>
	</div>
);
`;
		const result = extract_jsx(source);
		expect(result.elements?.has('div')).toBe(true);
		expect(result.elements?.has('header')).toBe(true);
		expect(result.elements?.has('main')).toBe(true);
		expect(result.elements?.has('footer')).toBe(true);
	});

	test('filters out PascalCase components from elements', () => {
		const source = `
import Button from './Button';
import Card from './Card';

const App = () => (
	<div>
		<Button className="btn">Click</Button>
		<Card>
			<span>Content</span>
		</Card>
	</div>
);
`;
		const result = extract_jsx(source);
		// Lowercase elements should be detected
		expect(result.elements?.has('div')).toBe(true);
		expect(result.elements?.has('span')).toBe(true);
		// PascalCase components should NOT be detected as elements
		expect(result.elements?.has('Button')).toBe(false);
		expect(result.elements?.has('Card')).toBe(false);
		expect(result.elements?.has('App')).toBe(false);
	});

	test('handles JSX fragments', () => {
		const source = `
const List = () => (
	<>
		<ul>
			<li>Item 1</li>
			<li>Item 2</li>
		</ul>
	</>
);
`;
		const result = extract_jsx(source);
		expect(result.elements?.has('ul')).toBe(true);
		expect(result.elements?.has('li')).toBe(true);
		// Fragments don't have a tag name
	});

	test('detects SVG elements in JSX', () => {
		const source = `
const Icon = () => (
	<svg viewBox="0 0 100 100" className="icon">
		<circle cx="50" cy="50" r="40" />
		<path d="M10 10" />
	</svg>
);
`;
		const result = extract_jsx(source);
		expect(result.elements?.has('svg')).toBe(true);
		expect(result.elements?.has('circle')).toBe(true);
		expect(result.elements?.has('path')).toBe(true);
	});

	test('detects custom elements with dashes in JSX', () => {
		const source = `
const App = () => (
	<div>
		<my-button>Click</my-button>
		<custom-card>Content</custom-card>
	</div>
);
`;
		const result = extract_jsx(source);
		expect(result.elements?.has('div')).toBe(true);
		expect(result.elements?.has('my-button')).toBe(true);
		expect(result.elements?.has('custom-card')).toBe(true);
	});

	test('distinguishes HTML elements from React built-ins', () => {
		const source = `
import { Suspense, Fragment } from 'react';

const App = () => (
	<Suspense fallback={<div>Loading...</div>}>
		<Fragment>
			<section>Content</section>
		</Fragment>
	</Suspense>
);
`;
		const result = extract_jsx(source);
		// Lowercase elements are detected
		expect(result.elements?.has('div')).toBe(true);
		expect(result.elements?.has('section')).toBe(true);
		// PascalCase React built-ins are NOT detected
		expect(result.elements?.has('Suspense')).toBe(false);
		expect(result.elements?.has('Fragment')).toBe(false);
	});

	test('returns null elements when no HTML elements present', () => {
		const source = `
import Button from './Button';
import Card from './Card';

// Only components, no HTML elements
const App = () => (
	<Button>
		<Card>Content</Card>
	</Button>
);
`;
		const result = extract_jsx(source);
		// No lowercase elements, so elements should be null
		expect(result.elements).toBeNull();
	});
});

describe('JSX CSS variable extraction', () => {
	describe('string style attribute', () => {
		test('extracts single variable from style="..."', () => {
			const source = `const Box = () => <div style="color: var(--text_color)" />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['text_color']);
		});

		test('extracts multiple variables from style string', () => {
			const source = `const Box = () => <div style="color: var(--fg); background: var(--bg)" />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['fg', 'bg']);
		});

		test('extracts variable with fallback', () => {
			const source = `const Box = () => <div style="color: var(--primary, blue)" />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['primary']);
		});

		test('extracts nested variable fallbacks', () => {
			const source = `const Box = () => <div style="color: var(--a, var(--b, var(--c)))" />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['a', 'b', 'c']);
		});

		test('extracts variable in calc()', () => {
			const source = `const Box = () => <div style="width: calc(100% - var(--sidebar))" />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['sidebar']);
		});

		test('deduplicates repeated variables', () => {
			const source = `const Box = () => <div style="color: var(--theme); background: var(--theme)" />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['theme']);
		});
	});

	describe('object style attribute', () => {
		test('extracts single variable from style={{ }}', () => {
			const source = `const Box = () => <div style={{ color: 'var(--text_color)' }} />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['text_color']);
		});

		test('extracts multiple variables from object style', () => {
			const source = `const Box = () => <div style={{ color: 'var(--fg)', background: 'var(--bg)' }} />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['fg', 'bg']);
		});

		test('extracts variable with fallback in object style', () => {
			const source = `const Box = () => <div style={{ color: 'var(--primary, red)' }} />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['primary']);
		});

		test('extracts from camelCase CSS properties', () => {
			const source = `const Box = () => <div style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }} />;`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['bg', 'border']);
		});
	});

	describe('edge cases', () => {
		test('no variables in empty style', () => {
			const source = `const Box = () => <div style="" />;`;
			const result = extract_jsx(source);
			assert_no_css_variables(result);
		});

		test('no variables in style without var()', () => {
			const source = `const Box = () => <div style="color: red" />;`;
			const result = extract_jsx(source);
			assert_no_css_variables(result);
		});

		test('no variables in object style without var()', () => {
			const source = `const Box = () => <div style={{ color: 'red' }} />;`;
			const result = extract_jsx(source);
			assert_no_css_variables(result);
		});

		test('extracts from multiple elements', () => {
			const source = `
const App = () => (
	<>
		<div style="color: var(--a)" />
		<span style={{ background: 'var(--b)' }} />
	</>
);
`;
			const result = extract_jsx(source);
			assert_css_variables(result, ['a', 'b']);
		});

		test('combines classes and CSS variables extraction', () => {
			const source = `const Box = () => <div className="p_md" style="color: var(--text)" />;`;
			const result = extract_jsx(source);
			class_names_equal(result, ['p_md']);
			assert_css_variables(result, ['text']);
		});
	});
});
