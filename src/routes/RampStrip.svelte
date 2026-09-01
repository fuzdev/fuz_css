<script lang="ts">
	// TODO upstream to fuz_ui

	import { numeric_scale_variants } from '$lib/variable_data.ts';

	const {
		prefix,
		label = prefix
	}: {
		/** The variable family prefix, e.g. `accent` renders `--accent_00`…`--accent_100`. */
		prefix: string;
		label?: string;
	} = $props();
</script>

<!-- live feedback for the derived scales: each cell renders the current
	computed stop, so dragging any knob repaints the strip -->
<div class="ramp_strip">
	<small class="ramp_label"><code class="ramp_name">{label}</code></small>
	<div class="cells">
		{#each numeric_scale_variants as stop (stop)}
			<div
				class="cell"
				style:background-color="var(--{prefix}_{stop})"
				title="--{prefix}_{stop}"
			></div>
		{/each}
	</div>
</div>

<style>
	.ramp_strip {
		display: flex;
		flex-direction: column;
		gap: var(--space_xs3);
	}
	.ramp_label {
		line-height: 1;
	}
	.ramp_name {
		background: transparent;
		padding: 0;
		font-size: var(--font_size_sm);
	}
	.cells {
		display: flex;
		height: var(--space_lg);
		border-radius: var(--border_radius_xs);
		overflow: hidden;
	}
	.cell {
		flex: 1;
	}
</style>
