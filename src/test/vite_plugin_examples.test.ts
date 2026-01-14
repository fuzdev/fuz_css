/**
 * Integration tests for Vite plugin examples.
 *
 * Builds each example project and verifies that:
 * 1. The build completes successfully
 * 2. All expected CSS classes are extracted (no missing)
 * 3. No unexpected classes are generated (no extra)
 * 4. All examples produce the same set of classes (consistency)
 *
 * These tests are slower due to npm install + vite build.
 * Skip with: SKIP_EXAMPLE_TESTS=1 gro test
 *
 * @module
 */

import {test, expect, describe, beforeAll} from 'vitest';
import {join} from 'node:path';
import {readdir, readFile} from 'node:fs/promises';
import {execSync} from 'node:child_process';

import {FUZ_CSS_MARKER} from '$lib/vite_plugin_fuz_css.js';

// Skip if SKIP_EXAMPLE_TESTS is set
const SKIP = !!process.env.SKIP_EXAMPLE_TESTS;

const EXAMPLES_DIR = join(process.cwd(), 'examples');

// Build the package before running example tests so examples get fresh dist/
if (!SKIP) {
	beforeAll(() => {
		execSync('npx svelte-package', {cwd: process.cwd(), stdio: 'pipe'});
	}, 60_000); // 1 minute timeout for package build
}

/**
 * All CSS classes that should be extracted from the examples.
 * This is the single source of truth - all examples should produce this exact set.
 * Sorted alphabetically for consistent comparison.
 */
const EXPECTED_CLASSES = [
	// From App - Class Types section (Token classes)
	'p_md', // also used in main wrapper
	'bg_d_2',
	'pl_xl5',
	'font_size_lg',
	'shadow_sm',
	// From App - Class Types section (Composite classes)
	'box',
	'ellipsis',
	// From App - Class Types section (Literal classes)
	'opacity:60%',
	'color:var(--color_j_5)',
	'box-shadow:0~4px~8px~rgb(0,0,0,0.2)',
	// From example_class_utilities.ts - Naming patterns (mb_* + ml_* for plurals)
	'mb_xs5', // demoClass
	'mb_xs4', // demo_class
	'mb_xs3', // DEMO_CLASS
	'mb_xs2', // demoClasses (+ ml_xs)
	'mb_xs', // demo_classes (+ ml_sm)
	'mb_sm', // demoClassName
	'mb_md', // demo_class_name
	'mb_lg', // demoClassNames (+ ml_md), also used in Interactive row wrapper
	'mb_xl', // demo_class_names (+ ml_lg)
	'mb_xl2', // demoClassList
	'mb_xl3', // demo_class_list
	'mb_xl4', // demoClassLists (+ ml_xl)
	'mb_xl5', // demo_class_lists (+ ml_xl2)
	'ml_xs', // demoClasses (plural)
	'ml_sm', // demo_classes (plural)
	'ml_md', // demoClassNames (plural)
	'ml_lg', // demo_class_names (plural)
	'ml_xl', // demoClassLists (plural)
	'ml_xl2', // demo_class_lists (plural)
	// From example_class_utilities.ts - Expression patterns (mt_* incrementing)
	'mt_xs', // ternaryClass (true branch)
	'mt_sm', // ternaryClass (false branch)
	'mt_md', // logicalClass
	'mt_lg', // arrayClasses[0]
	'mt_xl', // arrayClasses[1]
	'mt_xl2', // objectClasses key
	'mt_xl3', // objectClasses key
	// From example_class_utilities.ts - Comment hints
	// Note: 'not-real:extracted-but-excluded' is extracted via @fuz-classes but excluded
	// from CSS output because 'not-real' fails @webref/css property validation
	'shadow_lg', // fromComment via @fuz-classes
	// From App - Layout
	'max-width:1000px',
	'mx_auto',
	'px_md',
	'md:px_xl',
	'py_xl7',
	'column',
	'gap_lg',
	'text-align:center',
	// From App - Responsive
	'gap_md',
	'md:flex-direction:row',
	'md:gap_lg',
	'min-width(543px):font_size_lg',
	'flex:1',
	// From App - Interactive (hover/active state modifiers)
	'row',
	'hover:border_color_b',
	'hover:outline_color_b',
	'active:border_color_d',
	'active:outline_color_d',
	'hover:border_color_g',
	'hover:outline_color_g',
	'active:border_color_h',
	'active:outline_color_h',
].sort();

/**
 * Finds the CSS file in Vite's build output.
 */
const find_css_file = async (dist_dir: string): Promise<string | null> => {
	const assets_dir = join(dist_dir, 'assets');
	try {
		const files = await readdir(assets_dir);
		const css_file = files.find((f) => f.endsWith('.css'));
		return css_file ? join(assets_dir, css_file) : null;
	} catch {
		return null;
	}
};

/**
 * Builds an example project.
 * @throws Error if build fails with details about the failure
 */
const build_example = (example_name: string): void => {
	const example_dir = join(EXAMPLES_DIR, example_name);
	try {
		execSync('npm install', {cwd: example_dir, stdio: 'pipe'});
		execSync('npm run build', {cwd: example_dir, stdio: 'pipe'});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to build ${example_name}: ${message}`);
	}
};

/**
 * Reads the generated CSS from an example's dist folder.
 */
const read_generated_css = async (example_name: string): Promise<string> => {
	const dist_dir = join(EXAMPLES_DIR, example_name, 'dist');
	const css_path = await find_css_file(dist_dir);
	if (!css_path) {
		throw new Error(`No CSS file found in ${dist_dir}/assets`);
	}
	return readFile(css_path, 'utf8');
};

/**
 * Extracts the fuz_css generated portion from the full CSS.
 * Returns the CSS between the marker comments.
 */
const extract_fuz_css = (css: string): string | null => {
	const start_idx = css.indexOf(FUZ_CSS_MARKER);
	const end_idx = css.lastIndexOf(FUZ_CSS_MARKER);
	if (start_idx === -1 || end_idx === -1 || start_idx === end_idx) {
		return null;
	}
	return css.slice(start_idx, end_idx + FUZ_CSS_MARKER.length);
};

/**
 * Extracts class names from CSS content.
 * Handles escaped characters in class names (colons, percent signs, parens, tildes, commas, dots).
 */
const extract_class_names = (css: string): Array<string> => {
	const classes: Set<string> = new Set();
	// Match class selectors: .classname
	// Class names can contain escaped characters like \: \% \( \) \~ \, \.
	const pattern = /\.([a-zA-Z_][a-zA-Z0-9_-]*(?:\\[:%()~,.][-a-zA-Z0-9_(),%~.]*)*)/g;
	let match;
	while ((match = pattern.exec(css)) !== null) {
		// Unescape CSS escape sequences: \: -> :, \% -> %, \( -> (, etc.
		const class_name = match[1]!.replace(/\\([:%()~,.])/g, '$1');
		classes.add(class_name);
	}
	return [...classes].sort();
};

/** Store extracted classes per example for cross-example consistency test */
const example_results: Map<string, Array<string>> = new Map();

/**
 * Creates a test suite for an example.
 */
const create_example_tests = (example_name: string, app_file: string): void => {
	describe.skipIf(SKIP)(`${example_name} example`, () => {
		let css: string;
		let fuz_css: string | null;
		let extracted_classes: Array<string>;

		beforeAll(async () => {
			build_example(example_name);
			css = await read_generated_css(example_name);
			fuz_css = extract_fuz_css(css);
			extracted_classes = fuz_css ? extract_class_names(fuz_css) : [];
			// Store for cross-example comparison
			example_results.set(example_name, extracted_classes);
		}, 120_000); // 2 minute timeout for install + build

		test('generates fuz_css section', () => {
			expect(fuz_css, 'CSS should contain fuz_css marker comments').not.toBeNull();
		});

		test(`extracts all expected classes from ${app_file} and dependencies`, () => {
			const missing = EXPECTED_CLASSES.filter((cls) => !extracted_classes.includes(cls));
			expect(missing, `Missing classes: ${missing.join(', ')}`).toEqual([]);
		});

		test('does not generate unexpected classes', () => {
			const extra = extracted_classes.filter((cls) => !EXPECTED_CLASSES.includes(cls));
			expect(extra, `Unexpected classes: ${extra.join(', ')}`).toEqual([]);
		});

		test('generates valid CSS without errors', () => {
			expect(css).not.toContain('undefined');
			expect(css).not.toContain('[object Object]');
			expect(css).not.toContain('NaN');
		});
	});
};

// Create test suites for each example
create_example_tests('vite-react', 'App.tsx');
create_example_tests('vite-preact', 'App.tsx');
create_example_tests('vite-solid', 'App.tsx');
create_example_tests('vite-svelte', 'App.svelte');

// Cross-example consistency test
describe.skipIf(SKIP)('cross-example consistency', () => {
	test('all examples produce the same classes', () => {
		const examples = [...example_results.keys()];
		expect(examples.length, 'Should have results from all 4 examples').toBe(4);

		const first_example = examples[0]!;
		const first_classes = example_results.get(first_example)!;

		for (const example of examples.slice(1)) {
			const classes = example_results.get(example)!;
			expect(classes, `${example} should produce same classes as ${first_example}`).toEqual(
				first_classes,
			);
		}
	});
});
