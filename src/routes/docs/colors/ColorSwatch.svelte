<script lang="ts">
	import ColorSwatchItem from './ColorSwatchItem.svelte';
	import { intensity_variants } from '$lib/variable_data.ts';

	const {
		prefix
	}: {
		/** The scale's variable prefix, e.g. `palette_a` or `accent`. */
		prefix: string;
	} = $props();
</script>

<ul class="unstyled">
	{#each intensity_variants as intensity (intensity)}
		<ColorSwatchItem {intensity} {prefix} />
	{/each}
</ul>

<style>
	ul {
		width: 100%;
		margin-bottom: var(--input_height_compact);
	}
</style>
