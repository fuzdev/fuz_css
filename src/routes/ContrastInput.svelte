<script lang="ts">
	// TODO upstream to fuz_ui

	import { swallow } from '@fuzdev/fuz_util/dom.ts';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import type { Theme } from '$lib/variable.ts';

	const {
		modifiers,
		selected,
		select,
		...rest
	}: SvelteHTMLElements['menu'] & {
		/** The composable contrast modifiers, usually `contrast_modifiers`. */
		modifiers: Array<Theme>;
		/** The active modifier, or `null` for the theme's own contrast. */
		selected: Theme | null;
		select: (modifier: Theme | null) => void;
	} = $props();

	// `null` sits first as the theme's own contrast, so the row reads
	// default → low → high left to right
	const options: Array<{ modifier: Theme | null; label: string }> = $derived([
		{ modifier: null, label: 'default' },
		...modifiers.map((modifier) => ({ modifier, label: modifier.name.replace(' contrast', '') }))
	]);
</script>

<!-- the same shape as fuz_ui's ColorSchemeInput: a horizontal radio menu of
	joined buttons, not a select, so the three states are one glance apart -->
<menu {...rest} class="contrast-control unstyled {rest.class}">
	{#each options as { modifier, label } (label)}
		{@const is_selected = modifier === selected}
		<button
			type="button"
			class={['contrast color_a', { selected: is_selected }]}
			role="menuitemradio"
			title={is_selected ? `${label} contrast is selected` : `select ${label} contrast`}
			aria-checked={is_selected}
			onclick={(e) => {
				swallow(e);
				select(modifier);
			}}
		>
			<div class="content">{label}</div>
		</button>
	{/each}
</menu>

<style>
	.contrast-control {
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
	.content {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--space_lg);
	}
	.contrast {
		border-radius: 0;
	}
	.contrast:first-child {
		border-top-left-radius: var(--border_radius, var(--border_radius_md));
		border-bottom-left-radius: var(--border_radius, var(--border_radius_md));
	}
	.contrast:last-child {
		border-top-right-radius: var(--border_radius, var(--border_radius_md));
		border-bottom-right-radius: var(--border_radius, var(--border_radius_md));
	}
</style>
