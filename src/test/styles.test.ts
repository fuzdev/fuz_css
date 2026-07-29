import { test, assert } from 'vitest';
import { readFileSync } from 'node:fs';

import * as exported_variables from '$lib/variables.ts';
import { theme_knob_hook_names } from '$lib/knobs.ts';
import { parse_style_css } from '$lib/style_rule_parser.ts';
import css_classes_text from './fixtures/css_classes_fixture.json?raw';

// vitest replaces this with an empty string because CSS isn't opted into being processed,
// and it has no CLI option, so just read it directly
const main_stylesheet_text = readFileSync('./src/lib/style.css', 'utf8');

const css_files = [main_stylesheet_text, css_classes_text];

const extract_custom_properties_usage = (css: string) =>
	Array.from(css.matchAll(/var\((?:\s|\\[nt])*--([a-z][a-z0-9_]*(?<!_))(?:[,)])/g)).map(
		(m) => m[1]!
	);

test('variables in the CSS exist', () => {
	// Track which known variables we actually find in the CSS
	const found_known = new Set();
	const unknowns = new Set();

	for (const css of css_files) {
		assert.ok(css);
		const variable_names = extract_custom_properties_usage(css);
		for (const name of variable_names) {
			if (name in exported_variables) {
				// Variable exists in exported variables, all good
				continue;
			} else if (known_without_variables.has(name)) {
				// Found a known variable that doesn't have an export
				found_known.add(name);
			} else {
				// Unknown variable that's neither exported nor in our known list
				unknowns.add(name);
			}
		}
	}

	// Verify no unknown variables were found
	if (unknowns.size) {
		throw new Error(`unknown variables found: ${Array.from(unknowns).join(', ')}`);
	}

	// Verify all known variables were actually found in the CSS
	const missing_known = new Set([...known_without_variables].filter((x) => !found_known.has(x)));
	if (missing_known.size) {
		throw new Error(`known variables not found in CSS: ${Array.from(missing_known).join(', ')}`);
	}
});

/**
 * These variables are known to be in the CSS but not in the exported variables.
 * This means they can be contextually used when defined, but otherwise have a fallback.
 * Hook knobs from the catalog (e.g. `heading_font_weight`) are included
 * automatically - they're defined as CSS-consumed-but-undeclared.
 */
const known_without_variables = new Set([
	...theme_knob_hook_names,
	'fill', // contextual variable set by button palette classes (e.g., .palette_a sets --fill: var(--palette_a_50))
	'button_fill',
	'button_fill_hover',
	'button_fill_active',
	'clickable_transform',
	'clickable_transform_origin',
	'clickable_transition_duration',
	'clickable_transform_focus',
	'clickable_transform_hover',
	'clickable_transform_active',
	'pane_shadow',
	'font_size',
	'icon_size',
	'border_radius',
	'flow_margin',
	'menuitem_padding',
	'chip_padding_x',
	'button_min_height',
	'menuitem_min_height',
	'checkbox_content',
	'checkbox_content_empty',
	'checkbox_content_checked',
	'left',
	'top',
	'overflow',
	'thumb_size',
	'thumb_background_color',
	'button_text_color',
	'button_border_color',
	'button_border_color_hover',
	'button_border_color_active',
	'shadow',
	'shadow_alpha',
	'shadow_color'
]);

test('the OS user-preference mappings parse core and layer into fuz.preferences', () => {
	// bundled output must always carry these - they target :root, so they ride
	// the conditional-group-with-core-inner rule - and must re-layer into
	// fuz.preferences so they beat the fuz.base defaults in every mode
	const index = parse_style_css(main_stylesheet_text);
	for (const feature of ['prefers-contrast: more', 'prefers-reduced-motion']) {
		const rule = index.rules.find((r) => r.css.includes(feature));
		assert(rule, `style.css carries a ${feature} block`);
		assert.isTrue(rule.is_core, `${feature} is core`);
		assert.strictEqual(rule.layer, 'fuz.preferences', feature);
	}
	// everything else stays in fuz.base
	const misplaced = index.rules.filter(
		(r) => r.layer === 'fuz.preferences' && !r.css.includes('prefers-')
	);
	assert.deepEqual(misplaced, []);
});

test('untargetable base rules are core, so bundled output always ships them', () => {
	// pseudo-element and attribute selectors name no element or class, so
	// detection can never match them - without the core marking they'd be
	// tree-shaken out of every bundle (and --selection_color could never apply)
	const index = parse_style_css(main_stylesheet_text);
	for (const selector of ['::selection', '::placeholder', '::file-selector-button', '[hidden]']) {
		const rule = index.rules.find((r) => r.css.startsWith(selector));
		assert(rule, `style.css carries a ${selector} rule`);
		assert.isTrue(rule.is_core, `${selector} is core`);
		assert.strictEqual(rule.core_reason, 'untargetable', selector);
	}
	const selection = index.rules.find((r) => r.css.startsWith('::selection'));
	assert.isTrue(selection!.variables_used.has('selection_color'));
});
