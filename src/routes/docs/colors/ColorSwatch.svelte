<script lang="ts">
	import ColorSwatchItem from '$routes/docs/colors/ColorSwatchItem.svelte';
	import {intensity_variants} from '$lib/variable_data.js';

	const {
		color_name,
		computed_styles,
		suffix,
		absolute = false,
	}: {
		color_name: string;
		computed_styles: CSSStyleDeclaration | null;
		suffix?: 'light' | 'dark';
		absolute?: boolean;
	} = $props();
</script>

{#if absolute}
	<ul class="unstyled">
		{#each intensity_variants as intensity (intensity)}
			<ColorSwatchItem {intensity} {color_name} {computed_styles} suffix="light" />
		{/each}
	</ul>
	<ul class="unstyled">
		{#each intensity_variants as intensity (intensity)}
			<ColorSwatchItem {intensity} {color_name} {computed_styles} suffix="dark" />
		{/each}
	</ul>
{:else}
	<ul class="unstyled">
		{#each intensity_variants as intensity (intensity)}
			<ColorSwatchItem {intensity} {color_name} {computed_styles} {suffix} />
		{/each}
	</ul>
{/if}

<style>
	ul {
		width: 100%;
		margin-bottom: var(--input_height_sm);
	}
</style>
