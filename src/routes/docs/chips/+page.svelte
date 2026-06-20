<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {tome_get_by_slug} from '@fuzdev/fuz_ui/tome.ts';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';

	import {color_variants} from '$lib/variable_data.ts';

	const LIBRARY_ITEM_NAME = 'chips';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

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
		<TomeSectionHeader text="Size composites" />
		<p>
			The <TomeLink slug="classes" hash="#Composite-classes">size composite classes</TomeLink>
			<code>.xs</code>, <code>.sm</code>, <code>.md</code>, <code>.lg</code>, and <code>.xl</code
			> scale chips up and down, adjusting font and padding.
		</p>
		<Code
			content={`<span class="chip xs">xs</span>\n<span class="chip sm">sm</span>\n<span class="chip">md</span>\n<span class="chip lg">lg</span>\n<span class="chip xl">xl</span>`}
		/>
		<div class="row align-items:center flex-wrap:wrap gap_sm mb_lg">
			<span class="chip xs">xs</span>
			<span class="chip sm">sm</span>
			<span class="chip">md</span>
			<span class="chip lg">lg</span>
			<span class="chip xl">xl</span>
		</div>
		<p>Set on a container and children inherit the sizing:</p>
		<Code content={`<div class="xs">...</div>`} />
		<div class="xs row gap_sm">
			<span class="chip">one</span>
			<span class="chip color_d">two</span>
			<!-- svelte-ignore a11y_missing_attribute -->
			<a class="chip color_e">three</a>
		</div>
	</TomeSection>
</TomeContent>
