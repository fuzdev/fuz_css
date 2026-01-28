<script lang="ts">
	import type {ComponentProps} from 'svelte';

	import FileLink from '$routes/FileLink.svelte';

	// TODO upstream?

	const {
		base_path = 'https://github.com/fuzdev/fuz_css/blob/main/src/lib/',
		children = fallback_children,
		...rest
	}: ComponentProps<typeof FileLink> = $props();
</script>

<FileLink {...rest} {base_path} {children} />

{#snippet fallback_children()}@fuzdev/fuz_css/{rest.path}{/snippet}
