import { theme_state_context } from '@fuzdev/fuz_ui/theme_state.svelte.ts';
import { clamp } from '@fuzdev/fuz_util/maths.ts';
import { rgb_to_hex_string } from '@fuzdev/fuz_util/colors.ts';

import { oklch_to_srgb, type Oklch } from '$lib/oklch.ts';

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

	/**
	 * The parsed opaque `oklch()` components; `null` for anything else (an
	 * alpha channel, another notation), letting displays degrade to `resolved`.
	 */
	readonly parsed: Oklch | null = $derived.by(() => {
		const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/u.exec(this.resolved);
		if (!m) return null;
		return [Number(m[1]), Number(m[2]), Number(m[3])];
	});

	/** `oklch(l c h)` at display precision, or the raw `resolved` fallback. */
	readonly formatted: string = $derived.by(() => {
		if (!this.parsed) return this.resolved;
		const [l, c, h] = this.parsed;
		return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`;
	});

	/** The sRGB hex twin of `parsed`, gamut-clamped; empty when unparsed. */
	readonly hex: string = $derived.by(() => {
		if (!this.parsed) return '';
		const rgb = oklch_to_srgb(this.parsed);
		const [r, g, b] = rgb.map((c) => Math.round(clamp(c, 0, 1) * 255));
		return rgb_to_hex_string(r!, g!, b!);
	});

	constructor(get_name: () => string) {
		const get_theme_state = theme_state_context.get();
		// read after render so the probe reflects the current name/scheme/theme
		$effect(() => {
			const theme_state = get_theme_state();
			theme_state.color_scheme;
			theme_state.theme;
			get_name();
			if (!this.el) return;
			this.resolved = window.getComputedStyle(this.el).backgroundColor;
		});
	}
}
