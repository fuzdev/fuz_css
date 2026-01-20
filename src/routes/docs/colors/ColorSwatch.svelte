<script lang="ts">
	import ColorSwatchItem from '$routes/docs/colors/ColorSwatchItem.svelte';
	import {intensity_variants} from '$lib/variable_data.js';

	const {
		color_name,
		computed_styles,
	}: {
		color_name: string;
		computed_styles: CSSStyleDeclaration | null;
	} = $props();
</script>

<ul class="unstyled">
	{#each intensity_variants as intensity (intensity)}
		<ColorSwatchItem {intensity} {color_name} {computed_styles} />
	{/each}
</ul>

<style>
	ul {
		width: 100%;
		margin-bottom: var(--input_height_sm);
	}
</style>
