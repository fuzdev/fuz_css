<script lang="ts">
	import ColorSwatchItem from '$routes/docs/colors/ColorSwatchItem.svelte';

	const {
		color_name,
		computed_styles,
	}: {
		color_name: string;
		computed_styles: CSSStyleDeclaration | null;
	} = $props();
</script>

<ul class="unstyled">
	{#each {length: 9} as _, index (index)}
		<ColorSwatchItem {index} {color_name} {computed_styles} />
	{/each}
</ul>

<style>
	ul {
		width: 100%;
		margin-bottom: var(--input_height_sm);
	}
</style>
