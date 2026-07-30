/**
 * @vitest-environment jsdom
 */
import { describe, test, assert, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { ThemeState } from '@fuzdev/fuz_ui/theme_state.svelte.ts';
import { rgb_to_hex_string } from '@fuzdev/fuz_util/colors.ts';
import { clamp } from '@fuzdev/fuz_util/maths.ts';

import { parse_resolved_color, type ResolvedColor } from '$routes/docs/resolved_color.svelte.ts';
import { oklch_to_srgb, type Oklch } from '$lib/oklch.ts';
import ResolvedColorHarness from './ResolvedColorHarness.svelte';
import { mount_component, unmount_component } from './component_test_helpers.ts';

const expected_hex = (color: Oklch): string => {
	const [r, g, b] = oklch_to_srgb(color).map((c) => Math.round(clamp(c, 0, 1) * 255));
	return rgb_to_hex_string(r!, g!, b!);
};

describe('parse_resolved_color', () => {
	test('parses the chromium/firefox opaque serialization', () => {
		const parsed = parse_resolved_color('oklch(0.593407 0.0208996 250)');
		assert(parsed?.oklch);
		assert.deepEqual(parsed.oklch, [0.593407, 0.0208996, 250]);
		assert.strictEqual(parsed.alpha, 1);
	});

	test('parses percentage lightness/chroma components', () => {
		const parsed = parse_resolved_color('oklch(59.34% 25% 250)');
		assert(parsed?.oklch);
		assert.closeTo(parsed.oklch[0], 0.5934, 1e-6);
		// chroma percentages are relative to 0.4
		assert.closeTo(parsed.oklch[1], 0.1, 1e-6);
	});

	test('parses a deg hue and an alpha channel', () => {
		const parsed = parse_resolved_color('oklch(0.5 0.1 250deg / 0.4)');
		assert(parsed?.oklch);
		assert.deepEqual(parsed.oklch, [0.5, 0.1, 250]);
		assert.strictEqual(parsed.alpha, 0.4);
	});

	test('parses a percentage alpha and none components', () => {
		const parsed = parse_resolved_color('oklch(0.985 none 250 / 40%)');
		assert(parsed?.oklch);
		assert.strictEqual(parsed.oklch[1], 0);
		assert.closeTo(parsed.alpha, 0.4, 1e-9);
	});

	test('parses exponent notation for near-zero components', () => {
		const parsed = parse_resolved_color('oklch(0.985 2e-4 250)');
		assert(parsed?.oklch);
		assert.closeTo(parsed.oklch[1], 0.0002, 1e-9);
	});

	test('parses the legacy rgb()/rgba() down-conversion', () => {
		const opaque = parse_resolved_color('rgb(255, 0, 0)');
		assert(opaque);
		assert.isNull(opaque.oklch);
		assert.deepEqual(opaque.srgb, [1, 0, 0]);
		const transparent = parse_resolved_color('rgba(0, 0, 0, 0)');
		assert(transparent);
		assert.strictEqual(transparent.alpha, 0);
	});

	test('rejects garbage instead of producing NaN', () => {
		assert.isNull(parse_resolved_color(''));
		assert.isNull(parse_resolved_color('oklch(.. .. ..)'));
		assert.isNull(parse_resolved_color('color(srgb 1 0 0)'));
	});
});

describe('ResolvedColor', () => {
	let mounted: { instance: Record<string, any>; container: HTMLElement } | null = null;

	afterEach(async () => {
		if (mounted) {
			await unmount_component(mounted.instance, mounted.container);
			mounted = null;
		}
	});

	const mount_color = (
		read_color: (el: HTMLElement) => string,
		theme_state = new ThemeState()
	): { color: ResolvedColor; theme_state: ThemeState } => {
		let color: ResolvedColor | undefined;
		mounted = mount_component(ResolvedColorHarness as any, {
			name: 'palette_a_50',
			theme_state,
			options: { read_color },
			expose: (c: ResolvedColor) => (color = c)
		});
		flushSync();
		assert(color, 'harness exposes the instance');
		return { color, theme_state };
	};

	test('reads the probe through the injected reader and derives display values', () => {
		const { color } = mount_color(() => 'oklch(0.5 0.1 250)');
		assert.strictEqual(color.resolved, 'oklch(0.5 0.1 250)');
		assert.strictEqual(color.formatted, 'oklch(0.500 0.100 250)');
		assert.strictEqual(color.hex, expected_hex([0.5, 0.1, 250]));
	});

	test('re-reads when the color scheme changes', () => {
		let scheme_reads = 0;
		const { color, theme_state } = mount_color(() =>
			++scheme_reads === 1 ? 'oklch(0.5 0.1 250)' : 'oklch(0.7 0.1 250)'
		);
		assert.strictEqual(color.formatted, 'oklch(0.500 0.100 250)');
		theme_state.color_scheme = 'dark';
		flushSync();
		assert.strictEqual(color.formatted, 'oklch(0.700 0.100 250)');
	});

	test('an alpha serialization keeps a formatted value and a hex', () => {
		const { color } = mount_color(() => 'oklch(0.5 0.1 250 / 0.4)');
		assert.strictEqual(color.formatted, 'oklch(0.500 0.100 250 / 0.4)');
		assert.strictEqual(color.hex, expected_hex([0.5, 0.1, 250]));
	});

	test('a fully transparent value degrades to the raw string with an empty hex', () => {
		const { color } = mount_color(() => 'rgba(0, 0, 0, 0)');
		assert.strictEqual(color.formatted, 'rgba(0, 0, 0, 0)');
		assert.strictEqual(color.hex, '');
	});

	test('an unparseable serialization degrades to the raw string', () => {
		const { color } = mount_color(() => 'color(srgb 0.5 0.5 0.5)');
		assert.strictEqual(color.formatted, 'color(srgb 0.5 0.5 0.5)');
		assert.strictEqual(color.hex, '');
	});
});
