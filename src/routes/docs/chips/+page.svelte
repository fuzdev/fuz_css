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

	<TomeSection>
		<TomeSectionHeader text="Chip examples" />
		<section>
			<p>Chips are useful for inline metadata:</p>
			<Code
				content={`<p>
	Status: <span class="chip color_a">active</span>
</p>`}
			/>
			<p>
				Status: <span class="chip color_a">active</span>
			</p>
		</section>
		<section>
			<p>Or for navigation links:</p>
			<Code
				content={`<nav>
	<a class="chip" href="#">home</a>
	<a class="chip" href="#">about</a>
	<a class="chip color_h" href="#">Button.svelte</a>
</nav>`}
			/>
			<nav class="row gap_md">
				<a class="chip" href="#">home</a>
				<a class="chip" href="#">about</a>
				<a class="chip color_h" href="#">Button.svelte</a>
			</nav>
		</section>
		<section>
			<p>Or for tags and categories:</p>
			<Code
				content={`<div class="row gap_md">
	<span class="chip color_d">TypeScript</span>
	<span class="chip color_h">Svelte</span>
	<span class="chip color_b">CSS</span>
</div>`}
			/>
			<div class="row gap_md flex-wrap:wrap">
				<span class="chip color_d">TypeScript</span>
				<span class="chip color_h">Svelte</span>
				<span class="chip color_b">CSS</span>
			</div>
		</section>
	</TomeSection>
</TomeContent>
