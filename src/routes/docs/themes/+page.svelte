<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import Dialog from '@fuzdev/fuz_ui/Dialog.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import ThemeInput from '@fuzdev/fuz_ui/ThemeInput.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';

	import ModuleLink from '$routes/ModuleLink.svelte';
	import {default_themes} from '$lib/themes.js';
	import type {Theme} from '$lib/theme.js';
	import ThemeForm from '$routes/ThemeForm.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'themes';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const themes = default_themes.slice();

	// let show_create_theme_dialog = false;
	let editing_theme: null | Theme = $state(null);
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css supports both the browser's
			<MdnLink path="Web/CSS/color-scheme" />
			and custom themes based on <TomeLink name="variables" />, which use
			<MdnLink path="Web/CSS/--*">CSS custom properties</MdnLink>.
		</p>
		<p>
			fuz_css works with any JS framework, but it provides only stylesheets, not integrations. This
			website uses the companion Svelte UI library <a href="https://ui.fuz.dev/">fuz_ui</a>
			to provide the UI below to control the fuz_css color scheme and themes.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Color scheme" />
		<p>
			fuz_css supports
			<MdnLink path="Web/CSS/color-scheme" /> with dark and light modes. To apply dark mode manually,
			add the <code>dark</code> class to the root <code>html</code>
			element.
		</p>
		<p>
			The Fuz integration detects the default with
			<MdnLink path="Web/CSS/@media/prefers-color-scheme" />, and users can also set it directly
			with a component like
			<a href="https://github.com/fuzdev/fuz_ui/blob/main/src/lib/ColorSchemeInput.svelte"
				>this one</a
			>:
		</p>
		<div class="display:flex mb_lg">
			<ColorSchemeInput />
		</div>
		<p>
			The builtin themes support both dark and light color schemes. Custom themes may support one or
			both color schemes.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Builtin themes" />
		<UnfinishedImplementationWarning
			>The builtin themes need more work, but the proof of concept is ready!</UnfinishedImplementationWarning
		>
		<p>
			A theme is a simple JSON collection of <TomeLink name="variables" /> that can be transformed into
			CSS that set custom properties. Each variable can have values for light and/or dark color schemes.
			In other words, "dark" isn't a theme, it's a mode that any theme can implement.
		</p>
		<p>
			These docs are a work in progress, for now see <ModuleLink path="theme.ts"
				><code>@fuzdev/fuz_css/theme.ts</code></ModuleLink
			> and <ModuleLink path="themes.ts"><code>@fuzdev/fuz_css/themes.ts</code></ModuleLink>.
		</p>
		<!-- TODO explain when exported <Code code={`<ThemeInput\n\t{themes}\n\t{selected_theme}\n/>`} /> -->
		<div class="width_upto_xs mb_lg">
			<ThemeInput {themes} enable_editing onedit={(t) => (editing_theme = t)} />
		</div>
		<!-- <button class="mb_lg" onclick={() => (show_create_theme_dialog = true)} disabled
				>create a new theme (todo)</button
			> -->
	</TomeSection>
</TomeContent>

<!-- TODO enable creating themes -->
<!-- {#if show_create_theme_dialog}
	<Dialog onclose={() => (show_create_theme_dialog = false)} let:close>
		<div class="pane p_md width_upto_md mx_auto">
			<div class="theme_editor_wrapper panel">
				<ThemeForm
					oncreate={(theme) => {
						themes = themes.concat(theme);
						close();
					}}
				/>
			</div>
		</div>
	</Dialog>
{/if} -->
{#if editing_theme}
	<Dialog onclose={() => (editing_theme = null)}>
		<div class="pane p_md width_upto_md mx_auto">
			<div class="theme_editor_wrapper">
				<ThemeForm
					theme={editing_theme}
					onsave={(theme) => {
						console.log(`update theme`, theme); // eslint-disable-line no-console
						alert('todo'); // eslint-disable-line no-alert
					}}
				/>
			</div>
		</div>
	</Dialog>
{/if}

<style>
	.theme_editor_wrapper {
		padding: var(--space_lg);
	}
</style>
