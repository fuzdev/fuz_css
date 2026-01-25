<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import StyleVariableButton from '$routes/StyleVariableButton.svelte';
	import {
		color_variants,
		shadow_size_variants,
		shadow_variant_prefixes,
		shadow_alpha_variants,
		type ColorVariant,
	} from '$lib/variable_data.js';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'shadows';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	// @fuz-classes shadow_xs shadow_sm shadow_md shadow_lg shadow_xl shadow_top_xs shadow_top_sm shadow_top_md shadow_top_lg shadow_top_xl shadow_bottom_xs shadow_bottom_sm shadow_bottom_md shadow_bottom_lg shadow_bottom_xl shadow_inset_xs shadow_inset_sm shadow_inset_md shadow_inset_lg shadow_inset_xl shadow_inset_top_xs shadow_inset_top_sm shadow_inset_top_md shadow_inset_top_lg shadow_inset_top_xl shadow_inset_bottom_xs shadow_inset_bottom_sm shadow_inset_bottom_md shadow_inset_bottom_lg shadow_inset_bottom_xl
	// @fuz-classes shadow_alpha_1 shadow_alpha_2 shadow_alpha_3 shadow_alpha_4 shadow_alpha_5
	// @fuz-classes darken_30 lighten_30
	// @fuz-classes shadow_color_a_60 shadow_color_b_60 shadow_color_c_60 shadow_color_d_60 shadow_color_e_60 shadow_color_f_60 shadow_color_g_60 shadow_color_h_60 shadow_color_i_60 shadow_color_j_60

	// TODO duplicate shadows links
</script>

<TomeContent {tome}>
	<UnfinishedImplementationWarning
		>This is unfinished and will change. It feels simultaneously limiting in usage and bloated in
		the implementation.</UnfinishedImplementationWarning
	>
	<p>
		fuz_css's shadows build on the light model discussed in the <TomeLink name="shading" /> docs.
	</p>
	<TomeSection>
		<TomeSectionHeader text="Shadow" />
		<p>Shadows darken in light mode and lighten in dark mode.</p>
		<UnfinishedImplementationWarning
			>Maybe rename for clarity? It's weird that shadows lighten in dark mode.</UnfinishedImplementationWarning
		>
		{@render shadow_section(null)}
	</TomeSection>
	<section>
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Highlight" />
		<p>Highlights lighten in light mode and darken in dark mode.</p>
		<div class="panel lighten_10 p_md">
			{@render shadow_section('highlight')}
		</div>
	</TomeSection>
	<section>
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Glow" />
		<p>Glows lighten in both light and dark mode.</p>
		<div class="panel darken_30 p_md">
			{@render shadow_section('glow')}
		</div>
	</TomeSection>
	<section>
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Shroud" />
		<p>Shrouds darken in both light and dark mode.</p>
		<div class="panel lighten_10 p_md">
			{@render shadow_section('shroud')}
		</div>
	</TomeSection>
	<section>
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Colored shadows" />
		<p>
			Use <code>shadow_color_{'{hue}'}_{'{intensity}'}</code> classes to apply colored shadows. The intensity
			controls the color's prominence (60 is a good starting point for visible colored shadows).
		</p>
		{#each color_variants as color_variant (color_variant)}
			<section>
				{@render shadow_section(color_variant)}
			</section>
		{/each}
	</TomeSection>
	<section>
		<ColorSchemeInput />
	</section>
</TomeContent>

{#snippet shadow_section(color_variant: ColorVariant | 'highlight' | 'glow' | 'shroud' | null)}
	{@const is_hue = color_variant && !['highlight', 'glow', 'shroud'].includes(color_variant)}
	{@const shadow_color_name = is_hue
		? `shadow_color_${color_variant}_60`
		: color_variant
			? `shadow_color_${color_variant}`
			: 'shadow_color'}
	{@const classes = is_hue ? 'color_' + color_variant : undefined}
	{@render shadow_example_header()}
	{#each shadow_variant_prefixes as shadow_variant_prefix (shadow_variant_prefix)}
		{#each shadow_size_variants as shadow_size_variant (shadow_size_variant)}
			{@const shadow_size_name = shadow_variant_prefix + shadow_size_variant}
			<div class="shadow_example">
				<div class="shadow_main_example {shadow_size_name} {shadow_color_name}">
					<StyleVariableButton name={shadow_size_name} {classes} />
					{#if is_hue}
						<code class="p_xs {classes}">{shadow_color_name}</code>
					{:else}
						<StyleVariableButton name={shadow_color_name} {classes} />
					{/if}
				</div>
				{@render shadow_variant_examples(shadow_color_name, shadow_size_name)}
			</div>
		{/each}
	{/each}
{/snippet}

{#snippet shadow_example_header()}
	<div class="shadow_example">
		<code>shadow_alpha_</code>
		<div class="row gap_lg">
			{#each shadow_alpha_variants as alpha (alpha)}
				<code class="shadow_variant_example box">
					<StyleVariableButton name="shadow_alpha_{alpha}">{alpha}</StyleVariableButton>
				</code>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet shadow_variant_examples(shadow_color_name: string, shadow_size_name: string)}
	<div class="row gap_lg">
		{#each shadow_alpha_variants as alpha (alpha)}
			<div
				title="{shadow_size_name} with {shadow_color_name}"
				class="shadow_variant_example {shadow_size_name} {shadow_color_name} shadow_alpha_{alpha}"
			></div>
		{/each}
	</div>
{/snippet}

<style>
	.shadow_example {
		position: relative;
		padding: var(--space_md);
		font-family: var(--font_family_mono);
		border-radius: var(--border_radius_xs3);
		display: flex;
		align-items: center;
		justify-content: end;
		flex-wrap: wrap;
		gap: var(--space_lg);
	}
	.shadow_main_example {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		padding: var(--space_xs);
		min-height: var(--input_height);
		gap: var(--space_xs);
		min-width: 260px;
	}
	.shadow_example:not(:last-child) {
		margin-bottom: var(--space_lg);
	}
	.shadow_variant_example {
		width: var(--input_height);
		min-width: var(--input_height);
		height: var(--input_height);
	}
</style>
