<script lang="ts">
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import {icon_sizes} from '$lib/variable_data.js';

	// @fuz-variables icon_size_xs icon_size_sm icon_size_md icon_size_lg icon_size_xl icon_size_xl2 icon_size_xl3
</script>

<TomeSection>
	<TomeSectionHeader text="Icon sizes" />
	<aside>
		unlike <code>--font_size_</code> variables, <code>--icon_</code> variables are in
		<code>px</code>
		not <code>rem</code>, so they're insensitive to browser font size
	</aside>
</TomeSection>
<div class="icon_sizes">
	{#each Object.entries(icon_sizes) as [name, value] (name)}
		<figure>
			<figcaption>
				<StyleVariableButton {name} /> =
				<code>{value}</code>
			</figcaption>
			<div
				style:font-size="var(--{name})"
				style:--font_size="var(--{name})"
				title="--{name} is {value}"
			>
				🐢
			</div>
		</figure>
	{/each}
</div>

<style>
	.icon_sizes {
		width: 100%;
		overflow-x: auto;
		overflow-y: hidden; /* TODO hack because emoji are bigger than the defined dimensions, maybe dont use a 🐢? :(  */
	}
	.icon_sizes figure {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: var(--space_xl) 0;
	}
	/* TODO layout with CSS grid */
	.icon_sizes figcaption {
		display: flex;
	}
	.icon_sizes figure > div {
		width: var(--font_size, var(--font_size_md));
		height: var(--font_size, var(--font_size_md));
		border: var(--border_width) var(--border_style) var(--border_color);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	code {
		white-space: nowrap;
	}
	figcaption {
		display: flex;
		align-items: center;
		z-index: 1;
	}
</style>
