<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';

	import {default_variables} from '$lib/variables.js';
	import StyleVariableButton from '$routes/StyleVariableButton.svelte';
	import UnfinishedImplementationWarning from '$routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'variables';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const variables = default_variables.slice().sort((a, b) => a.name.localeCompare(b.name));

	// TODO maybe FAQ? need a standardized pattern -- first add the "on this page" menu functionality
</script>

<TomeContent {tome}>
	<section>
		<p>
			Style variables, or just "variables" in fuz_css, are <MdnLink
				path="https://developer.mozilla.org/en-US/docs/Web/CSS/--*">CSS custom properties</MdnLink
			> that can be grouped into a <TomeLink name="themes">theme</TomeLink>. Each variable can have
			values for light and/or dark <MdnLink path="Web/CSS/color-scheme">color-schemes</MdnLink>.
			They're design tokens with an API.
		</p>
		<p>
			The goal of the variables system is to provide runtime theming that's efficient and ergnomic
			for both developers and end-users. Variables can be composed in multiple ways:
		</p>
		<ul>
			<li>by CSS classes, both utility and component</li>
			<li>
				by other variables, both in calculations and to add useful semantics (e.g. <code
					>button_fill_hover</code
				>
				defaults to <code>fg_2</code> but can be themed independently)
			</li>
			<li>
				in JS like the <a href="https://svelte.dev/">Svelte</a> components in
				<a href="https://ui.fuz.dev/">fuz_ui</a>
			</li>
		</ul>
		<p>
			Variables also provide an interface that's generally secure for user-generated content, if
			you're into that kind of thing.
		</p>
		<p>
			The result is a flexible system that aligns with modern CSS to deliver high-capability UX and
			DX with low overhead.
		</p>
	</section>
	<section>
		<div class="mb_md">
			<ModuleLink module_path="theme.ts" />
		</div>
		<Code
			lang="ts"
			content={`export interface Theme {
	name: string;
	variables: StyleVariable[];
}

export interface StyleVariable {
	name: string;
	light?: string;
	dark?: string;
	summary?: string;
}`}
		/>
	</section>
	<TomeSection>
		<TomeSectionHeader text={`All ${variables.length} style variables`} />
		<UnfinishedImplementationWarning>Many of these will change.</UnfinishedImplementationWarning>
		<!-- TODO add info through the contextmenu or dialog -->
		<div class="variables">
			{#each variables as variable (variable.name)}
				<StyleVariableButton name={variable.name} classes="menu_item" />
			{/each}
		</div>
	</TomeSection>
</TomeContent>

<style>
	.variables {
		width: 100%;
		display: inline-grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--style_variable_name_width, 240px), 1fr));
		font-family: var(--font_family_mono);
		white-space: nowrap;
	}
</style>
