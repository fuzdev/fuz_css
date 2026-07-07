<script lang="ts">
	import {theme_state_context} from '@fuzdev/fuz_ui/theme_state.svelte.ts';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import {oklch_to_srgb, type Oklch} from '$lib/oklch.ts';

	const {
		intensity,
		color_name,
	}: {
		intensity: string;
		color_name: string;
	} = $props();

	const get_theme_state = theme_state_context.get();
	const theme_state = $derived(get_theme_state());

	const name = $derived(`palette_${color_name}_${intensity}`);

	let color_el: HTMLElement | undefined = $state.raw();

	// the stop's value is a derived calc()/oklch() expression, so read the
	// browser-resolved color off the rendered swatch element instead
	const resolved = $derived.by(() => {
		// re-read when the user switches color scheme or theme
		theme_state.color_scheme;
		theme_state.theme;
		if (!color_el) return '';
		return window.getComputedStyle(color_el).backgroundColor;
	});

	const parsed_oklch = $derived.by((): Oklch | null => {
		const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(resolved);
		if (!m) return null;
		return [Number(m[1]), Number(m[2]), Number(m[3])];
	});

	const hex = $derived.by(() => {
		if (!parsed_oklch) return '';
		const rgb = oklch_to_srgb(parsed_oklch);
		return (
			'#' +
			rgb
				.map((c) =>
					Math.round(Math.min(1, Math.max(0, c)) * 255)
						.toString(16)
						.padStart(2, '0'),
				)
				.join('')
		);
	});

	const formatted = $derived.by(() => {
		if (!parsed_oklch) return resolved;
		const [l, c, h] = parsed_oklch;
		return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(0)})`;
	});
</script>

<li style:--bg_color="var(--{name})">
	<div class="color" bind:this={color_el}></div>
	<div class="text">
		<StyleVariableButton {name} style="width: 150px; justify-content: start;" />
		<div class="hex">{hex}</div>
		<div class="oklch">{formatted}</div>
	</div>
</li>

<style>
	li {
		display: flex;
		align-items: stretch;
		font-family: var(--font_family_mono);
		min-height: var(--input_height_compact);
	}
	li:hover {
		background-color: var(--shade_00);
	}
	.text {
		display: flex;
		align-items: center;
		flex: 1;
		padding-left: var(--space_sm);
	}
	.hex {
		width: 90px;
		font-size: var(--font_size_sm);
		padding-left: var(--space_sm);
	}
	.oklch {
		font-size: var(--font_size_sm);
		padding-left: var(--space_sm);
	}
	.color {
		width: 100px;
		min-width: 50px;
		background-color: var(--bg_color);
	}
	@media (max-width: 630px) {
		.text {
			flex-direction: column;
			align-items: flex-start;
			padding: var(--space_sm);
		}
	}
</style>
