import {test, expect, describe} from 'vitest';

import {extract_from_ts} from '$lib/css_class_extractor.js';

import {class_names_equal} from './css_class_extractor_test_helpers.js';

describe('JSX className attribute (React)', () => {
	test('extracts from static className', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Button = () => <button className="btn primary hover:opacity:80%">Click</button>;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['btn', 'primary', 'hover:opacity:80%']);
	});

	test('extracts from className with clsx', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Card = ({ active }) => (
	<div className={clsx("card", active && "active", "p_md")}>Content</div>
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['card', 'active', 'p_md']);
	});

	test('extracts from className with ternary', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Box = ({ big }) => <div className={big ? "large" : "small"} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['large', 'small']);
	});

	test('extracts from className with cn() utility', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Card = () => <div className={cn("card", "shadow_lg")} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['card', 'shadow_lg']);
	});

	test('extracts from className with logical AND', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Button = ({ disabled }) => (
	<button className={disabled && "opacity:50%"} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['opacity:50%']);
	});

	test('extracts from className with template literal', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Box = () => <div className={\`box \${variant}\`} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['box']);
	});

	test('extracts from multiple nested elements', async () => {
		const jsx = (await import('acorn-jsx')).default;
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
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['container', 'header', 'p_lg', 'nav', 'main', 'footer']);
	});

	test('extracts with TypeScript types', async () => {
		const jsx = (await import('acorn-jsx')).default;
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
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['btn', 'btn-primary']);
	});

	test('does not extract template literal fragments', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Icon = ({ size, color }) => (
	<svg className={clsx("icon", size && \`icon-\${size}\`, color && \`color_\${color}_5\`)} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		// Fragments like 'icon-', 'color_', '_5' are NOT extracted (incomplete tokens)
		class_names_equal(result, ['icon']);
	});
});

describe('JSX class attribute (Preact/Solid/Vue)', () => {
	test('extracts from static class attribute', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Button = () => <button class="btn primary">Click</button>;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['btn', 'primary']);
	});

	test('extracts from class with clsx expression', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Card = ({ active }) => (
	<div class={clsx("card", active && "active")}>Content</div>
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['card', 'active']);
	});

	test('extracts from class with ternary', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Box = ({ big }) => <div class={big ? "large" : "small"} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['large', 'small']);
	});

	test('extracts from class with template literal', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Box = () => <div class={\`box \${variant}\`} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['box']);
	});

	test('extracts from class with array syntax', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Box = ({ active }) => (
	<div class={['box', active && 'active', 'p_md']} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['box', 'active', 'p_md']);
	});

	test('extracts from class with object syntax', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Box = ({ active, disabled }) => (
	<div class={{ box: true, active, disabled, 'text-muted': disabled }} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['box', 'active', 'disabled', 'text-muted']);
	});
});

describe('JSX framework-specific constructs', () => {
	test('Solid: extracts from classList object syntax', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Toggle = ({ isOn, hasError }) => (
	<button classList={{ active: isOn, 'text-red': hasError, disabled: false }}>
		Toggle
	</button>
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['active', 'text-red', 'disabled']);
	});

	test('Solid: extracts from mixed class and classList', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Item = ({ selected }) => (
	<div class="item p_md" classList={{ selected, 'shade_20': selected }}>
		Item
	</div>
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['item', 'p_md', 'selected', 'shade_20']);
	});

	test('Solid: extracts from classList with string literal keys', async () => {
		const jsx = (await import('acorn-jsx')).default;
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
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['alert', 'alert-success', 'alert-error', 'p_md']);
	});

	test('Solid: extracts static keys from classList with spread', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Button = ({ variant }) => (
	<button classList={{ ...baseStyles, active: isActive, 'btn-primary': true }} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		// Spread can't be statically analyzed, but static keys are extracted
		class_names_equal(result, ['active', 'btn-primary']);
	});

	test('Solid: does not extract computed keys from classList (parameter)', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const Dynamic = ({ className }) => (
	<div classList={{ [className]: true, 'static-class': true }} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		// Function parameters can't be statically analyzed
		class_names_equal(result, ['static-class']);
	});

	test('Solid: extracts from variable in computed key via naming convention', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const dynamicClass = 'extracted-via-naming';
const Component = () => <div classList={{ [dynamicClass]: true, static: true }} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		// dynamicClass matches *Class naming convention, so it's extracted
		// Note: computed keys don't trigger usage tracking, only naming convention works here
		class_names_equal(result, ['extracted-via-naming', 'static']);
	});

	test('extracts from variables ending in classList or class_list', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const buttonClassList = 'btn-list';
const card_class_list = 'card-list-a card-list-b';
const Component = () => <div className="static" />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['btn-list', 'card-list-a', 'card-list-b', 'static']);
	});

	test('extracts from variables ending in classLists or class_lists', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const buttonClassLists = ['btn-lists-a', 'btn-lists-b'];
const card_class_lists = 'card-lists';
const Component = () => <div className="static" />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['btn-lists-a', 'btn-lists-b', 'card-lists', 'static']);
	});
});

describe('JSX general', () => {
	test('extracts @fuz-classes comments in JSX files', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
// @fuz-classes dynamic-opacity opacity:50%
const Component = ({ opacity }) => (
	<div className={\`opacity:\${opacity}%\`} />
);
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		// Template literal fragments like 'opacity:' and '%' are NOT extracted
		class_names_equal(result, ['dynamic-opacity', 'opacity:50%']);
	});

	test('fails gracefully without jsx plugin on TSX files', () => {
		const source = `const Button = () => <button className="btn">Click</button>;`;
		const result = extract_from_ts(source, 'component.tsx');
		expect(result.classes).toBeNull();
		expect(result.diagnostics).not.toBeNull();
		expect(result.diagnostics?.[0]?.level).toBe('warning');
	});
});

describe('JSX variable tracking', () => {
	test('tracks variable in className={foo}', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const foo = 'my-class';
const Component = () => <div className={foo} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['my-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
	});

	test('tracks variable in class={foo} (Preact style)', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const foo = 'my-class';
const Component = () => <div class={foo} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['my-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
	});

	test('tracks multiple variables in className={clsx(foo, bar)}', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const foo = 'foo-class';
const bar = 'bar-class';
const Component = () => <div className={clsx(foo, bar)} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['foo-class', 'bar-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
		expect(result.tracked_vars?.has('bar')).toBe(true);
	});

	test('tracks variables in ternary className={cond ? foo : bar}', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const foo = 'foo-class';
const bar = 'bar-class';
const Component = () => <div className={cond ? foo : bar} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['foo-class', 'bar-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
		expect(result.tracked_vars?.has('bar')).toBe(true);
	});

	test('tracks variable in logical AND className={cond && foo}', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const foo = 'conditional-class';
const Component = () => <div className={isActive && foo} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['conditional-class']);
		expect(result.tracked_vars?.has('foo')).toBe(true);
	});

	test('tracks variable with array value in className', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const classes = ['class-a', 'class-b'];
const Component = () => <div className={clsx(classes)} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		class_names_equal(result, ['class-a', 'class-b']);
	});

	test('extracts from variable in classList computed key via naming convention (Solid)', async () => {
		const jsx = (await import('acorn-jsx')).default;
		const source = `
const activeClass = 'is-active';
const Component = () => <div classList={{ [activeClass]: isActive, base: true }} />;
`;
		const result = extract_from_ts(source, 'component.tsx', [jsx()]);
		// activeClass is extracted via naming convention (*Class pattern), not usage tracking
		// 'base' is extracted as a static key
		class_names_equal(result, ['is-active', 'base']);
	});
});
