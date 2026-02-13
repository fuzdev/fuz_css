<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import Details from '@fuzdev/fuz_ui/Details.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import FontWeightControl from '$routes/FontWeightControl.svelte';
	import FontSizeControl from '$routes/FontSizeControl.svelte';
	import {default_variables} from '$lib/variables.js';
	import IconSizes from '$routes/docs/typography/IconSizes.svelte';
	import {
		line_height_names,
		font_size_names,
		text_scale_variants,
		font_family_variants,
	} from '$lib/variable_data.js';

	const LIBRARY_ITEM_NAME = 'typography';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	// TODO refactor, also maybe add `950`?
	const font_weights = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 234, 555, 997];
	// @fuz-classes font-weight:100 font-weight:200 font-weight:300 font-weight:400 font-weight:500 font-weight:600 font-weight:700 font-weight:800 font-weight:900 font-weight:950 font-weight:234 font-weight:555 font-weight:997

	const font_size_variants = default_variables.filter((p) => font_size_names.includes(p.name));

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	let selected_font_weight = $state(400);
	let selected_size = $state(3);

	// @fuz-classes font_family_sans font_family_serif font_family_mono
	// @fuz-variables font_size_xs font_size_sm font_size_md font_size_lg font_size_xl font_size_xl2 font_size_xl3 font_size_xl4 font_size_xl5 font_size_xl6 font_size_xl7 font_size_xl8 font_size_xl9
	// @fuz-variables text_min text_00 text_05 text_10 text_20 text_30 text_40 text_50 text_60 text_70 text_80 text_90 text_95 text_100 text_max
	// @fuz-variables line_height_xs line_height_sm line_height_md line_height_lg line_height_xl
</script>

<TomeContent {tome}>
	<section>
		<h1 title="--font_size_xl3">h1</h1>
		<h2 title="--font_size_xl2">h2</h2>
		<h3 title="--font_size_xl">h3</h3>
		<h4 title="--font_size_lg">h4</h4>
		<h5 title="--font_size_md">h5</h5>
		<h6 title="--font_size_sm">h6</h6>
		<p>paragraphs</p>
		<p>paragraphs</p>
		<p>paragraphs</p>
		<p>p with some <small>small</small> text</p>
		<p>p <sub>sub</sub> p <sup>sup</sup> p</p>
		<Details>
			{#snippet summary()}show code{/snippet}
			<Code
				content={`<section>
	<h1 title="--font_size_xl3">h1</h1>
	<h2 title="--font_size_xl2">h2</h2>
	<h3 title="--font_size_xl">h3</h3>
	<h4 title="--font_size_lg">h4</h4>
	<h5 title="--font_size_md">h5</h5>
	<h6 title="--font_size_sm">h6</h6>
	<p>paragraphs</p>
	<p>paragraphs</p>
	<p>paragraphs</p>
	<p>p with some <small>small</small> text</p>
	<p>p <sub>sub</sub> p <sup>sup</sup> p</p>
	<Details>
		{#snippet summary()}show code{/snippet}
		<Code ... />
	</Details>
</section>`}
			/>
		</Details>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Font families" />
		<div>
			{#each font_family_variants as font_family (font_family)}
				<div
					class="row my_md"
					style:font-weight={selected_font_weight}
					style:font-size="var(--{font_size_names[selected_size - 1]})"
				>
					<StyleVariableButton name={font_family}>
						<span class={font_family}>{font_family}</span>
					</StyleVariableButton>
					<div class="row">
						<span class="pr_sm">=</span>
						<code>{computed_styles?.getPropertyValue('--' + font_family)}</code>
					</div>
				</div>
			{/each}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Font sizes" />
		<form class="width_atmost_sm">
			<FontWeightControl bind:selected_font_weight></FontWeightControl>
		</form>
		{#each font_size_variants as size (size.name)}
			<div class="row flex-wrap:wrap">
				<StyleVariableButton title={size.light} name={size.name}
					><span
						style:font-size="var(--{size.name})"
						style:font-weight={selected_font_weight}
						class="font_family_sans">{size.name}</span
					></StyleVariableButton
				>
				<div class="row">
					<span class="pr_sm">=</span>
					<code>{computed_styles?.getPropertyValue('--' + size.name)}</code>
				</div>
			</div>
		{/each}
	</TomeSection>
	<TomeSection>
		<!-- TODO add a slider for the font size here -->
		<TomeSectionHeader text="Font weights" />
		<p>Font weight values can be any integer from 1 to 1000.</p>
		<p>
			There are no variables for <MdnLink path="Web/CSS/font-weight" /> but there are
			<TomeLink name="classes" hash="Utility-class-types">utility classes</TomeLink>.
		</p>
		<form>
			<FontSizeControl bind:selected_size />
		</form>
		<div>
			{#each font_weights as font_weight (font_weight)}
				<div
					class="white-space:nowrap font-weight:{font_weight}"
					style:font-size="var(--{font_size_names[selected_size - 1]})"
				>
					.font-weight:{font_weight}
				</div>
			{/each}
		</div>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Text colors">Text colors</TomeSectionHeader>
		<p>
			The text scale (<code>text_00</code> through <code>text_100</code>) provides tinted neutral
			colors optimized for text legibility. The scale uses "prominence" semantics for light and dark
			modes: low numbers are subtle, high numbers are strong. This matches the
			<TomeLink name="shading">shade scale</TomeLink> pattern.
		</p>
		<ul>
			<li><code>text_00</code> - surface-side endpoint: essentially invisible on surface</li>
			<li>
				<code>text_10</code>-<code>text_30</code> - very subtle/faint text: watermarks, hints
			</li>
			<li><code>text_50</code> - disabled text: <code>text_disabled</code></li>
			<li><code>text_80</code> - default body text: <code>--text_color</code></li>
			<li><code>text_90</code>-<code>text_100</code> - high emphasis/headings</li>
			<li>
				<code>text_min</code>/<code>text_max</code> - knockout text (pure white/black without tint)
			</li>
		</ul>
		<p>
			The text scale is separate from the shade scale because text and backgrounds have different
			contrast requirements. Use <code>text_*</code> for text colors and <code>shade_*</code> for
			backgrounds. For colored text, use <code>color_a_50</code> etc.
		</p>
		<div class="panel">
			{#each text_scale_variants as variant (variant)}
				{@const name = 'text_' + variant}
				<div class="row">
					<StyleVariableButton {name}
						><span class="font_family_mono" style:color="var(--{name})">
							{name}
						</span></StyleVariableButton
					> = <code>{computed_styles?.getPropertyValue('--' + name)}</code>
				</div>
			{/each}
		</div>
	</TomeSection>
	<!-- <section> 'text_disabled'</section> -->
	<TomeSection>
		<TomeSectionHeader text="Line heights" />
		<aside>Learn more about <MdnLink path="Web/CSS/line-height" />.</aside>
		<div>
			{#each line_height_names as name (name)}
				<div>
					<StyleVariableButton {name}
						><div style:line-height="var(--{name})" class="button_contents font_family_mono">
							<div>
								{name} =
								<code>{computed_styles?.getPropertyValue('--' + name)}</code>
							</div>
							<div>{name}</div>
							<div>{name}</div>
						</div></StyleVariableButton
					>
				</div>
			{/each}
		</div>
	</TomeSection>
	<IconSizes />
</TomeContent>

<style>
	.button_contents {
		font-weight: normal;
		text-align: left;
		padding: var(--space_sm) 0;
	}
</style>
