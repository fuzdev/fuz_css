<script lang="ts">
	import type {Snippet} from 'svelte';

	const {
		children,
	}: {
		children?: Snippet;
	} = $props();
</script>

<aside>
	⚠️ {#if children}{@render children()}{:else}This is unfinished and will change.{/if}
</aside>
