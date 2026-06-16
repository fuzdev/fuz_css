<script lang="ts">
	import type {Snippet} from 'svelte';
	import Docs from '@fuzdev/fuz_ui/Docs.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';
	import DialogContent from '@fuzdev/fuz_ui/DialogContent.svelte';
	import {selected_variable_context} from '@fuzdev/fuz_ui/style_variable_helpers.svelte.ts';
	import {Library, library_context} from '@fuzdev/fuz_ui/library.svelte.ts';

	import {tomes} from './tomes.ts';
	import {library_json} from '$routes/library.ts';
	import StyleVariableDetail from '$routes/StyleVariableDetail.svelte';
	import UnfinishedImplementationWarning from './UnfinishedImplementationWarning.svelte';

	const {
		children,
	}: {
		children: Snippet;
	} = $props();

	const library = new Library(library_json);
	library_context.set(() => library);

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
