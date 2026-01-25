<script lang="ts">
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import {get_tome_by_name} from '@fuzdev/fuz_ui/tome.js';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import MdnLink from '@fuzdev/fuz_ui/MdnLink.svelte';
	import ColorSchemeInput from '@fuzdev/fuz_ui/ColorSchemeInput.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';

	import HueSwatch from '$routes/docs/colors/HueSwatch.svelte';
	import ColorSwatch from '$routes/docs/colors/ColorSwatch.svelte';
	import {color_variants} from '$lib/variable_data.js';

	const LIBRARY_ITEM_NAME = 'colors';

	const tome = get_tome_by_name(LIBRARY_ITEM_NAME);

	const computed_styles =
		typeof window === 'undefined' ? null : window.getComputedStyle(document.documentElement);

	// TODO button to add an inline hue input for runtime modification of the theme

	// TODO maybe add this to the variable data as comments
	// Note: This array must stay in sync with color_variants (a-j = 10 elements)
	const descriptions = [
		'primary',
		'success',
		'error/danger',
		'secondary/accent',
		'tertiary/highlight',
		'quaternary/muted',
		'quinary/decorative',
		'senary/caution',
		'septenary/info',
		'octonary/flourish',
	];
</script>

<TomeContent {tome}>
	<TomeSection>
		<TomeSectionHeader text="Color semantics" />
		<p>
			fuz_css provides a palette of color and hue <TomeLink name="variables" /> designed to support concise
			authoring in light and dark modes, as well as straightforward <TomeLink name="themes"
				>theming</TomeLink
			> by both developers and end-users at runtime. The colors have more semantics than just plain values,
			so they automatically adapt to dark mode and custom themes, at the cost of having different values
			depending on color scheme and theme.
		</p>
		<h4>Adapting colors to dark mode</h4>
		<p>
			A color's subjective appearance depends on the context in which it's viewed, especially the
			surrounding colors and values. fuz_css's semantic colors are designed to work across color
			schemes, so each fuz_css color <TomeLink name="variables">variable</TomeLink> has two values, one
			for light and one for dark mode.
		</p>
		<h4>Custom themes</h4>
		<p>
			Instead of "blue" and "red", colors are named with letters like "a" and "b", so you can change
			the primary "a" from blue to any color in a theme without breaking the name-to-color
			correspondence everywhere. This also flexibly handles more colors and cases than using names
			like "primary", and although it takes some learning, it's a simple pattern to remember.
			("primary" and its ilk require learning too!)
		</p>
		<p>
			A downside of this approach is that changing a color like the primary "a" affects the many
			places it's used. Sometimes you may want to change the color of a specific element or state,
			not all the things. In those cases, use plain CSS and optionally fuz_css variables. Compared
			to most libraries, fuz_css provides fewer handles for granular color customizations, but the
			benefits include consistency, efficiency, DRY authoring, and ease of app-wide theming.
		</p>
	</TomeSection>
	<TomeSection>
		<TomeSectionHeader text="Hue variables" />
		<p>
			Hue variables contain a single <MdnLink path="Web/CSS/hue" /> number. Each color variable combines
			a hue variable with hardcoded saturation and lightness values for light and dark modes.
		</p>
		<p>
			Hue variables therefore provide a single source of truth that's easy to theme, but to achieve
			pleasing results, setting the hue alone is not always sufficient. Custom colors will often
			require you to set per-variable saturation and lightness values.
		</p>
		<p>
			Hue variables are also useful to construct custom colors not covered by the color variables.
			For example, fuz_css's base stylesheet uses <code>hue_a</code> for the semi-transparent
			<code>::selection</code>. (try selecting some text -
			<span class="color_a_50">same hue!</span>)
		</p>
		<p>Unlike the color variables, the hue variables are the same in both light and dark modes.</p>
		<ul class="palette unstyled">
			{#each color_variants as color_name, i (color_name)}
				<HueSwatch {color_name} {computed_styles} description={descriptions[i]!} />
			{/each}
		</ul>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
	<TomeSection>
		<TomeSectionHeader text="Color variables" />
		<p>
			There are 11 variables per color (05, 10, 20, ..., 80, 90, 95), from subtle to bold. The 50
			variant of each color is used as the base for things like <TomeLink name="buttons" />.
		</p>
		<p>
			Note that these values differ between light and dark modes! See the discussion above for why.
		</p>
		<p>
			Unlike the <TomeLink name="shading">shade</TomeLink> and
			<TomeLink name="typography" hash="Text-colors">text</TomeLink> scales (which are separate), color
			variables can be used for both text and backgrounds via utility classes:
			<code>.color_a_50</code> sets text color, <code>.bg_a_50</code> sets background color.
		</p>
		<p>These colors were eyeballed by a programmer, and will change :]</p>
		<ul class="palette unstyled pt_xl2">
			{#each color_variants as color_name (color_name)}
				<ColorSwatch {color_name} {computed_styles} />
			{/each}
		</ul>
	</TomeSection>
	<section class="box">
		<ColorSchemeInput />
	</section>
</TomeContent>

<style>
	.palette {
		width: 100%;
	}
</style>
