<script lang="ts">
	import { theme_state_context } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	// the derived color stops are calc()/oklch() expressions, so reading them
	// with `getPropertyValue` yields the unevaluated token stream - render a
	// zero-size probe and read the browser-resolved color instead, like the
	// colors page's `ColorSwatchItem`

	const { name }: { name: string } = $props();

	const get_theme_state = theme_state_context.get();
	const theme_state = $derived(get_theme_state());

	let probe_el: HTMLElement | undefined = $state.raw();
	let resolved = $state.raw('');

	// read after render so the probe reflects the current name/scheme/theme
	$effect(() => {
		theme_state.color_scheme;
		theme_state.theme;
		name;
		if (!probe_el) return;
		resolved = window.getComputedStyle(probe_el).backgroundColor;
	});

	const formatted = $derived.by(() => {
		// expects the computed-style serialization of an opaque oklch() color;
		// anything else degrades to the raw resolved string
		const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/u.exec(resolved);
		if (!m) return resolved;
		return `oklch(${Number(m[1]).toFixed(3)} ${Number(m[2]).toFixed(3)} ${Number(m[3]).toFixed(0)})`;
	});
</script>

<span class="probe" bind:this={probe_el} style:background-color="var(--{name})" aria-hidden="true"
></span><code>{formatted}</code>

<style>
	.probe {
		display: inline-block;
		width: 0;
		height: 0;
	}
</style>
