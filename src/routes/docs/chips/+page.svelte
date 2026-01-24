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
			<!-- eslint-disable-next-line svelte/no-useless-mustaches -->
			<Code content={`<span class="chip">a chip</span>`} />
			<span class="chip">a chip</span>
		</div>
		<div class:mb_xs>
			<!-- eslint-disable-next-line svelte/no-useless-mustaches -->
			<Code content={`<a class="chip" href="#">a link chip</a>`} />
			<a class="chip" href="#">a link chip</a>
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
				<a class="chip {color_name}" href="#" class:mb_xs>a.chip.{color_name}</a>
			</section>
		{/each}
		<div class="box width:100% mb_lg">
			<ColorSchemeInput />
		</div>
	</TomeSection>
</TomeContent>
