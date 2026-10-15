<script lang="ts">
	// TODO remove once the published fuz_ui `ThemeRoot` takes an injected
	// `resolve_theme` - until then it renders the bare theme, with no stance mirror

	import { theme_state_context } from '@fuzdev/fuz_ui/theme_state.svelte.ts';

	import { render_theme_style, to_theme_stance } from '#lib/theme.ts';
	import { resolve_theme_stance } from '#lib/theme_stance.ts';

	/**
	 * Renders the applied theme's stance mirror, which the layout's
	 * `ThemeRoot` can't: it renders the theme alone, and the mirror is derived
	 * data beside it. Renders the whole resolved theme rather than the mirror
	 * alone, so the result doesn't depend on which `<style>` comes first - the
	 * theme's own declarations match `ThemeRoot`'s, and the mirror yields every
	 * name the theme sets. A dual-scheme theme renders nothing here.
	 */

	const get_theme_state = theme_state_context.get();

	const style = $derived.by(() => {
		const { theme } = get_theme_state();
		if (!to_theme_stance(theme.scheme)) return null;
		const resolved = resolve_theme_stance(theme);
		return render_theme_style(resolved.theme, resolved) || null;
	});
	const style_html = $derived(style ? `<style>${style}</style>` : null);
</script>

<!-- eslint-disable svelte/no-at-html-tags -- the renderer contains every value it writes -->
<svelte:head>
	{#if style_html}{@html style_html}{/if}
</svelte:head>
