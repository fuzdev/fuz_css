<script lang="ts">
	import 'virtual:fuz.css';
	import '@fuzdev/fuz_code/theme.css';

	import { SiteState, site_context } from '@fuzdev/fuz_ui/site.svelte.ts';
	import { logo_fuz_css } from '@fuzdev/fuz_ui/logos.ts';
	import type { Snippet } from 'svelte';
	import ThemeRoot from '@fuzdev/fuz_ui/ThemeRoot.svelte';
	import Spiders from '@fuzdev/fuz_ui/Spiders.svelte';
	import { save_theme } from '@fuzdev/fuz_ui/theme_state.svelte.ts';
	import pkg_json from 'virtual:pkg.json';

	import { UNSAVED_THEME_NAME } from '$routes/theme_draft.ts';

	// TODO re-enable this, see comment below
	// import ContextmenuRoot from '$lib/ContextmenuRoot.svelte';
	// import Dialog from '$lib/Dialog.svelte';
	// import Settings from '$routes/Settings.svelte';
	// import {contextmenu_attachment} from '$lib/contextmenu_helpers.svelte.js';

	const {
		children
	}: {
		children: Snippet;
	} = $props();

	site_context.set(new SiteState({ icon: logo_fuz_css, pkg_json }));

	// let show_settings = $state.raw(false);
</script>

<svelte:head>
	<title>fuz_css - CSS with more utility</title>
</svelte:head>

<!-- the theme editor's draft rethemes the page live through `theme_state`, and
	ThemeRoot persists every theme reassignment to localStorage undebounced, so
	drafts are excluded from persistence here -->
<ThemeRoot
	save_theme={(theme) => (theme?.name === UNSAVED_THEME_NAME ? undefined : save_theme(theme))}
>
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
