<script lang="ts">
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import LibraryDetail from '@fuzdev/fuz_ui/LibraryDetail.svelte';
	import EcosystemLinksPanel from '@fuzdev/fuz_ui/EcosystemLinksPanel.svelte';
	import Breadcrumb from '@fuzdev/fuz_ui/Breadcrumb.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {logo_fuz} from '@fuzdev/fuz_ui/logos.js';
	import {library_context} from '@fuzdev/fuz_ui/library.svelte.js';

	import {MAIN_HEADER_MARGIN_TOP} from '$routes/constants.js';

	const library = library_context.get();

	// TODO standardize
</script>

<main class="width_upto_md">
	<section>
		<header class="box width_upto_sm">
			<h1 class="mb_xl5" style:margin-top={MAIN_HEADER_MARGIN_TOP}>
				{library.repo_name}
			</h1>
		</header>
		<Breadcrumb><Svg data={logo_fuz} size="var(--icon_size_sm)" /></Breadcrumb>
	</section>
	<section>
		<div class="panel p_md width_upto_md">
			<LibraryDetail {library} />
		</div>
	</section>
	<EcosystemLinksPanel />
	<section class="box mb_xl7">
		<DocsFooter {library}>
			<div class="mb_xl5">
				<Breadcrumb><Svg data={logo_fuz} size="var(--icon_size_sm)" /></Breadcrumb>
			</div>
		</DocsFooter>
	</section>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 0 auto;
	}
	h1 {
		display: flex;
		align-items: baseline;
		text-align: center;
	}
</style>
