<script lang="ts">
	import 'virtual:fuz.css';
	import '@fuzdev/fuz_code/theme.css';

	import {SiteState, site_context} from '@fuzdev/fuz_ui/site.svelte.js';
	import {logo_fuz_css} from '@fuzdev/fuz_ui/logos.js';
	import type {Snippet} from 'svelte';
	import ThemeRoot from '@fuzdev/fuz_ui/ThemeRoot.svelte';
	import Spiders from '@fuzdev/fuz_ui/Spiders.svelte';
	import pkg_json from 'virtual:pkg.json';

	// TODO re-enable this, see comment below
	// import ContextmenuRoot from '$lib/ContextmenuRoot.svelte';
	// import Dialog from '$lib/Dialog.svelte';
	// import Settings from '$routes/Settings.svelte';
	// import {contextmenu_attachment} from '$lib/contextmenu_helpers.svelte.js';

	const {
		children,
	}: {
		children: Snippet;
	} = $props();

	site_context.set(new SiteState({icon: logo_fuz_css, pkg_json}));

	// let show_settings = $state.raw(false);
</script>

<svelte:head>
	<title>fuz_css - CSS with more utility</title>
</svelte:head>

<ThemeRoot>
	<!-- TODO add all of this and fixed scoped, so the docs examples work as expected,
		or maybe disable this main contextmenu when in the docs -->
	<!-- <ContextmenuRoot> -->
	{@render children()}
	<Spiders />
	<!-- </ContextmenuRoot> -->
	<!-- {#if show_settings}
		<Dialog onclose={() => (show_settings = false)}>
			<div class="pane p_md width_atmost_md mx_auto">
				<Settings />
			</div>
		</Dialog>
	{/if} -->
</ThemeRoot>

<!-- <svelte:body
	{@attach contextmenu_attachment([
		{
			snippet: 'text',
			props: {
				content: 'Settings',
				icon: '?',
				run: () => {
					show_settings = true;
				},
			},
		},
		{
			snippet: 'text',
			props: {
				content: 'Reload',
				icon: '⟳',
				run: () => {
					location.reload();
				},
			},
		},
	])}
/> -->
