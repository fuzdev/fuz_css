<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import ModuleLink from '@fuzdev/fuz_ui/ModuleLink.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import { default_variables } from '#lib/variables.ts';
	import { INTERNAL_VARIABLE_NAME_MATCHER } from '#lib/variable.ts';
	import { style_hooks } from '#lib/style_hooks.ts';
	import UnfinishedImplementationWarning from '#routes/docs/UnfinishedImplementationWarning.svelte';

	const LIBRARY_ITEM_NAME = 'variables';

	const tome = tome_get_by_slug(LIBRARY_ITEM_NAME);

	// the ramp intermediates are internal, so they stay out of the reference
	const variables = default_variables
		.filter((v) => !INTERNAL_VARIABLE_NAME_MATCHER.test(v.name))
		.sort((a, b) => a.name.localeCompare(b.name));

	// TODO maybe FAQ? need a standardized pattern - first add the "on this page" menu functionality
</script>

<TomeContent {tome}>
	<section>
		<p>
			Style variables, or just "variables" in fuz_css, are
			<MdnLink path="https://developer.mozilla.org/en-US/docs/Web/CSS/--*">
				CSS custom properties
			</MdnLink>
			that can be grouped into a <TomeLink slug="themes">theme</TomeLink>. Each variable has a
			<code>base</code> value that applies in both
			<MdnLink path="Web/CSS/color-scheme">color-schemes</MdnLink>, a <code>dark</code> value that
			replaces it in dark mode, or both. They're design tokens with an API.
		</p>
		<p>
			The goal of the variables system is to provide runtime theming that's efficient and ergonomic
			for both developers and end-users. Variables can be composed in multiple ways:
		</p>
		<ul>
			<li>by CSS classes, both utility and component</li>
			<li>
				by other variables, both in calculations and to add useful semantics (e.g.
				<code>button_fill_hover</code> uses <code>shade_50</code> but can be themed independently)
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
		<p>
			Most color variables are <em>derived</em>:
			<TomeLink slug="colors" hash="Color-knobs">knobs</TomeLink> feed ramp stops and ramp stops
			feed color stops, all computed in pure CSS
			(<code>calc()</code>/<code>pow()</code>/<code>oklch()</code>). Scale knobs like
			<code>radius_scale</code> derive other families the same way, and a derived token or color
			stop can still be pinned as an escape hatch. The ramp stops in between are internal
			(<code>--_palette_lightness_30</code>), so a theme can't set them. See
			<TomeLink slug="themes" /> for setting the rest.
		</p>
		<p>
			In <TomeLink slug="classes" hash="What-gets-included">bundled mode</TomeLink>, only the
			variables your code uses are emitted, along with any they depend on. The full
			<ModuleLink module_path="theme.css" /> stylesheet ships every variable, for utility-only mode
			and direct imports.
		</p>
	</section>
	<section>
		<div class="mb_md">
			<ModuleLink module_path="variable.ts" />
		</div>
		<Code
			lang="ts"
			content={`export type Theme = {
	name: string;
	/** What the theme looks like, for theme pickers. */
	summary?: string;
	variables: StyleVariable[];
	/** Single-scheme themes render one appearance in both color schemes. */
	scheme?: 'dual' | 'light' | 'dark';
};

export type StyleVariable = {
	name: string;
	base?: string;
	dark?: string;
	summary?: string;
};`}
		/>
		<p>
			Both are zod schemas, so the same names validate at runtime:
			<code>Theme.safeParse(value)</code> reports what's wrong, <code>parse_theme(value)</code>
			returns a theme or <code>null</code>, and <code>validate_theme(theme)</code> in
			<ModuleLink module_path="theme_validate.ts" /> runs the full lint.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Hooks" />
		<p>
			Hooks are the contextual surface: custom properties the base styles and classes read but don't
			declare as variables, so they have no <code>:root</code> default. Set one on an element to
			retune what reads it there, with a literal class like <code>--flow_margin:0</code> or in a
			component's styles - the <code>sized_*</code> composites work this way, setting
			<code>--flow_margin</code> and <code>--font_size</code> for their subtree. Where nothing sets
			a hook, its read falls back to the value listed. A <em>local</em> hook is declared by the rule
			that reads it, so a value reaches it only from a rule on the same element.
		</p>
		<p>
			Hooks aren't theme variables: from a theme's root, an inherited hook retunes every element
			that reads it and a local one reaches nothing, so <code>validate_theme</code> warns on a theme
			that sets one. Themes turn the knobs instead. The catalog is
			<ModuleLink module_path="style_hooks.ts" />.
		</p>
		<table>
			<thead>
				<tr>
					<th>hook</th>
					<th>read by</th>
					<th>fallback</th>
				</tr>
			</thead>
			<tbody>
				{#each style_hooks as hook (hook.name)}
					<tr>
						<td><code>--{hook.name}</code></td>
						<td>{hook.read_by.join(', ')}</td>
						<td>
							{#if hook.local}
								<em>local</em>
							{:else}
								<div class="row flex-wrap:wrap gap_xs">
									{#each hook.fallbacks as fallback (fallback)}
										<code>{fallback}</code>
									{/each}
								</div>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text={`All ${variables.length} style variables`} />
		<UnfinishedImplementationWarning>
			fuz_css is in early alpha, so variable names may still change before a stable release.
		</UnfinishedImplementationWarning>
		<!-- TODO add info through the contextmenu or dialog -->
		<div class="variables">
			{#each variables as variable (variable.name)}
				<StyleVariableButton name={variable.name} class="menuitem" />
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
