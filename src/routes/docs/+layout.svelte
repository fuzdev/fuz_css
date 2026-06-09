<script lang="ts">
	import type {Snippet} from 'svelte';
	import Docs from '@fuzdev/fuz_ui/Docs.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';
	import DialogContent from '@fuzdev/fuz_ui/DialogContent.svelte';
	import {selected_variable_context} from '@fuzdev/fuz_ui/style_variable_helpers.svelte.js';
	import {Library, library_context} from '@fuzdev/fuz_ui/library.svelte.js';

	import {tomes} from '$routes/docs/tomes.js';
	import {library_json} from '$routes/library.js';
	import StyleVariableDetail from '$routes/StyleVariableDetail.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const {
		children,
	}: {
		children: Snippet;
	} = $props();

	library_context.set(new Library(library_json));

	const selected_variable = selected_variable_context.set();
</script>

<Docs {tomes}>{@render children()}</Docs>

{#if selected_variable.value}
	<Dialog onclose={() => (selected_variable.value = null)}>
		<DialogContent>
			{#snippet children({close})}
				<StyleVariableDetail variable={selected_variable.value} />
				<UnfinishedImplementationWarning />
				<button type="button" onclick={close}>ok</button>
			{/snippet}
		</DialogContent>
	</Dialog>
{/if}
