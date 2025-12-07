<script lang="ts">
	import {resolve} from '$app/paths';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {fuz_logo} from '@fuzdev/fuz_ui/logos.js';
	import HiddenPersonalLinks from '@fuzdev/fuz_ui/HiddenPersonalLinks.svelte';
	import {library_context} from '@fuzdev/fuz_ui/library.svelte.js';

	import Introduction from '$routes/Introduction.svelte';
	import FileLink from '$routes/FileLink.svelte';
	import {MAIN_HEADER_MARGIN_TOP} from '$routes/constants.js';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const library = library_context.get();
</script>

<main class="box mb_xl7">
	<section class="box">
		<h1 class="mb_sm" style:margin-top={MAIN_HEADER_MARGIN_TOP}>moss</h1>
		<Svg data={fuz_logo} size="var(--icon_size_xl2)" />
		<div class="p_xl mt_lg border_radius_lg shadow_inset_bottom_xs">
			<blockquote class="shadow_inset_top_xs">magical organic stylesheets 🌿</blockquote>
		</div>
	</section>
	<section class="width_upto_sm p_sm border_radius_md shadow_xs">
		<div class="panel p_lg bg shadow_sm">
			<Introduction />
		</div>
	</section>
	<section>
		<Card href={resolve('/docs')}>docs{#snippet icon()}🌿{/snippet}</Card>
	</section>
	<section class="width_upto_sm p_sm border_radius_md shadow_xs">
		<div class="panel p_lg bg shadow_sm">
			<UnfinishedImplementationWarning>
				Fuz CSS is in early alpha and will have many breaking changes to get to 1.0. Help is
				welcome, see
				<FileLink path="contributing.md">contributing.md</FileLink>.
			</UnfinishedImplementationWarning>
			<p>
				See also my Svelte UI library <a href="https://ui.fuz.dev/">Fuz UI</a> that builds on Fuz
				CSS. Feel free to take the ideas and
				<a href="https://github.com/fuzdev/fuz_css">code</a> for your own purposes.
			</p>
			<p>
				Fuz CSS is being made to support <a href="https://www.zzz.software/">Zzz</a> and
				<a href="https://www.ryanatkn.com/">my other projects</a>
				that focus on end-users. It's grown slowly over 5 years, adding new features when I feel they're
				sufficiently generalizable or merit experimentation, and in 2025 I'm excited to explore themes!
				And then I'll think about announcing it.
			</p>
		</div>
	</section>
	<section class="p_xl border_radius_lg shadow_inset_bottom_xs">
		<DocsFooter {library}>
			{#snippet logo_header()}
				<a href={resolve('/about')} class="mb_xs">about</a>
			{/snippet}
			<HiddenPersonalLinks />
		</DocsFooter>
	</section>
</main>
