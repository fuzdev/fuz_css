<script lang="ts">
	// TODO upstream to fuz_ui, beside `ThemeInput`

	import type { Snippet } from 'svelte';

	import type { Theme } from '$lib/variable.ts';

	const {
		theme,
		edited_from = null,
		link
	}: {
		/** The picked theme, already applied to the page - the sample renders under it. */
		theme: Theme;
		/** The theme an unsaved draft started from, whose summary stands in for the draft's. */
		edited_from?: Theme | null;
		/** A link for the sample to show, so it goes somewhere. */
		link: Snippet;
	} = $props();

	const summary = $derived((edited_from ?? theme).summary);
</script>

<!-- a compact look at the picked theme: its summary over a sample of the
	basic elements, which render under the theme because it styles the whole page -->
<div class="theme-preview panel p_md">
	<p aria-live="polite">
		{#if edited_from}
			<strong>unsaved edits</strong> to {edited_from.name}
		{:else}
			<strong>{theme.name}</strong>
		{/if}
		{#if summary}- {summary}{/if}
	</p>
	<!-- a real heading element, since its tier is where a theme's heading
		family, weight, and tracking show, with its role removed so the sample
		stays out of the page outline; margins tightened to keep it compact -->
	<h3 role="none" class="mt_0 mb_md">A heading</h3>
	<p>Body text with {@render link()} and <code>inline code</code>.</p>
	<!-- the intents by meaning rather than palette letter, since a theme can
		rebind them (stop 60 is the text-safe one) -->
	<p class="row flex-wrap:wrap gap_md">
		<span class="accent_60">accent</span>
		<span class="positive_60">positive</span>
		<span class="negative_60">negative</span>
		<span class="caution_60">caution</span>
		<span class="info_60">info</span>
	</p>
	<div class="row flex-wrap:wrap gap_sm mb_md">
		<button type="button">button</button>
		<button type="button" class="selected">selected</button>
		<button type="button" disabled>disabled</button>
		<span class="chip">chip</span>
	</div>
	<div class="row flex-wrap:wrap gap_md">
		<input class="flex:1" aria-label="sample text input" placeholder="a text input" />
		<label class="row">
			<input type="checkbox" checked />
			checkbox
		</label>
	</div>
</div>

<style>
	.theme-preview {
		/* the picker's partner: shares its row on wide screens, wraps below it on narrow */
		flex: 1 1 var(--distance_sm);
		min-width: 0;
	}
</style>
