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

	import StyleVariableButton from '$routes/StyleVariableButton.svelte';
	import {shade_variants} from '$lib/variable_data.js';

	const LIBRARY_ITEM_NAME = 'shading';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const themer = themer_context.get();
	const toggle_color_scheme = () => {
		themer.color_scheme = themer.color_scheme === 'light' ? 'dark' : 'light';
	};
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_css is designed around two simplistic models of light, one for dark mode and one for light
			mode, mapping to the web platform's <MdnLink path="Web/CSS/color-scheme" />. The goal is easy
			authoring with simple and consistent rules for arbitrary compositions and states. Each <TomeLink
				name="themes">theme</TomeLink
			> can choose to implement either light mode or dark mode or both.
		</p>
		<p>
			Light mode's starting point is plain white documents (like paper) where we can think of UI
			construction as assembling elements that contrast against the white background, replacing some
			of the white blankness with darkened values/color/shape. In other words, we start with full
			lightness and subtract light to make visuals. Black shadows on the white background make
			natural sense, and white glows against a white background are invisible.
		</p>
		<p>
			In contrast, dark mode's starting point is a lightless void where we add light. We add
			elements which emanate light. I think of videogames and virtual/augmented/actual reality.
			Black shadows are invisible against a black background, and white glows make natural sense
			against a black background.
		</p>
		<p>
			The shade scale provides a unified system for backgrounds and surfaces that adapts
			automatically to light and dark modes. Numbers represent prominence: low numbers are subtle
			(near the base surface), high numbers are bold (high contrast).
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
			<div>
				<div class="color" style:background-color="var(--shade_min)"></div>
				<small><StyleVariableButton name="shade_min" /></small>
			</div>
			{#each shade_variants as shade (shade)}
				{@const name = 'shade_' + shade}
				<div>
					<div class="color" style:background-color="var(--{name})"></div>
					<small><StyleVariableButton {name} /></small>
				</div>
			{/each}
			<div>
				<div class="color" style:background-color="var(--shade_max)"></div>
				<small><StyleVariableButton name="shade_max" /></small>
			</div>
		</div>
		<TomeSection>
			<TomeSectionHeader text="Key values" tag="h4" />
			<ul>
				<li>
					<code>shade_min</code>: Untinted surface-side extreme (white in light mode, black in dark
					mode). Used for input backgrounds.
				</li>
				<li>
					<code>shade_00</code> / <code>--surface</code>: The base background. Use
					<code>var(--surface)</code> for readability.
				</li>
				<li><code>shade_05</code>: Very subtle (hover states on surface).</li>
				<li><code>shade_10</code>: Subtle elevation (panels, cards, aside, blockquote, code).</li>
				<li><code>shade_20</code>: More elevated (active/pressed states).</li>
				<li><code>shade_30</code>: Default border intensity.</li>
				<li><code>shade_100</code>: Maximum tinted contrast.</li>
				<li>
					<code>shade_max</code>: Untinted contrast-side extreme (black in light mode, white in dark
					mode). Rarely needed.
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
		<TomeSectionHeader text="Usage patterns" />
		<p>Common shade assignments:</p>
		<Code
			content={`/* Base page background */
background-color: var(--surface);

/* Elevated panel or card */
background-color: var(--shade_10);

/* Hover state on surface */
background-color: var(--shade_05);

/* Active/pressed state */
background-color: var(--shade_20);

/* Default border */
border-color: var(--shade_30);

/* Subtle border (tables) */
border-color: var(--shade_10);

/* Input backgrounds (untinted for contrast) */
background-color: var(--shade_min);`}
		/>
		<p class="mt_lg">
			Shades are opaque and don't accumulate when nested. This is more performant and predictable
			than alpha-based stacking. For rare cases requiring true overlay stacking, use inline alpha
			values like <code>hsla(0 0% 0% / 10%)</code>.
		</p>
	</TomeSection>
</TomeContent>

<style>
	.swatch {
		font-family: var(--font_family_mono);
		margin-bottom: var(--space_md);
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
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
</style>
