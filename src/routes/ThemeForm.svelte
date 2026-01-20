<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import {swallow} from '@fuzdev/fuz_util/dom.js';
	import CopyToClipboard from '@fuzdev/fuz_ui/CopyToClipboard.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';

	import {render_theme_style, type Theme} from '$lib/theme.js';
	import type {StyleVariable} from '$lib/variable.js';
	import StyleVariableDetail from '$routes/StyleVariableDetail.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	// TODO @many add to $lib?

	// TODO should this be merged with `ThemeInput`?

	// TODO add UI to change the tint hue/saturation

	const {
		theme = null,
		onsave,
	}: {
		/**
		 * `null` means creating
		 */
		theme?: Theme | null;
		onsave?: (theme: Theme) => void;
		// oncreate?: (theme: Theme) => void;
	} = $props();

	let new_name = $derived(theme ? theme.name : 'new theme');

	let new_variables = $derived(theme ? theme.variables : []); // TODO `updateVariables` to `StyleVariableDetail` ?

	const new_theme: Theme = $derived({name: new_name, variables: new_variables});

	const code = $derived(
		render_theme_style(new_theme, {empty_default_theme: false, specificity: 1}),
	);

	const light_count = $derived(new_variables.reduce((c, v) => (v.light ? c + 1 : c), 0));
	const dark_count = $derived(new_variables.reduce((c, v) => (v.dark ? c + 1 : c), 0));

	let selected_variable: StyleVariable | null = $state(null);

	const save = (): void => {
		if (!changed) return;
		onsave?.(new_theme);
	};

	const edit_variable = (e: MouseEvent, variable: StyleVariable): void => {
		swallow(e);
		selected_variable = variable;
		new_variables = new_variables.slice(); // TODO
	};

	const add_variable = (e: MouseEvent) => {
		swallow(e);
		alert('TODO'); // eslint-disable-line no-alert
	};

	const editing = $derived(!!theme);
	const changed = $derived(
		theme ? new_name !== theme.name || new_variables !== theme.variables : true,
	);
</script>

<div class="theme_form">
	<h2 class="text-align:center">
		{#if editing}edit{:else}create{/if} theme
	</h2>
	<aside>
		Creating and editing themes at runtime is a work in progress, but you can click around to see
		where it's going!
	</aside>
	<header>
		<div class="variables_header">
			<p>variables: {light_count} light, {dark_count} dark</p>
			<button type="button" class="width:100%" onclick={add_variable} disabled
				>add a variable</button
			>
		</div>
		<form>
			<label>
				<div class="title">name</div>
				<input bind:value={new_name} placeholder=">" />
			</label>
			<button type="button" onclick={save} disabled={!changed}
				>{#if editing}save changes{:else}create theme{/if}</button
			>
		</form>
	</header>
	<div class="content">
		<div class="variables">
			{#each new_variables as variable (variable.name)}
				<button type="button" class="variable menu_item" onclick={(e) => edit_variable(e, variable)}
					>--{variable.name}</button
				>
			{/each}
		</div>
		<div class="rendered">
			{#if code}
				<div class="copy">
					<CopyToClipboard text={code} />
				</div>
				<Code content={code} lang="css" />
			{/if}
		</div>
	</div>
</div>
{#if selected_variable}
	<Dialog onclose={() => (selected_variable = null)}>
		{#snippet children(close)}
			<div class="pane p_md width_atmost_md mx_auto">
				<div class="panel p_lg box">
					<StyleVariableDetail variable={selected_variable} />
					<UnfinishedImplementationWarning />
					<button type="button" onclick={close}>ok</button>
				</div>
			</div>
		{/snippet}
	</Dialog>
{/if}

<style>
	.theme_form {
		width: 100%;
	}
	header {
		display: flex;
		gap: 1rem;
		margin-bottom: var(--space_md);
	}
	.variables_header,
	form {
		flex: 1;
	}
	.content {
		display: flex;
	}
	.variables {
		padding-right: var(--space_sm);
	}
	.variable {
		min-height: var(--icon_size_sm);
		width: var(--style_variable_name_width, 240px);
	}
	.rendered {
		position: relative; /* for the .copy button */
		flex: 1;
		overflow: auto;
	}
	/* TODO this is hacky, maybe pass classes to `Code`? or what else? */
	.rendered :global(.code_example) {
		width: 100%;
	}
	.copy {
		position: absolute;
		top: var(--space_md);
		right: var(--space_md);
	}
</style>
