<script lang="ts">
	import type {StyleVariable} from '$lib/variable.js';

	const {
		variable,
	}: {
		variable: StyleVariable | null;
	} = $props();

	// TODO @many add to $lib?

	// TODO needs a lot of work - for example, enable editing the values directly, and certain values like colors could be rendered
</script>

{#if variable}
	<div class="variable">
		<div class="usage">
			<div class="title">variable</div>
			<code>--{variable.name}</code>
		</div>
		{#if variable.summary}<blockquote>{variable.summary}</blockquote>{/if}
		<label>
			<div class="title">light</div>
			<input disabled value={variable.light ?? ''} />
		</label>
		<label>
			<div class="title">dark</div>
			<input disabled value={variable.dark ?? ''} />
		</label>
	</div>
{/if}

<style>
	.variable {
		/* ... */
		padding: var(--space_xs) 0;
	}
	.usage {
		font-size: var(--font_size_xl);
		display: grid;
		/* 2 columns of width 1:2 */
		grid-template-columns: 1fr 2fr;
		gap: var(--space_md);
	}
	.usage .title {
		display: flex;
		justify-content: flex-end;
	}
	.usage code {
		text-align: center;
		margin-bottom: var(--space_xl);
	}
</style>
