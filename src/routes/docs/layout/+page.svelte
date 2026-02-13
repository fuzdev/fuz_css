<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';
	import {resolve} from '$app/paths';

	import {space_variants, distance_variants} from '$lib/variable_data.js';

	const LIBRARY_ITEM_NAME = 'layout';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	// TODO width/height classes
	// @fuz-variables space_xs5 space_xs4 space_xs3 space_xs2 space_xs space_sm space_md space_lg space_xl space_xl2 space_xl3 space_xl4 space_xl5 space_xl6 space_xl7 space_xl8 space_xl9 space_xl10 space_xl11 space_xl12 space_xl13 space_xl14 space_xl15
	// @fuz-variables distance_xs distance_sm distance_md distance_lg distance_xl
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css provides space and distance <a href={resolve('/docs/variables')}>variables</a> for
			consistent sizing across your UI. Space variants work with utility classes like
			<code>.p_md</code> and <code>.gap_lg</code>.
		</p>
	</section>
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
		<TomeSectionHeader text="Distance variables" />
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
			Distance variants have <a href={resolve('/docs/classes')}>classes</a> like
			<code>.width_atmost_sm</code>
			and <code>.width_atleast_md</code>.
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
		background-color: var(--shade_20);
	}

	.variable_wrapper {
		width: 120px;
	}

	.computed_value {
		margin-left: var(--space_md);
		font-family: var(--font_family_mono);
	}
</style>
