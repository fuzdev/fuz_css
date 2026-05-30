<script lang="ts">
	import {resolve} from '$app/paths';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import {site_context} from '@fuzdev/fuz_ui/site.svelte.js';
	import {FUZ_DEV_URL} from '@fuzdev/fuz_ui/constants.js';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {logo_fuz_css} from '@fuzdev/fuz_ui/logos.js';

	import Introduction from '$routes/Introduction.svelte';
	import {MAIN_HEADER_MARGIN_TOP} from '$routes/constants.js';

	const site = site_context.get();
</script>

<main class="box mb_xl7">
	<section class="box">
		<h1 class="mb_sm" style:margin-top={MAIN_HEADER_MARGIN_TOP}>fuz_css</h1>
		<Svg data={logo_fuz_css} size="var(--icon_size_xl2)" />
		<div class="px_xl py_md mt_lg border_radius_lg shadow_inset_bottom_xs">
			<div class="panel p_md shadow_inset_top_xs">CSS with more utility 🪴</div>
		</div>
	</section>
	<section class="width_atmost_md p_sm border_radius_md shadow_xs">
		<div class="panel p_lg shade_00 shadow_sm">
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
		<DocsFooter repo_url={site.repo_url} root_url={FUZ_DEV_URL}>
			{#snippet logo_header()}
				<a href={resolve('/about')} class="mb_xs">about</a>
			{/snippet}
		</DocsFooter>
	</section>
</main>
