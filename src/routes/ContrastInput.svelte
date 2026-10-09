<script lang="ts">
	// TODO replace with fuz_ui's `RadioMenu` (which `ColorSchemeInput` now
	// wraps) once the fuz_ui release carrying it lands

	import { swallow } from '@fuzdev/fuz_util/dom.ts';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import type { Theme } from '$lib/variable.ts';

	const {
		modifiers,
		selected,
		select,
		...rest
	}: SvelteHTMLElements['menu'] & {
		/** The composable contrast modifiers ordered low to high, usually `contrast_modifiers`. */
		modifiers: Array<Theme>;
		/** The active modifier, or `null` for the theme's own contrast. */
		selected: Theme | null;
		select: (modifier: Theme | null) => void;
	} = $props();

	// `null` is the theme's own contrast, placed between the modifiers (ordered
	// low to high) so the row reads low → default → high left to right
	const options: Array<{ modifier: Theme | null; label: string }> = $derived.by(() => {
		const result: Array<{ modifier: Theme | null; label: string }> = modifiers.map((modifier) => ({
			modifier,
			label: modifier.name.replace(' contrast', '')
		}));
		result.splice(Math.ceil(result.length / 2), 0, { modifier: null, label: 'default' });
		return result;
	});
</script>

<!-- the same shape as fuz_ui's ColorSchemeInput: a horizontal radio group of
	joined buttons, not a select, so the three states are one glance apart -->
<menu
	role="radiogroup"
	aria-label="contrast"
	{...rest}
	class={['contrast-control', 'unstyled', rest.class]}
>
	{#each options as { modifier, label } (label)}
		{@const is_selected = modifier === selected}
		<button
			type="button"
			class={['contrast', { selected: is_selected }]}
			role="radio"
			title={is_selected ? `${label} contrast is selected` : `select ${label} contrast`}
			aria-checked={is_selected}
			onclick={(e) => {
				swallow(e);
				select(modifier);
			}}
		>
			<span class="content">{label}</span>
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
