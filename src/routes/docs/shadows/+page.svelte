<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import {
		palette_variants,
		shadow_size_variants,
		shadow_variant_prefixes,
		shadow_alpha_variants,
		intensity_variants,
		type PaletteVariant,
		type IntensityVariant
	} from '$lib/variable_data.ts';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'shadows';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	let selected_intensity: IntensityVariant = $state.raw('60');

	// TODO duplicate shadows links
</script>

<TomeContent {tome}>
	<UnfinishedImplementationWarning
		>This is unfinished and will change. It feels simultaneously limiting in usage and bloated in
		the implementation.</UnfinishedImplementationWarning
	>
	<section>
		<p>
			fuz_css provides four semantic shadow types that build on the light model in the
			<TomeLink slug="shading" /> docs: umbra for natural depth, highlight for rim lighting, glow for
			light emphasis, and shroud for dark overlays.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Umbra" />
		<p>
			Umbras are adaptive shadows that darken in light mode and lighten in dark mode. This is the
			default shadow behavior, creating natural depth perception in both color schemes. In light
			mode umbra is untinted (pure black); in dark mode it's tinted using
			<code>hue_neutral</code>/<code>neutral_chroma</code>.
		</p>
		<form><ColorSchemeInput /></form>
		{@render shadow_examples('umbra')}
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Highlight" />
		<p>
			Highlights are adaptive shadows that lighten in light mode and darken in dark mode. In light
			mode highlight is tinted using <code>hue_neutral</code>; in dark mode it's untinted (pure
			black).
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
			tinted using the theme's <code>hue_neutral</code>.
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
			Use <code>shadow_{'{letter}'}_{'{intensity}'}</code> classes to apply colored shadows. The intensity
			controls the color's prominence -- 60 is a fine starting point for visible colored shadows.
		</p>
		{#each palette_variants as color_variant (color_variant)}
			<TomeSection>
				{@render intensity_selector(color_variant)}
				{@render shadow_examples(color_variant, selected_intensity)}
			</TomeSection>
		{/each}
	</TomeSection>
</TomeContent>

{#snippet shadow_examples(
	color_variant: PaletteVariant | 'umbra' | 'highlight' | 'glow' | 'shroud' | null,
	intensity: IntensityVariant = '60'
)}
	{@const is_hue =
		color_variant && !['umbra', 'highlight', 'glow', 'shroud'].includes(color_variant)}
	{@const shadow_color_name = is_hue
		? `shadow_${color_variant}_${intensity}`
		: color_variant
			? `shadow_color_${color_variant}`
			: 'shadow_color_umbra'}
	{@const classes = is_hue ? 'palette_' + color_variant : undefined}
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

{#snippet intensity_selector(color_variant: PaletteVariant)}
	<TomeSectionHeader text="shadow_{color_variant}" tag="h3"
		>shadow_{color_variant}_{selected_intensity}</TomeSectionHeader
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
