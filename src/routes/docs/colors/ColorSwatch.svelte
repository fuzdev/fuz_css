<script lang="ts">
	import ColorSwatchItem from './ColorSwatchItem.svelte';
	import { intensity_variants, type PaletteVariant } from '$lib/variable_data.ts';

	const {
		letter
	}: {
		letter: PaletteVariant;
	} = $props();
</script>

<ul class="unstyled">
	{#each intensity_variants as intensity (intensity)}
		<ColorSwatchItem {intensity} {letter} />
	{/each}
</ul>

<style>
	ul {
		width: 100%;
		margin-bottom: var(--input_height_compact);
	}
</style>
