<script lang="ts">
	import { ResolvedColor } from '../resolved_color.svelte.ts';

	// the derived color stops are calc()/oklch() expressions, so render a
	// zero-size probe and read the browser-resolved color off it

	const { name }: { name: string } = $props();

	const color = new ResolvedColor(() => name);
</script>

<span class="probe" bind:this={color.el} style:background-color="var(--{name})" aria-hidden="true"
></span><code>{color.formatted}</code>

<style>
	.probe {
		display: inline-block;
		width: 0;
		height: 0;
	}
</style>
