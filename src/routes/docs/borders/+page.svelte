<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';

	import {
		border_width_variants,
		color_variants,
		outline_width_variants,
		border_radius_variants,
	} from '$lib/variable_data.js';
	import StyleVariableButton from '$routes/StyleVariableButton.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'borders';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	// TODO demo `border_style_values` from the data

	const border_radius_classes = [
		'border_radius_0',
		'border_radius_14',
		'border_radius_32',
		'border_radius_100',
	];

	const border_radius_corner_classes = [
		'border_top_left_radius_26',
		'border_top_right_radius_100 border_bottom_left_radius_100',
		'border_bottom_right_radius_77',
	];

	const border_radius_corner_size_classes = [
		'border_top_left_radius_lg border_top_right_radius_sm',
		'border_bottom_left_radius_md border_bottom_right_radius_xl',
	];
	// TODO improve class detection
	// classes="border_top_right_radius_100 border_bottom_left_radius_100 border_top_left_radius_lg border_top_right_radius_sm border_bottom_left_radius_md border_bottom_right_radius_xl"
	// classes="outline_width_focus outline_width_active"
</script>

<TomeContent {tome}>
	<!-- TODO  -->
	<!-- <div>border_color</div> -->
	<!-- <div>border_style</div> -->
	<!-- <div>border_width</div> -->
	<!-- <div>outline_width</div> -->
	<!-- <div>outline_style</div> -->
	<!-- <div>outline_color</div> -->

	<TomeSection>
		<TomeSectionHeader text="Border shades" />
		<UnfinishedImplementationWarning />
		<div class="border_examples border_colors">
			{#each {length: 5} as _, i (i)}
				{@const name = 'border_color_' + (i + 1)}
				<div class="border_color_outer">
					<div class="border_color_inner">
						<div class="border_example border_color" style:border-color="var(--{name})">
							<StyleVariableButton {name} />
						</div>
						{#each {length: 5} as _, i (i)}
							<div
								class="border_color_width"
								style:border-color="var(--{name})"
								style:border-width="var(--{'border_width_' + (i + 2)})"
							></div>
						{/each}
					</div>
					<div>
						<span class="pl_sm pr_sm">=</span><code
							>{computed_styles?.getPropertyValue('--' + name)}</code
						>
					</div>
				</div>
			{/each}
		</div>
	</TomeSection>
	<section>
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Border colors" />
		<UnfinishedImplementationWarning />
		<div class="border_examples border_colors">
			{#each color_variants as color_variant (color_variant)}
				{@const name = 'border_color_' + color_variant}
				<div class="border_color_outer">
					<div class="border_color_inner">
						<div class="border_example border_color" style:border-color="var(--{name})">
							<StyleVariableButton {name} />
						</div>
						{#each {length: 5} as _, i (i)}
							<div
								class="border_color_width"
								style:border-color="var(--{name})"
								style:border-width="var(--{'border_width_' + (i + 2)})"
							></div>
						{/each}
					</div>
					<div>
						<span class="pl_sm pr_sm">=</span><code
							>{computed_styles?.getPropertyValue('--' + name)}</code
						>
					</div>
				</div>
			{/each}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Border widths" />
		<UnfinishedImplementationWarning />
		<div class="border_examples border_widths">
			{#each border_width_variants as border_width_variant (border_width_variant)}
				{@const name = 'border_width_' + border_width_variant}
				<div class="row">
					<div class="border_example border_width" style:border-width="var(--{name})">
						<StyleVariableButton {name} />
					</div>
					<span class="pl_sm pr_sm">=</span><code
						>{computed_styles?.getPropertyValue('--' + name)}</code
					>
				</div>
			{/each}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Outlines" />
		<p>
			Each border utility class has a corresponding outline variant using the same border variables
			(like <code>outline_color_b</code>, <code>outline_width_4</code>, and
			<code>outline_style_solid</code>), and there are also two special outline variables:
		</p>
		<div class="border_examples outline_widths">
			{#each outline_width_variants as outline_width_variant (outline_width_variant)}
				{@const name = 'outline_width_' + outline_width_variant}
				<div class="row">
					<div class="border_example {name} outline_style_solid outline_color_3">
						<StyleVariableButton {name} />
					</div>
					<span class="pl_sm pr_sm">=</span><code
						>{computed_styles?.getPropertyValue('--' + name)}</code
					>
				</div>
			{/each}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Border radius" />
		<div class="border_examples border_radii">
			{#each border_radius_variants as radius (radius)}
				{@const name = 'border_radius_' + radius}
				<div class="row">
					<div class="border_example border_radius" style:border-radius="var(--{name})">
						<StyleVariableButton {name} />
					</div>
					<span class="pl_sm pr_sm">=</span><code
						>{computed_styles?.getPropertyValue('--' + name)}</code
					>
				</div>
			{/each}
		</div>
		<TomeSectionHeader tag="h4" text="Border radius percentages" />
		<p>Interpreted utility classes, 0 to 100 (%).</p>
		<div class="border_examples border_radii">
			{#each border_radius_classes as border_radius_class (border_radius_class)}
				<div class="row">
					<div
						class="border_example border_radius {border_radius_class} font_family_mono"
						style:width="200px"
						style:height="100px"
					>
						.{border_radius_class}
					</div>
				</div>
			{/each}
		</div>
		<TomeSectionHeader tag="h4" text="Border radius corners" />
		<div class="border_examples border_radii">
			{#each border_radius_corner_size_classes as classes (classes)}
				<div class="row">
					<div
						class="border_example border_radius {classes} font_family_mono"
						style:width="320px"
						style:height="100px"
					>
						{#each classes.split(' ') as class_name (class_name)}
							<div>.{class_name}</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<TomeSectionHeader tag="h4" text="Border radius corner percentages" />
		<p>Interpreted utility classes, 0 to 100 (%).</p>
		<div class="border_examples border_radii">
			{#each border_radius_corner_classes as classes (classes)}
				<div class="row">
					<div
						class="border_example border_radius {classes} font_family_mono"
						style:width="320px"
						style:height="100px"
					>
						{#each classes.split(' ') as class_name (class_name)}
							<div>.{class_name}</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</TomeSection>
</TomeContent>

<style>
	.border_examples {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.border_example {
		width: 200px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-bottom: var(--space_md);
		padding: var(--space_md);
	}

	.border_colors .border_example {
		margin-bottom: var(--space_xs2);
	}
	.border_color_outer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		margin-bottom: var(--space_md);
	}
	.border_color_inner {
		display: flex;
	}
	.border_color {
		border-width: 1px;
		border-style: solid;
	}
	.border_color_width {
		border-style: solid;
		padding: 2px;
		margin-left: var(--space_xs2);
		margin-bottom: var(--space_xs2);
	}

	.border_width {
		border-color: var(--border_color_5);
		border-style: solid;
	}

	.outline_width {
		outline-color: var(--outline_color);
		outline-style: solid;
	}

	.border_radii .border_example {
		padding: var(--space_xl5) var(--space_md);
	}
	.border_radius {
		background-color: var(--fg_2);
	}
</style>
