<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import {themer_context} from '@fuzdev/fuz_ui/themer.svelte.js';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import StyleVariableButton from '@fuzdev/fuz_ui/StyleVariableButton.svelte';

	import {shade_scale_variants, alpha_variants} from '$lib/variable_data.js';

	// @fuz-classes fg_00 fg_05 fg_10 fg_20 fg_30 fg_40 fg_50 fg_60 fg_70 fg_80 fg_90 fg_95 fg_100
	// @fuz-classes bg_00 bg_05 bg_10 bg_20 bg_30 bg_40 bg_50 bg_60 bg_70 bg_80 bg_90 bg_95 bg_100
	// @fuz-classes shade_50
	// @fuz-classes darken_00 darken_05 darken_10 darken_20 darken_30 darken_40 darken_50 darken_60 darken_70 darken_80 darken_90 darken_95 darken_100
	// @fuz-classes lighten_00 lighten_05 lighten_10 lighten_20 lighten_30 lighten_40 lighten_50 lighten_60 lighten_70 lighten_80 lighten_90 lighten_95 lighten_100
	const LIBRARY_ITEM_NAME = 'shading';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const themer = themer_context.get();
	const toggle_color_scheme = () => {
		themer.color_scheme = themer.color_scheme === 'light' ? 'dark' : 'light';
	};

	// TODO BLOCK add theme toggle below in at least one more place
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css offers a shading model built on <em>adaptive</em> style variables that respond to the
			<MdnLink path="Web/CSS/color-scheme" />, working naturally in both light and dark modes. Each <TomeLink
				name="themes">theme</TomeLink
			> can choose to implement either light mode or dark mode or both.
		</p>
		<p>
			Light mode's starting point is plain white documents (like paper) where we subtract light to
			create contrast and shape. Black shadows on white make natural sense; white glows are near
			invisible.
		</p>
		<p>
			Dark mode's starting point is a lightless void where we add light. Elements emit light to fill
			the darkness. White glows make natural sense; black shadows are near invisible.
		</p>
	</section>
	<TomeSection>
		<TomeSectionHeader text="The shade scale" />
		<p>
			The shade scale is the primary system for backgrounds and surfaces. All numbered shades (<code
				>shade_00</code
			>
			through <code>shade_100</code>) are tinted using the theme's
			<code>tint_hue</code> and <code>tint_saturation</code> for visual cohesion. The scale also
			includes two untinted extremes (<code>shade_min</code> and <code>shade_max</code>) for maximum
			contrast needs.
		</p>
		<div class="swatch">
			{#each shade_scale_variants as shade (shade)}
				{@const name = 'shade_' + shade}
				<div>
					<div class="color" style:background-color="var(--{name})"></div>
					<small><StyleVariableButton {name} /></small>
				</div>
			{/each}
		</div>
		<TomeSection>
			<TomeSectionHeader text="Key values" tag="h4" />
			<ul>
				<li>
					<code>shade_min</code>: untinted surface-side extreme -- white in light mode, black in
					dark mode; used for input backgrounds
				</li>
				<li><code>shade_00</code>: the base background</li>
				<li><code>shade_05</code>: very subtle: hover states on surface</li>
				<li><code>shade_10</code>: subtle elevation: panels, cards, aside, blockquote, code</li>
				<li><code>shade_20</code>: more elevated: active/pressed states</li>
				<li><code>shade_30</code>: default border intensity</li>
				<li><code>shade_100</code>: maximum tinted contrast</li>
				<li>
					<code>shade_max</code>: untinted contrast-side extreme: black in light mode, white in dark
					mode; rarely needed
				</li>
			</ul>
		</TomeSection>
	</TomeSection>
	<section>
		<ColorSchemeInput />
		<aside class="mt_xl2 width_atmost_sm mx_auto">
			<p>
				tip: Try <button type="button" onclick={toggle_color_scheme}>toggling</button> between light and
				dark to see how the shade scale adapts. Lower numbers stay near the surface, higher numbers move
				toward maximum contrast.
			</p>
		</aside>
	</section>
	<TomeSection>
		<TomeSectionHeader text="Adaptive alpha overlays (fg/bg)" />
		<p>
			The <code>fg</code> and <code>bg</code> variables provide alpha-based overlays that adapt to
			the color scheme. Unlike the opaque shade scale, these stack when nested and are used by
			composites like <code>.panel</code> and <code>.chip</code>.
		</p>
		<ul>
			<li>
				<code>fg_NN</code> (foreground direction) - darkens in light mode, lightens in dark mode; use
				for elevated surfaces like panels, cards, and hover states
			</li>
			<li>
				<code>bg_NN</code> (background direction) - lightens in light mode, darkens in dark mode; use
				for surfaces that blend toward the background
			</li>
		</ul>
		<p>
			In light mode, <code>fg</code> is the same as <code>darken</code> and <code>bg</code> is the
			same as <code>lighten</code>. In dark mode, they're swapped.
		</p>
		<TomeSection>
			<TomeSectionHeader text="fg (toward foreground)" tag="h4" />
			<p>Adaptive alpha overlays that add contrast with the surface.</p>
			<div class="overlay_swatch shade_20">
				{#each alpha_variants as v (v)}
					{@const name = 'fg_' + v}
					<div>
						<div class="overlay_color fg_{v}"></div>
						<small><StyleVariableButton {name} /></small>
					</div>
				{/each}
			</div>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="bg (toward background)" tag="h4" />
			<p>Adaptive alpha overlays that reduce contrast with the surface.</p>
			<div class="overlay_swatch shade_20">
				{#each alpha_variants as v (v)}
					{@const name = 'bg_' + v}
					<div>
						<div class="overlay_color bg_{v}"></div>
						<small><StyleVariableButton {name} /></small>
					</div>
				{/each}
			</div>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Stacking behavior" tag="h4" />
			<p>
				Unlike the opaque shade scale, alpha overlays <strong>stack</strong> when nested. Each layer adds
				more contrast:
			</p>
			<Code
				content={`<div class="fg_10 p_sm">
	<div class="fg_10 p_sm">
		<div class="fg_10 p_sm">
			<div class="fg_10 p_sm">
				...
			</div>
		</div>
	</div>
</div>`}
			/>
			<div class="stacking_demo">
				<div class="stacking_layer fg_10">
					<span>fg_10</span>
					<div class="stacking_layer fg_10">
						<span>nested fg_10</span>
						<div class="stacking_layer fg_10">
							<span>triple nested</span>
							<div class="stacking_layer fg_10">
								<span>quadruple nested</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			<p class="mt_md">
				This is useful for nested UI elements like cards within cards, or hover states inside
				elevated containers. Composites like <code>.panel</code>, <code>.chip</code>, and
				<code>.menu_item</code> use <code>fg_10</code> for this stacking behavior.
			</p>
		</TomeSection>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Darken/lighten alpha overlays" />
		<p>
			The non-adaptive <code>darken_NN</code> and <code>lighten_NN</code> variables provide
			consistent darkening or lightening regardless of color scheme. These are the underlying
			primitives that <code>fg</code> and <code>bg</code> reference.
		</p>
		<TomeSection>
			<TomeSectionHeader text="Darken" tag="h4" />
			<p>Alpha overlays that always add black.</p>
			<div class="overlay_swatch shade_20">
				{#each alpha_variants as v (v)}
					{@const name = 'darken_' + v}
					<div>
						<div class="overlay_color darken_{v}"></div>
						<small><StyleVariableButton {name} /></small>
					</div>
				{/each}
			</div>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Lighten" tag="h4" />
			<p>Alpha overlays that always add white.</p>
			<div class="overlay_swatch shade_20">
				{#each alpha_variants as v (v)}
					{@const name = 'lighten_' + v}
					<div>
						<div class="overlay_color lighten_{v}"></div>
						<small><StyleVariableButton {name} /></small>
					</div>
				{/each}
			</div>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Perceptual curve" tag="h4" />
			<p>
				Both scales use a perceptual curve from 0% to 100%: 0%, 3%, 6%, 12%, 21%, 32%, 45%, 65%,
				80%, 89%, 96%, 98%, 100%. This provides visually even steps across the range.
			</p>
		</TomeSection>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="When to use which" />
		<p>
			<strong>Use <code>fg_NN</code></strong> when you need stacking behavior or are building nested UI:
		</p>
		<Code
			lang="css"
			content={`/* elevated panel (stacks when nested) */
background-color: var(--fg_10);

/* hover state (stacks on any background) */
background-color: var(--fg_10);

/* active/pressed state */
background-color: var(--fg_20);`}
		/>
		<p class="mt_md">
			<strong>Use <code>shade_NN</code></strong> when you need explicit, predictable opaque surfaces:
		</p>
		<Code
			lang="css"
			content={`/* base page background */
background-color: var(--shade_00);

/* opaque border */
border-color: var(--shade_30);

/* input backgrounds (untinted for contrast) */
background-color: var(--shade_min);`}
		/>
		<p class="mt_lg">
			The composites (<code>.panel</code>, <code>.chip</code>, <code>.menu_item</code>) use
			<code>fg_NN</code> for stacking. The page background uses <code>shade_00</code> as the opaque base.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Text colors" />
		<p>
			For text colors, see the <TomeLink name="typography" hash="Text-colors">text scale</TomeLink>
			(<code>text_00</code> through <code>text_100</code>). Both scales use the same "prominence"
			semantics for light and dark modes: low numbers are subtle, high numbers are strong. They're
			separate scales because text and backgrounds have different contrast requirements.
		</p>
	</TomeSection>
</TomeContent>

<style>
	.swatch {
		font-family: var(--font_family_mono);
		margin-bottom: var(--space_md);
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		grid-auto-flow: row;
	}
	.color {
		height: var(--input_height_sm);
	}
	small {
		height: var(--input_height_sm);
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.overlay_swatch {
		font-family: var(--font_family_mono);
		margin-bottom: var(--space_md);
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		grid-auto-flow: row;
		border-radius: var(--border_radius_xs2);
	}
	.overlay_color {
		height: var(--input_height_sm);
	}
	.stacking_demo {
		padding: var(--space_md);
		border-radius: var(--border_radius_xs);
	}
	.stacking_layer {
		padding: var(--space_md);
		border-radius: var(--border_radius_xs);
		margin-top: var(--space_sm);
	}
	.stacking_layer span {
		font-family: var(--font_family_mono);
		font-size: var(--font_size_sm);
	}
</style>
