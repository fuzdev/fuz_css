import { theme_state_context } from '@fuzdev/fuz_ui/theme_state.svelte.ts';
import { clamp } from '@fuzdev/fuz_util/maths.ts';
import { rgb_to_hex_string } from '@fuzdev/fuz_util/colors.ts';

import { oklch_to_srgb, type Oklch } from '$lib/oklch.ts';

/** A parsed computed-style color serialization. */
export interface ParsedResolvedColor {
	/** The OKLCH components when the serialization was `oklch(...)`, else `null`. */
	oklch: Oklch | null;
	/** sRGB components in `[0, 1]`, gamut-clamped when converted from `oklch`. */
	srgb: [number, number, number];
	/** The alpha channel in `[0, 1]`. */
	alpha: number;
}

// engines may serialize computed oklch() with percentages, `deg`, `none`
// components, exponents, and an optional alpha channel - accept all of them
const OKLCH_MATCHER =
	/^oklch\((none|[+-]?[\d.]+(?:e[+-]?\d+)?%?)\s+(none|[+-]?[\d.]+(?:e[+-]?\d+)?%?)\s+(none|[+-]?[\d.]+(?:e[+-]?\d+)?(?:deg)?)(?:\s*\/\s*([+-]?[\d.]+(?:e[+-]?\d+)?%?))?\)$/iu;
// the legacy down-conversion form some values compute to (e.g. `transparent`)
const RGB_MATCHER = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/u;

const parse_component = (raw: string, percent_base: number): number => {
	if (raw === 'none') return 0;
	const percent = raw.endsWith('%');
	const n = Number(percent ? raw.slice(0, -1) : raw.replace(/deg$/iu, ''));
	return percent ? (n / 100) * percent_base : n;
};

/**
 * Parses a `getComputedStyle` color serialization: the modern `oklch(l c h)`
 * form with its engine variations (percentages, `deg`, `none`, alpha,
 * exponents) plus the legacy `rgb()`/`rgba()` form. Returns `null` for
 * anything else, letting displays degrade to the raw string.
 */
export const parse_resolved_color = (value: string): ParsedResolvedColor | null => {
	const trimmed = value.trim();
	const oklch_match = OKLCH_MATCHER.exec(trimmed);
	if (oklch_match) {
		const lightness = parse_component(oklch_match[1]!, 1);
		const chroma = parse_component(oklch_match[2]!, 0.4);
		const hue = parse_component(oklch_match[3]!, 0);
		const alpha = oklch_match[4] === undefined ? 1 : parse_component(oklch_match[4], 1);
		if (![lightness, chroma, hue, alpha].every(Number.isFinite)) return null;
		const color: Oklch = [lightness, chroma, hue];
		const srgb = oklch_to_srgb(color).map((c) => clamp(c, 0, 1)) as [number, number, number];
		return { oklch: color, srgb, alpha };
	}
	const rgb_match = RGB_MATCHER.exec(trimmed);
	if (rgb_match) {
		const alpha = rgb_match[4] === undefined ? 1 : Number(rgb_match[4]);
		if (!Number.isFinite(alpha)) return null;
		return {
			oklch: null,
			srgb: [Number(rgb_match[1]) / 255, Number(rgb_match[2]) / 255, Number(rgb_match[3]) / 255],
			alpha
		};
	}
	return null;
};

export interface ResolvedColorOptions {
	/**
	 * Reads the probe element's resolved color - injectable for tests.
	 *
	 * @default reads `getComputedStyle(el).backgroundColor`
	 */
	read_color?: (el: HTMLElement) => string;
}

/**
 * Reads the browser-resolved color of a derived stop off a probe element.
 *
 * The derived color stops are calc()/oklch() expressions, so reading them
 * with `getPropertyValue` yields the unevaluated token stream - instead the
 * consumer renders a probe element styled with the variable, binds it to
 * `el`, and reads the resolved value here. The read runs in an effect (not a
 * derived) so it happens after the scheme class toggles on the root.
 *
 * Construct during component init - the constructor registers the effect and
 * reads the theme-state context.
 */
export class ResolvedColor {
	el: HTMLElement | undefined = $state.raw();

	/** The computed-style `background-color` serialization of the probe. */
	resolved: string = $state.raw('');

	/** The parsed serialization; `null` when unparseable (displays degrade to `resolved`). */
	readonly parsed: ParsedResolvedColor | null = $derived.by(() =>
		parse_resolved_color(this.resolved)
	);

	/** `oklch(l c h[ / a])` at display precision, or the raw `resolved` fallback. */
	readonly formatted: string = $derived.by(() => {
		const p = this.parsed;
		if (!p?.oklch) return this.resolved;
		const [l, c, h] = p.oklch;
		const alpha = p.alpha === 1 ? '' : ` / ${Number(p.alpha.toFixed(3))}`;
		return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)}${alpha})`;
	});

	/** The sRGB hex twin of `parsed`; empty when unparsed or fully transparent. */
	readonly hex: string = $derived.by(() => {
		const p = this.parsed;
		if (!p || p.alpha === 0) return '';
		const [r, g, b] = p.srgb.map((c) => Math.round(c * 255));
		return rgb_to_hex_string(r!, g!, b!);
	});

	constructor(get_name: () => string, options?: ResolvedColorOptions) {
		const read_color =
			options?.read_color ?? ((el: HTMLElement) => window.getComputedStyle(el).backgroundColor);
		const get_theme_state = theme_state_context.get();
		// read after render so the probe reflects the current name/scheme/theme
		$effect(() => {
			const theme_state = get_theme_state();
			theme_state.color_scheme;
			theme_state.theme;
			get_name();
			if (!this.el) return;
			this.resolved = read_color(this.el);
		});
	}
}
