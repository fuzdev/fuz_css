<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import {resolve} from '$app/paths';

	import {space_variants, distance_variants} from '$lib/variable_data.js';
	import StyleVariableButton from '$routes/StyleVariableButton.svelte';

	const LIBRARY_ITEM_NAME = 'layout';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	// TODO width/height classes
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Space variables" />
		<ul class="unstyled">
			{#each space_variants as space_size (space_size)}
				{@const name = 'space_' + space_size}
				<li class="layout_example">
					<div class="fill" style:width="var(--{name})"></div>
					<div class="variable_wrapper"><StyleVariableButton {name} /></div>
					<span class="pr_sm">=</span>
					<div class="computed_value">{computed_styles?.getPropertyValue('--' + name)}</div>
				</li>
			{/each}
		</ul>
		<p>
			Space variants are used in <a href={resolve('/docs/classes')}>classes</a> like
			<code>.p_md</code>
			for padding, margin, other forms of spacing like gap, positioning, dimensions, etc.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Width variables" />
		<aside>⚠️ maybe instead of "width" this should be "distance" or "length" something?</aside>
		<ul class="unstyled">
			{#each distance_variants as distance_variant (distance_variant)}
				{@const name = 'distance_' + distance_variant}
				<li class="layout_example">
					<div class="fill" style:width="var(--{name})"></div>
					<div class="variable_wrapper"><StyleVariableButton {name} /></div>
					<span class="pr_sm">=</span>
					<div class="computed_value">{computed_styles?.getPropertyValue('--' + name)}</div>
				</li>
			{/each}
		</ul>
		<p>
			Width variants have <a href={resolve('/docs/classes')}>classes</a> like <code>.width_sm</code>
			and <code>.min_width_md</code>.
		</p>
	</TomeSection>
</TomeContent>

<style>
	.layout_example {
		position: relative;
		height: var(--input_height_sm);
		display: flex;
		align-items: center;
	}

	.fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		z-index: -1;
		background-color: var(--fg_2);
	}

	.variable_wrapper {
		width: 120px;
	}

	.computed_value {
		margin-left: var(--space_md);
		font-family: var(--font_family_mono);
	}
</style>
