<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import {
		color_variants,
		shadow_size_variants,
		shadow_variant_prefixes,
		shadow_alpha_variants,
		intensity_variants,
		type ColorVariant,
		type IntensityVariant,
	} from '$lib/variable_data.js';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'shadows';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	let selected_intensity: IntensityVariant = $state('60');

	// @fuz-classes shadow_xs shadow_sm shadow_md shadow_lg shadow_xl shadow_top_xs shadow_top_sm shadow_top_md shadow_top_lg shadow_top_xl shadow_bottom_xs shadow_bottom_sm shadow_bottom_md shadow_bottom_lg shadow_bottom_xl shadow_inset_xs shadow_inset_sm shadow_inset_md shadow_inset_lg shadow_inset_xl shadow_inset_top_xs shadow_inset_top_sm shadow_inset_top_md shadow_inset_top_lg shadow_inset_top_xl shadow_inset_bottom_xs shadow_inset_bottom_sm shadow_inset_bottom_md shadow_inset_bottom_lg shadow_inset_bottom_xl
	// @fuz-classes shadow_alpha_00 shadow_alpha_05 shadow_alpha_10 shadow_alpha_20 shadow_alpha_30 shadow_alpha_40 shadow_alpha_50 shadow_alpha_60 shadow_alpha_70 shadow_alpha_80 shadow_alpha_90 shadow_alpha_95 shadow_alpha_100
	// @fuz-classes shadow_color_umbra shadow_color_highlight shadow_color_glow shadow_color_shroud
	// @fuz-classes shadow_color_a_00 shadow_color_a_05 shadow_color_a_10 shadow_color_a_20 shadow_color_a_30 shadow_color_a_40 shadow_color_a_50 shadow_color_a_60 shadow_color_a_70 shadow_color_a_80 shadow_color_a_90 shadow_color_a_95 shadow_color_a_100
	// @fuz-classes shadow_color_b_00 shadow_color_b_05 shadow_color_b_10 shadow_color_b_20 shadow_color_b_30 shadow_color_b_40 shadow_color_b_50 shadow_color_b_60 shadow_color_b_70 shadow_color_b_80 shadow_color_b_90 shadow_color_b_95 shadow_color_b_100
	// @fuz-classes shadow_color_c_00 shadow_color_c_05 shadow_color_c_10 shadow_color_c_20 shadow_color_c_30 shadow_color_c_40 shadow_color_c_50 shadow_color_c_60 shadow_color_c_70 shadow_color_c_80 shadow_color_c_90 shadow_color_c_95 shadow_color_c_100
	// @fuz-classes shadow_color_d_00 shadow_color_d_05 shadow_color_d_10 shadow_color_d_20 shadow_color_d_30 shadow_color_d_40 shadow_color_d_50 shadow_color_d_60 shadow_color_d_70 shadow_color_d_80 shadow_color_d_90 shadow_color_d_95 shadow_color_d_100
	// @fuz-classes shadow_color_e_00 shadow_color_e_05 shadow_color_e_10 shadow_color_e_20 shadow_color_e_30 shadow_color_e_40 shadow_color_e_50 shadow_color_e_60 shadow_color_e_70 shadow_color_e_80 shadow_color_e_90 shadow_color_e_95 shadow_color_e_100
	// @fuz-classes shadow_color_f_00 shadow_color_f_05 shadow_color_f_10 shadow_color_f_20 shadow_color_f_30 shadow_color_f_40 shadow_color_f_50 shadow_color_f_60 shadow_color_f_70 shadow_color_f_80 shadow_color_f_90 shadow_color_f_95 shadow_color_f_100
	// @fuz-classes shadow_color_g_00 shadow_color_g_05 shadow_color_g_10 shadow_color_g_20 shadow_color_g_30 shadow_color_g_40 shadow_color_g_50 shadow_color_g_60 shadow_color_g_70 shadow_color_g_80 shadow_color_g_90 shadow_color_g_95 shadow_color_g_100
	// @fuz-classes shadow_color_h_00 shadow_color_h_05 shadow_color_h_10 shadow_color_h_20 shadow_color_h_30 shadow_color_h_40 shadow_color_h_50 shadow_color_h_60 shadow_color_h_70 shadow_color_h_80 shadow_color_h_90 shadow_color_h_95 shadow_color_h_100
	// @fuz-classes shadow_color_i_00 shadow_color_i_05 shadow_color_i_10 shadow_color_i_20 shadow_color_i_30 shadow_color_i_40 shadow_color_i_50 shadow_color_i_60 shadow_color_i_70 shadow_color_i_80 shadow_color_i_90 shadow_color_i_95 shadow_color_i_100
	// @fuz-classes shadow_color_j_00 shadow_color_j_05 shadow_color_j_10 shadow_color_j_20 shadow_color_j_30 shadow_color_j_40 shadow_color_j_50 shadow_color_j_60 shadow_color_j_70 shadow_color_j_80 shadow_color_j_90 shadow_color_j_95 shadow_color_j_100

	// TODO duplicate shadows links

	// TODO BLOCK @many smoother gradient? esp on the low end? for both shadows and borders
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
		<TomeSectionHeader text="Umbra" />
		<p>
			Umbras are adaptive shadows that darken in light mode and lighten in dark mode. This is the
			default shadow behavior, creating natural depth perception in both color schemes. In light
			mode umbra is untinted (pure black); in dark mode it's tinted using
			<code>tint_hue</code>/<code>tint_saturation</code>.
		</p>
		<form><ColorSchemeInput /></form>
		{@render shadow_examples('umbra')}
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Highlight" />
		<p>
			Highlights are adaptive shadows that lighten in light mode and darken in dark mode. In light
			mode highlight is tinted using <code>tint_hue</code>/<code>tint_saturation</code>; in dark
			mode it's untinted (pure black).
		</p>
		<form><ColorSchemeInput /></form>
		<div class="panel fg_30 p_md">
			{@render shadow_examples('highlight')}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Glow" />
		<p>
			Glows are non-adaptive shadows that lighten in both light and dark mode. Glow colors are
			tinted using the theme's <code>tint_hue</code> and <code>tint_saturation</code>.
		</p>
		<form><ColorSchemeInput /></form>
		<div class="panel darken_30 p_md">
			{@render shadow_examples('glow')}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Shroud" />
		<p>
			Shrouds are non-adaptive shadows that darken in both light and dark mode. Unlike glow, shroud
			is untinted (pure black) because dark shadows typically don't benefit from tinting. This
			asymmetry is intentional but subject to change.
		</p>
		<form><ColorSchemeInput /></form>
		<div class="panel lighten_30 p_md">
			{@render shadow_examples('shroud')}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Colored shadows" />
		<p>
			Use <code>shadow_color_{'{hue}'}_{'{intensity}'}</code> classes to apply colored shadows. The intensity
			controls the color's prominence -- 60 is a fine starting point for visible colored shadows.
		</p>
		{#each color_variants as color_variant (color_variant)}
			<TomeSection>
				{@render intensity_selector(color_variant)}
				{@render shadow_examples(color_variant, selected_intensity)}
			</TomeSection>
		{/each}
	</TomeSection>
</TomeContent>

{#snippet shadow_examples(
	color_variant: ColorVariant | 'umbra' | 'highlight' | 'glow' | 'shroud' | null,
	intensity: IntensityVariant = '60',
)}
	{@const is_hue =
		color_variant && !['umbra', 'highlight', 'glow', 'shroud'].includes(color_variant)}
	{@const shadow_color_name = is_hue
		? `shadow_color_${color_variant}_${intensity}`
		: color_variant
			? `shadow_color_${color_variant}`
			: 'shadow_color_umbra'}
	{@const classes = is_hue ? 'color_' + color_variant : undefined}
	{@render shadow_example_header()}
	{#each shadow_variant_prefixes as shadow_variant_prefix (shadow_variant_prefix)}
		{#each shadow_size_variants as shadow_size_variant (shadow_size_variant)}
			{@const shadow_size_name = shadow_variant_prefix + shadow_size_variant}
			<div class="shadow_example">
				<div class="shadow_main_example {shadow_size_name} {shadow_color_name}">
					<StyleVariableButton name={shadow_size_name} class={classes} />
					{#if is_hue}
						<code class="p_xs {classes}">.{shadow_color_name}</code>
					{:else}
						<StyleVariableButton name={shadow_color_name} class={classes}
							><span>
								{shadow_color_name}
								{#if color_variant === 'umbra'}&nbsp;<small>(default)</small>{/if}</span
							></StyleVariableButton
						>
					{/if}
				</div>
				{@render shadow_variant_examples(shadow_color_name, shadow_size_name)}
			</div>
		{/each}
	{/each}
{/snippet}

{#snippet shadow_example_header()}
	<div class="shadow_example">
		<code>shadow_alpha</code>
		<div class="row gap_lg">
			{#each shadow_alpha_variants as alpha (alpha)}
				<code class="shadow_variant_example box">
					<StyleVariableButton name="shadow_alpha_{alpha}">{alpha}</StyleVariableButton>
				</code>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet shadow_variant_examples(shadow_color_name: string | null, shadow_size_name: string)}
	<div class="row gap_lg">
		{#each shadow_alpha_variants as alpha (alpha)}
			<div
				title="{shadow_size_name} with {shadow_color_name ?? 'shadow_color_umbra'}"
				class="shadow_variant_example {shadow_size_name} {shadow_color_name} shadow_alpha_{alpha}"
			></div>
		{/each}
	</div>
{/snippet}

{#snippet intensity_selector(color_variant: ColorVariant)}
	<TomeSectionHeader text="shadow_color_{color_variant}" tag="h3"
		>shadow_color_{color_variant}_{selected_intensity}</TomeSectionHeader
	>
	<form class="intensity_selector">
		<fieldset class="row mb_0">
			{#each intensity_variants as intensity (intensity)}
				<label class="box gap_xs mb_0 px_xs4" class:selected={selected_intensity === intensity}>
					<input
						type="radio"
						name="intensity"
						value={intensity}
						bind:group={selected_intensity}
						class="screen_reader_only"
					/>
					{intensity}
				</label>
			{/each}
		</fieldset>
		<ColorSchemeInput />
	</form>
{/snippet}

<style>
	.shadow_example {
		position: relative;
		padding: var(--space_md);
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
		align-items: center;
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
	.intensity_selector {
		display: flex;
		flex-wrap: wrap;
		align-items: start;
		gap: var(--space_xl);
		padding: var(--space_sm) 0;
	}
</style>
