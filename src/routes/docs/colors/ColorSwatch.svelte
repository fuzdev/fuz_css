<script lang="ts">
	import ColorSwatchItem from './ColorSwatchItem.svelte';
	import {intensity_variants} from '$lib/variable_data.ts';

	const {
		color_name,
	}: {
		color_name: string;
	} = $props();
</script>

<ul class="unstyled">
	{#each intensity_variants as intensity (intensity)}
		<ColorSwatchItem {intensity} {color_name} />
	{/each}
</ul>

<style>
	ul {
		width: 100%;
		margin-bottom: var(--input_height_compact);
	}
</style>
