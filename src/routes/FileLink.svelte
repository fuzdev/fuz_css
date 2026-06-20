<script lang="ts">
	import type {Snippet} from 'svelte';
	import type {SvelteHTMLElements} from 'svelte/elements';
	import {icon_create_file} from '@fuzdev/fuz_ui/icons.ts';
	import type {SvgData} from '@fuzdev/fuz_ui/svg.ts';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';

	// TODO upstream?

	const {
		path,
		js = false,
		base_path = 'https://github.com/fuzdev/fuz_css/blob/main/',
		unstyled = false,
		attrs,
		icon = icon_create_file,
		children,
	}: {
		path: string;
		/**
		 * Converts `.js` to `.ts` by default, pass `true` to keep `.js`.
		 */
		js?: boolean;
		base_path?: string;
		unstyled?: boolean;
		attrs?: SvelteHTMLElements['a'];
		icon?: SvgData | Snippet | string;
		children?: Snippet;
	} = $props();

	const final_path = $derived(js ? path : path.replace(/\.js$/, '.ts'));

	const href = $derived(base_path + final_path);
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a {...attrs} {href} class:chip={!unstyled} class:white-space:nowrap={true}
	>{#if typeof icon === 'string'}{icon}{:else if typeof icon ===
		'function'}{@render icon()}{:else}<Svg data={icon} />{/if}
	{#if children}{@render children()}{:else}{final_path}{/if}</a
>
