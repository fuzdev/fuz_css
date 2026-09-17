<script lang="ts">
	// Test harness: constructs a `ResolvedColor` during component init (its
	// constructor registers an effect and reads the theme-state context) with
	// an injectable reader, and binds the probe element it reads from.
	import { theme_state_context, type ThemeState } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import { ResolvedColor, type ResolvedColorOptions } from '$routes/docs/resolved_color.svelte.ts';

	const {
		name,
		theme_state,
		options,
		expose
	}: {
		name: string;
		theme_state: ThemeState;
		options?: ResolvedColorOptions;
		expose: (color: ResolvedColor) => void;
	} = $props();

	theme_state_context.set(() => theme_state);

	// the harness deliberately captures init-time values
	// svelte-ignore state_referenced_locally
	const color = new ResolvedColor(() => name, options);
	// svelte-ignore state_referenced_locally
	expose(color);
</script>

<div data-testid="probe" bind:this={color.el}></div>
