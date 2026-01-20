<script lang="ts">
	import {resolve} from '$app/paths';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {logo_fuz_css} from '@fuzdev/fuz_ui/logos.js';
	import {library_context} from '@fuzdev/fuz_ui/library.svelte.js';

	import Introduction from '$routes/Introduction.svelte';
	import {MAIN_HEADER_MARGIN_TOP} from '$routes/constants.js';

	const library = library_context.get();
</script>

<main class="box mb_xl7">
	<section class="box">
		<h1 class="mb_sm" style:margin-top={MAIN_HEADER_MARGIN_TOP}>fuz_css</h1>
		<Svg data={logo_fuz_css} size="var(--icon_size_xl2)" />
		<div class="p_xl mt_lg border_radius_lg shadow_inset_bottom_xs">
			<blockquote class="shadow_inset_top_xs">CSS with more utility 🪴</blockquote>
		</div>
	</section>
	<section class="width_atmost_md p_sm border_radius_md shadow_xs">
		<div class="panel p_lg bg shadow_sm">
			<Introduction />
		</div>
	</section>
	<section>
		<Card href={resolve('/docs')}>docs{#snippet icon()}🪴{/snippet}</Card>
	</section>
	<section class="width_atmost_sm p_sm border_radius_md shadow_xs text-align:center">
		fuz_css is part of the Fuz stack, <br /> see
		<a href="https://www.fuz.dev/">fuz.dev</a>
		and
		<a href="https://github.com/fuzdev" rel="noopener">github.com/fuzdev</a>
	</section>
	<section class="p_xl border_radius_lg shadow_inset_bottom_xs">
		<DocsFooter {library}>
			{#snippet logo_header()}
				<a href={resolve('/about')} class="mb_xs">about</a>
			{/snippet}
		</DocsFooter>
	</section>
</main>
