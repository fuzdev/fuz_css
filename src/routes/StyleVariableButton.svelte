<script lang="ts">
	import type {SvelteHTMLElements} from 'svelte/elements';
	import type {Snippet} from 'svelte';

	import {default_variables} from '$lib/variables.js';
	import {selected_variable_context} from '$routes/style_variable_helpers.svelte.js';

	const {
		name,
		classes,
		inline = false,
		plain = true,
		attrs,
		children,
	}: {
		name: string; // TODO type? generate from `tomes`? or keep extensible?
		classes?: string;
		inline?: boolean;
		plain?: boolean;
		attrs?: SvelteHTMLElements['button'];
		children?: Snippet;
	} = $props();

	// TODO @many add to $lib?

	// TODO add contextmenu behavior

	const variable = $derived.by(() => {
		const v = default_variables.find((v) => v.name === name);
		if (!v) throw new Error(`cannot find variable named "${name}"`);
		return v;
	});

	const selected_variable = selected_variable_context.get();
</script>

<button
	type="button"
	{...attrs}
	class={classes}
	class:inline
	class:plain
	onclick={() => (selected_variable.value = variable)}
	>{#if children}{@render children()}{:else}<span class="font_family_mono">{name}</span
		>{/if}</button
>

<style>
	button {
		min-height: var(--input_height_sm);
	}
</style>
