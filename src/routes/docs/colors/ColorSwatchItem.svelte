<script lang="ts">
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import { ResolvedColor } from '../resolved_color.svelte.ts';
	import type { PaletteVariant } from '$lib/variable_data.ts';

	const {
		intensity,
		letter
	}: {
		intensity: string;
		letter: PaletteVariant;
	} = $props();

	const name = $derived(`palette_${letter}_${intensity}`);

	// the stop's value is a derived calc()/oklch() expression, so read the
	// browser-resolved color off the rendered swatch element
	const color = new ResolvedColor(() => name);
</script>

<li style:--bg_color="var(--{name})">
	<div class="color" bind:this={color.el}></div>
	<div class="text">
		<StyleVariableButton {name} style="width: 150px; justify-content: start;" />
		<div class="hex">{color.hex}</div>
		<div class="oklch">{color.formatted}</div>
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
