<script lang="ts">
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';

	const tome = get_tome_by_name('examples');

	const GITHUB_EXAMPLES = 'https://github.com/fuzdev/fuz_css/tree/main/examples';
</script>

<TomeContent {tome}>
	<section class="column gap_md">
		<p>
			The <a href={GITHUB_EXAMPLES}>example repos</a> demonstrate the <TomeLink name="classes" /> system
			using the
			<a href="https://github.com/fuzdev/fuz_css/blob/main/src/lib/vite_plugin_fuz_css.ts"
				>Vite plugin</a
			>:
		</p>
		<ul>
			<li><a href="{GITHUB_EXAMPLES}/vite-svelte">vite-svelte</a> - Svelte 5</li>
			<li><a href="{GITHUB_EXAMPLES}/vite-react">vite-react</a> - React 19</li>
			<li><a href="{GITHUB_EXAMPLES}/vite-preact">vite-preact</a> - Preact</li>
			<li><a href="{GITHUB_EXAMPLES}/vite-solid">vite-solid</a> - Solid</li>
		</ul>
		<p>
			For projects using <a href="https://github.com/fuzdev/gro">Gro</a>, see
			<a href="https://github.com/fuzdev/fuz_template">fuz_template</a> for integration with
			<ModuleLink module_path="gen_fuz_css.ts" />.
		</p>
	</section>
</TomeContent>
