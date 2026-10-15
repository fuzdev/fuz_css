/**
 * Integration tests for Vite plugin examples.
 *
 * Builds each example project and verifies that:
 * 1. The build completes successfully
 * 2. All expected CSS classes are extracted (no missing)
 * 3. No unexpected classes are generated (no extra)
 * 4. All examples produce the same set of classes (consistency)
 * 5. A packed tarball installs and builds in a clean directory, the way
 *    consumers get it (the examples resolve `file:../..`, which finds the
 *    repo's own `node_modules` and hides undeclared dependencies)
 *
 * These tests are slower due to npm install + vite build.
 * Skip with: SKIP_EXAMPLE_TESTS=1 gro test
 *
 * @module
 */

import { test, assert, describe, beforeAll, afterAll } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';

import { FUZ_CSS_PLACEHOLDER } from '#lib/css_placeholder_splice.ts';

// Skip if SKIP_EXAMPLE_TESTS is set
const SKIP = !!process.env.SKIP_EXAMPLE_TESTS;

const EXAMPLES_DIR = join(process.cwd(), 'examples');

// Build the package before running example tests so examples get fresh dist/
if (!SKIP) {
	beforeAll(async () => {
		execSync('npx svelte-package', { cwd: process.cwd(), stdio: 'pipe' });
		// `svelte-package` leaves relative `.ts` specifiers in `dist`; with
		// `rewriteRelativeImportExtensions: false` tsc no longer rewrites them, so the
		// gro dist-rewrite pass (which `gro build` runs after svelte-package) must run
		// here too - otherwise the examples can't resolve the freshly-packaged dist.
		const { rewrite_dist_imports } = await import('@fuzdev/gro/dist_rewrite_imports.ts');
		await rewrite_dist_imports(join(process.cwd(), 'dist'));
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
	'bg_d_20',
	'pl_xl5',
	'font_size_lg',
	'shadow_sm',
	// From App - Class Types section (Composite classes)
	'box',
	'ellipsis',
	// From App - Class Types section (Literal classes)
	'opacity:60%',
	'color:var(--palette_j_50)',
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
	'hover:border_b_50',
	'hover:outline_b_50',
	'active:border_d_50',
	'active:outline_d_50',
	'hover:border_g_50',
	'hover:outline_g_50',
	'active:border_h_50',
	'active:outline_h_50'
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
 * Runs a project's build, returning its log with stderr merged in, where
 * Vite writes the plugin's warnings.
 *
 * @throws Error - when the build fails, with its log
 */
const run_build = (cwd: string): string => {
	try {
		return execSync('npm run build 2>&1', { cwd, stdio: 'pipe' }).toString();
	} catch (err) {
		const output = (err as { stdout?: Buffer | string | null }).stdout;
		throw new Error(`${to_error_message(err)}\n${output?.toString() ?? ''}`);
	}
};

/**
 * Asserts a build went through the restatement, not the fallback splice,
 * which also produces a `fuz.utilities` layer: no plugin warning in its log
 * and no placeholder left in its CSS.
 */
const assert_restated_build = (build_log: string, css: string): void => {
	assert.notInclude(build_log, '[fuz_css]', 'the build logs no fuz_css warning');
	assert.notInclude(css, FUZ_CSS_PLACEHOLDER, 'the emitted CSS holds no placeholder');
};

/**
 * Builds an example project.
 * @returns the build's log
 * @throws Error if build fails with details about the failure
 */
const build_example = (example_name: string): string => {
	const example_dir = join(EXAMPLES_DIR, example_name);
	try {
		execSync('npm install', { cwd: example_dir, stdio: 'pipe' });
		return run_build(example_dir);
	} catch (err) {
		const message = to_error_message(err);
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
 * Extracts the generated utility classes from a built stylesheet: the
 * `fuz.utilities` layer block, which survives minification where comments
 * don't.
 */
const extract_fuz_css = (css: string): string | null => {
	const match = /@layer fuz\.utilities\s*\{/.exec(css);
	if (!match) return null;
	let depth = 0;
	for (let i = match.index + match[0].length - 1; i < css.length; i++) {
		if (css[i] === '{') depth++;
		else if (css[i] === '}' && --depth === 0) return css.slice(match.index, i + 1);
	}
	return null;
};

/**
 * Extracts class names from CSS content.
 * Handles escaped characters in class names (colons, percent signs, parens, tildes, commas, dots).
 */
const extract_class_names = (css: string): Array<string> => {
	// strip @layer preludes so `fuz.utilities` doesn't read as a `.utilities` class
	const without_layer_preludes = css.replaceAll(/@layer[^{;]*[{;]/g, '');
	const classes: Set<string> = new Set();
	// Match class selectors: .classname
	// Class names can contain escaped characters like \: \% \( \) \~ \, \.
	const pattern = /\.([a-zA-Z_][a-zA-Z0-9_-]*(?:\\[:%()~,.][-a-zA-Z0-9_(),%~.]*)*)/g;
	let match;
	while ((match = pattern.exec(without_layer_preludes)) !== null) {
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
		let build_log: string;
		let fuz_css: string | null;
		let extracted_classes: Array<string>;

		beforeAll(async () => {
			build_log = build_example(example_name);
			css = await read_generated_css(example_name);
			fuz_css = extract_fuz_css(css);
			extracted_classes = fuz_css ? extract_class_names(fuz_css) : [];
			// Store for cross-example comparison
			example_results.set(example_name, extracted_classes);
		}, 120_000); // 2 minute timeout for install + build

		test('generates fuz_css section', () => {
			assert.isNotNull(fuz_css, 'CSS should contain the fuz.utilities layer');
		});

		test("runs the generated CSS through Vite's pipeline", () => {
			assert_restated_build(build_log, css);
		});

		test(`extracts all expected classes from ${app_file} and dependencies`, () => {
			const missing = EXPECTED_CLASSES.filter((cls) => !extracted_classes.includes(cls));
			assert.deepEqual(missing, [], `Missing classes: ${missing.join(', ')}`);
		});

		test('does not generate unexpected classes', () => {
			const extra = extracted_classes.filter((cls) => !EXPECTED_CLASSES.includes(cls));
			assert.deepEqual(extra, [], `Unexpected classes: ${extra.join(', ')}`);
		});

		test('generates valid CSS without errors', () => {
			assert.notInclude(css, 'undefined');
			assert.notInclude(css, '[object Object]');
			assert.notInclude(css, 'NaN');
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
		assert.strictEqual(examples.length, 4, 'Should have results from all 4 examples');

		const first_example = examples[0]!;
		const first_classes = example_results.get(first_example)!;

		for (const example of examples.slice(1)) {
			const classes = example_results.get(example)!;
			assert.deepEqual(
				classes,
				first_classes,
				`${example} should produce same classes as ${first_example}`
			);
		}
	});
});

// A fresh install of the packed tarball, outside the repo, so nothing resolves
// from fuz_css's own `node_modules`
describe.skipIf(SKIP)('packed install', () => {
	let temp_dir: string;
	let css: string;
	let build_log: string;

	beforeAll(async () => {
		temp_dir = await mkdtemp(join(tmpdir(), 'fuz_css_packed_'));
		const pack_dir = join(temp_dir, 'pack');
		const app_dir = join(temp_dir, 'app');
		await mkdir(pack_dir);
		const tarball = execSync(`npm pack --pack-destination ${pack_dir}`, {
			cwd: process.cwd(),
			stdio: 'pipe'
		})
			.toString()
			.trim()
			.split('\n')
			.at(-1)!;
		const example_dir = join(EXAMPLES_DIR, 'vite-react');
		await cp(example_dir, app_dir, {
			recursive: true,
			filter: (source) => !/[\\/](node_modules|dist|\.fuz)$/.test(source)
		});
		await rm(join(app_dir, 'package-lock.json'), { force: true });
		const package_json_path = join(app_dir, 'package.json');
		const package_json = JSON.parse(await readFile(package_json_path, 'utf8'));
		package_json.devDependencies['@fuzdev/fuz_css'] = `file:${join(pack_dir, tarball)}`;
		await writeFile(package_json_path, JSON.stringify(package_json, null, '\t'));
		try {
			execSync('npm install --no-audit --no-fund', { cwd: app_dir, stdio: 'pipe' });
			build_log = run_build(app_dir);
		} catch (err) {
			throw new Error(`Failed to install and build the packed tarball: ${to_error_message(err)}`);
		}
		const css_path = await find_css_file(join(app_dir, 'dist'));
		if (!css_path) throw new Error(`No CSS file found in ${app_dir}/dist/assets`);
		css = await readFile(css_path, 'utf8');
	}, 180_000);

	afterAll(async () => {
		if (temp_dir) await rm(temp_dir, { recursive: true, force: true });
	});

	test('builds with the generated CSS', () => {
		assert.isNotNull(extract_fuz_css(css), 'CSS should contain the fuz.utilities layer');
		assert_restated_build(build_log, css);
	});
});
