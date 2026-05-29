<script lang="ts">
	import type {SvelteHTMLElements} from 'svelte/elements';

	const {children, ...rest}: SvelteHTMLElements['aside'] = $props();
</script>

<aside {...rest}>
	⚠️ {#if children}{@render children()}{:else}This is unfinished and will change.{/if}
</aside>
