<script lang="ts">
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import type { PaletteVariant } from '#lib/variable_data.ts';
	import { PALETTE_HUES } from '#lib/ramps.ts';
	import { watch_resolved_style } from '#routes/docs/resolved_style.svelte.ts';

	const {
		letter,
		width = 48,
		height = 48,
		description
	}: {
		letter: PaletteVariant;
		width?: number;
		height?: number;
		description: string;
	} = $props();

	const variable_name = $derived(`hue_${letter}`);

	// the angle the page currently renders, re-read after each theme or scheme
	// change so the readout tracks the swatch; the default angle stands in
	// during SSR/prerender, and for a value that isn't a plain number
	let rendered_hue: number | null = $state(null);
	const hue = $derived(rendered_hue ?? PALETTE_HUES[letter]);
	watch_resolved_style(() => {
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue('--' + variable_name)
			.trim();
		const n = value === '' ? NaN : Number(value);
		rendered_hue = Number.isFinite(n) ? n : null;
	});
</script>

<li style:--hue="var(--{variable_name})">
	<div class="color" style:width="{width}px" style:height="{height}px"></div>
	<div class="text">
		<StyleVariableButton name={variable_name} />
		<div class="hue">{hue}</div>
		<small class="description">{description}</small>
	</div>
</li>

<style>
	li {
		display: flex;
		align-items: stretch;
		font-family: var(--font_family_mono);
		padding: var(--space_xs2);
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
	.hue {
		width: 55px;
		padding-left: var(--space_sm);
	}
	.color {
		/* preview the OKLCH hue angle from achromatic to vivid at constant lightness */
		background: linear-gradient(-90deg, oklch(0.65 0.17 var(--hue)), oklch(0.65 0 var(--hue)));
		position: relative;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
	}
	.color::before {
		content: '';
		display: block;
		position: absolute;
		inset: 0;
		background: linear-gradient(#fff8, transparent 50%, transparent);
		mix-blend-mode: screen;
	}
	.color::after {
		content: '';
		display: block;
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 50%, #0008);
		mix-blend-mode: multiply;
	}
	small {
		display: flex;
	}
	.description {
		font-family: var(--font_family_sans);
	}
</style>
