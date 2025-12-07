<script lang="ts">
	import {page} from '$app/state';
	import ApiIndex from '@fuzdev/fuz_ui/ApiIndex.svelte';
	import {DOCS_PATH} from '@fuzdev/fuz_ui/docs_helpers.svelte.js';

	// TODO this is a big strange because we use this page component in tomes, maybe it should be a separate component?
	const at_root = $derived(page.url.pathname === DOCS_PATH);
</script>

<ApiIndex minimal={at_root} />
