<script lang="ts">
	import type {ComponentProps} from 'svelte';

	import FileLink from '$routes/FileLink.svelte';

	// TODO upstream?

	type Props = ComponentProps<typeof FileLink>;

	const {
		base_path = 'https://github.com/fuzdev/fuz_css/blob/main/src/lib/',
		children = fallback_children,
		...rest
	}: Props = $props();
</script>

<FileLink {...rest} {base_path} {children} />

{#snippet fallback_children()}@fuzdev/fuz_css/{rest.path}{/snippet}
