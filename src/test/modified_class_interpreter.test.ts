import {test, describe, assert} from 'vitest';

import {generate_classes_css} from '$lib/css_class_generation.js';
import {modified_class_interpreter} from '$lib/css_class_interpreters.js';
import {css_class_definitions} from '$lib/css_class_definitions.js';
import {css_class_composites} from '$lib/css_class_composites.js';
import {
	assert_css_contains,
	assert_css_not_contains,
	assert_css_order,
	assert_diagnostic,
	filter_diagnostics_by_message,
} from './test_helpers.js';

/**
 * Tests for the modified_class_interpreter which handles classes with modifiers
 * like hover:, md:, dark:, before:, etc.
 */
describe('modified_class_interpreter', () => {
	describe('basic modifiers', () => {
		test('generates CSS for hover:box', () => {
			const result = generate_classes_css({
				class_names: ['hover:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:box:hover',
				'display: flex',
				'flex-direction: column',
			);
		});

		test('generates CSS for md:box with media query', () => {
			const result = generate_classes_css({
				class_names: ['md:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '@media (width >= 48rem)', '.md\\:box', 'display: flex');
		});

		test('generates CSS for dark:panel with ancestor wrapper', () => {
			const result = generate_classes_css({
				class_names: ['dark:panel'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, ':root.dark', '.dark\\:panel', 'border-radius');
		});

		test('handles multiple modifiers md:dark:hover:box', () => {
			const result = generate_classes_css({
				class_names: ['md:dark:hover:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 48rem)',
				':root.dark',
				'.md\\:dark\\:hover\\:box:hover',
			);
		});

		test('handles all modifier types: lg:dark:focus:after:box', () => {
			const result = generate_classes_css({
				class_names: ['lg:dark:focus:after:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 64rem)',
				':root.dark',
				'.lg\\:dark\\:focus\\:after\\:box:focus::after',
			);
		});

		test('handles token class with modifiers hover:p_md', () => {
			const result = generate_classes_css({
				class_names: ['hover:p_md'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:p_md:hover', 'padding');
		});

		test('returns null for unknown base class', () => {
			const result = generate_classes_css({
				class_names: ['hover:unknown_class'],
				class_definitions: {},
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_not_contains(result.css, 'hover:unknown_class');
		});

		test('returns null for class without modifiers', () => {
			const result = generate_classes_css({
				class_names: ['box'],
				class_definitions: {},
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_not_contains(result.css, '.box');
		});
	});

	describe('pseudo-elements', () => {
		test('handles before pseudo-element', () => {
			const result = generate_classes_css({
				class_names: ['before:box'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.before\\:box::before', 'display: flex');
		});

		test('handles combined state and pseudo-element', () => {
			const result = generate_classes_css({
				class_names: ['hover:before:ellipsis'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:before\\:ellipsis:hover::before');
		});
	});

	describe('priority', () => {
		test('prioritizes known classes over css-literal', () => {
			const result = generate_classes_css({
				class_names: ['hover:row'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:row:hover', 'display: flex', 'flex-direction: row');
		});
	});

	describe('ruleset modifier support', () => {
		test('handles ruleset class with hover: selectable', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:selectable:hover', 'cursor: pointer');
			assert_css_not_contains(result.css, ':hover:hover');
		});

		test('handles ruleset class with media: md:selectable', () => {
			const result = generate_classes_css({
				class_names: ['md:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 48rem)',
				'.md\\:selectable',
				'.md\\:selectable:hover',
				'.md\\:selectable.selected',
			);
		});

		test('handles ruleset with descendant selectors: hover:menuitem', () => {
			const result = generate_classes_css({
				class_names: ['hover:menuitem'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:menuitem:hover',
				'.hover\\:menuitem:hover .content',
				'.hover\\:menuitem:hover .icon',
				'.hover\\:menuitem:hover .title',
			);
		});

		test('handles ruleset with pseudo-element: hover:chevron', () => {
			const result = generate_classes_css({
				class_names: ['hover:chevron'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:chevron:hover', '.hover\\:chevron:hover::before');
		});

		test('handles ruleset with element.class: hover:chip', () => {
			const result = generate_classes_css({
				class_names: ['hover:chip'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:chip:hover',
				'a.hover\\:chip:hover',
				'font-weight: 500',
				'font-weight: 600',
			);
		});

		test('handles md:dark:hover:selectable', () => {
			const result = generate_classes_css({
				class_names: ['md:dark:hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 48rem)',
				':root.dark',
				'.md\\:dark\\:hover\\:selectable:hover',
			);
		});

		test('handles plain ruleset with :not()', () => {
			const result = generate_classes_css({
				class_names: ['focus:plain'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.focus\\:plain:not(:hover):focus',
				'.focus\\:plain:hover:focus',
				'.focus\\:plain:active:focus',
			);
		});

		test('handles clickable ruleset', () => {
			const result = generate_classes_css({
				class_names: ['md:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 48rem)',
				'.md\\:clickable',
				'.md\\:clickable:focus',
				'.md\\:clickable:hover',
				'.md\\:clickable:active',
			);
		});

		test('includes pseudo-element rules without extra modifier: before:chevron', () => {
			const result = generate_classes_css({
				class_names: ['before:chevron'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.before\\:chevron::before',
				'position: relative',
				'border-left-color',
			);
			assert_css_not_contains(result.css, '::before::before');
		});

		test('applies pseudo-element to simple ruleset: before:chip', () => {
			const result = generate_classes_css({
				class_names: ['before:chip'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.before\\:chip::before',
				'a.before\\:chip::before',
				'font-weight: 500',
				'font-weight: 600',
			);
		});
	});

	describe('state conflict skipping', () => {
		test('hover:selectable skips .selectable:hover rule but keeps others', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:selectable:hover',
				'cursor: pointer',
				'.hover\\:selectable.selected:hover',
			);
			assert_css_not_contains(result.css, ':hover:hover');
		});

		test('hover:selectable keeps .selectable:active rule (different state)', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, ':active:hover');
		});

		test('focus:clickable skips .clickable:focus rule', () => {
			const result = generate_classes_css({
				class_names: ['focus:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.focus\\:clickable:focus', ':hover:focus', ':active:focus');
			assert_css_not_contains(result.css, ':focus:focus');
		});

		test('active:clickable skips .clickable:active rule', () => {
			const result = generate_classes_css({
				class_names: ['active:clickable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_not_contains(result.css, ':active:active');
			assert_css_contains(result.css, ':hover:active', ':focus:active');
		});

		test('hover:plain includes all rules, skipping redundant :hover additions', () => {
			const result = generate_classes_css({
				class_names: ['hover:plain'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:plain',
				'.hover\\:plain:not(:hover)',
				'.hover\\:plain:hover',
				'.hover\\:plain:active',
			);
			assert_css_not_contains(result.css, ':hover:hover');
			assert.isAbove(result.diagnostics.length, 0);
		});
	});

	describe('modifier on composes-based composites', () => {
		test('modifier on composes-based composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {composes: ['p_lg', 'rounded']},
			};

			const result = generate_classes_css({
				class_names: ['hover:card'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:card:hover {',
				'padding: var(--space_lg);',
				'border-radius: var(--border_radius_md);',
			);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('modifier on composes + declaration composite', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				card: {composes: ['p_lg', 'rounded'], declaration: '--card-bg: blue;'},
			};

			const result = generate_classes_css({
				class_names: ['hover:card'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:card:hover {',
				'padding: var(--space_lg);',
				'border-radius: var(--border_radius_md);',
				'--card-bg: blue;',
			);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('modifier on nested composes composition', () => {
			const definitions = {
				p_lg: {declaration: 'padding: var(--space_lg);'},
				rounded: {declaration: 'border-radius: var(--border_radius_md);'},
				panel_base: {composes: ['p_lg', 'rounded']},
			};

			const result = generate_classes_css({
				class_names: ['md:panel_base'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 48rem)',
				'.md\\:panel_base',
				'padding: var(--space_lg);',
				'border-radius: var(--border_radius_md);',
			);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('modifier on diamond dependency deduplicates silently', () => {
			const definitions = {
				base: {declaration: 'color: red;'},
				branch_a: {composes: ['base'], declaration: 'font-size: 1rem;'},
				branch_b: {composes: ['base'], declaration: 'font-weight: bold;'},
				diamond: {composes: ['branch_a', 'branch_b']},
			};

			const result = generate_classes_css({
				class_names: ['hover:diamond'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'.hover\\:diamond:hover',
				'color: red;',
				'font-size: 1rem;',
				'font-weight: bold;',
			);
			// Should not have duplicate "color: red;" - only appears once
			const colorMatches = result.css.match(/color: red;/g);
			assert.strictEqual(colorMatches?.length, 1);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('md:sm generates media query with density overrides', () => {
			const result = generate_classes_css({
				class_names: ['md:sm'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 48rem)',
				'.md\\:sm',
				'--font_size: var(--font_size_sm);',
				'--input_height: var(--space_xl3);',
				'--icon_size: var(--icon_size_sm);',
			);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('hover:sm applies hover state to sm composite', () => {
			const result = generate_classes_css({
				class_names: ['hover:sm'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:sm:hover', '--font_size: var(--font_size_sm);');
			assert.lengthOf(result.diagnostics, 0);
		});

		test('hover:md applies hover state to md composite', () => {
			const result = generate_classes_css({
				class_names: ['hover:md'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.hover\\:md:hover', '--font_size: var(--font_size_md);');
			assert.lengthOf(result.diagnostics, 0);
		});

		test('lg:sm generates lg breakpoint with sm sizing', () => {
			const result = generate_classes_css({
				class_names: ['lg:sm'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 64rem)',
				'.lg\\:sm',
				'--font_size: var(--font_size_sm);',
			);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('lg:md generates lg breakpoint with default sizing reset', () => {
			const result = generate_classes_css({
				class_names: ['lg:md'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(
				result.css,
				'@media (width >= 64rem)',
				'.lg\\:md',
				'--font_size: var(--font_size_md);',
				'--icon_size: var(--icon_size_md);',
			);
			assert.lengthOf(result.diagnostics, 0);
		});

		test('sm and md together generate both classes', () => {
			const result = generate_classes_css({
				class_names: ['sm', 'md'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_contains(result.css, '.sm {', '--font_size: var(--font_size_sm);');
			assert_css_contains(result.css, '.md {', '--font_size: var(--font_size_md);');
			assert.lengthOf(result.diagnostics, 0);
		});
	});

	describe('error propagation', () => {
		test('modifier on class with unknown composes array produces error', () => {
			const definitions = {
				card: {composes: ['unknown_class']},
			};

			const result = generate_classes_css({
				class_names: ['hover:card'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_not_contains(result.css, '.hover\\:card');
			assert_diagnostic(
				result.diagnostics,
				'error',
				'Unknown class "unknown_class" in composes array',
			);
		});

		test('modifier on class with circular reference produces error', () => {
			const definitions = {
				a: {composes: ['b']},
				b: {composes: ['a']},
			};

			const result = generate_classes_css({
				class_names: ['hover:a'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_not_contains(result.css, '.hover\\:a');
			assert_diagnostic(result.diagnostics, 'error', 'Circular reference');
		});

		test('modifier on empty composes array produces no output', () => {
			const definitions = {
				empty: {composes: []},
			};

			const result = generate_classes_css({
				class_names: ['hover:empty'],
				class_definitions: definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert.strictEqual(result.css, '');
			assert.lengthOf(result.diagnostics, 0);
		});
	});

	describe('state modifier ordering for cascade', () => {
		test('hover classes come before active classes in output (LVFHA order)', () => {
			const result = generate_classes_css({
				class_names: ['active:border_color_a_50', 'hover:border_color_b_50'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_order(result.css, '.hover\\:border_color_b_50', '.active\\:border_color_a_50');
		});

		test('visited < focus < hover < active ordering', () => {
			const result = generate_classes_css({
				class_names: ['active:p_xl', 'hover:p_lg', 'focus:p_md', 'visited:p_sm'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert_css_order(
				result.css,
				'.visited\\:p_sm',
				'.focus\\:p_md',
				'.hover\\:p_lg',
				'.active\\:p_xl',
			);
		});

		test('non-interaction states use alphabetical order', () => {
			const result = generate_classes_css({
				class_names: ['odd:p_md', 'even:p_lg', 'first:p_sm'],
				class_definitions: css_class_definitions,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			// Alphabetical: even < first < odd
			assert_css_order(result.css, '.even\\:p_lg', '.first\\:p_sm', '.odd\\:p_md');
		});
	});

	describe('skip warnings', () => {
		test('before:chevron emits warning for skipped pseudo-element rule', () => {
			const result = generate_classes_css({
				class_names: ['before:chevron'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			assert.isAbove(result.diagnostics.length, 0);
			const warning = result.diagnostics.find(
				(d) => d.identifier === 'before:chevron' && d.message.includes('pseudo-element'),
			);
			assert.isDefined(warning);
			assert.strictEqual(warning.level, 'warning');
			assert.include(warning.message, '.chevron::before');
			assert.include(warning.message, '::before');
		});

		test('hover:selectable emits warnings for skipped :hover rules', () => {
			const result = generate_classes_css({
				class_names: ['hover:selectable'],
				class_definitions: css_class_composites,
				interpreters: [modified_class_interpreter],
				css_properties: null,
			});

			const hover_warnings = filter_diagnostics_by_message(result.diagnostics, ':hover').filter(
				(d) => d.identifier === 'hover:selectable',
			);
			assert.isAbove(hover_warnings.length, 0);

			for (const warning of hover_warnings) {
				assert.strictEqual(warning.level, 'warning');
				assert.include(warning.message, 'redundancy');
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
				(d) => d.identifier === 'focus:clickable' && d.message.includes(':focus'),
			);
			assert.isDefined(focus_warning);
			assert.include(focus_warning.message, '.clickable:focus');
			assert.include(focus_warning.message, 'redundancy');
		});
	});
});
