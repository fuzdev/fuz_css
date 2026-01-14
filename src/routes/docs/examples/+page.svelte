<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';

	const tome = get_tome_by_name('examples');

	const GITHUB_EXAMPLES = 'https://github.com/fuzdev/fuz_css/tree/main/examples';
</script>

<TomeContent {tome}>
	<section class="column gap_md">
		<p>
			Example projects using the <a
				href="https://github.com/fuzdev/fuz_css/blob/main/src/lib/vite_plugin_fuz_css.ts"
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
			Each example demonstrates token, composite, and literal classes with responsive, hover, and
			dark mode modifiers.
		</p>
	</section>
</TomeContent>
