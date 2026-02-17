<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	import {color_variants} from '$lib/variable_data.js';

	const LIBRARY_ITEM_NAME = 'chips';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const mb_xs = true;
</script>

<!-- eslint-disable svelte/no-useless-mustaches -->

<TomeContent {tome}>
	<section>
		<p>
			The <code>.chip</code> class creates a small inline label or tag, useful for displaying
			metadata, categories, or status indicators. Chips work on any element but are commonly used
			with <code>&lt;span&gt;</code> and <code>&lt;a&gt;</code>.
		</p>
		<p>
			Chips have color variants (<code>.color_a</code> through <code>.color_j</code>) that tint both
			the text and background. Links (<code>a.chip</code>) have slightly bolder text.
		</p>
		<div class:mb_xs>
			<Code content={`<span class="chip">a chip</span>`} />
			<span class="chip">a chip</span>
		</div>
		<div class:mb_xs>
			<Code content={`<a class="chip">a link chip</a>`} />
			<!-- svelte-ignore a11y_missing_attribute -->
			<a class="chip">a link chip</a>
		</div>
	</section>

	<section>
		<div class="box width:100% mb_lg">
			<ColorSchemeInput />
		</div>
	</section>

	<TomeSection>
		<TomeSectionHeader text="Colorful chips" />
		{#each color_variants as c (c)}
			{@const color_name = `color_${c}`}
			<section>
				<Code content={`<span class="chip ${color_name}">`} />
				<span class="chip {color_name}" class:mb_xs>.chip.{color_name}</span>
				<!-- svelte-ignore a11y_missing_attribute -->
				<a class="chip {color_name}" class:mb_xs>a.chip.{color_name}</a>
			</section>
		{/each}
		<div class="box width:100% mb_lg">
			<ColorSchemeInput />
		</div>
	</TomeSection>

	<TomeSection>
		<TomeSectionHeader text="With .compact">
			With <code>.compact</code>
		</TomeSectionHeader>
		<p>
			<code>.compact</code> provides tighter sizing -- smaller fonts, inputs, padding, and border radii.
			Apply directly or on a container to cascade to children.
		</p>
		<Code content={`<span class="chip compact">compact</span>`} />
		<div class="row gap_sm mb_lg">
			<span class="chip compact">compact</span>
			<span class="chip">normal</span>
		</div>
		<Code
			content={`<span class="chip compact color_a">color_a</span>\n<span class="chip compact color_b">color_b</span>\n<span class="chip compact color_c">color_c</span>`}
		/>
		<div class="row gap_sm mb_lg">
			<span class="chip compact color_a">color_a</span>
			<span class="chip compact color_b">color_b</span>
			<span class="chip compact color_c">color_c</span>
		</div>
		<Code
			content={`<!-- container usage -->\n<div class="compact row gap_sm">\n\t<span class="chip">one</span>\n\t<span class="chip color_d">two</span>\n\t<a class="chip color_e">three</a>\n</div>`}
		/>
		<div class="compact row gap_sm">
			<span class="chip">one</span>
			<span class="chip color_d">two</span>
			<!-- svelte-ignore a11y_missing_attribute -->
			<a class="chip color_e">three</a>
		</div>
	</TomeSection>
</TomeContent>
