<script lang="ts">
	import { watch_resolved_style } from '#routes/docs/resolved_style.svelte.ts';

	// a length variable can be a calc() of a scale knob, which reading it with
	// `getPropertyValue` leaves unevaluated - so read it off an undisplayed
	// probe through a property whose computed value is the absolute length

	const { name }: { name: string } = $props();

	let el: HTMLElement | undefined = $state.raw();
	let resolved = $state.raw('');

	watch_resolved_style(() => {
		name;
		if (el) resolved = getComputedStyle(el).textIndent;
	});
</script>

<span class="probe" bind:this={el} style:text-indent="var(--{name})" aria-hidden="true"
></span>{resolved}

<style>
	.probe {
		display: none;
	}
</style>
