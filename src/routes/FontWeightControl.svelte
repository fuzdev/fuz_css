<script lang="ts">
	import type {Snippet} from 'svelte';

	let {
		selected_font_weight = $bindable(400),
		children,
	}: {
		selected_font_weight?: number;
		children?: Snippet;
	} = $props();

	// TODO @many publish in $lib when ready, the 950 thing has me wack
</script>

<label
	><div class="title row width_100 flex-wrap:wrap">
		{#if children}
			{@render children()}
		{:else}
			font-weight
		{/if} =
		<input
			class="display:inline flex:1"
			type="number"
			bind:value={selected_font_weight}
			min={100}
			step={100}
			max={900}
		/>
	</div>
	<input type="range" bind:value={selected_font_weight} min={100} step={100} max={900} />
</label>
