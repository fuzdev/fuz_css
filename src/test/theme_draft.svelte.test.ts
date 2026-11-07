import { test, assert, describe, afterEach } from 'vitest';

import {
	UNSAVED_THEME_NAME,
	register_draft_caps_source,
	resolve_site_theme
} from '#routes/theme_draft.svelte.ts';
import { compose_themes } from '#lib/theme.ts';
import { compile_theme } from '#lib/theme_compile.ts';
import { compute_scheme_mirror } from '#lib/theme_stance.ts';
import { contrast_modifiers } from '#lib/themes.ts';
import { base_theme } from '#lib/themes/base.ts';
import { marquee_theme } from '#lib/themes/marquee.ts';
import type { Theme } from '#lib/variable.ts';
import { create_monochrome_theme } from './theme_test_helpers.ts';

// a dark-stanced draft whose single hue moves the caps
const draft: Theme = { ...create_monochrome_theme(145), name: UNSAVED_THEME_NAME };
const { caps } = compile_theme(draft);

describe('resolve_site_theme', () => {
	afterEach(() => {
		register_draft_caps_source(null);
	});

	test('the fixture draft emits caps', () => {
		assert.isAbove(caps.length, 0);
	});

	test('a non-draft theme gets no caps, a registered source notwithstanding', () => {
		register_draft_caps_source(() => caps);
		const resolved = resolve_site_theme(marquee_theme);
		assert.strictEqual(resolved.theme, marquee_theme);
		assert.isUndefined(resolved.caps);
		assert.deepEqual(resolved.scheme_mirror, compute_scheme_mirror('dark'));
		assert.isUndefined(resolve_site_theme(base_theme).caps);
	});

	test('the draft gets the registered caps beside its stance mirror', () => {
		register_draft_caps_source(() => caps);
		const resolved = resolve_site_theme(draft);
		assert.strictEqual(resolved.theme, draft);
		assert.strictEqual(resolved.caps, caps);
		assert.deepEqual(resolved.scheme_mirror, compute_scheme_mirror('dark'));
	});

	test('a draft composed with a contrast modifier, renamed back to the draft, gets the caps', () => {
		register_draft_caps_source(() => caps);
		const composed = {
			...compose_themes(draft, contrast_modifiers.high),
			name: UNSAVED_THEME_NAME
		};
		assert.strictEqual(resolve_site_theme(composed).caps, caps);
	});

	test('the source is read on every resolve, so it follows the draft', () => {
		let current = caps;
		register_draft_caps_source(() => current);
		assert.strictEqual(resolve_site_theme(draft).caps, caps);
		current = [];
		assert.isUndefined(resolve_site_theme(draft).caps);
	});

	test('with no source registered the draft gets no caps', () => {
		const resolved = resolve_site_theme(draft);
		assert.isUndefined(resolved.caps);
		assert.deepEqual(resolved.scheme_mirror, compute_scheme_mirror('dark'));
	});
});
